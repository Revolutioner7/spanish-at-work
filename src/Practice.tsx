// One voice conversation with a character, followed by a short review.
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { ChatReply, Review, Turn, getReview, nextLine } from './api';
import { Conversation } from './data/profiles';
import { colors, styles } from './styles';

const LANG = 'es-MX';
const MAX_LEARNER_TURNS = 12; // keeps a session around 10 to 15 minutes

type Line = Turn & { translation?: string };

export function Practice({
  email,
  conversation,
  onBack,
}: {
  email: string;
  conversation: Conversation;
  onBack: () => void;
}) {
  const opening: Line[] = [{ role: 'character', text: conversation.opener }];
  const [lines, setLines] = useState<Line[]>(opening);
  const [listening, setListening] = useState(false);
  const [live, setLive] = useState('');
  const [thinking, setThinking] = useState(false);
  const [suggestion, setSuggestion] = useState<ChatReply['suggestion']>();
  const [showHint, setShowHint] = useState(false);
  const [shownTranslation, setShownTranslation] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState('');

  const heard = useRef('');
  const voice = useRef<string | undefined>(undefined);
  const linesRef = useRef<Line[]>(opening);

  // Keeps the latest conversation available to event handlers.
  const updateLines = (next: Line[]) => {
    linesRef.current = next;
    setLines(next);
  };

  const say = (text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: LANG,
      voice: voice.current,
      rate: 0.85,
      useApplicationAudioSession: true,
    });
  };

  const send = async (text: string) => {
    const withLearner: Line[] = [...linesRef.current, { role: 'learner', text }];
    updateLines(withLearner);
    setThinking(true);
    try {
      const r = await nextLine(email, conversation, withLearner);
      updateLines([
        ...withLearner,
        { role: 'character', text: r.reply, translation: r.translation },
      ]);
      setSuggestion(r.suggestion);
      say(r.reply);
      const learnerTurns = withLearner.filter((l) => l.role === 'learner').length;
      if (r.done || learnerTurns >= MAX_LEARNER_TURNS) setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setThinking(false);
    }
  };

  // Restart the scene from the character's opening line.
  const restart = () => {
    updateLines(opening);
    setDone(false);
    setReview(null);
    setSuggestion(undefined);
    setShowHint(false);
    setShownTranslation(null);
    setError('');
    say(conversation.opener);
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'ios') {
        // Lets the character be heard even with the phone on silent.
        try {
          ExpoSpeechRecognitionModule.setCategoryIOS({
            category: 'playAndRecord',
            categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
            mode: 'default',
          });
        } catch {
          // Not critical.
        }
      }
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const mx = voices.filter((v) => v.language === LANG);
        const best = mx.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? mx[0];
        voice.current = best?.identifier;
      } catch {
        // The default system voice is fine.
      }
      say(conversation.opener);
    })();
    return () => {
      Speech.stop();
      ExpoSpeechRecognitionModule.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results[0]?.transcript ?? '';
    heard.current = text;
    setLive(text);
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const text = heard.current.trim();
    heard.current = '';
    setLive('');
    if (text) send(text);
  });

  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if (e.error === 'not-allowed') {
      setError('Thrivlingo needs the microphone and speech recognition. Allow them in Settings.');
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      setError("Sorry, I couldn't hear that. Try again.");
    }
  });

  const toggleMic = async () => {
    setError('');
    if (listening) {
      ExpoSpeechRecognitionModule.stop(); // the 'end' event sends what was heard
      return;
    }
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Thrivlingo needs the microphone and speech recognition. Allow them in Settings.');
      return;
    }
    Speech.stop();
    heard.current = '';
    setShowHint(false);
    setListening(true);
    ExpoSpeechRecognitionModule.start({ lang: LANG, interimResults: true, continuous: true });
  };

  const finish = async () => {
    Speech.stop();
    ExpoSpeechRecognitionModule.abort();
    setThinking(true);
    setError('');
    try {
      setReview(await getReview(email, conversation, linesRef.current));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setThinking(false);
    }
  };

  const learnerSpoke = lines.some((l) => l.role === 'learner');

  if (review) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.hello}>Your review</Text>
        <View style={styles.goodBox}>
          <Text style={styles.label}>What went well</Text>
          <Text style={styles.body}>{review.wellDone}</Text>
        </View>
        {review.corrections.length === 0 ? (
          <Text style={styles.body}>Nothing to fix this time. ¡Muy bien!</Text>
        ) : (
          review.corrections.map((c, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.said}>{c.said}</Text>
              <Pressable onPress={() => say(c.better)}>
                <Text style={styles.better}>{c.better}  🔊</Text>
              </Pressable>
              <Text style={styles.cardText}>{c.why}</Text>
            </View>
          ))
        )}
        <Pressable style={styles.button} onPress={restart}>
          <Text style={styles.buttonText}>Try this conversation again</Text>
        </Pressable>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>Back to all conversations</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={onBack}>
          <Text style={styles.link}>‹ Back</Text>
        </Pressable>
        <Text style={styles.hello}>{conversation.title}</Text>
        <Text style={styles.body}>{conversation.situation}</Text>
        <Text style={styles.goal}>Goal: {conversation.goal}</Text>

        {lines.map((l, i) =>
          l.role === 'character' ? (
            <Pressable
              key={i}
              style={styles.bubble}
              onPress={() => setShownTranslation(shownTranslation === i ? null : i)}
            >
              <Text style={styles.bubbleName}>{conversation.character.name}</Text>
              <Text style={styles.bubbleText}>{l.text}</Text>
              {shownTranslation === i && l.translation ? (
                <Text style={styles.translation}>{l.translation}</Text>
              ) : null}
            </Pressable>
          ) : (
            <View key={i} style={styles.mine}>
              <Text style={styles.mineText}>{l.text}</Text>
            </View>
          ),
        )}

        {listening ? (
          <View style={styles.mine}>
            <Text style={styles.mineText}>{live || 'Listening…'}</Text>
          </View>
        ) : null}
        {thinking ? <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} /> : null}
        {showHint && suggestion ? (
          <View style={styles.hint}>
            <Text style={styles.bubbleText}>{suggestion.es}</Text>
            <Text style={styles.translation}>{suggestion.en}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {done ? (
          <Text style={styles.goodNote}>Nice work, you made it. Tap the review button below.</Text>
        ) : null}
        <Text style={styles.note}>Tap a bubble to see it in English.</Text>
      </ScrollView>

      {learnerSpoke ? (
        <Pressable
          style={[styles.finish, done && styles.finishReady]}
          onPress={finish}
          disabled={thinking || listening}
        >
          <Text style={[styles.finishText, done && styles.finishTextReady]}>
            Finish and see my review
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.controls}>
        <Pressable
          style={styles.smallButton}
          onPress={() => {
            const last = [...lines].reverse().find((l) => l.role === 'character');
            if (last) say(last.text);
          }}
        >
          <Text style={styles.smallButtonText}>Repeat</Text>
        </Pressable>
        <Pressable
          style={[styles.mic, listening && styles.micOn]}
          onPress={toggleMic}
          disabled={thinking}
        >
          <Text style={styles.micText}>{listening ? 'Send' : 'Speak'}</Text>
        </Pressable>
        <Pressable
          style={[styles.smallButton, !suggestion && styles.disabled]}
          onPress={() => setShowHint(!showHint)}
          disabled={!suggestion}
        >
          <Text style={styles.smallButtonText}>Hint</Text>
        </Pressable>
      </View>
    </View>
  );
}
