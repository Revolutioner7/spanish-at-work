import React, { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { applyUpdateIfAvailable } from "./src/updates";
import { colors, gap, radius } from "./src/theme";
import { CharacterId } from "./src/brain/characters";
import { findLearner, setLearner } from "./src/learners";
import { claimDeviceFor, savedEmail, signOut } from "./src/db";
import Home from "./src/screens/Home";
import Conversation, { ConversationResult } from "./src/screens/Conversation";
import Debrief from "./src/screens/Debrief";
import ErrorBook from "./src/screens/ErrorBook";
import Settings from "./src/screens/Settings";
import Monologue from "./src/screens/Monologue";
import WordGame from "./src/screens/WordGame";
import ClozeGame from "./src/screens/ClozeGame";

type Route =
  | { name: "signin" }
  | { name: "home" }
  | { name: "conversation"; characterId: CharacterId; tappaId?: string; key: number }
  | { name: "debrief"; result: ConversationResult }
  | { name: "errors" }
  | { name: "settings" }
  | { name: "monologue"; key: number }
  | { name: "game"; key: number }
  | { name: "cloze"; key: number };

/** Si ya había entrado antes, va directo a su recorrido. */
function initialRoute(): Route {
  const email = savedEmail();
  const found = email ? findLearner(email) : null;
  if (found) {
    setLearner(found);
    return { name: "home" };
  }
  return { name: "signin" };
}

export default function App() {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [homeKey, setHomeKey] = useState(0);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    applyUpdateIfAvailable(() => setUpdating(true));
  }, []);

  const goHome = () => {
    setHomeKey((k) => k + 1); // refresca las estadísticas del inicio
    setRoute({ name: "home" });
  };
  const startConversation = (characterId: CharacterId, tappaId?: string) => setRoute({ name: "conversation", characterId, tappaId, key: Date.now() });

  let screen: React.ReactNode;
  switch (route.name) {
    case "signin":
      screen = <SignIn onDone={goHome} />;
      break;
    case "home":
      screen = (
        <Home
          key={homeKey}
          onStart={startConversation}
          onMonologue={() => setRoute({ name: "monologue", key: Date.now() })}
          onGame={() => setRoute({ name: "game", key: Date.now() })}
          onCloze={() => setRoute({ name: "cloze", key: Date.now() })}
          onErrors={() => setRoute({ name: "errors" })}
          onSettings={() => setRoute({ name: "settings" })}
        />
      );
      break;
    case "conversation":
      screen = (
        <Conversation
          key={route.key}
          characterId={route.characterId}
          tappaId={route.tappaId}
          onFinish={(result) => setRoute({ name: "debrief", result })}
          onCancel={goHome}
        />
      );
      break;
    case "debrief":
      screen = <Debrief result={route.result} onRepeat={() => startConversation(route.result.characterId, route.result.tappaId)} onHome={goHome} onNext={goHome} />;
      break;
    case "errors":
      screen = <ErrorBook onBack={goHome} />;
      break;
    case "settings":
      screen = (
        <Settings
          onBack={goHome}
          onSignOut={() => {
            signOut();
            setLearner(null);
            setRoute({ name: "signin" });
          }}
        />
      );
      break;
    case "monologue":
      screen = <Monologue key={route.key} onBack={goHome} />;
      break;
    case "game":
      screen = <WordGame key={route.key} onBack={goHome} />;
      break;
    case "cloze":
      screen = <ClozeGame key={route.key} onBack={goHome} />;
      break;
  }

  if (updating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, gap: 12 }}>
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.muted, fontSize: 16 }}>Updating Thrivlingo…</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {screen}
    </>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const found = findLearner(email);
    if (!found) {
      setError("We couldn't find that email. Check it, or ask Rodrigo to add you.");
      return;
    }
    claimDeviceFor(found.email);
    setLearner(found);
    onDone();
  };

  return (
    <KeyboardAvoidingView style={styles.signin} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.brand}>Thrivlingo</Text>
      <Text style={styles.tagline}>Real Spanish conversations, a few minutes a day.</Text>
      <TextInput
        style={styles.input}
        placeholder="Your work email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        onSubmitEditing={submit}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={submit}>
        <Text style={styles.primaryText}>Start</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  signin: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.bg, gap: 12 },
  brand: { fontSize: 40, fontWeight: "700", color: colors.accent, letterSpacing: -1 },
  tagline: { fontSize: 17, color: colors.muted, marginBottom: 12 },
  input: { backgroundColor: colors.card, borderRadius: radius, borderWidth: 1, borderColor: colors.line, padding: gap, fontSize: 17, color: colors.ink },
  error: { color: colors.danger },
  primary: { backgroundColor: colors.accent, borderRadius: radius, padding: 16, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
