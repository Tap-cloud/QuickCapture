import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { Capture } from './storage';
import { useTheme } from './theme';

interface Props { session: Session; captures: Capture[] }

export default function ProfileScreen({ session, captures }: Props) {
  const { colors, isDark, toggle } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'User';
  const email    = session.user.email ?? '';
  const initial  = username.charAt(0).toUpperCase();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner}>
      <View style={s.header}>
        <Text style={s.title}>Profile</Text>
      </View>

      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.username}>{username}</Text>
        <Text style={s.email}>{email}</Text>
      </View>

      <View style={s.statsCard}>
        <View style={s.stat}>
          <Text style={s.statNumber}>{captures.length}</Text>
          <Text style={s.statLabel}>Items saved</Text>
        </View>
      </View>

      <View style={s.section}>
        <TouchableOpacity style={s.row} onPress={toggle} activeOpacity={0.7}>
          <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.primary} />
          <Text style={s.rowText}>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
          <View style={[s.toggle, isDark && s.toggleOn]}>
            <View style={[s.toggleThumb, isDark && s.toggleThumbOn]} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[s.section, { marginTop: 12 }]}>
        <TouchableOpacity style={s.row} onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          <Text style={s.rowTextDanger}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    inner:     { paddingBottom: 100 },
    header: {
      paddingTop: Platform.OS === 'ios' ? 60 : 48,
      paddingHorizontal: 20, paddingBottom: 16,
      backgroundColor: c.bg,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    title:         { fontSize: 26, fontWeight: '700', color: c.text },
    avatarSection: { alignItems: 'center', paddingVertical: 32 },
    avatar: {
      width: 84, height: 84, borderRadius: 42,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    avatarText: { fontSize: 34, fontWeight: '700', color: '#FFFFFF' },
    username:   { fontSize: 22, fontWeight: '700', color: c.text, marginTop: 12 },
    email:      { fontSize: 14, color: c.textSub, marginTop: 4 },
    statsCard: {
      flexDirection: 'row', justifyContent: 'center',
      backgroundColor: c.bgSoft,
      marginHorizontal: 20, borderRadius: 20,
      paddingVertical: 24, marginBottom: 24,
    },
    stat:       { alignItems: 'center', paddingHorizontal: 32 },
    statNumber: { fontSize: 32, fontWeight: '700', color: c.primary },
    statLabel:  { fontSize: 13, color: c.textSub, marginTop: 2 },
    section: {
      backgroundColor: c.bgSoft,
      marginHorizontal: 20, borderRadius: 20, overflow: 'hidden',
    },
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 16, gap: 12,
    },
    rowText:       { flex: 1, fontSize: 15, color: c.text, fontWeight: '500' },
    rowTextDanger: { fontSize: 15, color: '#E53E3E', fontWeight: '500' },
    toggle: {
      width: 44, height: 26, borderRadius: 13,
      backgroundColor: c.border,
      justifyContent: 'center', paddingHorizontal: 2,
    },
    toggleOn:       { backgroundColor: c.primary },
    toggleThumb:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
    toggleThumbOn:  { alignSelf: 'flex-end' },
  });
}
