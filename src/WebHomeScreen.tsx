import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Image, StyleSheet, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { Capture, removeCapture } from './storage';
import { expandSearchQuery, COLLECTION_TAGS } from './tagger';

// ── Utilities ────────────────────────────────────────────────

function getDomain(url?: string) {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function getContentType(c: Capture) {
  const url = (c.url ?? '').toLowerCase();
  const tags = c.tags.map(t => t.toLowerCase());
  if (url.includes('youtube.com') || url.includes('youtu.be') || tags.includes('video')) return 'Video';
  if (tags.includes('pdf') || url.endsWith('.pdf')) return 'PDF';
  if (tags.includes('recipe')) return 'Recipe';
  if (tags.includes('article') || tags.includes('news')) return 'Article';
  return 'Link';
}

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'Video':   return 'play-circle-outline';
    case 'PDF':     return 'document-outline';
    case 'Recipe':  return 'restaurant-outline';
    case 'Article': return 'newspaper-outline';
    default:        return 'link-outline';
  }
}

function formatDate(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function greeting(username: string) {
  const h = new Date().getHours();
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${t}, ${username} 👋`;
}

// ── Collections ──────────────────────────────────────────────

const GRADS: [string, string][] = [
  ['#EEF2FF', '#DDE6FF'], ['#FFF7ED', '#FEE9CC'], ['#ECFDF5', '#D1FAE5'],
  ['#FFF1F2', '#FFE0E3'], ['#F0F9FF', '#DBEEFE'], ['#FEFCE8', '#FEF3C0'],
  ['#F5F3FF', '#E5DEFF'], ['#FDF4FF', '#F3E8FF'],
];
const EMOJIS: Record<string, string> = {
  recipe: '🍜', food: '🍜', cooking: '🍳', ramen: '🍜', meal: '🍽️',
  travel: '✈️', japan: '🗾', trip: '🗺️',
  startup: '💡', business: '💼', finance: '💰', investing: '📈',
  book: '📚', reading: '📖',
  tech: '💻', coding: '👨‍💻', programming: '💻',
  fitness: '💪', workout: '🏋️', health: '🏥', exercise: '🏃',
  video: '🎥', youtube: '▶️', film: '🎬',
  music: '🎵', art: '🎨', design: '✏️',
  article: '📰', news: '📰', link: '🔗',
};

interface Collection { tag: string; name: string; count: number; thumbnail?: string; colors: [string, string]; emoji: string }

function buildCollections(captures: Capture[]): Collection[] {
  const map = new Map<string, { count: number; thumbnail?: string }>();
  for (const c of captures) {
    for (const tag of c.tags) {
      if (!COLLECTION_TAGS.has(tag)) continue;
      const e = map.get(tag);
      if (e) { e.count++; if (!e.thumbnail && c.thumbnail_url) e.thumbnail = c.thumbnail_url; }
      else map.set(tag, { count: 1, thumbnail: c.thumbnail_url ?? undefined });
    }
  }
  return [...map.entries()]
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8)
    .map(([tag, { count, thumbnail }], i) => ({
      tag, name: tag.charAt(0).toUpperCase() + tag.slice(1),
      count, thumbnail, colors: GRADS[i % GRADS.length], emoji: EMOJIS[tag] ?? '📁',
    }));
}

// ── Sub-components ───────────────────────────────────────────

function LargeCard({ item, onDelete }: { item: Capture; onDelete: (id: string) => void }) {
  const type = getContentType(item);
  const domain = getDomain(item.url);
  const badgeLabel = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : type;

  return (
    <TouchableOpacity
      style={s.largeCard}
      onPress={() => item.url ? Linking.openURL(item.url) : null}
      activeOpacity={0.85}
    >
      <View style={s.largeThumbWrap}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={s.largeThumb} resizeMode="cover" />
        ) : (
          <View style={[s.largeThumb, s.largeThumbPlaceholder]}>
            {item.site_name
              ? <Text style={s.largeThumbInitial}>{item.site_name.charAt(0).toUpperCase()}</Text>
              : <Ionicons name={getTypeIcon(type)} size={34} color="#A0AEC0" />}
          </View>
        )}
        <View style={s.badge}>
          <Text style={s.badgeText}>{badgeLabel}</Text>
        </View>
      </View>

      <View style={s.largeInfo}>
        <Text style={s.largeTitle} numberOfLines={2}>{item.title || item.content}</Text>
        <Text style={s.largeMeta} numberOfLines={1}>
          {item.site_name || domain || 'Link'}
        </Text>
        <Text style={s.largeTime}>{formatDate(item.created_at)}</Text>
      </View>

      <TouchableOpacity
        style={s.deleteBtn}
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      >
        <Ionicons name="close" size={14} color="#CBD5E0" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function CollectionCard({ col, onPress }: { col: Collection; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.colCard} activeOpacity={0.85} onPress={onPress}>
      <LinearGradient colors={col.colors} style={s.colGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {col.thumbnail
          ? <Image source={{ uri: col.thumbnail }} style={s.colThumb} resizeMode="cover" />
          : <Text style={s.colEmoji}>{col.emoji}</Text>}
        <Text style={s.colName}>{col.name}</Text>
        <Text style={s.colCount}>{col.count} items</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function RecentItem({ item, onDelete }: { item: Capture; onDelete: (id: string) => void }) {
  const type = getContentType(item);
  const domain = getDomain(item.url);

  return (
    <TouchableOpacity
      style={s.recentItem}
      onPress={() => item.url ? Linking.openURL(item.url) : null}
      activeOpacity={0.8}
    >
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={s.recentThumb} resizeMode="cover" />
      ) : (
        <View style={[s.recentThumb, s.recentPlaceholder]}>
          {item.site_name
            ? <Text style={s.recentInitial}>{item.site_name.charAt(0).toUpperCase()}</Text>
            : <Ionicons name={getTypeIcon(type)} size={20} color="#A0AEC0" />}
        </View>
      )}
      <View style={s.recentText}>
        <Text style={s.recentTitle} numberOfLines={2}>{item.title || item.content}</Text>
        <Text style={s.recentMeta}>{item.site_name || domain}</Text>
        <Text style={s.recentTime}>{formatDate(item.created_at)}</Text>
      </View>
      <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <Ionicons name="ellipsis-vertical" size={14} color="#CBD5E0" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────

interface Props { captures: Capture[]; session: Session; onRefresh: () => void }

export default function WebHomeScreen({ captures, session, onRefresh }: Props) {
  const [search, setSearch]                       = useState('');
  const [terms, setTerms]                         = useState<string[]>([]);
  const [searching, setSearching]                 = useState(false);
  const [activeCollection, setActiveCollection]   = useState<string | null>(null);

  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'there';

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setTerms([]); setSearching(false); return; }
    setTerms([q]);
    setSearching(true);
    const t = setTimeout(async () => {
      setTerms(await expandSearchQuery(q));
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // When search changes, clear active collection
  useEffect(() => { if (search.trim()) setActiveCollection(null); }, [search]);

  const baseFiltered = search.trim()
    ? captures.filter(c => {
        const q = search.toLowerCase().trim();
        const t = terms.length > 0 ? terms : [q];
        const tagMatch = c.tags.some(tag => t.some(term => tag.includes(term) || term.includes(tag)));
        const allText  = [c.title, c.content, c.summary, c.description, c.category, c.site_name]
          .filter(Boolean).join(' ').toLowerCase();
        const textMatch = t.some(term => allText.includes(term));
        return tagMatch || textMatch;
      })
    : captures;

  // If a collection is active, additionally filter by its tag
  const filtered = activeCollection
    ? baseFiltered.filter(c => c.tags.includes(activeCollection))
    : baseFiltered;

  const collections = buildCollections(captures);
  const recentItems = captures.slice(0, 5);
  const showSections = !search.trim() && !activeCollection;

  function confirmDelete(id: string) {
    if (window.confirm('Remove this capture?')) {
      removeCapture(id).then(onRefresh).catch(() => {});
    }
  }

  // Build 2-column rows for "Recently saved"
  const rows: Capture[][] = [];
  for (let i = 0; i < filtered.length; i += 2) rows.push(filtered.slice(i, i + 2));

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={s.contentPad}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.greetingText}>{greeting(username)}</Text>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color="#A0AEC0" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder='Search… "ramen recipe", "japan trip"'
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {searching && <ActivityIndicator size="small" color="#A0AEC0" style={{ marginLeft: 6 }} />}
          {search.length > 0 && !searching && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#CBD5E0" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Continue where you left off ── */}
      {showSections && recentItems.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Continue where you left off</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {recentItems.map(item => (
              <LargeCard key={item.id} item={item} onDelete={confirmDelete} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Smart Collections ── */}
      {showSections && collections.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Smart Collections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {collections.map(col => (
              <CollectionCard
                key={col.tag}
                col={col}
                onPress={() => setActiveCollection(col.tag)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Recently saved / Collection view / Search results ── */}
      <View style={s.section}>
        <View style={s.sectionRow}>
          {activeCollection ? (
            <View style={s.collectionHeader}>
              <TouchableOpacity onPress={() => setActiveCollection(null)} style={s.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={18} color="#5A67D8" />
              </TouchableOpacity>
              <Text style={[s.sectionTitle, { marginBottom: 0 }]}>
                {activeCollection.charAt(0).toUpperCase() + activeCollection.slice(1)}
              </Text>
              <Text style={s.collectionCount}>{filtered.length} items</Text>
            </View>
          ) : (
            <Text style={s.sectionTitle}>
              {search.trim() ? `Results for "${search}"` : 'Recently saved'}
            </Text>
          )}
        </View>

        {filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔍</Text>
            <Text style={s.emptyTitle}>No matches found</Text>
            <Text style={s.emptyText}>Try a different keyword</Text>
          </View>
        ) : (
          <View style={s.recentGrid}>
            {rows.map((row, i) => (
              <View key={i} style={s.recentRow}>
                {row.map(item => (
                  <View key={item.id} style={s.recentCell}>
                    <RecentItem item={item} onDelete={confirmDelete} />
                  </View>
                ))}
                {row.length === 1 && <View style={s.recentCell} />}
              </View>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F7F8FC' },
  contentPad: { paddingBottom: 40 },

  header: {
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingHorizontal: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  greetingText: { fontSize: 24, fontWeight: '700', color: '#1A202C', marginBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 540,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1A202C' },

  section: { paddingHorizontal: 32, paddingTop: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A202C', marginBottom: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  hScroll: { paddingBottom: 4 },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  backBtn: { padding: 4 },
  collectionCount: { fontSize: 13, color: '#A0AEC0', fontWeight: '500' },

  // Large cards ("Continue where you left off")
  largeCard: {
    width: 200,
    backgroundColor: '#fff',
    borderRadius: 18,
    marginRight: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  largeThumbWrap: { position: 'relative' },
  largeThumb: { width: '100%', height: 140 },
  largeThumbPlaceholder: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  largeThumbInitial: { fontSize: 42, fontWeight: '700', color: '#5A67D8' },
  badge: {
    position: 'absolute', bottom: 8, left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  badgeText: { fontSize: 10, color: '#fff', fontWeight: '700', textTransform: 'capitalize' },
  largeInfo: { padding: 12, paddingTop: 10 },
  largeTitle: { fontSize: 13, fontWeight: '600', color: '#1A202C', lineHeight: 18, marginBottom: 4 },
  largeMeta:  { fontSize: 11, color: '#A0AEC0' },
  largeTime:  { fontSize: 11, color: '#A0AEC0', marginTop: 1 },
  deleteBtn:  { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 3 },

  // Collection cards
  colCard: { width: 170, marginRight: 12, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  colGradient: { borderRadius: 18, overflow: 'hidden', paddingBottom: 14 },
  colThumb: { width: '100%', height: 100 },
  colEmoji: { fontSize: 38, textAlign: 'center', paddingVertical: 20 },
  colName:  { fontSize: 14, fontWeight: '700', color: '#1A202C', paddingHorizontal: 14, marginTop: 2 },
  colCount: { fontSize: 12, color: '#718096', paddingHorizontal: 14, marginTop: 2 },

  // Recently saved grid
  recentGrid: {},
  recentRow:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  recentCell: { flex: 1 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recentThumb: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#ECEEF2' },
  recentPlaceholder: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  recentInitial: { fontSize: 20, fontWeight: '700', color: '#5A67D8' },
  recentText: { flex: 1, marginHorizontal: 10 },
  recentTitle: { fontSize: 13, fontWeight: '600', color: '#1A202C', lineHeight: 17 },
  recentMeta:  { fontSize: 11, color: '#A0AEC0', marginTop: 3 },
  recentTime:  { fontSize: 11, color: '#A0AEC0', marginTop: 1 },

  empty: { alignItems: 'center', paddingTop: 48 },
  emptyIcon:  { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#2D3748', marginTop: 10 },
  emptyText:  { fontSize: 13, color: '#A0AEC0', marginTop: 4 },
});
