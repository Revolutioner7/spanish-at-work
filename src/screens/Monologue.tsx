import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { monologueFixSystem } from "../brain/prompts";
import { allCharacters } from "../brain/characters";
import { learner } from "../learners";
import { callClaude, parseJson } from "../api";
import { MODEL_CONVERSATION, TARGET_LANG } from "../config";
import { addMonologueRound, addUsefulPhrases } from "../db";
import { FluencyMetrics, fluencyFromWords, Word } from "../fluency";
import { colors, gap, radius } from "../theme";

const ROUND_SECONDS = [120, 90, 60];

type Phase = "intro" | "recording" | "fixing" | "fixes" | "results";
type Fix = { said: string; better: string };
type RoundResult = { metrics: FluencyMetrics; transcript: string };

export default function Monologue({ onBack }: { onBack: () => void }) {
  const [topic] = useState(() => {
    const topics = learner().profile.monologueTopics;
    return topics[Math.floor(Math.random() * topics.length)];
  });
  const listener = allCharacters()[0].name;
  const [runId] = useState(() => String(Date.now()));
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(0);
  const [remaining, setRemaining] = useState(ROUND_SECONDS[0]);
  const [liveText, setLiveText] = useState("");
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [usefulPhrase, setUsefulPhrase] = useState("");
  const [results, setResults] = useState<RoundResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Estado del reconocimiento dentro de una ronda (puede reiniciarse varias veces)
  const roundStart = useRef(0);
  const sessionOffset = useRef(0);
  const committedWords = useRef<Word[]>([]);
  const committedText = useRef("");
  const currentText = useRef("");
  const recording = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef = useRef(0);
  const resultsRef = useRef<RoundResult[]>([]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    ExpoSpeechRecognitionModule.abort();
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    const r = event.results[0];
    if (!r) return;
    currentText.current = r.transcript;
    setLiveText(`${committedText.current} ${r.transcript}`.trim());
    if (event.isFinal) {
      const words = (r.segments || []).map((s) => ({
        text: s.segment,
        start: s.startTimeMillis + sessionOffset.current,
        end: s.endTimeMillis + sessionOffset.current,
      }));
      committedWords.current.push(...words);
      committedText.current = `${committedText.current} ${r.transcript}`.trim();
      currentText.current = "";
    }
  });

  useSpeechRecognitionEvent("end", () => {
    // Si el iPhone corta el reconocimiento antes de tiempo, se reanuda sin que lo notes
    if (recording.current) startRecognizer();
    else finishRound();
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "aborted" || event.error === "no-speech") return;
    setError(`Speech recognition failed (${event.error}).`);
  });

  function startRecognizer() {
    sessionOffset.current = Date.now() - roundStart.current;
    ExpoSpeechRecognitionModule.start({
      lang: TARGET_LANG,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  }

  async function startRound(index: number) {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Microphone", "Thrivlingo needs microphone and speech recognition access. Turn them on in your iPhone Settings.");
      return;
    }
    setError(null);
    setRound(index);
    roundRef.current = index;
    setLiveText("");
    committedWords.current = [];
    committedText.current = "";
    currentText.current = "";
    roundStart.current = Date.now();
    recording.current = true;
    setRemaining(ROUND_SECONDS[index]);
    setPhase("recording");
    startRecognizer();

    timer.current = setInterval(() => {
      const left = ROUND_SECONDS[index] - Math.floor((Date.now() - roundStart.current) / 1000);
      setRemaining(Math.max(left, 0));
      if (left <= 0) stopRound();
    }, 250);
  }

  function stopRound() {
    if (!recording.current) return;
    recording.current = false;
    if (timer.current) clearInterval(timer.current);
    ExpoSpeechRecognitionModule.stop(); // el evento "end" llama a finishRound
  }

  async function finishRound() {
    const transcript = `${committedText.current} ${currentText.current}`.trim();
    const elapsed = (Date.now() - roundStart.current) / 1000;
    const metrics = fluencyFromWords(committedWords.current, elapsed, transcript);
    const index = roundRef.current;
    addMonologueRound({ runId, round: index + 1, topic, transcript, ...metrics });
    resultsRef.current = [...resultsRef.current, { metrics, transcript }];
    setResults(resultsRef.current);

    if (index === ROUND_SECONDS.length - 1) {
      setPhase("results");
      return;
    }
    if (index > 0) {
      // Solo se corrige tras la primera ronda; entre la segunda y la tercera se repite sin interrupciones
      setFixes([]);
      setPhase("fixes");
      return;
    }
    setPhase("fixing");
    try {
      const text = await callClaude({
        model: MODEL_CONVERSATION,
        systemStatic: monologueFixSystem(),
        messages: [{ role: "user", content: `Topic: ${topic}\n\nWhat ${learner().name} said:\n${transcript || "(nothing could be understood)"}` }],
        maxTokens: 500,
      });
      const data = parseJson<{ fixes: Fix[]; usefulPhrase: string }>(text);
      setFixes((data.fixes || []).slice(0, 3));
      setUsefulPhrase(data.usefulPhrase || "");
      if (data.usefulPhrase) addUsefulPhrases(0, [data.usefulPhrase]);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't prepare the fixes.");
    }
    setPhase("fixes");
  }

  const nextSeconds = ROUND_SECONDS[round + 1];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => {
          recording.current = false;
          ExpoSpeechRecognitionModule.abort();
          onBack();
        }}
        hitSlop={12}
      >
        <Text style={styles.back}>‹ Home</Text>
      </Pressable>
      <Text style={styles.title}>Tell {listener}</Text>
      <Text style={styles.topic}>{topic}</Text>

      {phase === "intro" && (
        <>
          <Text style={styles.body}>
            You will tell it three times, in Spanish: in 2 minutes, in 90 seconds and in 60. After the first round you will see three things to fix. Don’t stop to look for the perfect word: if it doesn’t come, say it another way and keep going.
          </Text>
          <Pressable style={styles.primary} onPress={() => startRound(0)}>
            <Text style={styles.primaryText}>Start (2 minutes)</Text>
          </Pressable>
        </>
      )}

      {phase === "recording" && (
        <>
          <Text style={styles.countdown}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </Text>
          <Text style={styles.roundLabel}>Round {round + 1} of 3</Text>
          <View style={styles.liveBox}>
            <Text style={styles.live}>{liveText || "Te escucho…"}</Text>
          </View>
          <Pressable style={styles.ghost} onPress={stopRound}>
            <Text style={styles.ghostText}>I’m done</Text>
          </Pressable>
        </>
      )}

      {phase === "fixing" && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Finding what helps most for next time…</Text>
        </View>
      )}

      {phase === "fixes" && (
        <>
          <RoundSummary index={round} r={results[round]} />
          {fixes.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>For next time</Text>
              {fixes.map((f, i) => (
                <View key={i} style={{ marginTop: 6 }}>
                  <Text style={styles.said}>{f.said}</Text>
                  <Text style={styles.correct}>{f.better}</Text>
                </View>
              ))}
              {usefulPhrase ? <Text style={[styles.body, { marginTop: 8 }]}>Would have helped: {usefulPhrase}</Text> : null}
            </View>
          )}
          <Pressable style={styles.primary} onPress={() => startRound(round + 1)}>
            <Text style={styles.primaryText}>Again, in {nextSeconds} seconds</Text>
          </Pressable>
        </>
      )}

      {phase === "results" && (
        <>
          <Text style={styles.body}>How your speaking changed across the three rounds:</Text>
          <View style={styles.card}>
            <View style={styles.tableRow}>
              <Text style={[styles.cell, styles.head]}>Round</Text>
              <Text style={[styles.cell, styles.head]}>Syllables/min</Text>
              <Text style={[styles.cell, styles.head]}>Syllables in a row</Text>
              <Text style={[styles.cell, styles.head]}>Pauses/min</Text>
            </View>
            {results.map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.cell}>{ROUND_SECONDS[i]} s</Text>
                <Text style={styles.cell}>{r.metrics.speechRate || "–"}</Text>
                <Text style={styles.cell}>{r.metrics.meanRun || "–"}</Text>
                <Text style={styles.cell}>{r.metrics.pausesPerMinute || "–"}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            Usually each round you speak faster, say more syllables in a row and pause less. That improvement, repeated many times, is what turns into fluency.
          </Text>
          <Pressable style={styles.primary} onPress={onBack}>
            <Text style={styles.primaryText}>Finish</Text>
          </Pressable>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function RoundSummary({ index, r }: { index: number; r?: RoundResult }) {
  if (!r) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Round {index + 1}</Text>
      <Text style={styles.body}>
        {r.metrics.speechRate || "–"} syllables per minute · {r.metrics.meanRun || "–"} syllables in a row on average · {r.metrics.words} words
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 14 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  topic: { fontSize: 19, color: colors.accent, fontWeight: "600", lineHeight: 26 },
  body: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  muted: { color: colors.muted },
  countdown: { fontSize: 64, fontWeight: "700", color: colors.ink, textAlign: "center", fontVariant: ["tabular-nums"] },
  roundLabel: { textAlign: "center", color: colors.muted, marginTop: -8 },
  liveBox: { backgroundColor: colors.card, borderRadius: radius, padding: 16, minHeight: 140, borderWidth: 1, borderColor: colors.line },
  live: { fontSize: 17, color: colors.ink, lineHeight: 24 },
  loading: { alignItems: "center", gap: 8, padding: 24 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 4, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  said: { fontSize: 16, color: colors.danger, textDecorationLine: "line-through" },
  correct: { fontSize: 17, color: colors.ok, fontWeight: "700" },
  tableRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  cell: { flex: 1, fontSize: 15, color: colors.ink, textAlign: "center" },
  head: { fontSize: 11, fontWeight: "700", color: colors.muted },
  note: { fontSize: 13, color: colors.muted, lineHeight: 19 },
  error: { color: colors.danger },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { borderRadius: radius, borderWidth: 1, borderColor: colors.accent, padding: 14, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
});
