import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, Modal,
  TextInput, StyleSheet, Platform, Linking, Alert,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Capture, UserCollection,
  loadUserCollections, createUserCollection, deleteUserCollection,
} from './storage';
import { COLLECTION_TAGS } from './tagger';
import { useTheme } from './theme';

// ── Constants ────────────────────────────────────────────────

const GRADIENTS: [string, string][] = [
  ['#EEF2FF', '#DDE6FF'], ['#FFF7ED', '#FEE9CC'], ['#ECFDF5', '#D1FAE5'],
  ['#FFF1F2', '#FFE0E3'], ['#F0F9FF', '#DBEEFE'], ['#FEFCE8', '#FEF3C0'],
  ['#F5F3FF', '#E5DEFF'], ['#FDF4FF', '#F3E8FF'],
];
const GRADIENTS_DARK: [string, string][] = [
  ['#1E1B4B', '#2E2A6B'], ['#431407', '#7C2D12'], ['#052E16', '#064E3B'],
  ['#4C0519', '#881337'], ['#0C1A2E', '#1E3A5F'], ['#422006', '#713F12'],
  ['#2E1065', '#4C1D95'], ['#3B0764', '#581C87'],
];
const AUTO_EMOJIS: Record<string, string> = {
  recipe: '🍜', food: '🍜', cooking: '🍳', travel: '✈️', fitness: '💪',
  workout: '🏋️', music: '🎵', tech: '💻', coding: '👨‍💻', finance: '💰',
  investing: '📈', video: '🎥', youtube: '▶️', book: '📚', reading: '📖',
  health: '🏥', art: '🎨', design: '✏️', business: '💼', startup: '💡',
  article: '📰', news: '📰', photography: '📸',
};
const EMOJI_OPTIONS = [
  '📁','🍜','🎵','💪','✈️','💻','💰','📚','🎥','🏥','🎨','💼',
  '📰','🌿','🏠','🐾','🎮','📷','🧘','🏄','🍕','🏋️','📈','🎬',
  '🌍','🛒','💡','📝','🎓','🔬',
];

interface AutoCollection {
  tag: string; name: string; count: number; thumbnail?: string;
  colors: [string, string]; emoji: string;
}
interface DetailConfig { type: 'manual' | 'auto'; name: string; emoji: string; tag?: string }

// ── Helpers ──────────────────────────────────────────────────

function buildAutoCollections(captures: Capture[], isDark: boolean): AutoCollection[] {
  const grads = isDark ? GRADIENTS_DARK : GRADIENTS;
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
    .filter(([, v]) => v.count >= 2)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 12)
    .map(([tag, { count, thumbnail }], i) => ({
      tag, name: tag.charAt(0).toUpperCase() + tag.slice(1),
      count, thumbnail, colors: grads[i % grads.length],
      emoji: AUTO_EMOJIS[tag] ?? '📁',
    }));
}

function captureMatchesManual(capture: Capture, collectionName: string): boolean {
  const words = collectionName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 3);
  if (words.length === 0) return false;
  const tags = capture.tags.map(t => t.toLowerCase());
  const text = [capture.title, capture.content, capture.summary, capture.category, capture.site_name]
    .filter(Boolean).join(' ').toLowerCase();
  return words.some(w => tags.some(t => t.includes(w) || w.includes(t)) || text.includes(w));
}

function getDomain(url?: string) {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function timeAgo(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24)    return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Detail item ──────────────────────────────────────────────

function DetailItem({ item }: { item: Capture }) {
  const { colors } = useTheme();
  const ds = useMemo(() => makeDetailStyles(colors), [colors]);
  const domain  = getDomain(item.url);
  const initial = (item.site_name || item.title || 'Q').charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={ds.item} onPress={() => item.url ? Linking.openURL(item.url) : null} activeOpacity={item.url ? 0.75 : 1}>
      {item.thumbnail_url ? (
        <Image source={{ uri: item.thumbnail_url }} style={ds.thumb} resizeMode="cover" />
      ) : (
        <View style={[ds.thumb, ds.thumbPlaceholder]}>
          <Text style={ds.thumbInitial}>{initial}</Text>
        </View>
      )}
      <View style={ds.info}>
        <Text style={ds.title} numberOfLines={2}>{item.title || item.content}</Text>
        {item.summary ? <Text style={ds.summary} numberOfLines={1}>{item.summary}</Text> : null}
        <View style={ds.meta}>
          {(item.site_name || domain) ? <Text style={ds.metaText}>{item.site_name || domain} · </Text> : null}
          <Text style={ds.metaText}>{timeAgo(item.created_at)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </TouchableOpacity>
  );
}

// ── Collection detail view ───────────────────────────────────

function CollectionDetail({ config, captures, onBack }: { config: DetailConfig; captures: Capture[]; onBack: () => void }) {
  const { colors } = useTheme();
  const ds = useMemo(() => makeDetailStyles(colors), [colors]);

  const items = config.type === 'auto'
    ? captures.filter(c => c.tags.includes(config.tag!))
    : captures.filter(c => captureMatchesManual(c, config.name));

  return (
    <View style={ds.container}>
      <View style={ds.header}>
        <TouchableOpacity onPress={onBack} style={ds.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={ds.headerEmoji}>{config.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={ds.headerTitle}>{config.name}</Text>
          <Text style={ds.headerSub}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
            {config.type === 'manual' ? ' · Manual' : ' · Auto'}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={ds.list}>
        {items.length === 0 ? (
          <View style={ds.empty}>
            <Text style={ds.emptyEmoji}>{config.emoji}</Text>
            <Text style={ds.emptyTitle}>Nothing here yet</Text>
            <Text style={ds.emptyText}>
              {config.type === 'manual'
                ? `Save items about "${config.name}" and they'll appear here automatically`
                : 'Save more items with this tag to see them here'}
            </Text>
          </View>
        ) : (
          items.map(item => <DetailItem key={item.id} item={item} />)
        )}
      </ScrollView>
    </View>
  );
}

// ── Collection card ──────────────────────────────────────────

function CollectionCard({
  name, emoji, count, thumbnail, colors: gradColors, showDelete, onPress, onDelete,
}: {
  name: string; emoji: string; count: number; thumbnail?: string;
  colors: [string, string]; showDelete?: boolean;
  onPress: () => void; onDelete?: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity style={s.cardWrap} activeOpacity={0.85} onPress={onPress}>
      <LinearGradient colors={gradColors} style={s.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={s.cardImage} resizeMode="cover" />
        ) : (
          <View style={s.emojiWrap}>
            <Text style={s.emoji}>{emoji}</Text>
          </View>
        )}
        <View style={s.cardInfo}>
          <Text style={s.cardName} numberOfLines={1}>{name}</Text>
          <Text style={s.cardCount}>{count} items</Text>
        </View>
      </LinearGradient>
      {showDelete && onDelete && (
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={e => { e.stopPropagation?.(); onDelete(); }}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// 2-column grid helper
function CardGrid({ items }: { items: React.ReactNode[] }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={s.grid}>
      {rows.map((row, i) => (
        <View key={i} style={s.gridRow}>
          {row[0]}
          {row[1] ?? <View style={s.cardSpacer} />}
        </View>
      ))}
    </View>
  );
}

// ── Create modal ─────────────────────────────────────────────

function CreateModal({ visible, onClose, onSave }: {
  visible: boolean; onClose: () => void;
  onSave: (name: string, emoji: string) => Promise<void>;
}) {
  const { colors } = useTheme();
  const m = useMemo(() => makeModalStyles(colors), [colors]);

  const [name, setName]     = useState('');
  const [emoji, setEmoji]   = useState('📁');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), emoji);
    setName(''); setEmoji('📁'); setSaving(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={m.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={m.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={m.sheet}>
          <View style={m.handle} />
          <Text style={m.sheetTitle}>New Collection</Text>

          <View style={m.emojiPreview}>
            <Text style={m.emojiPreviewText}>{emoji}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.emojiRow}>
            {EMOJI_OPTIONS.map(e => (
              <TouchableOpacity
                key={e}
                style={[m.emojiOption, emoji === e && m.emojiSelected]}
                onPress={() => setEmoji(e)}
                activeOpacity={0.7}
              >
                <Text style={m.emojiOptionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={m.input}
            placeholder="Collection name…"
            placeholderTextColor={colors.textMuted}
            value={name} onChangeText={setName}
            autoFocus returnKeyType="done" onSubmitEditing={handleSave}
          />

          <View style={m.btns}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={m.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.saveBtn, (!name.trim() || saving) && m.saveBtnDisabled]}
              onPress={handleSave} activeOpacity={0.8} disabled={!name.trim() || saving}
            >
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={m.saveText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────

interface Props { captures: Capture[] }

export default function CollectionsScreen({ captures }: Props) {
  const { colors, isDark } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [userCollections, setUserCollections] = useState<UserCollection[]>([]);
  const [detail, setDetail]                   = useState<DetailConfig | null>(null);
  const [showCreate, setShowCreate]           = useState(false);

  const autoCollections = buildAutoCollections(captures, isDark);

  useEffect(() => { loadUserCollections().then(setUserCollections); }, []);

  async function handleCreate(name: string, emoji: string) {
    await createUserCollection(name, emoji);
    setUserCollections(await loadUserCollections());
    setShowCreate(false);
  }

  function handleDelete(id: string) {
    Alert.alert('Delete Collection', "Remove this collection? Your saved items won't be deleted.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteUserCollection(id);
          setUserCollections(prev => prev.filter(c => c.id !== id));
        },
      },
    ]);
  }

  if (detail) {
    return <CollectionDetail config={detail} captures={captures} onBack={() => setDetail(null)} />;
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Collections</Text>
          <Text style={s.subtitle}>Organize your saves</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={s.section}>
          <Text style={s.sectionLabel}>My Collections</Text>
          {userCollections.length === 0 ? (
            <TouchableOpacity style={s.createPrompt} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={s.createPromptText}>Create your first collection</Text>
            </TouchableOpacity>
          ) : (
            <CardGrid items={userCollections.map((col, i) => (
              <CollectionCard
                key={col.id}
                name={col.name} emoji={col.emoji}
                count={captures.filter(c => captureMatchesManual(c, col.name)).length}
                colors={isDark ? GRADIENTS_DARK[i % GRADIENTS_DARK.length] : GRADIENTS[i % GRADIENTS.length]}
                showDelete
                onPress={() => setDetail({ type: 'manual', name: col.name, emoji: col.emoji })}
                onDelete={() => handleDelete(col.id)}
              />
            ))} />
          )}
        </View>

        {autoCollections.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Auto Collections</Text>
            <Text style={s.sectionSub}>Automatically grouped by topic</Text>
            <CardGrid items={autoCollections.map(col => (
              <CollectionCard
                key={col.tag}
                name={col.name} emoji={col.emoji}
                count={col.count} thumbnail={col.thumbnail} colors={col.colors}
                onPress={() => setDetail({ type: 'auto', name: col.name, emoji: col.emoji, tag: col.tag })}
              />
            ))} />
          </View>
        )}

        {autoCollections.length === 0 && userCollections.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>📁</Text>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptyText}>
              Create a collection above, or save a few items and auto collections will appear
            </Text>
          </View>
        )}

      </ScrollView>

      <CreateModal visible={showCreate} onClose={() => setShowCreate(false)} onSave={handleCreate} />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: Platform.OS === 'ios' ? 60 : 48,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title:    { fontSize: 26, fontWeight: '700', color: c.text },
    subtitle: { fontSize: 13, color: c.textMuted, marginTop: 1 },
    addBtn:   { width: 38, height: 38, borderRadius: 12, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },

    scrollContent: { paddingBottom: 100 },

    section:      { paddingHorizontal: 16, paddingTop: 24 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
    sectionSub:   { fontSize: 12, color: c.sectionHead, marginBottom: 12 },

    createPrompt: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: c.bgSoft, borderRadius: 16, padding: 16, marginTop: 8,
      borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.primary,
    },
    createPromptText: { fontSize: 14, color: c.primary, fontWeight: '600' },

    grid:       { marginTop: 8 },
    gridRow:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
    cardSpacer: { flex: 1 },

    cardWrap: {
      flex: 1, borderRadius: 20, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, position: 'relative',
    },
    card:      { borderRadius: 20, overflow: 'hidden' },
    cardImage: { width: '100%', height: 110 },
    emojiWrap: { width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' },
    emoji:     { fontSize: 44 },
    cardInfo:  { padding: 12 },
    cardName:  { fontSize: 15, fontWeight: '700', color: c.text },
    cardCount: { fontSize: 12, color: c.textSub, marginTop: 2 },
    deleteBtn: { position: 'absolute', top: 8, right: 8 },

    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyIcon:  { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.text, marginTop: 12 },
    emptyText:  { fontSize: 14, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 22 },
  });
}

function makeDetailStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingTop: Platform.OS === 'ios' ? 60 : 48,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn:     { padding: 4 },
    headerEmoji: { fontSize: 26 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: c.text },
    headerSub:   { fontSize: 12, color: c.textMuted, marginTop: 2 },
    list:        { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 100 },
    item: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.bgSoft, borderRadius: 16, padding: 12, marginBottom: 8,
    },
    thumb:            { width: 60, height: 60, borderRadius: 12, backgroundColor: c.border },
    thumbPlaceholder: { backgroundColor: c.primaryBg, alignItems: 'center', justifyContent: 'center' },
    thumbInitial:     { fontSize: 20, fontWeight: '700', color: c.primary },
    info:     { flex: 1, marginHorizontal: 12 },
    title:    { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    summary:  { fontSize: 12, color: c.textSub, marginTop: 3, lineHeight: 16 },
    meta:     { flexDirection: 'row', marginTop: 5 },
    metaText: { fontSize: 11, color: c.textMuted },
    empty:      { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: c.text, marginTop: 12 },
    emptyText:  { fontSize: 14, color: c.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 22 },
  });
}

function makeModalStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay:  { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 28, borderTopRightRadius: 28,
      padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: c.text, textAlign: 'center', marginBottom: 20 },

    emojiPreview:     { width: 72, height: 72, borderRadius: 20, backgroundColor: c.bgSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
    emojiPreviewText: { fontSize: 38 },
    emojiRow:         { paddingHorizontal: 4, gap: 8, paddingBottom: 4 },
    emojiOption:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgSoft },
    emojiSelected:    { backgroundColor: c.primaryBg, borderWidth: 2, borderColor: c.primary },
    emojiOptionText:  { fontSize: 22 },

    input: {
      backgroundColor: c.bgSoft, borderRadius: 14,
      paddingHorizontal: 16, paddingVertical: 14,
      fontSize: 16, color: c.text, marginTop: 16, marginBottom: 20,
    },

    btns:            { flexDirection: 'row', gap: 12 },
    cancelBtn:       { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: c.bgSoft, alignItems: 'center' },
    cancelText:      { fontSize: 15, fontWeight: '600', color: c.textSub },
    saveBtn:         { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveText:        { fontSize: 15, fontWeight: '700', color: '#fff' },
  });
}
