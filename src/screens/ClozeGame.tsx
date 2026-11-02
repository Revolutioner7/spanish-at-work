import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { callClaude, parseJson } from "../api";
import { MODEL_CONVERSATION } from "../config";
import { dueVocabAny, recordVocabResult, type VocabRow } from "../db";
import { speak, stopSpeaking } from "../tts";
import { colors, gap, radius } from "../theme";

/**
 * «Completa la frase»: para las palabras que no tienen imagen (esperar, aunque, ojalá…).
 * Una frase en español con un hueco y cuatro opciones. Todo en español, sin traducciones.
 */

const ROUND_SIZE = 6;
const VOICE = "es-US-Chirp3-HD-Kore";

type Item = { lemma: string; frase: string; respuesta: string; opciones: string[]; explicacion: string };
type Question = Item & { row: VocabRow };

const SYSTEM = `Eres profesor de español para principiantes (nivel A1-A2) que hablan inglés. Preparas un ejercicio de "completa la frase". Escribe SOLO en español de México: prohibido traducir o usar otro idioma.

Te dan una lista de palabras. Para cada una, crea un ejercicio.

Devuelve solo este JSON:
{"ejercicios":[{"lemma":"","frase":"","respuesta":"","opciones":[],"explicacion":""}]}

- lemma: la palabra tal como te la dieron.
- frase: una frase corta (5-10 palabras), cotidiana, de café, comida, música o viajes, con ___ en lugar de la palabra. El contexto debe dejar claro qué palabra falta.
- respuesta: la palabra exacta que va en el hueco, en la forma correcta (conjugada o concordada).
- opciones: 4 opciones, incluida la respuesta. Las otras 3 son palabras del mismo tipo y en la misma forma, pero que en la frase no tienen sentido. Nada de sinónimos correctos.
- explicacion: máximo 12 palabras, español muy sencillo, por qué es la palabra correcta.`;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

async function buildRound(rows: VocabRow[]): Promise<Question[]> {
  const text = await callClaude({
    model: MODEL_CONVERSATION,
    systemStatic: SYSTEM,
    messages: [{ role: "user", content: "Palabras: " + rows.map((r) => r.lemma).join(", ") }],
    maxTokens: 1200,
  });
  const { ejercicios } = parseJson<{ ejercicios: Item[] }>(text);
  const out: Question[] = [];
  for (const e of ejercicios ?? []) {
    const row = rows.find((r) => r.lemma === e.lemma.trim().toLowerCase()) ?? rows.find((r) => e.lemma.toLowerCase().includes(r.lemma));
    if (!row || !e.frase?.includes("___") || !e.respuesta) continue;
    const opts = Array.from(new Set([e.respuesta, ...(e.opciones ?? [])])).slice(0, 4);
    if (opts.length < 2) continue;
    out.push({ ...e, opciones: shuffle(opts), row });
  }
  return out;
}

export default function ClozeGame({ onBack }: { onBack: () => void }) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const rows = shuffle(dueVocabAny(30)).slice(0, ROUND_SIZE);
    if (rows.length === 0) {
      setQuestions([]);
      return;
    }
    buildRound(rows)
      .then(setQuestions)
      .catch((e) => setError(String(e?.message ?? e)));
    return () => stopSpeaking();
  }, []);

  const q = questions?.[index];
  const finished = questions !== null && questions.length > 0 && index >= questions.length;

  function choose(option: string) {
    if (!q || chosen) return;
    setChosen(option);
    const ok = option === q.respuesta;
    if (ok) setScore((s) => s + 1);
    recordVocabResult(q.row.id, ok);
    speak(q.frase.replace("___", q.respuesta), { googleVoice: VOICE, rate: 0.9 });
  }

  function next() {
    stopSpeaking();
    setChosen(null);
    setIndex((i) => i + 1);
  }

  const header = (
    <>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Home</Text>
      </Pressable>
      <Text style={styles.title}>Completa la frase</Text>
    </>
  );

  if (error) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>Couldn’t prepare the game</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (questions === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.emptyText}>Preparando las frases…</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>No words yet</Text>
        <Text style={styles.emptyText}>
          Words you didn’t know, said wrong or tapped will show up here. Talk with someone at El Patio and come back.
        </Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.doneTitle}>¡Muy bien! 🎉</Text>
        <Text style={styles.emptyText}>
          {score} de {questions.length} correctas
        </Text>
        <Pressable style={styles.primary} onPress={onBack}>
          <Text style={styles.primaryText}>Terminar</Text>
        </Pressable>
      </View>
    );
  }

  const [before, after] = q!.frase.split("___");
  const ok = chosen === q!.respuesta;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {header}
      <Text style={styles.progress}>
        {index + 1} / {questions.length}
      </Text>

      <View style={styles.sentenceCard}>
        <Text style={styles.sentence}>
          {before}
          <Text style={[styles.blank, chosen && { color: ok ? colors.ok : colors.danger }]}>{chosen ? q!.respuesta : "_____"}</Text>
          {after}
        </Text>
      </View>

      <View style={styles.options}>
        {q!.opciones.map((o) => {
          const isAnswer = o === q!.respuesta;
          const isChosen = o === chosen;
          return (
            <Pressable
              key={o}
              onPress={() => choose(o)}
              style={[styles.option, chosen && isAnswer && styles.optionOk, isChosen && !isAnswer && styles.optionWrong]}
            >
              <Text style={styles.optionText}>{o}</Text>
            </Pressable>
          );
        })}
      </View>

      {chosen && (
        <View style={styles.feedback}>
          <Text style={[styles.verdict, { color: ok ? colors.ok : colors.danger }]}>{ok ? "¡Correcto! 👏" : "Casi… 🤏"}</Text>
          {!!q!.explicacion && <Text style={styles.explain}>{q!.explicacion}</Text>}
          <Pressable onPress={() => speak(q!.frase.replace("___", q!.respuesta), { googleVoice: VOICE, rate: 0.8 })} hitSlop={8}>
            <Text style={styles.listen}>🔊 Escuchar</Text>
          </Pressable>
          <Pressable style={styles.primary} onPress={next}>
            <Text style={styles.primaryText}>Siguiente</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 16 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 30, fontWeight: "700", color: colors.ink },
  progress: { fontSize: 14, color: colors.muted, marginTop: -8 },
  sentenceCard: { backgroundColor: colors.card, borderRadius: radius, padding: 20, borderWidth: 1, borderColor: colors.line },
  sentence: { fontSize: 22, lineHeight: 32, color: colors.ink },
  blank: { fontWeight: "700", color: colors.accent },
  options: { gap: 10 },
  option: { padding: 16, borderRadius: radius, borderWidth: 1.5, borderColor: colors.accent, backgroundColor: colors.card, alignItems: "center" },
  optionOk: { borderColor: colors.ok, backgroundColor: "#E3F1E4" },
  optionWrong: { borderColor: colors.danger, backgroundColor: "#F8E1E1" },
  optionText: { fontSize: 18, fontWeight: "600", color: colors.ink },
  feedback: { gap: 10, alignItems: "center" },
  verdict: { fontSize: 22, fontWeight: "700" },
  explain: { fontSize: 16, color: colors.ink, textAlign: "center", lineHeight: 22 },
  listen: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center", alignSelf: "stretch" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  doneTitle: { fontSize: 32, fontWeight: "700", color: colors.ink },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.ink, textAlign: "center" },
  emptyText: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 22 },
});
