import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Updates from "expo-updates";
import Constants from "expo-constants";
import { getSetting, setSetting } from "../db";
import { learner } from "../learners";
import { colors, gap, radius } from "../theme";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function Settings({ onBack, onSignOut }: { onBack: () => void; onSignOut: () => void }) {
  const [listening, setListening] = useState(getSetting("level_listening", "A1 (estimated)").slice(0, 2));
  const [speaking, setSpeaking] = useState(getSetting("level_speaking", "A1 (estimated)").slice(0, 2));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={onBack} hitSlop={12}>
        <Text style={styles.back}>‹ Home</Text>
      </Pressable>
      <Text style={styles.title}>My level</Text>
      <Text style={styles.subtitle}>Pick roughly where you are. The characters adjust their Spanish to your listening level.</Text>

      <LevelPicker
        label="Listening"
        value={listening}
        onChange={(v) => {
          setListening(v);
          setSetting("level_listening", v);
        }}
      />
      <LevelPicker
        label="Speaking"
        value={speaking}
        onChange={(v) => {
          setSpeaking(v);
          setSetting("level_speaking", v);
        }}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.subtitle}>{learner().email}</Text>
        <Pressable style={styles.ghost} onPress={onSignOut}>
          <Text style={styles.ghostText}>Sign out</Text>
        </Pressable>
      </View>

      <Text style={styles.version}>
        Thrivlingo {Constants.expoConfig?.version ?? "?"} · {Updates.isEmbeddedLaunch ? "installed version" : `update ${(Updates.updateId ?? "").slice(0, 8)}`}
        {Updates.createdAt ? ` from ${Updates.createdAt.toLocaleDateString("en-US")}` : ""} · channel {Updates.channel ?? "–"}
      </Text>
    </ScrollView>
  );
}

function LevelPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {LEVELS.map((l) => (
          <Pressable key={l} style={[styles.chip, value === l && styles.chipOn]} onPress={() => onChange(l)}>
            <Text style={[styles.chipText, value === l && { color: "#fff" }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gap, paddingTop: 64, paddingBottom: 48, gap: 12 },
  back: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  version: { fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 8 },
  subtitle: { fontSize: 15, color: colors.muted, lineHeight: 21 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  label: { fontSize: 13, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  row: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.accent, alignItems: "center" },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.accent, fontWeight: "700" },
  ghost: { borderRadius: 12, borderWidth: 1, borderColor: colors.accent, padding: 12, alignItems: "center" },
  ghostText: { color: colors.accent, fontWeight: "600" },
});
