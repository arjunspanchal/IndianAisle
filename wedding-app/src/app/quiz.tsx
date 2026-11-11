import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Quiz, type QuizQuestion } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';

// "How well do you know us?" The couple write the questions; guests get one go
// at each, see the right answer straight away, and climb a small leaderboard.
export default function QuizScreen() {
  const { isHost } = useSession();
  const { data, setData, error, loading, reload } = useLoad<Quiz>(() => api.quiz());
  const [refreshing, setRefreshing] = useState(false);

  useLive('quiz', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function answer(q: QuizQuestion, choice: number) {
    if (q.choice !== null) return;
    try {
      const r = await api.quizAnswer(q.id, choice);
      setData((d) => (d ? { ...d, questions: d.questions.map((x) => (x.id === q.id ? { ...x, choice: r.choice, answer: r.answer } : x)) } : d));
      void reload();
    } catch (e) {
      tell(errorMessage(e));
    }
  }

  function remove(q: QuizQuestion) {
    confirm('Remove this question?', "Guests' answers to it will no longer count.", 'Remove', async () => {
      try {
        await api.quizDelete(q.id);
        await reload();
      } catch (e) {
        tell(errorMessage(e));
      }
    });
  }

  if (loading && !data) return <Loading />;
  if (!data) return <Notice icon="cloud-off" title="Can't load the quiz" body={error ?? undefined} action={<Button label="Try again" variant="quiet" onPress={() => void reload()} />} />;

  const answered = data.questions.filter((q) => q.choice !== null);
  const score = answered.filter((q) => q.choice === q.answer).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={96}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
        <Eyebrow>These two kids are getting married</Eyebrow>
        <Title size={34} style={{ marginTop: 2 }}>
          How well do you know us?
        </Title>
        {data.questions.length > 0 ? (
          <Body muted style={{ marginTop: 4 }}>
            You've answered {answered.length} of {data.questions.length}
            {answered.length > 0 ? ` and got ${score} right` : ''}. One go at each.
          </Body>
        ) : null}

        {data.questions.length === 0 ? (
          <Card style={{ marginTop: space.lg }}>
            <Body muted>{isHost ? 'No questions yet. Add your first one below.' : 'The couple are still writing the questions. Check back soon.'}</Body>
          </Card>
        ) : null}

        {data.questions.map((q, i) => (
          <Card key={q.id} style={{ marginTop: space.lg }}>
            <View style={styles.qHead}>
              <Eyebrow>Question {i + 1}</Eyebrow>
              <View style={{ flex: 1 }} />
              {isHost ? <IconButton icon="trash-2" label="Remove question" size={18} color={colors.muted} onPress={() => remove(q)} /> : null}
            </View>
            <Title size={24} style={{ marginBottom: space.md }}>
              {q.prompt}
            </Title>
            {q.options.map((opt, idx) => {
              const n = idx + 1;
              const done = q.choice !== null;
              const right = q.answer === n && (done || isHost);
              const wrong = done && q.choice === n && q.answer !== n;
              return (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt}${right ? ', correct answer' : wrong ? ', your answer, not right' : ''}`}
                  disabled={done}
                  onPress={() => void answer(q, n)}
                  style={({ pressed }) => [styles.option, right && styles.optionRight, wrong && styles.optionWrong, pressed && { opacity: 0.8 }]}>
                  <Text style={styles.optionText}>{opt}</Text>
                  {right ? <Feather name="check" size={20} color={colors.ink} /> : wrong ? <Feather name="x" size={20} color={colors.rose} /> : null}
                </Pressable>
              );
            })}
          </Card>
        ))}

        {data.leaderboard.length > 0 ? (
          <>
            <View style={styles.sectionHead}>
              <Eyebrow>Leaderboard</Eyebrow>
              <GoldRule style={{ flex: 1, marginLeft: space.md }} />
            </View>
            <Card tone="sage">
              {data.leaderboard.map((row, i) => (
                <View key={`${row.name}-${i}`} style={styles.leader}>
                  <Text style={styles.rank}>{i + 1}</Text>
                  <Text style={[styles.leaderName, row.me && { fontFamily: fonts.bodyBold }]} numberOfLines={1}>
                    {row.name}
                    {row.me ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.leaderScore}>{row.score}</Text>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {isHost ? <NewQuestion onSaved={reload} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Hosts only: write a question, 2 to 4 answers, and tap the right one. */
function NewQuestion({ onSaved }: { onSaved: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [answer, setAnswer] = useState(0);
  const [busy, setBusy] = useState(false);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const answerText = options[answer]?.trim() ?? '';
  const valid = prompt.trim().length >= 3 && filled.length >= 2 && answerText.length > 0;

  async function save() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await api.quizSave(prompt.trim(), filled, filled.indexOf(answerText) + 1);
      setPrompt('');
      setOptions(['', '', '', '']);
      setAnswer(0);
      onSaved();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.sectionHead}>
        <Eyebrow>Add a question</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      <Card tone="blush">
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Who said I love you first?"
          placeholderTextColor="#A08E94"
          maxLength={200}
          style={styles.field}
          accessibilityLabel="Question"
        />
        <Body muted style={{ fontSize: 14, marginTop: space.md, marginBottom: 6 }}>
          Two to four answers. Tap the circle next to the right one.
        </Body>
        {options.map((o, i) => (
          <View key={i} style={styles.optRow}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: answer === i }}
              accessibilityLabel={`Mark answer ${i + 1} as correct`}
              hitSlop={8}
              onPress={() => setAnswer(i)}
              style={[styles.radio, answer === i && styles.radioOn]}>
              {answer === i ? <Feather name="check" size={16} color={colors.white} /> : null}
            </Pressable>
            <TextInput
              value={o}
              onChangeText={(t) => setOptions((all) => all.map((x, j) => (j === i ? t : x)))}
              placeholder={`Answer ${i + 1}${i > 1 ? ' (optional)' : ''}`}
              placeholderTextColor="#A08E94"
              maxLength={80}
              style={[styles.field, { flex: 1 }]}
              accessibilityLabel={`Answer ${i + 1}`}
            />
          </View>
        ))}
        <Button label="Add question" icon="plus" onPress={save} busy={busy} disabled={!valid} style={{ marginTop: space.md }} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  qHead: { flexDirection: 'row', alignItems: 'center', minHeight: 30, marginBottom: 2 },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginTop: space.sm,
  },
  optionRight: { backgroundColor: colors.moss, borderColor: colors.olive },
  optionWrong: { backgroundColor: colors.blush, borderColor: colors.rose },
  optionText: { fontFamily: fonts.body, fontSize: 17, color: colors.ink, flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  leader: { flexDirection: 'row', alignItems: 'center', minHeight: 40, gap: space.md },
  rank: { fontFamily: fonts.displayMedium, fontSize: 22, color: colors.olive, width: 24, textAlign: 'center' },
  leaderName: { fontFamily: fonts.body, fontSize: 16.5, color: colors.ink, flex: 1 },
  leaderScore: { fontFamily: fonts.bodyBold, fontSize: 16.5, color: colors.ink },
  field: {
    minHeight: 50,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  radio: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.rose, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.rose },
});
