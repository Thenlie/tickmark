import { useNetworkState } from 'expo-network';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Pressable, SectionList, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDistance } from '@/climb/geo';
import { changeKind, systemForArea } from '@/climb/grades';
import type { Area } from '@/climb/types';
import { FormInput } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getArea, getChildren, nearbyCached, recentAreas, searchCached } from '@/db/areas';
import { getClimb, updateClimb } from '@/db/climbs';
import { nearbyRemote, refreshArea, refreshCountries, searchRemote } from '@/openbeta/area-cache';
import { useDbQuery } from '@/hooks/use-db-query';
import { quickPosition } from '@/hooks/use-position-capture';
import { useTheme } from '@/hooks/use-theme';

const DAY_MS = 24 * 60 * 60 * 1000;

type Row = { area: Area; detail?: string };
type Section = { title: string; data: Row[] };

/**
 * Area picker. Reads only from the local cache; when online it refreshes from
 * OpenBeta in the background and the list updates as rows land.
 * `?parent=<uuid>` drills into an area; `depth` counts pushed picker screens.
 */
export default function AreaPickerScreen() {
  const { id, parent, depth } = useLocalSearchParams<{ id: string; parent?: string; depth?: string }>();
  const level = Number(depth ?? 0);
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const network = useNetworkState();
  const online = network.isInternetReachable !== false && network.isConnected !== false;

  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (!parent) void quickPosition().then(setPos);
  }, [parent]);

  const { data } = useDbQuery<{ parentArea: Area | null; sections: Section[] }>(
    async (db) => {
      if (q.length >= 2) {
        const results = await searchCached(db, q);
        return { parentArea: null, sections: [{ title: 'Results', data: results.map(withPath) }] };
      }
      if (parent) {
        const [parentArea, children] = await Promise.all([getArea(db, parent), getChildren(db, parent)]);
        return { parentArea, sections: [{ title: 'In this area', data: children.map((area) => ({ area })) }] };
      }
      const [nearby, recent, roots] = await Promise.all([
        pos ? nearbyCached(db, pos.lat, pos.lng) : Promise.resolve([]),
        recentAreas(db),
        getChildren(db, null),
      ]);
      const sections: Section[] = [
        {
          title: 'Nearby',
          data: nearby.map(({ area, distanceM }) => ({ area, detail: formatDistance(distanceM) })),
        },
        { title: 'Recent', data: recent.map(withPath) },
        { title: 'Browse', data: roots.map((area) => ({ area })) },
      ];
      return { parentArea: null, sections: sections.filter((s) => s.data.length > 0) };
    },
    ['areas', 'climbs'],
    `${parent ?? ''}|${q}|${pos?.lat ?? ''},${pos?.lng ?? ''}`,
  );

  // Background refreshes. Errors are expected offline and ignored; the cache is still shown.
  useEffect(() => {
    if (!online || !parent) return;
    void getArea(db, parent).then((a) => {
      if (!a?.childrenFetchedAt || Date.now() - a.childrenFetchedAt > DAY_MS) {
        refreshArea(db, parent).catch(() => {});
      }
    });
  }, [db, online, parent]);

  useEffect(() => {
    if (!online || parent || q.length >= 2) return;
    void getChildren(db, null).then((roots) => {
      if (roots.length === 0) refreshCountries(db).catch(() => {});
    });
    if (pos) nearbyRemote(db, pos.lat, pos.lng).catch(() => {});
  }, [db, online, parent, pos, q.length]);

  useEffect(() => {
    if (!online || q.length < 2) return;
    const t = setTimeout(() => searchRemote(db, q).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [db, online, q]);

  const choose = async (area: Area) => {
    if (!area.isLeaf) {
      router.push({ pathname: '/climb/[id]/area', params: { id, parent: area.id, depth: String(level + 1) } });
      return;
    }
    const climb = await getClimb(db, id);
    if (!climb) return;
    const kindPatch = area.isBoulder ? changeKind(climb, 'boulder', area.gradeContext).patch : {};
    const next = { ...climb, ...kindPatch };
    await updateClimb(db, id, { ...kindPatch, areaId: area.id, gradeSystem: systemForArea(next, area.gradeContext) });
    // Pull the crag's climb names for the similar-name hint.
    if (online) refreshArea(db, area.id).catch(() => {});
    // Pop every picker screen in the drill-down and land back on setup.
    router.dismiss(level + 1);
  };

  const sections = data?.sections ?? [];

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: data?.parentArea?.name ?? 'Where is it?' }} />
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.area.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            {!parent && (
              <FormInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search areas"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            )}
            {data?.parentArea && (
              <ThemedText type="small" themeColor="textSecondary">
                {data.parentArea.pathTokens.join(' › ')}
              </ThemedText>
            )}
            {!online && (
              <ThemedText type="small" themeColor="textSecondary">
                Offline. Showing areas saved on this phone.
              </ThemedText>
            )}
          </ThemedView>
        }
        renderSectionHeader={({ section }) => (
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {section.title.toUpperCase()}
          </ThemedText>
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => choose(item.area)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.row}>
              <ThemedView type="backgroundElement" style={styles.rowText}>
                <ThemedText numberOfLines={1}>{item.area.name}</ThemedText>
                {item.detail && (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.detail}
                  </ThemedText>
                )}
              </ThemedView>
              <ThemedText type="small" style={{ color: item.area.isLeaf ? theme.primary : theme.textSecondary }}>
                {item.area.isLeaf ? (item.area.isBoulder ? 'Boulder' : 'Crag') : '›'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
        ListEmptyComponent={
          data ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {online
                ? 'Loading areas from OpenBeta…'
                : "No saved areas here yet. You can choose the area later, once you're back in signal."}
            </ThemedText>
          ) : undefined
        }
        stickySectionHeadersEnabled={false}
      />
    </ThemedView>
  );
}

function withPath(area: Area): Row {
  return { area, detail: area.pathTokens.slice(0, -1).slice(-3).join(' › ') };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.two },
  header: { gap: Spacing.two, marginBottom: Spacing.two },
  sectionTitle: { marginTop: Spacing.three, marginBottom: Spacing.one, letterSpacing: 0.6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  rowText: { flex: 1, gap: Spacing.half },
  empty: { paddingVertical: Spacing.five, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
