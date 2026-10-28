import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Practice } from './src/Practice';
import { findLearner } from './src/data/learners';
import { Conversation, PROFILES } from './src/data/profiles';
import { styles } from './src/styles';

const EMAIL_KEY = 'thrivlingo.email';

type Learner = { name: string; profileId: string; email: string };

export default function App() {
  const [ready, setReady] = useState(false);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [open, setOpen] = useState<Conversation | null>(null);

  // Remember who signed in, so they go straight to their conversations next time.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(EMAIL_KEY);
        const found = saved ? findLearner(saved) : null;
        if (saved && found) setLearner({ ...found, email: saved });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signIn = async (email: string) => {
    const found = findLearner(email);
    if (!found) return false;
    const clean = email.trim().toLowerCase();
    await AsyncStorage.setItem(EMAIL_KEY, clean).catch(() => {});
    setLearner({ ...found, email: clean });
    return true;
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(EMAIL_KEY).catch(() => {});
    setOpen(null);
    setLearner(null);
  };

  let screen = null;
  if (!ready) {
    screen = null;
  } else if (!learner) {
    screen = <SignIn onSignIn={signIn} />;
  } else if (open) {
    screen = <Practice email={learner.email} conversation={open} onBack={() => setOpen(null)} />;
  } else {
    screen = <Home learner={learner} onOpen={setOpen} onSignOut={signOut} />;
  }

  return (
    <View style={styles.root}>
      {screen}
      <StatusBar style="dark" />
    </View>
  );
}

function SignIn({ onSignIn }: { onSignIn: (email: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const ok = await onSignIn(email);
    setError(ok ? '' : "We couldn't find that email. Check it, or ask Rodrigo to add you.");
  };

  return (
    <KeyboardAvoidingView
      style={styles.center}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>Thrivlingo</Text>
      <Text style={styles.tagline}>Real Spanish conversations, 15 minutes at a time.</Text>
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
      <Pressable style={styles.button} onPress={submit}>
        <Text style={styles.buttonText}>Start</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function Home({
  learner,
  onOpen,
  onSignOut,
}: {
  learner: Learner;
  onOpen: (c: Conversation) => void;
  onSignOut: () => void;
}) {
  const profile = PROFILES[learner.profileId];
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={styles.hello}>¡Hola, {learner.name}!</Text>
      <Text style={styles.subtitle}>Pick a conversation to practice today.</Text>
      {profile.conversations.map((c) => (
        <Pressable key={c.id} style={styles.card} onPress={() => onOpen(c)}>
          <Text style={styles.cardTitle}>{c.title}</Text>
          <Text style={styles.cardText}>
            {c.character.name}, {c.character.role}
          </Text>
        </Pressable>
      ))}
      <Pressable onPress={onSignOut}>
        <Text style={styles.link}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
