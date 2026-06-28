import { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Capture } from './storage';
import { MainTab } from './BottomNav';
import { COLLECTION_TAGS } from './tagger';
import { useTheme } from './theme';

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
  const { colors, isDark, toggle } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
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
            <Text style={s.logoText}>Cove</Text>
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
                  <Ionicons name={active ? item.on : item.off} size={19} color={active ? colors.primary : colors.textSub} />
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

          {/* Dark mode toggle */}
          <TouchableOpacity style={s.themeRow} onPress={toggle} activeOpacity={0.7}>
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={15} color={colors.textMuted} />
            <Text style={s.themeLabel}>{isDark ? 'Light mode' : 'Dark mode'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* ── Content ── */}
      <View style={s.content}>{children}</View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, flexDirection: 'row', backgroundColor: c.bgSoft },

    sidebar:      { width: 210, backgroundColor: c.bg, borderRightWidth: 1, borderRightColor: c.border },
    sidebarInner: { padding: 18, paddingTop: 26, flexGrow: 1 },

    logo:     { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    logoMark: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
    logoText: { fontSize: 15, fontWeight: '700', color: c.text },

    navGroup:     { marginBottom: 22 },
    navItem:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 11, borderRadius: 10, marginBottom: 2 },
    navActive:    { backgroundColor: c.primaryBg },
    navLabel:     { fontSize: 14, color: c.textSub, marginLeft: 10, fontWeight: '500' },
    navLabelActive: { color: c.primary, fontWeight: '600' },

    saveBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.primary, borderRadius: 12,
      paddingVertical: 12, paddingHorizontal: 16, marginBottom: 24,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
    },
    saveBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 7 },

    collectGroup:  { marginBottom: 22 },
    collectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    collectTitle:  { fontSize: 10, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.9 },
    collectRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, borderRadius: 8 },
    dot:           { width: 7, height: 7, borderRadius: 4, marginRight: 9 },
    collectName:   { flex: 1, fontSize: 13, color: c.text, fontWeight: '500' },
    collectCount:  { fontSize: 12, color: c.textMuted, fontWeight: '600' },

    statsCard:  { backgroundColor: c.bgSoft, borderRadius: 14, padding: 14, marginTop: 8 },
    statsNum:   { fontSize: 24, fontWeight: '800', color: c.primary },
    statsLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '500' },

    themeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 2 },
    themeLabel: { fontSize: 12, color: c.textMuted },

    content: { flex: 1 },
  });
}
