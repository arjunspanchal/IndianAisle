import { Image } from 'expo-image';
import { CallButtons, ContactsEditor } from '@/components/Contacts';
import { Audio } from '@/components/ReportedAudio';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Accent, Body, Button, Card, Eyebrow, GoldRule, Title } from '@/components/ui';
import { api, chatMediaUrl, docsApi, errorMessage, photoUrl, removeChatFiles, removePhotoFiles, type Report } from '@/lib/api';
import { confirm, tell } from '@/lib/dialog';
import { useLoad } from '@/lib/live';
import { useSession } from '@/lib/session';
import { colors, fonts, radius, space, wedding } from '@/lib/theme';
import { formatWhen } from '@/lib/time';

export default function Me() {
  const { guest, isHost, isVendor, leave } = useSession();
  const [deleting, setDeleting] = useState(false);

  function signOut() {
    confirm(
      'Leave on this phone?',
      "You'll need the invite code to come back, and you'd rejoin as a new person.",
      'Leave',
      () => void leave(),
    );
  }

  function deleteAccount() {
    confirm(
      'Delete your account?',
      'Your name, messages, photos, voice notes, travel documents, reactions and quiz answers are removed for everyone. This cannot be undone.',
      'Delete everything',
      async () => {
        setDeleting(true);
        try {
          // Travel documents first: if they can't be erased, nothing else is touched.
          if (!isVendor) await docsApi.removeAllMine();
          const { paths, chat_paths } = await api.deleteMe();
          await removePhotoFiles(paths);
          await removeChatFiles(chat_paths);
          await leave();
        } catch (e) {
          setDeleting(false);
          tell(errorMessage(e));
        }
      },
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.paper }} contentContainerStyle={styles.content}>
      <Eyebrow>{isVendor ? 'On the team' : "You're on the list"}</Eyebrow>
      <Title size={36} style={{ marginTop: 2 }}>
        {guest?.name}
      </Title>
      {isHost ? <Accent style={{ fontSize: 20 }}>Hosting. You can post updates, write quiz questions and tidy the chat and album.</Accent> : null}

      {isHost ? <Reports /> : null}

      <Card style={{ marginTop: space.xl }}>
        <Eyebrow>Where</Eyebrow>
        <Title size={24} style={{ marginTop: 4 }}>
          {wedding.venue}
        </Title>
        <Body muted style={{ marginTop: 6 }}>
          {wedding.address}
        </Body>
        <Body style={{ marginTop: space.md }}>{wedding.gettingThere}</Body>
        <View style={styles.links}>
          <Button label="Open in Maps" icon="map-pin" variant="quiet" onPress={() => void Linking.openURL(wedding.mapsUrl)} />
          <Button label="Travel, weather & FAQs" variant="ghost" onPress={() => router.push('/info')} />
        </View>
        <CallButtons />
      </Card>

      {isHost ? <ContactsEditor /> : null}

      {isVendor ? null : (
        <Card style={{ marginTop: space.md }}>
          <Eyebrow>For your journey</Eyebrow>
          <Title size={24} style={{ marginTop: 4 }}>
            Travel documents
          </Title>
          <Body muted style={{ marginTop: 6 }}>
            {isHost
              ? "Guests' IDs and tickets, kept in a private vault only you and they can open."
              : 'Add your ID and tickets so the wedding team can sort out travel and check-in. Kept private.'}
          </Body>
          <Button label={isHost ? 'Open the vault' : 'Add or view yours'} icon="lock" variant="quiet" onPress={() => router.push('/docs')} style={{ alignSelf: 'flex-start', marginTop: space.md }} />
        </Card>
      )}

      {isVendor ? null : (
        <Card tone="sage" style={{ marginTop: space.md }}>
          <Eyebrow>How the camera works</Eyebrow>
          <Body style={{ marginTop: 6 }}>
            You get 27 photos a day, like a disposable camera. There's no preview and no retake. Everyone's photos develop together at 9:00 am
            the next morning and appear in the album.
          </Body>
          <Body muted style={{ marginTop: space.sm }}>
            No signal? Keep shooting. Photos wait safely on your phone and send themselves later.
          </Body>
        </Card>
      )}

      <Card tone="sage" style={{ marginTop: space.md }}>
        <Eyebrow>Keeping it kind</Eyebrow>
        <Body style={{ marginTop: 6 }}>
          Hold any message, or open any photo, to report it to the couple or to block the person who posted it.
        </Body>
      </Card>

      <View style={{ marginTop: space.xl, gap: space.xs, alignItems: 'center' }}>
        <Button label="Leave on this phone" variant="ghost" onPress={signOut} />
        <Button label="Delete my account and everything I posted" variant="ghost" busy={deleting} onPress={deleteAccount} />
      </View>
    </ScrollView>
  );
}

/** Hosts only: messages and photos that guests have reported. */
function Reports() {
  const { data, reload } = useLoad<Report[]>(() => api.reports(), 60000);
  if (!data || data.length === 0) return null;

  async function settle(r: Report, remove: boolean) {
    try {
      await api.resolveReport(r.kind, r.target_id, remove);
      if (remove && r.path) void removePhotoFiles([r.path, `t/${r.path}`]);
      if (remove && r.media_path) void removeChatFiles([r.media_path]);
      await reload();
    } catch (e) {
      tell(errorMessage(e));
    }
  }

  return (
    <>
      <View style={styles.sectionHead}>
        <Eyebrow color={colors.rose}>Reported by guests</Eyebrow>
        <GoldRule style={{ flex: 1, marginLeft: space.md }} />
      </View>
      {data.map((r) => (
        <Card key={`${r.kind}-${r.target_id}`} tone="blush" style={{ marginBottom: space.sm }}>
          <Text style={styles.reportMeta}>
            {r.kind === 'photo' ? 'Photo' : 'Message'} by {r.author ?? 'someone'} · {r.count} {r.count === 1 ? 'report' : 'reports'} ·{' '}
            {formatWhen(r.latest)}
          </Text>
          {r.kind === 'photo' && r.path ? (
            <Image source={{ uri: photoUrl(r.path, true) }} style={styles.reportPhoto} contentFit="cover" />
          ) : r.media_kind === 'image' && r.media_path ? (
            <Image source={{ uri: chatMediaUrl(r.media_path) }} style={styles.reportPhoto} contentFit="cover" />
          ) : r.media_kind === 'voice' && r.media_path ? (
            <Audio url={chatMediaUrl(r.media_path)} />
          ) : (
            <Body style={{ marginTop: 6 }}>{r.body}</Body>
          )}
          <View style={styles.links}>
            <Button label="Remove it" onPress={() => void settle(r, true)} style={{ minHeight: 44 }} />
            <Button label="Keep it" variant="quiet" onPress={() => void settle(r, false)} style={{ minHeight: 44 }} />
          </View>
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, paddingBottom: space.xxl * 2 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm, marginTop: space.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: space.xl, marginBottom: space.sm },
  reportMeta: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.muted },
  reportPhoto: { width: 120, height: 120, borderRadius: radius.sm, marginTop: space.sm, backgroundColor: colors.moss },
});
