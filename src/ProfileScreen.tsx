import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { Capture } from './storage';

interface Props {
  session: Session;
  captures: Capture[];
}

export default function ProfileScreen({ session, captures }: Props) {
  const username = session.user.user_metadata?.username ?? session.user.email?.split('@')[0] ?? 'User';
  const email = session.user.email ?? '';
  const initial = username.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{captures.length}</Text>
          <Text style={styles.statLabel}>Items saved</Text>
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.row} onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          <Text style={styles.rowTextDanger}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { paddingBottom: 100 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: { fontSize: 26, fontWeight: '700', color: '#1A202C' },
  avatarSection: { alignItems: 'center', paddingVertical: 32 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#5A67D8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: { fontSize: 34, fontWeight: '700', color: '#FFFFFF' },
  username: { fontSize: 22, fontWeight: '700', color: '#1A202C', marginTop: 12 },
  email: { fontSize: 14, color: '#718096', marginTop: 4 },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#F7F8FC',
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 24,
    marginBottom: 24,
  },
  stat: { alignItems: 'center', paddingHorizontal: 32 },
  statNumber: { fontSize: 32, fontWeight: '700', color: '#5A67D8' },
  statLabel: { fontSize: 13, color: '#718096', marginTop: 2 },
  section: {
    backgroundColor: '#F7F8FC',
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  rowTextDanger: { fontSize: 15, color: '#E53E3E', fontWeight: '500' },
});
