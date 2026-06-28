import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, SectionList, TouchableOpacity,
  Alert, StyleSheet, Platform, Image, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { Capture, removeCapture, updateCapture } from './storage';
import { scoreCapture, SCORE_THRESHOLD } from './tagger';
import { useTheme } from './theme';
import WebHomeScreen from './WebHomeScreen';

interface Props { captures: Capture[]; session: Session; onRefresh: () => void }

interface Section { title: string; data: Capture[] }

function getGreeting(username: string): string {
  const h = new Date().getHours();
  const t = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${t}, ${username} 👋`;
}

function getDomain(url?: string): string {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function getContentType(c: Capture): string {
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

function formatDate(d: string): string {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function groupCaptures(captures: Capture[]): Section[] {
  const todayStart     = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart      = todayStart - 7 * 86400000;
  const groups: Record<string, Capture[]> = { Today: [], Yesterday: [], 'This Week': [], Older: [] };
  for (const c of captures) {
    const t = new Date(c.created_at).getTime();
    if      (t >= todayStart)     groups['Today'].push(c);
    else if (t >= yesterdayStart) groups['Yesterday'].push(c);
    else if (t >= weekStart)      groups['This Week'].push(c);
    else                          groups['Older'].push(c);
  }
  return Object.entries(groups).filter(([, d]) => d.length > 0).map(([title, data]) => ({ title, data }));
}

function CaptureItem({ item, onEdit, onDelete }: { item: Capture; onEdit: (item: Capture) => void; onDelete: (id: string) => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const type   = getContentType(item);
  const domain = getDomain(item.url);

  function showOptions() {
    Alert.alert('Options', undefined, [
      { text: 'Edit', onPress: () => onEdit(item) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <TouchableOpacity style={s.item} onPress={() => item.url ? Linking.openURL(item.url) : null} activeOpacity={item.url ? 0.7 : 1}>
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={s.thumb} resizeMode="cover" onError={() => {}} />
      ) : (
        <View style={s.thumbPlaceholder}>
          {item.site_name
            ? <Text style={s.thumbInitial}>{item.site_name.charAt(0).toUpperCase()}</Text>
            : <Ionicons name={getTypeIcon(type)} size={26} color={colors.textMuted} />}
        </View>
      )}
      <View style={s.itemContent}>
        <Text style={s.itemTitle} numberOfLines={2}>{item.title || item.content}</Text>
        {item.summary ? <Text style={s.itemSummary} numberOfLines={2}>{item.summary}</Text> : null}
        <View style={s.itemMeta}>
          {(item.site_name || domain) ? <Text style={s.metaText}>{item.site_name || domain} · </Text> : null}
          {item.category ? <Text style={s.metaCategory}>{item.category} · </Text> : <Text style={s.metaText}>{type} · </Text>}
          <Text style={s.metaText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={showOptions} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }} style={s.moreBtn}>
        <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function EditModal({ item, onSave, onClose }: { item: Capture; onSave: (id: string, title: string, note: string) => void; onClose: () => void }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [title, setTitle] = useState(item.title ?? '');
  const [note, setNote]   = useState(item.content ?? '');

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <Text style={s.modalHeading}>Edit</Text>

          <Text style={s.modalLabel}>Title</Text>
          <TextInput
            style={s.modalInput} value={title} onChangeText={setTitle}
            placeholder="Title" placeholderTextColor={colors.textMuted}
          />

          <Text style={s.modalLabel}>Your note</Text>
          <TextInput
            style={[s.modalInput, { minHeight: 90, textAlignVertical: 'top' }]}
            value={note} onChangeText={setNote} multiline
            placeholder="Add a note…" placeholderTextColor={colors.textMuted}
          />

          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalCancel} onPress={onClose}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalSave} onPress={() => onSave(item.id, title, note)}>
              <Text style={s.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen(props: Props) {
  if (Platform.OS === 'web') return <WebHomeScreen {...props} />;
  return <MobileHomeScreen {...props} />;
}

function MobileHomeScreen({ captures, session, onRefresh }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [search, setSearch]       = useState('');
  const [editTarget, setEditTarget] = useState<Capture | null>(null);

  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'there';

  const { filtered, sections } = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return { filtered: captures, sections: groupCaptures(captures) };
    const scored = captures
      .map(c => ({ c, score: scoreCapture(c, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) return { filtered: [], sections: [{ title: 'Results', data: [] }] };
    const maxScore  = scored[0].score;
    const cutoff    = Math.max(SCORE_THRESHOLD, maxScore * 0.4);
    const list      = scored.filter(({ score }) => score >= cutoff).map(({ c }) => c);
    return { filtered: list, sections: [{ title: 'Results', data: list }] };
  }, [captures, search]);

  function confirmDelete(id: string) {
    Alert.alert('Delete', 'Remove this capture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await removeCapture(id); onRefresh(); } },
    ]);
  }

  async function handleSaveEdit(id: string, title: string, note: string) {
    await updateCapture(id, { title: title.trim() || undefined, content: note.trim() });
    setEditTarget(null);
    onRefresh();
  }

  return (
    <View style={s.container}>
      {editTarget && (
        <EditModal
          item={editTarget}
          onSave={handleSaveEdit}
          onClose={() => setEditTarget(null)}
        />
      )}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={filtered.length === 0 && !search ? s.emptyContainer : s.listContent}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.greeting}>{getGreeting(username)}</Text>
            <View style={s.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                placeholder='Search... "ramen recipe", "japan trip"'
                placeholderTextColor={colors.textMuted}
                value={search} onChangeText={setSearch} clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={s.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => <CaptureItem item={item} onEdit={setEditTarget} onDelete={confirmDelete} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📥</Text>
            <Text style={s.emptyTitle}>{search.trim() ? 'No matches found' : 'Nothing saved yet'}</Text>
            <Text style={s.emptyText}>{search.trim() ? 'Try a different keyword or tag' : 'Tap + to capture your first note'}</Text>
          </View>
        }
      />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container:      { flex: 1, backgroundColor: c.bg },
    listContent:    { paddingBottom: 20 },
    emptyContainer: { flexGrow: 1 },
    header: {
      backgroundColor: c.bg,
      paddingTop: Platform.OS === 'ios' ? 60 : 48,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    greeting:    { fontSize: 22, fontWeight: '700', color: c.text, marginBottom: 14 },
    searchBar:   { flexDirection: 'row', alignItems: 'center', backgroundColor: c.bgSoft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
    searchIcon:  { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: c.text },
    sectionHeader: {
      fontSize: 12, fontWeight: '700', color: c.sectionHead,
      textTransform: 'uppercase', letterSpacing: 1,
      paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8,
      backgroundColor: c.bg,
    },
    item: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.bgSoft,
      marginHorizontal: 14, marginBottom: 8, borderRadius: 18, padding: 12,
    },
    thumb:            { width: 62, height: 62, borderRadius: 14, backgroundColor: c.border },
    thumbPlaceholder: { width: 62, height: 62, borderRadius: 14, backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' },
    thumbInitial:     { fontSize: 22, fontWeight: '700', color: c.primary },
    itemContent:      { flex: 1, marginHorizontal: 12 },
    itemTitle:        { fontSize: 15, fontWeight: '600', color: c.text, lineHeight: 20 },
    itemSummary:      { fontSize: 12, color: c.textSub, lineHeight: 17, marginTop: 3 },
    itemMeta:         { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    metaText:         { fontSize: 12, color: c.textMuted },
    metaCategory:     { fontSize: 12, color: c.primary, fontWeight: '600' },
    moreBtn:          { padding: 4 },
    empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyIcon:  { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.text, marginTop: 12 },
    emptyText:  { fontSize: 14, color: c.textMuted, marginTop: 6, textAlign: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    modalCard:    { backgroundColor: c.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeading: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 20 },
    modalLabel:   { fontSize: 13, fontWeight: '600', color: c.textSub, marginBottom: 6 },
    modalInput:   { backgroundColor: c.bgSoft, borderRadius: 14, padding: 14, fontSize: 15, color: c.text, marginBottom: 16 },
    modalBtns:    { flexDirection: 'row', gap: 10, marginTop: 4 },
    modalCancel:  { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    modalCancelText: { fontSize: 15, fontWeight: '600', color: c.textSub },
    modalSave:    { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center' },
    modalSaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
