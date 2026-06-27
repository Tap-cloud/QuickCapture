import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Capture } from './storage';
import { MainTab } from './BottomNav';
import { COLLECTION_TAGS } from './tagger';

const DOT_COLORS = ['#5A67D8', '#E53E3E', '#38A169', '#D69E2E', '#2B6CB0', '#C05621'];

const NAV: { key: MainTab; off: keyof typeof Ionicons.glyphMap; on: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: 'home',        off: 'home-outline',   on: 'home',   label: 'Home' },
  { key: 'collections', off: 'grid-outline',   on: 'grid',   label: 'Collections' },
  { key: 'profile',     off: 'person-outline', on: 'person', label: 'Profile' },
];

function sidebarCollections(captures: Capture[]): [string, number][] {
  const map = new Map<string, number>();
  for (const c of captures)
    for (const t of c.tags) {
      if (!COLLECTION_TAGS.has(t)) continue;
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  return [...map.entries()].sort(([, a], [, b]) => b - a).slice(0, 7);
}

interface Props {
  captures: Capture[];
  activeTab: MainTab;
  onTabPress: (tab: MainTab) => void;
  onAdd: () => void;
  children: ReactNode;
}

export default function WebLayout({ captures, activeTab, onTabPress, onAdd, children }: Props) {
  const collections = sidebarCollections(captures);

  return (
    <View style={s.root}>
      {/* ── Sidebar ── */}
      <View style={s.sidebar}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.sidebarInner}>

          {/* Logo */}
          <View style={s.logo}>
            <View style={s.logoMark}>
              <Ionicons name="bookmark" size={15} color="#fff" />
            </View>
            <Text style={s.logoText}>Later</Text>
          </View>

          {/* Nav */}
          <View style={s.navGroup}>
            {NAV.map(item => {
              const active = activeTab === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[s.navItem, active && s.navActive]}
                  onPress={() => onTabPress(item.key)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={active ? item.on : item.off} size={19} color={active ? '#5A67D8' : '#718096'} />
                  <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button */}
          <TouchableOpacity style={s.saveBtn} onPress={onAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.saveBtnText}>Save something</Text>
          </TouchableOpacity>

          {/* Collections list */}
          {collections.length > 0 && (
            <View style={s.collectGroup}>
              <View style={s.collectHeader}>
                <Text style={s.collectTitle}>Collections</Text>
              </View>
              {collections.map(([tag, count], i) => (
                <TouchableOpacity
                  key={tag}
                  style={s.collectRow}
                  onPress={() => onTabPress('collections')}
                  activeOpacity={0.7}
                >
                  <View style={[s.dot, { backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }]} />
                  <Text style={s.collectName} numberOfLines={1}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </Text>
                  <Text style={s.collectCount}>{count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Stats */}
          <View style={s.statsCard}>
            <Text style={s.statsNum}>{captures.length}</Text>
            <Text style={s.statsLabel}>Items saved</Text>
          </View>

        </ScrollView>
      </View>

      {/* ── Content ── */}
      <View style={s.content}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#F7F8FC' },

  sidebar: { width: 210, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#F0F0F0' },
  sidebarInner: { padding: 18, paddingTop: 26, flexGrow: 1 },

  logo: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  logoMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#5A67D8', alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  logoText: { fontSize: 15, fontWeight: '700', color: '#1A202C' },

  navGroup: { marginBottom: 22 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, marginBottom: 2 },
  navActive: { backgroundColor: '#EEF2FF' },
  navLabel: { fontSize: 14, color: '#718096', marginLeft: 10, fontWeight: '500' },
  navLabelActive: { color: '#5A67D8', fontWeight: '600' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#5A67D8', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16, marginBottom: 24,
    shadowColor: '#5A67D8', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 7 },

  collectGroup: { marginBottom: 22 },
  collectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  collectTitle: { fontSize: 10, fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase', letterSpacing: 0.9 },
  collectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 9 },
  collectName: { flex: 1, fontSize: 13, color: '#2D3748', fontWeight: '500' },
  collectCount: { fontSize: 12, color: '#A0AEC0', fontWeight: '600' },

  statsCard: { backgroundColor: '#F7F8FC', borderRadius: 14, padding: 14, marginTop: 8 },
  statsNum: { fontSize: 24, fontWeight: '800', color: '#5A67D8' },
  statsLabel: { fontSize: 11, color: '#A0AEC0', marginTop: 2, fontWeight: '500' },

  content: { flex: 1 },
});
