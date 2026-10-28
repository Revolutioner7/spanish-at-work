import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { findLearner } from './src/data/learners';
import { Conversation, PROFILES } from './src/data/profiles';

type Learner = { name: string; profileId: string };

export default function App() {
  const [learner, setLearner] = useState<Learner | null>(null);
  const [open, setOpen] = useState<Conversation | null>(null);

  let screen;
  if (!learner) {
    screen = <SignIn onSignIn={setLearner} />;
  } else if (open) {
    screen = <ConversationIntro conversation={open} onBack={() => setOpen(null)} />;
  } else {
    screen = (
      <Home
        learner={learner}
        onOpen={setOpen}
        onSignOut={() => setLearner(null)}
      />
    );
  }

  return (
    <View style={styles.root}>
      {screen}
      <StatusBar style="dark" />
    </View>
  );
}

function SignIn({ onSignIn }: { onSignIn: (l: Learner) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    const found = findLearner(email);
    if (found) {
      setError('');
      onSignIn(found);
    } else {
      setError("We couldn't find that email. Check it, or ask Rodrigo to add you.");
    }
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

function ConversationIntro({
  conversation,
  onBack,
}: {
  conversation: Conversation;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Pressable onPress={onBack}>
        <Text style={styles.link}>‹ Back</Text>
      </Pressable>
      <Text style={styles.hello}>{conversation.title}</Text>
      <Text style={styles.label}>Where you are</Text>
      <Text style={styles.body}>{conversation.situation}</Text>
      <Text style={styles.label}>Who you talk to</Text>
      <Text style={styles.body}>
        {conversation.character.name}, {conversation.character.role}
      </Text>
      <Text style={styles.label}>Your goal</Text>
      <Text style={styles.body}>{conversation.goal}</Text>
      <View style={styles.bubble}>
        <Text style={styles.bubbleName}>{conversation.character.name}</Text>
        <Text style={styles.bubbleText}>{conversation.opener}</Text>
      </View>
      <Text style={styles.note}>Voice conversation coming in the next version.</Text>
    </ScrollView>
  );
}

const ink = '#1d2433';
const accent = '#1f7a5c';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf8f4' },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  page: { padding: 24, paddingTop: 72, gap: 12 },
  brand: { fontSize: 36, fontWeight: '700', color: accent, marginBottom: 4 },
  tagline: { fontSize: 16, color: ink, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#d9d4ca',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: ink,
  },
  error: { color: '#b3261e', marginTop: 8 },
  button: {
    backgroundColor: accent,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  hello: { fontSize: 28, fontWeight: '700', color: ink },
  subtitle: { fontSize: 16, color: ink, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ece7dd',
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: ink },
  cardText: { fontSize: 14, color: '#5b6272', marginTop: 4 },
  link: { color: accent, fontSize: 16, paddingVertical: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#5b6272', marginTop: 8 },
  body: { fontSize: 16, color: ink },
  bubble: {
    backgroundColor: '#e6f2ed',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  bubbleName: { fontSize: 13, fontWeight: '600', color: accent, marginBottom: 4 },
  bubbleText: { fontSize: 18, color: ink },
  note: { fontSize: 13, color: '#5b6272', marginTop: 8 },
});
