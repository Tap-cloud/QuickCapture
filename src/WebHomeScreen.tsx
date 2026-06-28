import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Image, StyleSheet, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { Capture, removeCapture, updateCapture } from './storage';
import { scoreCapture, SCORE_THRESHOLD, COLLECTION_TAGS } from './tagger';
import { useTheme } from './theme';

// ── Utilities ────────────────────────────────────────────────

function getDomain(url?: string) {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function getContentType(c: Capture) {
  const url  = (c.url ?? '').toLowerCase();
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
const GRADS_DARK: [string, string][] = [
  ['#1E1B4B', '#2E2A6B'], ['#431407', '#7C2D12'], ['#052E16', '#064E3B'],
  ['#4C0519', '#881337'], ['#0C1A2E', '#1E3A5F'], ['#422006', '#713F12'],
  ['#2E1065', '#4C1D95'], ['#3B0764', '#581C87'],
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

function buildCollections(captures: Capture[], isDark: boolean): Collection[] {
  const grads = isDark ? GRADS_DARK : GRADS;
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
      count, thumbnail, colors: grads[i % grads.length], emoji: EMOJIS[tag] ?? '📁',
    }));
}

// ── Sub-components ───────────────────────────────────────────

function LargeCard({ item, onEdit, onDelete }: { item: Capture; onEdit: (item: Capture) => void; onDelete: (id: string) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const type       = getContentType(item);
  const domain     = getDomain(item.url);
  const badgeLabel = item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : type;

  return (
    <TouchableOpacity style={s.largeCard} onPress={() => item.url ? Linking.openURL(item.url) : null} activeOpacity={0.85}>
      <View style={s.largeThumbWrap}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={s.largeThumb} resizeMode="cover" />
        ) : (
          <View style={[s.largeThumb, s.largeThumbPlaceholder]}>
            {item.site_name
              ? <Text style={s.largeThumbInitial}>{item.site_name.charAt(0).toUpperCase()}</Text>
              : <Ionicons name={getTypeIcon(type)} size={34} color={colors.textMuted} />}
          </View>
        )}
        <View style={s.badge}>
          <Text style={s.badgeText}>{badgeLabel}</Text>
        </View>
      </View>
      <View style={s.largeInfo}>
        <Text style={s.largeTitle} numberOfLines={2}>{item.title || item.content}</Text>
        <Text style={s.largeMeta} numberOfLines={1}>{item.site_name || domain || 'Link'}</Text>
        <Text style={s.largeTime}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 4 }}>
        <TouchableOpacity style={s.deleteBtn} onPress={() => onEdit(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="pencil" size={13} color="#CBD5E0" />
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close" size={14} color="#CBD5E0" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function CollectionCard({ col, onPress }: { col: Collection; onPress: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
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

function RecentItem({ item, onEdit, onDelete }: { item: Capture; onEdit: (item: Capture) => void; onDelete: (id: string) => void }) {
  const { colors } = useTheme();
  const s    = useMemo(() => makeStyles(colors), [colors]);
  const type   = getContentType(item);
  const domain = getDomain(item.url);

  return (
    <TouchableOpacity style={s.recentItem} onPress={() => item.url ? Linking.openURL(item.url) : null} activeOpacity={0.8}>
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={s.recentThumb} resizeMode="cover" />
      ) : (
        <View style={[s.recentThumb, s.recentPlaceholder]}>
          {item.site_name
            ? <Text style={s.recentInitial}>{item.site_name.charAt(0).toUpperCase()}</Text>
            : <Ionicons name={getTypeIcon(type)} size={20} color={colors.textMuted} />}
        </View>
      )}
      <View style={s.recentText}>
        <Text style={s.recentTitle} numberOfLines={2}>{item.title || item.content}</Text>
        <Text style={s.recentMeta}>{item.site_name || domain}</Text>
        <Text style={s.recentTime}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity onPress={() => onEdit(item)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="pencil-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ──────────────────────────────────────────────

interface Props { captures: Capture[]; session: Session; onRefresh: () => void }

export default function WebHomeScreen({ captures, session, onRefresh }: Props) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [search, setSearch]                     = useState('');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [editTarget, setEditTarget]             = useState<Capture | null>(null);
  const [editTitle, setEditTitle]               = useState('');
  const [editNote, setEditNote]                 = useState('');

  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'there';

  useEffect(() => { if (search.trim()) setActiveCollection(null); }, [search]);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return captures;
    const scored = captures
      .map(c => ({ c, score: scoreCapture(c, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) return [];
    const maxScore = scored[0].score;
    const cutoff   = Math.max(SCORE_THRESHOLD, maxScore * 0.4);
    return scored.filter(({ score }) => score >= cutoff).map(({ c }) => c);
  }, [captures, search]);

  const filtered    = activeCollection ? baseFiltered.filter(c => c.tags.includes(activeCollection)) : baseFiltered;
  const collections = buildCollections(captures, isDark);
  const recentItems = captures.slice(0, 5);
  const showSections = !search.trim() && !activeCollection;

  function confirmDelete(id: string) {
    if (window.confirm('Remove this capture?')) {
      removeCapture(id).then(onRefresh).catch(() => {});
    }
  }

  function openEdit(item: Capture) {
    setEditTarget(item);
    setEditTitle(item.title ?? '');
    setEditNote(item.content ?? '');
  }

  async function saveEdit() {
    if (!editTarget) return;
    await updateCapture(editTarget.id, { title: editTitle.trim() || undefined, content: editNote.trim() });
    setEditTarget(null);
    onRefresh();
  }

  const rows: Capture[][] = [];
  for (let i = 0; i < filtered.length; i += 2) rows.push(filtered.slice(i, i + 2));

  return (
    <View style={{ flex: 1 }}>

    {/* ── Edit modal ── */}
    {editTarget && (
      <View style={s.editOverlay}>
        <View style={s.editCard}>
          <Text style={s.editHeading}>Edit</Text>

          <Text style={s.editLabel}>Title</Text>
          <TextInput style={s.editInput} value={editTitle} onChangeText={setEditTitle}
            placeholder="Title" placeholderTextColor={colors.textMuted} />

          <Text style={s.editLabel}>Your note</Text>
          <TextInput style={[s.editInput, { minHeight: 80, textAlignVertical: 'top' }]}
            value={editNote} onChangeText={setEditNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.textMuted} />

          <View style={s.editBtns}>
            <TouchableOpacity style={s.editCancel} onPress={() => setEditTarget(null)}>
              <Text style={s.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.editSave} onPress={saveEdit}>
              <Text style={s.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}

    <ScrollView style={s.container} showsVerticalScrollIndicator={false} contentContainerStyle={s.contentPad}>

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.greetingText}>{greeting(username)}</Text>
        <View style={s.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder='Search… "ramen recipe", "japan trip"'
            placeholderTextColor={colors.textMuted}
            value={search} onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Continue where you left off ── */}
      {showSections && recentItems.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Continue where you left off</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {recentItems.map(item => <LargeCard key={item.id} item={item} onEdit={openEdit} onDelete={confirmDelete} />)}
          </ScrollView>
        </View>
      )}

      {/* ── Smart Collections ── */}
      {showSections && collections.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Smart Collections</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
            {collections.map(col => (
              <CollectionCard key={col.tag} col={col} onPress={() => setActiveCollection(col.tag)} />
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
                <Ionicons name="arrow-back" size={18} color={colors.primary} />
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
                    <RecentItem item={item} onEdit={openEdit} onDelete={confirmDelete} />
                  </View>
                ))}
                {row.length === 1 && <View style={s.recentCell} />}
              </View>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container:  { flex: 1, backgroundColor: c.bgSoft },
    contentPad: { paddingBottom: 40 },

    header: {
      backgroundColor: c.bg,
      paddingTop: 32, paddingHorizontal: 32, paddingBottom: 20,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    greetingText: { fontSize: 24, fontWeight: '700', color: c.text, marginBottom: 14 },
    searchBar: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.bgSoft, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 10, maxWidth: 540,
    },
    searchInput: { flex: 1, fontSize: 14, color: c.text },

    section:          { paddingHorizontal: 32, paddingTop: 28 },
    sectionTitle:     { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 14 },
    sectionRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    hScroll:          { paddingBottom: 4 },
    collectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    backBtn:          { padding: 4 },
    collectionCount:  { fontSize: 13, color: c.textMuted, fontWeight: '500' },

    // Large cards
    largeCard: {
      width: 200, backgroundColor: c.card, borderRadius: 18, marginRight: 14, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    largeThumbWrap:     { position: 'relative' },
    largeThumb:         { width: '100%', height: 140 },
    largeThumbPlaceholder: { backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' },
    largeThumbInitial:  { fontSize: 42, fontWeight: '700', color: c.primary },
    badge: {
      position: 'absolute', bottom: 8, left: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    },
    badgeText:  { fontSize: 10, color: '#fff', fontWeight: '700', textTransform: 'capitalize' },
    largeInfo:  { padding: 12, paddingTop: 10 },
    largeTitle: { fontSize: 13, fontWeight: '600', color: c.text, lineHeight: 18, marginBottom: 4 },
    largeMeta:  { fontSize: 11, color: c.textMuted },
    largeTime:  { fontSize: 11, color: c.textMuted, marginTop: 1 },
    deleteBtn:  { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10, padding: 3 },

    // Collection cards
    colCard:     { width: 170, marginRight: 12, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    colGradient: { borderRadius: 18, overflow: 'hidden', paddingBottom: 14 },
    colThumb:    { width: '100%', height: 100 },
    colEmoji:    { fontSize: 38, textAlign: 'center', paddingVertical: 20 },
    colName:     { fontSize: 14, fontWeight: '700', color: c.text, paddingHorizontal: 14, marginTop: 2 },
    colCount:    { fontSize: 12, color: c.textSub, paddingHorizontal: 14, marginTop: 2 },

    // Recently saved grid
    recentGrid: {},
    recentRow:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
    recentCell: { flex: 1 },
    recentItem: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.card, borderRadius: 14, padding: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    recentThumb:      { width: 60, height: 60, borderRadius: 10, backgroundColor: c.border },
    recentPlaceholder: { backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' },
    recentInitial:    { fontSize: 20, fontWeight: '700', color: c.primary },
    recentText:       { flex: 1, marginHorizontal: 10 },
    recentTitle:      { fontSize: 13, fontWeight: '600', color: c.text, lineHeight: 17 },
    recentMeta:       { fontSize: 11, color: c.textMuted, marginTop: 3 },
    recentTime:       { fontSize: 11, color: c.textMuted, marginTop: 1 },

    empty:      { alignItems: 'center', paddingTop: 48 },
    emptyIcon:  { fontSize: 36 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: c.text, marginTop: 10 },
    emptyText:  { fontSize: 13, color: c.textMuted, marginTop: 4 },

    editOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 100, alignItems: 'center', justifyContent: 'center' },
    editCard:    { backgroundColor: c.bg, borderRadius: 20, padding: 24, width: 420, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 },
    editHeading: { fontSize: 17, fontWeight: '700', color: c.text, marginBottom: 18 },
    editLabel:   { fontSize: 12, fontWeight: '600', color: c.textSub, marginBottom: 6 },
    editInput:   { backgroundColor: c.bgSoft, borderRadius: 12, padding: 12, fontSize: 14, color: c.text, marginBottom: 14 },
    editBtns:    { flexDirection: 'row', gap: 10, marginTop: 4 },
    editCancel:  { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    editCancelText: { fontSize: 14, fontWeight: '600', color: c.textSub },
    editSave:    { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center' },
    editSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  });
}
