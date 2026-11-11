import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body } from '@/components/ui';
import { type PhotoGoal as Goal } from '@/lib/api';
import { colors, fonts, radius, space } from '@/lib/theme';

// Gold, silver, bronze for 1st, 2nd and 3rd.
const MEDALS = ['#B89451', '#9BA0A6', '#B0815A'];
const PLACES = ['1st place', '2nd place', '3rd place'];

/**
 * The album's nudge: how close you are to the photo goal, a badge once you get
 * there, and (on tap) the people who have added the most.
 */
export function PhotoGoal({ goal }: { goal: Goal }) {
  // The leaderboard is open to begin with: seeing who's ahead is the point.
  const [open, setOpen] = useState(true);
  const done = goal.mine >= goal.goal;
  const left = Math.max(goal.goal - goal.mine, 0);
  const pct = Math.min(100, Math.round((goal.mine / goal.goal) * 100));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={
        done
          ? `You have added ${goal.mine} photos and earned the Wedding Photographer badge`
          : `You have added ${goal.mine} of ${goal.goal} photos. ${left} to go for the Wedding Photographer badge`
      }
      onPress={() => setOpen((v) => !v)}
      style={[styles.card, done && styles.cardDone]}>
      <View style={styles.head}>
        <View style={[styles.badge, done && styles.badgeDone]}>
          <Feather name={done ? 'award' : 'camera'} size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{done ? 'Wedding Photographer' : `${goal.mine} of ${goal.goal} photos`}</Text>
          <Body muted style={styles.small}>
            {done
              ? `You've added ${goal.mine}. The album is richer for it. Keep going!`
              : goal.mine === 0
                ? `Add ${goal.goal} photos to the album to earn your Wedding Photographer badge.`
                : `${left} more for your Wedding Photographer badge.`}
          </Body>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }, done && { backgroundColor: colors.gold }]} />
      </View>

      {open ? (
        <View style={{ marginTop: space.md }}>
          <Text style={styles.boardTitle}>Most photos so far</Text>
          {goal.top.length === 0 ? (
            <Body muted style={styles.small}>
              No photos yet. Be the first on the board.
            </Body>
          ) : (
            goal.top.map((t, i) => (
              <View key={`${t.name}-${i}`} style={styles.row}>
                {i < 3 ? (
                  <View style={[styles.medal, { backgroundColor: MEDALS[i] }]} accessibilityLabel={PLACES[i]}>
                    <Text style={styles.medalText}>{i + 1}</Text>
                  </View>
                ) : (
                  <Text style={styles.rank}>{i + 1}</Text>
                )}
                <Text style={[styles.name, t.me && { fontFamily: fonts.bodyBold }]} numberOfLines={1}>
                  {t.name}
                  {t.me ? ' (you)' : ''}
                  {i < 3 ? <Text style={styles.lead}>  ·  {PLACES[i]}</Text> : null}
                </Text>
                {t.count >= goal.goal ? <Feather name="award" size={15} color={colors.gold} /> : null}
                <Text style={styles.count}>{t.count}</Text>
              </View>
            ))
          )}
          {goal.prize ? <Body style={[styles.small, { marginTop: 6, color: colors.rose }]}>{goal.prize}</Body> : null}
          <Body muted style={[styles.small, { marginTop: 6 }]}>
            Camera shots and photos added from your phone both count. {goal.reached}{' '}
            {goal.reached === 1 ? 'person has' : 'people have'} earned the badge so far.
          </Body>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  cardDone: { borderColor: colors.gold },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  badgeDone: { backgroundColor: colors.gold },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  small: { fontSize: 14, lineHeight: 20 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.moss, overflow: 'hidden', marginTop: space.md },
  fill: { height: 6, backgroundColor: colors.rose },
  medal: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  medalText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white },
  boardTitle: { fontFamily: fonts.bodyMedium, fontSize: 11.5, letterSpacing: 2, textTransform: 'uppercase', color: colors.olive, marginBottom: 4 },
  lead: { fontFamily: fonts.body, fontSize: 13, color: colors.rose },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 34 },
  rank: { fontFamily: fonts.displayMedium, fontSize: 20, color: colors.olive, width: 22, textAlign: 'center' },
  name: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  count: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, minWidth: 28, textAlign: 'right' },
});
