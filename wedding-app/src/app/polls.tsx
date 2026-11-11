import { Feather } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Button, Card, Eyebrow, GoldRule, IconButton, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Poll } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space } from '@/lib/theme';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

/** The poll as it will look once this vote lands, so the screen changes at once. Choices count from 0. */
function withVote(p: Poll, choice: number): Poll {
  const before = p.my_choice;
  return {
    ...p,
    my_choice: choice,
    total: p.total + (before === null ? 1 : 0),
    options: p.options.map((o, i) => ({ ...o, votes: Math.max(0, o.votes + (i === choice ? 1 : 0) - (i === before ? 1 : 0)) })),
  };
}

const votesLabel = (n: number) => (n === 1 ? t('1 vote') : t('{n} votes', { n }));

// Quick questions from the hosts. Guests tap an answer, then see how everyone
// voted; they can change their mind until the hosts close the poll.
export default function PollsScreen() {
  const { isHost } = useSession();
  const { data, setData, error, loading, reload } = useLoad<Poll[]>(() => api.polls());
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useLive('updates', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function vote(p: Poll, choice: number) {
    if (p.closed || p.my_choice === choice) return;
    setData((list) => (list ? list.map((x) => (x.id === p.id ? withVote(x, choice) : x)) : list));
    try {
      await api.pollVote(p.id, choice);
    } catch (e) {
      tell(errorMessage(e));
    }
    void reload();
  }

  async function setClosed(p: Poll, closed: boolean) {
    setBusy(`${p.id}:close`);
    try {
      await api.pollClose(p.id, closed);
      await reload();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  function remove(p: Poll) {
    confirm(
      t('Delete this poll?'),
      t("The question and everyone's votes will be removed for all guests. This cannot be undone."),
      t('Delete'),
      async () => {
        setBusy(`${p.id}:delete`);
        try {
          await api.pollDelete(p.id);
          await reload();
        } catch (e) {
          tell(errorMessage(e));
        } finally {
          setBusy(null);
        }
      },
    );
  }

  const header = <Stack.Screen options={{ title: t('Polls') }} />;

  if (loading && !data) {
    return (
      <>
        {header}
        <Loading />
      </>
    );
  }
  if (!data) {
    return (
      <>
        {header}
        <Notice
          icon="cloud-off"
          title={t("Can't load the polls")}
          body={error ?? undefined}
          action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
        />
      </>
    );
  }

  const polls = [...data].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)); // newest first

  return (
    <>
      {header}
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.paper }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={96}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
          <Eyebrow>{t('Have your say')}</Eyebrow>
          <Title size={34} style={{ marginTop: 2 }}>
            {t('Polls')}
          </Title>
          <Body muted style={{ marginTop: 4 }}>
            {t('Quick questions from Kashika & Arjun. Tap an answer to vote.')}
          </Body>

          {isHost ? <AskForm onSent={reload} /> : null}

          {polls.length === 0 ? (
            <Card style={{ marginTop: space.lg }}>
              <Body muted>
                {isHost
                  ? t('No polls yet. Ask your first question above.')
                  : t('No polls yet. When Kashika & Arjun ask a question, it will appear here.')}
              </Body>
            </Card>
          ) : null}

          {polls.map((p) => (
            <PollCard
              key={p.id}
              poll={p}
              isHost={isHost}
              busy={busy}
              onVote={(choice) => void vote(p, choice)}
              onSetClosed={(closed) => void setClosed(p, closed)}
              onDelete={() => remove(p)}
            />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function PollCard({
  poll,
  isHost,
  busy,
  onVote,
  onSetClosed,
  onDelete,
}: {
  poll: Poll;
  isHost: boolean;
  busy: string | null;
  onVote: (choice: number) => void;
  onSetClosed: (closed: boolean) => void;
  onDelete: () => void;
}) {
  const voted = poll.my_choice !== null;
  // Guests see how everyone voted once they have voted themselves, or when the poll is closed. Hosts always do.
  const showResults = poll.closed || voted || isHost;

  return (
    <Card style={{ marginTop: space.lg }}>
      <View style={styles.pollHead}>
        {poll.closed ? (
          <View style={styles.closedPill}>
            <Feather name="lock" size={14} color={colors.ink} />
            <Text style={styles.closedText}>{t('Closed')}</Text>
          </View>
        ) : (
          <Eyebrow>{t('Open poll')}</Eyebrow>
        )}
      </View>
      <Title size={26} style={{ marginTop: 4 }}>
        {poll.question}
      </Title>
      <Body muted style={styles.hint}>
        {poll.closed
          ? t('This poll is closed. Here is how everyone voted.')
          : voted
            ? t('Tap another answer to change your vote.')
            : t('Tap your answer.')}
      </Body>

      {poll.options.map((o, i) => {
        const mine = poll.my_choice === i;

        if (!showResults) {
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={t('Vote for {option}', { option: o.text })}
              onPress={() => onVote(i)}
              style={({ pressed }) => [styles.option, pressed && { opacity: 0.8 }]}>
              <Text style={styles.optionText}>{o.text}</Text>
            </Pressable>
          );
        }

        const percent = poll.total > 0 ? Math.round((o.votes / poll.total) * 100) : 0;
        const said = { option: o.text, percent, votes: votesLabel(o.votes) };
        return (
          <Pressable
            key={i}
            accessibilityRole={poll.closed ? 'text' : 'button'}
            accessibilityState={{ selected: mine, disabled: poll.closed }}
            accessibilityLabel={mine ? t('{option}, {percent} percent, {votes}, your choice', said) : t('{option}, {percent} percent, {votes}', said)}
            disabled={poll.closed}
            onPress={() => onVote(i)}
            style={({ pressed }) => [styles.option, mine && styles.optionMine, pressed && { opacity: 0.8 }]}>
            <View style={[styles.fill, mine && styles.fillMine, { width: `${percent}%` }]} />
            {mine ? <Feather name="check-circle" size={20} color={colors.rose} /> : null}
            <Text style={[styles.optionText, mine && { fontFamily: fonts.bodyBold }]}>{o.text}</Text>
            <View style={styles.numbers}>
              <Text style={styles.percent}>{percent}%</Text>
              <Text style={styles.count}>{votesLabel(o.votes)}</Text>
            </View>
          </Pressable>
        );
      })}

      {showResults ? (
        <Text style={styles.total}>{poll.total === 0 ? t('No votes yet') : t('Total: {votes}', { votes: votesLabel(poll.total) })}</Text>
      ) : null}

      {isHost ? (
        <View style={styles.hostRow}>
          <Button
            label={poll.closed ? t('Reopen poll') : t('Close poll')}
            icon={poll.closed ? 'unlock' : 'lock'}
            variant="quiet"
            busy={busy === `${poll.id}:close`}
            disabled={busy !== null}
            onPress={() => onSetClosed(!poll.closed)}
            style={styles.smallButton}
          />
          <Button
            label={t('Delete')}
            icon="trash-2"
            variant="ghost"
            busy={busy === `${poll.id}:delete`}
            disabled={busy !== null}
            onPress={onDelete}
            style={styles.smallButton}
          />
        </View>
      ) : null}
    </Card>
  );
}

/** Hosts only: a question with two to six answers. Sending it notifies every phone. */
function AskForm({ onSent }: { onSent: () => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [busy, setBusy] = useState(false);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim().length >= 3 && filled.length >= MIN_OPTIONS;
  const examples = [t('e.g. Chai'), t('e.g. Coffee'), t('e.g. Both!')];

  async function create() {
    setBusy(true);
    try {
      await api.pollCreate(question.trim(), filled);
      setQuestion('');
      setOptions(['', '']);
      setOpen(false);
      await onSent();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function send() {
    if (!valid || busy) return;
    confirm(t('Send this question to everyone?'), t("Every guest's phone will get a notification with your question."), t('Send'), () => void create());
  }

  if (!open) {
    return <Button label={t('Ask everyone a question')} icon="plus" variant="quiet" onPress={() => setOpen(true)} style={{ marginTop: space.lg }} />;
  }

  return (
    <>
      <View style={styles.section}>
        <Eyebrow color={colors.rose}>{t('Ask everyone a question')}</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      <Card tone="blush">
        <Text style={styles.label}>{t('Your question')}</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t('e.g. Chai or coffee in the morning?')}
          placeholderTextColor="#A08E94"
          maxLength={200}
          multiline
          style={[styles.field, styles.fieldTall]}
          accessibilityLabel={t('Your question')}
        />

        <Text style={[styles.label, { marginTop: space.lg }]}>{t('The answers')}</Text>
        <Body muted style={{ fontSize: 14.5, marginBottom: 2 }}>
          {t('Two to six answers. Guests tap one.')}
        </Body>
        {options.map((o, i) => (
          <View key={i} style={styles.optRow}>
            <TextInput
              value={o}
              onChangeText={(text) => setOptions((list) => list.map((x, j) => (j === i ? text : x)))}
              placeholder={examples[i] ?? t('e.g. Another answer')}
              placeholderTextColor="#A08E94"
              maxLength={80}
              style={[styles.field, { flex: 1 }]}
              accessibilityLabel={t('Answer {n}', { n: i + 1 })}
            />
            {options.length > MIN_OPTIONS ? (
              <IconButton
                icon="x"
                label={t('Remove answer {n}', { n: i + 1 })}
                color={colors.muted}
                onPress={() => setOptions((list) => list.filter((_, j) => j !== i))}
              />
            ) : null}
          </View>
        ))}
        {options.length < MAX_OPTIONS ? (
          <Button
            label={t('Add another answer')}
            icon="plus"
            variant="ghost"
            onPress={() => setOptions((list) => (list.length < MAX_OPTIONS ? [...list, ''] : list))}
            style={{ alignSelf: 'flex-start', marginLeft: -space.md, marginTop: 4 }}
          />
        ) : null}

        <Button label={t('Send to everyone')} icon="send" busy={busy} disabled={!valid} onPress={send} style={{ marginTop: space.md }} />
        <Button label={t('Cancel')} variant="ghost" disabled={busy} onPress={() => setOpen(false)} style={{ marginTop: 4, minHeight: 48 }} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  pollHead: { flexDirection: 'row', alignItems: 'center', minHeight: 26 },
  closedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.moss,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  closedText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  hint: { fontSize: 15, marginTop: 4, marginBottom: 4 },
  option: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  optionMine: { borderColor: colors.rose, borderWidth: 1.5 },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 18, lineHeight: 24, color: colors.ink, flex: 1 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.moss },
  fillMine: { backgroundColor: colors.blush },
  numbers: { alignItems: 'flex-end', minWidth: 64 },
  percent: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  count: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  total: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.muted, marginTop: space.md },
  hostRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  smallButton: { minHeight: 46, paddingHorizontal: space.lg },
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink, marginBottom: 6 },
  field: {
    minHeight: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  fieldTall: { minHeight: 64, paddingTop: space.md, paddingBottom: space.md, textAlignVertical: 'top' },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.sm },
});
