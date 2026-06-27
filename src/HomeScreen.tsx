import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, SectionList, TouchableOpacity,
  Alert, StyleSheet, Platform, ActivityIndicator, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Session } from '@supabase/supabase-js';
import { Capture, removeCapture } from './storage';
import { expandSearchQuery } from './tagger';
import WebHomeScreen from './WebHomeScreen';

interface Props {
  captures: Capture[];
  session: Session;
  onRefresh: () => void;
}

interface Section {
  title: string;
  data: Capture[];
}

function getGreeting(username: string): string {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${username} 👋`;
}

function getDomain(url?: string): string {
  if (!url) return '';
  try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
}

function getContentType(capture: Capture): string {
  const url = (capture.url ?? '').toLowerCase();
  const tags = capture.tags.map(t => t.toLowerCase());
  if (url.includes('youtube.com') || url.includes('youtu.be') || tags.includes('video')) return 'Video';
  if (tags.includes('pdf') || url.endsWith('.pdf')) return 'PDF';
  if (tags.includes('recipe')) return 'Recipe';
  if (tags.includes('article') || tags.includes('news')) return 'Article';
  return 'Link';
}

function getTypeIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'Video': return 'play-circle-outline';
    case 'PDF': return 'document-outline';
    case 'Recipe': return 'restaurant-outline';
    case 'Article': return 'newspaper-outline';
    default: return 'link-outline';
  }
}

function formatDate(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function groupCaptures(captures: Capture[]): Section[] {
  const now = Date.now();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 7 * 86400000;

  const groups: Record<string, Capture[]> = {
    Today: [], Yesterday: [], 'This Week': [], Older: [],
  };

  for (const c of captures) {
    const t = new Date(c.created_at).getTime();
    if (t >= todayStart) groups['Today'].push(c);
    else if (t >= yesterdayStart) groups['Yesterday'].push(c);
    else if (t >= weekStart) groups['This Week'].push(c);
    else groups['Older'].push(c);
  }

  return Object.entries(groups)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
}

function CaptureItem({ item, onDelete }: { item: Capture; onDelete: (id: string) => void }) {
  const type = getContentType(item);
  const domain = getDomain(item.url);

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => item.url ? Linking.openURL(item.url) : null}
      activeOpacity={item.url ? 0.7 : 1}
    >
      {item.thumbnail_url ? (
        <Image
          source={{ uri: item.thumbnail_url }}
          style={styles.thumb}
          resizeMode="cover"
          onError={() => {}}
        />
      ) : (
        <View style={styles.thumbPlaceholder}>
          {item.site_name ? (
            <Text style={styles.thumbInitial}>
              {item.site_name.charAt(0).toUpperCase()}
            </Text>
          ) : (
            <Ionicons name={getTypeIcon(type)} size={26} color="#A0AEC0" />
          )}
        </View>
      )}

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title || item.content}
        </Text>
        {item.summary ? (
          <Text style={styles.itemSummary} numberOfLines={2}>{item.summary}</Text>
        ) : null}
        <View style={styles.itemMeta}>
          {(item.site_name || domain) ? <Text style={styles.metaText}>{item.site_name || domain} · </Text> : null}
          {item.category ? <Text style={styles.metaCategory}>{item.category} · </Text> : <Text style={styles.metaText}>{type} · </Text>}
          <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => onDelete(item.id)}
        hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        style={styles.moreBtn}
      >
        <Ionicons name="ellipsis-vertical" size={16} color="#CBD5E0" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function HomeScreen(props: Props) {
  if (Platform.OS === 'web') {
    return <WebHomeScreen {...props} />;
  }
  return <MobileHomeScreen {...props} />;
}

function MobileHomeScreen({ captures, session, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'there';
  const greeting = getGreeting(username);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setExpandedTerms([]); setSearching(false); return; }
    setExpandedTerms([q]);
    setSearching(true);
    const timer = setTimeout(async () => {
      const terms = await expandSearchQuery(q);
      setExpandedTerms(terms);
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const filtered = captures.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const terms = expandedTerms.length > 0 ? expandedTerms : [q];

    // Bidirectional tag match — "cheese" finds "grilled-cheese", "recipe" finds "recipes"
    const tagMatch = c.tags.some(tag =>
      terms.some(term => tag.includes(term) || term.includes(tag))
    );

    // Search across every text field using all expanded terms
    const allText = [c.title, c.content, c.summary, c.description, c.category, c.site_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const textMatch = terms.some(term => allText.includes(term));

    return tagMatch || textMatch;
  });

  const sections = groupCaptures(filtered);

  function confirmDelete(id: string) {
    Alert.alert('Delete', 'Remove this capture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await removeCapture(id); onRefresh(); } },
    ]);
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={filtered.length === 0 && !search ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>{greeting}</Text>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color="#A0AEC0" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder='Search... "ramen recipe", "japan trip"'
                placeholderTextColor="#A0AEC0"
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
              {searching && <ActivityIndicator size="small" color="#A0AEC0" />}
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <CaptureItem item={item} onDelete={confirmDelete} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyTitle}>
              {search.trim() ? 'No matches found' : 'Nothing saved yet'}
            </Text>
            <Text style={styles.emptyText}>
              {search.trim() ? 'Try a different keyword or tag' : 'Tap + to capture your first note'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flexGrow: 1 },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#1A202C', marginBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
    borderRadius: 16,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A202C' },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C0C8D8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 18,
    padding: 12,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#ECEEF2',
  },
  thumbPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5A67D8',
  },
  itemContent: { flex: 1, marginHorizontal: 12 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#1A202C', lineHeight: 20 },
  itemSummary: { fontSize: 12, color: '#718096', lineHeight: 17, marginTop: 3 },
  itemMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
  metaText: { fontSize: 12, color: '#A0AEC0' },
  metaCategory: { fontSize: 12, color: '#5A67D8', fontWeight: '600' },
  moreBtn: { padding: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#2D3748', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#A0AEC0', marginTop: 6, textAlign: 'center' },
});
