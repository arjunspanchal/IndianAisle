import { Feather } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Accent, Body, Button, Card, Eyebrow, GoldRule, Loading, Notice, Title } from '@/components/ui';
import { api, errorMessage, type Home, type Outfit, type WeddingEvent } from '@/lib/api';
import { tell } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useLive, useLoad } from '@/lib/live';
import { colour, PALETTE } from '@/lib/outfits';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';
import { formatDayShort, istDayKey } from '@/lib/time';

const MAX_GUEST_COLOURS = 6;

function outfitOf(e: WeddingEvent): Outfit {
  return {
    in_outfits: e.in_outfits ?? false,
    setting: e.setting ?? '',
    dress_code: e.dress_code ?? '',
    dress: e.dress ?? '',
    guest_colours: e.guest_colours ?? [],
    bride_colour: e.bride_colour ?? '',
    groom_colour: e.groom_colour ?? '',
  };
}

const hasDetails = (o: Outfit) =>
  !!(o.setting || o.dress_code || o.dress || o.guest_colours.length || o.bride_colour || o.groom_colour);

/** "Sun 17 Jan · 3:00 pm onwards" for an event: the day, month and "onwards" are translated, the clock time is not. */
function whenOf(e: WeddingEvent): string {
  const [weekday, date, month] = formatDayShort(istDayKey(e.starts_at)).split(' ');
  const day = t('{weekday} {date} {month}', { weekday: t(weekday), date, month: t(month) });
  const time = e.time_label.endsWith(' onwards') ? `${e.time_label.slice(0, -' onwards'.length)} ${t('onwards')}` : e.time_label;
  return `${day} · ${time}`;
}

// The outfits guide: one card per celebration, saying where it is held, whether
// there is a colour code, colours to wear, and what the bride and groom are
// wearing. The hosts fill it in here; guests see "coming soon" until they do.
export default function Outfits() {
  const { isHost } = useSession();
  const { data, error, loading, reload } = useLoad<Home>(() => api.home(), 120000);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useLive('updates', () => void reload());

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  async function addToGuide(e: WeddingEvent) {
    setBusy(e.id);
    try {
      await api.setOutfit(e.id, { ...outfitOf(e), in_outfits: true });
      await reload();
    } catch (err) {
      tell(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <Loading />;
  if (!data) {
    return (
      <Notice
        icon="cloud-off"
        title={t("Can't load the outfits guide")}
        body={error ?? undefined}
        action={<Button label={t('Try again')} variant="quiet" onPress={() => void reload()} />}
      />
    );
  }

  const inGuide = data.events.filter((e) => e.in_outfits);
  const others = data.events.filter((e) => !e.in_outfits);
  const anyDetails = inGuide.some((e) => hasDetails(outfitOf(e)));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.paper }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.olive} />}>
      <Eyebrow>{t('Before you pack')}</Eyebrow>
      <Title size={34} style={{ marginTop: 2 }}>
        {t('What to wear')}
      </Title>
      <Accent style={{ fontSize: 20, marginTop: 4 }}>{t('One look for each celebration.')}</Accent>

      {!anyDetails ? (
        <Card tone="blush" style={styles.interim}>
          <Feather name="scissors" size={18} color={colors.rose} style={{ marginTop: 3 }} />
          <Body muted style={{ flex: 1, fontSize: 15.5, lineHeight: 22 }}>
            {t(wedding.dressInterim)}
          </Body>
        </Card>
      ) : null}

      {inGuide.length === 0 ? (
        <Body muted style={{ marginTop: space.lg }}>
          {t('Nothing here yet.')}
        </Body>
      ) : null}

      {inGuide.map((e) => (
        <OutfitCard key={e.id} event={e} isHost={isHost} onChanged={reload} />
      ))}

      {isHost && others.length > 0 ? (
        <View style={{ marginTop: space.xl }}>
          <Eyebrow>Add an event to this guide</Eyebrow>
          <Body muted style={{ fontSize: 14.5, marginTop: 4, marginBottom: space.sm }}>
            Only you see this list. Guests see the events you add.
          </Body>
          {others.map((e) => (
            <View key={e.id} style={styles.addRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.addTitle}>{e.title}</Text>
                <Text style={styles.addWhen}>
                  {formatDayShort(istDayKey(e.starts_at))} · {e.time_label}
                </Text>
              </View>
              <Button label="Add" icon="plus" variant="quiet" busy={busy === e.id} onPress={() => void addToGuide(e)} style={{ minHeight: 44 }} />
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function OutfitCard({ event, isHost, onChanged }: { event: WeddingEvent; isHost: boolean; onChanged: () => Promise<void> | void }) {
  const [editing, setEditing] = useState(false);
  const o = outfitOf(event);
  const when = whenOf(event);

  if (editing) return <OutfitEditor event={event} when={when} onDone={() => setEditing(false)} onChanged={onChanged} />;

  const forGuests = o.guest_colours.length > 0 || !!o.dress || o.dress_code === 'free';
  const couple = !!o.bride_colour || !!o.groom_colour;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.when}>{when}</Text>
        {isHost ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit what to wear for ${event.title}`}
            hitSlop={10}
            onPress={() => setEditing(true)}
            style={styles.edit}>
            <Feather name="edit-2" size={15} color={colors.rose} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>
      <Title size={28}>{t(event.title)}</Title>

      {o.setting || o.dress_code ? (
        <View style={styles.pills}>
          {o.setting ? <Pill icon={o.setting === 'open' ? 'sun' : 'home'} label={o.setting === 'open' ? t('Open air') : t('Indoors')} /> : null}
          {o.dress_code ? <Pill icon={o.dress_code === 'coded' ? 'droplet' : 'smile'} label={o.dress_code === 'coded' ? t('Colour code') : t('No dress code')} /> : null}
        </View>
      ) : null}

      {!hasDetails(o) ? (
        <Body muted style={{ marginTop: space.sm }}>
          {t('Details coming soon.')}
        </Body>
      ) : (
        <>
          {forGuests ? (
            <View style={styles.block}>
              <Text style={styles.kicker}>{t('For you')}</Text>
              {o.guest_colours.length > 0 ? (
                <View style={styles.swatches}>
                  {o.guest_colours.map((k) => (
                    <Swatch key={k} colourKey={k} />
                  ))}
                </View>
              ) : null}
              {o.dress ? <Body style={{ marginTop: o.guest_colours.length ? 8 : 4 }}>{o.dress}</Body> : null}
              {!o.dress && o.guest_colours.length === 0 && o.dress_code === 'free' ? <Body style={{ marginTop: 4 }}>{t('Wear what you love.')}</Body> : null}
            </View>
          ) : null}

          {couple ? (
            <View style={styles.block}>
              <Text style={styles.kicker}>{t('The couple will be in')}</Text>
              <CoupleLine name={wedding.first} colourKey={o.bride_colour} />
              <CoupleLine name={wedding.second} colourKey={o.groom_colour} />
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function Pill({ icon, label }: { icon: ComponentProps<typeof Feather>['name']; label: string }) {
  return (
    <View style={styles.pill}>
      <Feather name={icon} size={14} color={colors.ink} />
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

function Dot({ hex, size = 22 }: { hex: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: hex, borderWidth: 1, borderColor: 'rgba(66,77,53,0.28)' }} />;
}

function Swatch({ colourKey }: { colourKey: string }) {
  const c = colour(colourKey);
  return (
    <View style={styles.swatch} accessible accessibilityLabel={t(c.name)}>
      <Dot hex={c.hex} />
      <Text style={styles.swatchText}>{t(c.name)}</Text>
    </View>
  );
}

function CoupleLine({ name, colourKey }: { name: string; colourKey: string }) {
  const c = colourKey ? colour(colourKey) : null;
  return (
    <View style={styles.coupleLine} accessible accessibilityLabel={c ? t('{name} will be in {colour}', { name: t(name), colour: t(c.name) }) : t('{name}: coming soon', { name: t(name) })}>
      <Text style={styles.coupleName}>{t(name)}</Text>
      {c ? (
        <>
          <Dot hex={c.hex} />
          <Text style={styles.swatchText}>{t(c.name)}</Text>
        </>
      ) : (
        <Text style={[styles.swatchText, { color: colors.muted }]}>{t('Coming soon')}</Text>
      )}
    </View>
  );
}

// ───── editing (hosts) ─────

function OutfitEditor({
  event,
  when,
  onDone,
  onChanged,
}: {
  event: WeddingEvent;
  when: string;
  onDone: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [o, setO] = useState<Outfit>(outfitOf(event));
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const set = (patch: Partial<Outfit>) => setO((cur) => ({ ...cur, ...patch }));

  function toggleGuestColour(key: string) {
    setO((cur) => {
      if (cur.guest_colours.includes(key)) return { ...cur, guest_colours: cur.guest_colours.filter((k) => k !== key) };
      if (cur.guest_colours.length >= MAX_GUEST_COLOURS) {
        tell(`Up to ${MAX_GUEST_COLOURS} colours`, 'Take one off before adding another.');
        return cur;
      }
      return { ...cur, guest_colours: [...cur.guest_colours, key] };
    });
  }

  async function save(next: Outfit, which: 'save' | 'remove') {
    setBusy(which);
    try {
      await api.setOutfit(event.id, next);
      await onChanged();
      onDone();
    } catch (e) {
      tell(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.card, styles.cardEditing]}>
      <Text style={styles.when}>{when}</Text>
      <Title size={28}>{event.title}</Title>

      <Text style={styles.label}>Where is it?</Text>
      <Choice
        value={o.setting}
        onChange={(setting) => set({ setting })}
        options={[
          { value: 'open', label: 'Open air' },
          { value: 'indoor', label: 'Indoors' },
          { value: '', label: 'Not decided' },
        ]}
      />

      <Text style={styles.label}>Is there a colour code?</Text>
      <Choice
        value={o.dress_code}
        onChange={(dress_code) => set({ dress_code })}
        options={[
          { value: 'coded', label: 'Colour code' },
          { value: 'free', label: 'No dress code' },
          { value: '', label: 'Not decided' },
        ]}
      />

      <Text style={styles.label}>Colours for guests</Text>
      <Text style={styles.hint}>Tap up to {MAX_GUEST_COLOURS}. Tap again to take one off.</Text>
      <ColourChips selected={o.guest_colours} onPress={toggleGuestColour} group="guests" />

      <Text style={styles.label}>A line for guests</Text>
      <TextInput
        value={o.dress}
        onChangeText={(dress) => set({ dress })}
        placeholder="e.g. Yellows and florals"
        placeholderTextColor="#9A9C8E"
        maxLength={200}
        style={styles.input}
        accessibilityLabel={`A line for guests about what to wear to ${event.title}`}
      />

      <Text style={styles.label}>{wedding.first} will be in</Text>
      <ColourChips selected={o.bride_colour ? [o.bride_colour] : []} onPress={(k) => set({ bride_colour: o.bride_colour === k ? '' : k })} group={wedding.first} />

      <Text style={styles.label}>{wedding.second} will be in</Text>
      <ColourChips selected={o.groom_colour ? [o.groom_colour] : []} onPress={(k) => set({ groom_colour: o.groom_colour === k ? '' : k })} group={wedding.second} />

      <GoldRule style={{ marginVertical: space.lg }} />
      <View style={styles.actions}>
        <Button label="Save" busy={busy === 'save'} disabled={busy !== null} onPress={() => void save(o, 'save')} style={{ flex: 1 }} />
        <Button label="Cancel" variant="quiet" disabled={busy !== null} onPress={onDone} />
      </View>
      <Button
        label="Take this event out of the guide"
        variant="ghost"
        busy={busy === 'remove'}
        disabled={busy !== null}
        onPress={() => void save({ ...o, in_outfits: false }, 'remove')}
        style={{ alignSelf: 'flex-start', marginLeft: -space.md, marginTop: 4 }}
      />
    </View>
  );
}

function Choice<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={opt.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(opt.value)}
            style={[styles.choice, on && styles.choiceOn]}>
            <Text style={[styles.choiceText, on && { color: colors.white }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ColourChips({ selected, onPress, group }: { selected: string[]; onPress: (key: string) => void; group: string }) {
  return (
    <View style={styles.chips}>
      {PALETTE.map((c) => {
        const on = selected.includes(c.key);
        return (
          <Pressable
            key={c.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${c.name}, for ${group}`}
            onPress={() => onPress(c.key)}
            style={[styles.chip, on && styles.chipOn]}>
            <Dot hex={c.hex} size={20} />
            <Text style={styles.chipText}>{c.name}</Text>
            {on ? <Feather name="check" size={15} color={colors.rose} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  interim: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    padding: space.lg,
    marginTop: space.md,
  },
  cardEditing: { borderColor: colors.rose, borderLeftColor: colors.rose },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  when: { fontFamily: fonts.bodyBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.olive },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  editText: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.rose },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.moss, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.ink },
  block: { marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: colors.line },
  kicker: { fontFamily: fonts.bodyBold, fontSize: 12.5, letterSpacing: 1, textTransform: 'uppercase', color: colors.olive, marginBottom: 6 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, rowGap: 8 },
  swatch: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  swatchText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.ink },
  coupleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  coupleName: { fontFamily: fonts.displayMedium, fontSize: 21, color: colors.ink, minWidth: 86 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink, marginTop: space.lg, marginBottom: 6 },
  hint: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: -2, marginBottom: 8 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.moss },
  choiceOn: { backgroundColor: colors.rose },
  choiceText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
  },
  chipOn: { borderColor: colors.rose, backgroundColor: colors.blush },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 14.5, color: colors.ink },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#D9D4C4',
    backgroundColor: colors.paper,
    paddingHorizontal: space.md,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line },
  addTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  addWhen: { fontFamily: fonts.body, fontSize: 13.5, color: colors.muted, marginTop: 1 },
});
