import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Capture, removeCapture } from './storage';
import { supabase } from './supabase';

interface Props {
  captures: Capture[];
  onAdd: () => void;
  onRefresh: () => void;
}

function formatDate(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeScreen({ captures, onAdd, onRefresh }: Props) {
  const [search, setSearch] = useState('');

  const filtered = captures.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.tags.some(t => t.includes(q)) || c.content.toLowerCase().includes(q);
  });

  function confirmDelete(id: string) {
    Alert.alert('Delete', 'Remove this capture?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeCapture(id);
          onRefresh();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>QuickCapture</Text>
          <Text style={styles.subtitle}>Save anything. Find it fast.</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by tag or keyword..."
          placeholderTextColor="#A0AEC0"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyTitle}>
              {search.trim() ? 'No matches found' : 'Nothing saved yet'}
            </Text>
            <Text style={styles.emptyText}>
              {search.trim()
                ? 'Try a different keyword or tag'
                : 'Tap + to capture your first note'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardContent} numberOfLines={3}>
                {item.content}
              </Text>
              <TouchableOpacity
                onPress={() => confirmDelete(item.id)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Text style={styles.deleteBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tagsRow}>
              {item.tags.map(tag => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={onAdd} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#1A202C' },
  subtitle: { fontSize: 13, color: '#718096', marginTop: 2 },
  signOut: { fontSize: 13, color: '#A0AEC0', paddingBottom: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1A202C' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#2D3748', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#718096', marginTop: 6, textAlign: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardContent: { flex: 1, fontSize: 14, color: '#2D3748', lineHeight: 20, marginRight: 8 },
  deleteBtn: { fontSize: 16, color: '#CBD5E0', fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  tag: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { fontSize: 12, color: '#5A67D8', fontWeight: '500' },
  date: { fontSize: 11, color: '#A0AEC0', marginTop: 4, textAlign: 'right' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5A67D8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { fontSize: 28, color: '#FFFFFF', lineHeight: 32 },
});
