import { useMemo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './theme';

export type MainTab = 'home' | 'collections' | 'profile';

interface Props {
  activeTab: MainTab;
  onTabPress: (tab: MainTab) => void;
  onAdd: () => void;
}

export default function BottomNav({ activeTab, onTabPress, onAdd }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.tab} onPress={() => onTabPress('home')}>
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={24}
          color={activeTab === 'home' ? colors.primary : colors.textMuted}
        />
        <Text style={[s.label, activeTab === 'home' && s.activeLabel]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.tab} onPress={() => onTabPress('collections')}>
        <Ionicons
          name={activeTab === 'collections' ? 'grid' : 'grid-outline'}
          size={24}
          color={activeTab === 'collections' ? colors.primary : colors.textMuted}
        />
        <Text style={[s.label, activeTab === 'collections' && s.activeLabel]}>Collections</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.addBtn} onPress={onAdd}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity style={s.tab} onPress={() => onTabPress('profile')}>
        <Ionicons
          name={activeTab === 'profile' ? 'person' : 'person-outline'}
          size={24}
          color={activeTab === 'profile' ? colors.primary : colors.textMuted}
        />
        <Text style={[s.label, activeTab === 'profile' && s.activeLabel]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingBottom: Platform.OS === 'ios' ? 28 : 8,
      paddingTop: 10,
      paddingHorizontal: 8,
    },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
    label:       { fontSize: 11, color: c.textMuted, marginTop: 3 },
    activeLabel: { color: c.primary, fontWeight: '600' },
    addBtn: {
      width: 58, height: 58, borderRadius: 29,
      backgroundColor: c.primary,
      alignItems: 'center', justifyContent: 'center',
      marginHorizontal: 12, marginBottom: 6,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
    },
  });
}
