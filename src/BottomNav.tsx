import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type MainTab = 'home' | 'collections' | 'profile';

interface Props {
  activeTab: MainTab;
  onTabPress: (tab: MainTab) => void;
  onAdd: () => void;
}

export default function BottomNav({ activeTab, onTabPress, onAdd }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => onTabPress('home')}>
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={24}
          color={activeTab === 'home' ? '#5A67D8' : '#A0AEC0'}
        />
        <Text style={[styles.label, activeTab === 'home' && styles.activeLabel]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onTabPress('collections')}>
        <Ionicons
          name={activeTab === 'collections' ? 'grid' : 'grid-outline'}
          size={24}
          color={activeTab === 'collections' ? '#5A67D8' : '#A0AEC0'}
        />
        <Text style={[styles.label, activeTab === 'collections' && styles.activeLabel]}>Collections</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onTabPress('profile')}>
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={24}
          color={activeTab === 'profile' ? '#5A67D8' : '#A0AEC0'}
        />
        <Text style={[styles.label, activeTab === 'profile' && styles.activeLabel]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: { fontSize: 11, color: '#A0AEC0', marginTop: 3 },
  activeLabel: { color: '#5A67D8', fontWeight: '600' },
  addBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#5A67D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginBottom: 6,
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
