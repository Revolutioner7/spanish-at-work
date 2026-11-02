import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { allCharacters, CharacterId, getCharacter } from "../brain/characters";
import { tappe, currentIndex, unlockedCharacters } from "../brain/path";
import { learner } from "../learners";
import { recentSessions, openErrors, dueVocabCount, dueVocabAnyCount, completedTappe } from "../db";
import { syllablesPerMinute } from "../fluency";
import { colors, gap, radius } from "../theme";

type Props = {
  onStart: (id: CharacterId, tappaId?: string) => void;
  onMonologue: () => void;
  onGame: () => void;
  onCloze: () => void;
  onErrors: () => void;
  onSettings: () => void;
};

export default function Home({ onStart, onMonologue, onGame, onCloze, onErrors, onSettings }: Props) {
  const TAPPE = tappe();
  const CHARACTERS = allCharacters();
  const firstCharacter = CHARACTERS[0];
  const { weekCount, lastRate, minutesWeek, openCount, dueWords, dueAny, current, unlocked } = useMemo(() => {
    const done = completedTappe();
    const sessions = recentSessions(50);
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const week = sessions.filter((s) => new Date(s.started_at).getTime() > weekAgo);
    const last = sessions[0];
    return {
      weekCount: week.length,
      minutesWeek: Math.round(week.reduce((n, s) => n + s.user_seconds, 0) / 60),
      lastRate: last ? syllablesPerMinute(last.user_syllables, last.user_seconds) : 0,
      openCount: openErrors().length,
      dueWords: dueVocabCount(),
      dueAny: dueVocabAnyCount(),
      current: currentIndex(done),
      unlocked: unlockedCharacters(done),
    };
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>Thrivlingo</Text>
      <Text style={styles.subtitle}>¡Hola, {learner().name}! Who are you talking to today?</Text>

      <View style={styles.statsRow}>
        <Stat label="Sessions this week" value={`${weekCount} / 2`} />
        <Stat label="Minutes spoken" value={`${minutesWeek}`} />
        <Stat label="Syllables per minute" value={lastRate ? `${lastRate}` : "–"} />
      </View>

      <Text style={styles.section}>Tu camino · {Math.min(current, TAPPE.length)} / {TAPPE.length}</Text>
      <View style={styles.path}>
        {TAPPE.map((t, i) => {
          const done = i < current;
          const isCurrent = i === current;
          const known = unlocked.includes(t.characterId);
          const who = known ? getCharacter(t.characterId) : undefined;
          const step = (
            <View style={[styles.step, isCurrent && styles.stepCurrent, !done && !isCurrent && styles.stepLocked]}>
              <View style={[styles.dot, { backgroundColor: done ? colors.ok : isCurrent ? who?.color ?? colors.accent : colors.line }]}>
                <Text style={styles.dotText}>{done ? "✓" : isCurrent ? t.emoji : "🔒"}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, !done && !isCurrent && { color: colors.muted }]}>{done || isCurrent ? t.title : `Stage ${i + 1}`}</Text>
                <Text style={styles.stepWho}>{who ? who.name : "Someone new"}</Text>
                {isCurrent && <Text style={styles.stepMission}>{t.mission}</Text>}
                {isCurrent && <Text style={styles.stepGo}>Start ›</Text>}
              </View>
            </View>
          );
          // Solo se muestran las etapas hechas, la actual y las dos siguientes
          if (i > current + 2) return null;
          return isCurrent ? (
            <Pressable key={t.id} onPress={() => onStart(t.characterId, t.id)} style={({ pressed }) => pressed && styles.pressed}>
              {step}
            </Pressable>
          ) : (
            <View key={t.id}>{step}</View>
          );
        })}
        {current >= TAPPE.length && <Text style={styles.stepMission}>You finished the path. ¡Ya eres de El Patio! 🇲🇽</Text>}
      </View>

      <Pressable style={({ pressed }) => [styles.drill, pressed && styles.pressed]} onPress={onMonologue}>
        <Text style={styles.drillTitle}>Tell {firstCharacter.name}</Text>
        <Text style={styles.drillText}>Tell the same story three times, faster each time: 2 minutes, 90 and 60 seconds.</Text>
      </Pressable>

      {dueWords > 0 && (
        <Pressable style={({ pressed }) => [styles.game, pressed && styles.pressed]} onPress={onGame}>
          <Text style={styles.gameTitle}>🧩 Une las palabras</Text>
          <Text style={styles.gameText}>{dueWords} palabras para repasar con imágenes</Text>
        </Pressable>
      )}

      {dueAny > 0 && (
        <Pressable style={({ pressed }) => [styles.game, pressed && styles.pressed]} onPress={onCloze}>
          <Text style={styles.gameTitle}>✍️ Completa la frase</Text>
          <Text style={styles.gameText}>{dueAny} palabras para repasar en una frase</Text>
        </Pressable>
      )}

      <Text style={styles.section}>Free conversation</Text>
      {CHARACTERS.filter((c) => unlocked.includes(c.id)).map((c) => (
        <Pressable key={c.id} style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={() => onStart(c.id)}>
          <View style={[styles.avatar, { backgroundColor: c.color }]}>
            <Text style={styles.avatarText}>{c.name.replace("Don ", "")[0]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {c.name} <Text style={styles.age}>· {c.age}</Text>
            </Text>
            <Text style={styles.tagline}>{c.tagline}</Text>
            <Text style={styles.difficulty}>{"●".repeat(c.difficulty) + "○".repeat(3 - c.difficulty)} difficulty</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.footer}>
        <Pressable style={styles.secondary} onPress={onErrors}>
          <Text style={styles.secondaryText}>Mistake book ({openCount})</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={onSettings}>
          <Text style={styles.secondaryText}>My level</Text>
        </Pressable>
      </View>
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
  content: { padding: gap, paddingTop: 72, paddingBottom: 48, gap },
  brand: { fontSize: 40, fontWeight: "700", color: colors.accent, letterSpacing: -1 },
  subtitle: { fontSize: 18, color: colors.muted, marginTop: -8 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: radius, padding: 12, borderWidth: 1, borderColor: colors.line },
  statValue: { fontSize: 22, fontWeight: "700", color: colors.ink },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  drill: { backgroundColor: colors.accent, borderRadius: radius, padding: 18, gap: 4 },
  drillTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  drillText: { color: "#fff", opacity: 0.9, fontSize: 14, lineHeight: 20 },
  game: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 4, borderWidth: 1.5, borderColor: colors.accent },
  gameTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  gameText: { fontSize: 14, color: colors.muted },
  section: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  path: { gap: 8 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: colors.card, borderRadius: radius, padding: 12, borderWidth: 1, borderColor: colors.line },
  stepCurrent: { borderWidth: 2, borderColor: colors.accent, padding: 14 },
  stepLocked: { opacity: 0.55 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dotText: { fontSize: 18, color: "#fff", fontWeight: "700" },
  stepTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  stepWho: { fontSize: 13, color: colors.muted },
  stepMission: { fontSize: 14, color: colors.ink, lineHeight: 20, marginTop: 6 },
  stepGo: { fontSize: 15, fontWeight: "700", color: colors.accent, marginTop: 6 },
  card: { flexDirection: "row", gap: 14, alignItems: "center", backgroundColor: colors.card, borderRadius: radius, padding: 16, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.7 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  name: { fontSize: 18, fontWeight: "600", color: colors.ink },
  age: { fontWeight: "400", color: colors.muted },
  tagline: { fontSize: 14, color: colors.muted, marginTop: 2 },
  difficulty: { fontSize: 12, color: colors.accent, marginTop: 6 },
  footer: { flexDirection: "row", gap: 8, marginTop: 8 },
  secondary: { flex: 1, padding: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.accent, alignItems: "center" },
  secondaryText: { color: colors.accent, fontWeight: "600" },
});
