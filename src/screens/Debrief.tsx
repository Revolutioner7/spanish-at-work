import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getCharacter } from "../brain/characters";
import { characterUnlockedBy, getTappa } from "../brain/path";
import { findInterference } from "../brain/interferences";
import { debriefSystem, debriefUserMessage } from "../brain/prompts";
import { callClaude, parseJson } from "../api";
import { MODEL_DEBRIEF } from "../config";
import { learner } from "../learners";
import {
  addCharacterMemory,
  addError,
  addUsefulPhrases,
  addUserFacts,
  completeTappa,
  errorBookForPrompt,
  errorCountByCode,
  finishSession,
} from "../db";
import { syllablesPerMinute } from "../fluency";
import { colors, gap, radius } from "../theme";
import type { ConversationResult } from "./Conversation";

type DebriefError = { said: string; better: string; code: string; explanation: string; confidence: "high" | "doubtful" };
type DebriefData = {
  mistakes: DebriefError[];
  wellDone: string;
  usefulPhrases: string[];
  newFacts: string[];
  characterSummary: string;
  mission?: { achieved: boolean; comment: string };
};

type Props = {
  result: ConversationResult;
  onRepeat: () => void;
  onHome: () => void;
  onNext: () => void;
};

export default function Debrief({ result, onRepeat, onHome, onNext }: Props) {
  const character = getCharacter(result.characterId);
  const tappa = getTappa(result.tappaId);
  const [data, setData] = useState<DebriefData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const transcript = result.messages
    .map((m) => `${m.role === "user" ? learner().name : character.name}: ${m.content.replace(/\n\n\[(QUEDA POCO|App note:[^\]]*)\]/g, "")}`)
    .join("\n");

  async function run() {
    setError(null);
    try {
      const text = await callClaude({
        model: MODEL_DEBRIEF,
        systemStatic: debriefSystem(tappa),
        messages: [{ role: "user", content: debriefUserMessage({ characterName: character.name, transcript, errorBook: errorBookForPrompt() }) }],
        maxTokens: 1200,
      });
      const parsed = parseJson<DebriefData>(text);
      parsed.mistakes = (parsed.mistakes || []).filter((e) => e.said && e.better).slice(0, 3);

      // Guardar: sesión, errores, frases, memoria
      finishSession(result.sessionId, { seconds: result.userSeconds, syllables: result.userSyllables, words: result.userWords, transcript });
      for (const e of parsed.mistakes) {
        addError(result.sessionId, { code: e.code, said: e.said, correct: e.better, explanation: e.explanation, confidence: e.confidence });
      }
      addUsefulPhrases(result.sessionId, parsed.usefulPhrases || []);
      addUserFacts(parsed.newFacts || []);
      addCharacterMemory(result.characterId, parsed.characterSummary || "");
      if (tappa && parsed.mission?.achieved) completeTappa(tappa.id);
      setData(parsed);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't prepare your review.");
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = (result.userSeconds / 60).toFixed(1);
  const rate = syllablesPerMinute(result.userSyllables, result.userSeconds);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your review</Text>
      <Text style={styles.subtitle}>Your conversation with {character.name}</Text>

      <View style={styles.statsRow}>
        <Stat label="Minutes you spoke" value={minutes} />
        <Stat label="Syllables per minute" value={rate ? String(rate) : "–"} />
        <Stat label="Words" value={String(result.userWords)} />
      </View>

      {!data && !error && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Reviewing what you said…</Text>
        </View>
      )}

      {error && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.ghost} onPress={run}>
            <Text style={styles.ghostText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {data && tappa && data.mission && (
        <View style={[styles.card, styles.missionCard, data.mission.achieved ? styles.missionOk : styles.missionNo]}>
          <Text style={styles.missionTitle}>
            {data.mission.achieved ? `🎉 Stage complete: ${tappa.title}` : `🤏 Almost: ${tappa.title}`}
          </Text>
          {!!data.mission.comment && <Text style={styles.body}>{data.mission.comment}</Text>}
          {data.mission.achieved && characterUnlockedBy(tappa.id) && (
            <Text style={styles.unlock}>New person at El Patio: {getCharacter(characterUnlockedBy(tappa.id)!).name}</Text>
          )}
        </View>
      )}

      {data && (
        <>
          {data.wellDone ? (
            <View style={[styles.card, { borderLeftColor: colors.ok, borderLeftWidth: 4 }]}>
              <Text style={styles.label}>What you did well</Text>
              <Text style={styles.body}>{data.wellDone}</Text>
            </View>
          ) : null}

          {data.mistakes.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.body}>Nothing important to fix this time.</Text>
            </View>
          )}

          {data.mistakes.map((e, i) => {
            const repeated = errorCountByCode(e.code) >= 3;
            const card = repeated ? findInterference(e.code)?.card : undefined;
            return (
              <View key={i} style={styles.card}>
                <View style={styles.errorHead}>
                  <Text style={styles.label}>A better way to say it</Text>
                  {e.confidence === "doubtful" && <Text style={styles.doubt}>not 100% sure</Text>}
                </View>
                <Text style={styles.said}>{e.said}</Text>
                <Text style={styles.correct}>{e.better}</Text>
                <Text style={styles.body}>{e.explanation}</Text>
                {card && (
                  <View style={styles.contrast}>
                    <Text style={styles.contrastLabel}>This keeps coming up: quick rule</Text>
                    <Text style={styles.body}>{card}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {data.usefulPhrases?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.label}>Phrases to keep</Text>
              {data.usefulPhrases.map((f, i) => (
                <Text key={i} style={styles.phrase}>
                  {f}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.note}>
            Corrections are made by AI and can be wrong. If one sounds odd, mark it as “not sure” in your mistake book and ask Rodrigo.
          </Text>

          {tappa && data.mission?.achieved ? (
            <Pressable style={styles.primary} onPress={onNext}>
              <Text style={styles.primaryText}>See my path</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primary} onPress={onRepeat}>
              <Text style={styles.primaryText}>{tappa ? "Try this stage again" : "Repeat the conversation"}</Text>
            </Pressable>
          )}
          <Pressable style={styles.ghost} onPress={onHome}>
            <Text style={styles.ghostText}>Back to home</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 72, paddingBottom: 48, gap: 12 },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: -6 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, borderWidth: 1, borderColor: colors.line },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  loading: { alignItems: "center", gap: 8, padding: 24 },
  muted: { color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 6, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  body: { fontSize: 15, lineHeight: 21, color: colors.ink },
  errorHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  doubt: { fontSize: 12, color: colors.warn, fontWeight: "600" },
  said: { fontSize: 17, color: colors.danger, textDecorationLine: "line-through" },
  correct: { fontSize: 18, color: colors.ok, fontWeight: "700" },
  contrast: { marginTop: 6, backgroundColor: colors.accentSoft, borderRadius: 12, padding: 12, gap: 4 },
  contrastLabel: { fontSize: 12, fontWeight: "700", color: colors.accent },
  phrase: { fontSize: 17, color: colors.ink, paddingVertical: 2 },
  missionCard: { borderWidth: 2 },
  missionOk: { borderColor: colors.ok },
  missionNo: { borderColor: colors.warn },
  missionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink },
  unlock: { fontSize: 15, fontWeight: "700", color: colors.accent, marginTop: 4 },
  note: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  errorText: { color: colors.danger },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  ghost: { borderRadius: radius, borderWidth: 1, borderColor: colors.accent, padding: 14, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600", fontSize: 16 },
});
