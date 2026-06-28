import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_KEY = 'cove_onboarding_done';

const OCEAN: [string, string, string] = ['#0B1D35', '#0E4166', '#0B7A75'];

const STEPS = [
  {
    icon: 'link' as const,
    color: '#57C9C4',
    title: 'Save anything',
    desc: 'Paste a YouTube video, article, recipe, or just type a note — anything goes.',
  },
  {
    icon: 'sparkles' as const,
    color: '#818CF8',
    title: 'Auto-tagged for you',
    desc: 'Cove reads the content and organises it instantly. No folders, no manual work.',
  },
  {
    icon: 'search' as const,
    color: '#34D399',
    title: 'Find it fast',
    desc: 'Search by topic, keyword, or browse smart collections. Your stuff, always findable.',
  },
];

interface Props { onDone: () => void }

export default function OnboardingScreen({ onDone }: Props) {
  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  }

  return (
    <LinearGradient colors={OCEAN} style={s.gradient} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
      {/* decorative circles */}
      <View style={s.circleTop} />
      <View style={s.circleBottom} />

      <View style={s.inner}>
        {/* logo */}
        <View style={s.logoRow}>
          <View style={s.iconRing}>
            <Ionicons name="water" size={22} color="#57C9C4" />
          </View>
          <Text style={s.logoText}>Cove</Text>
        </View>

        <Text style={s.headline}>Your personal corner{'\n'}of the internet</Text>
        <Text style={s.sub}>Here's how it works</Text>

        {/* steps */}
        <View style={s.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={s.step}>
              <View style={[s.stepIcon, { backgroundColor: step.color + '22', borderColor: step.color + '55' }]}>
                <Ionicons name={step.icon} size={22} color={step.color} />
              </View>
              <View style={s.stepText}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.btn} onPress={finish} activeOpacity={0.85}>
          <Text style={s.btnText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <Text style={s.hint}>You can always save from the browser extension too</Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  gradient: { flex: 1 },

  circleTop: {
    position: 'absolute', top: -80, left: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(87,201,196,0.1)',
  },
  circleBottom: {
    position: 'absolute', bottom: -100, right: -60,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(14,65,102,0.5)',
  },

  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 50,
    justifyContent: 'center',
  },

  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  iconRing: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: 'rgba(87,201,196,0.5)',
    backgroundColor: 'rgba(87,201,196,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  logoText: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 4 },

  headline: { fontSize: 30, fontWeight: '800', color: '#fff', lineHeight: 38, marginBottom: 8 },
  sub:      { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 36 },

  steps: { gap: 20, marginBottom: 40 },
  step:  { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepIcon: {
    width: 48, height: 48, borderRadius: 14,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  stepText:  { flex: 1, paddingTop: 2 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  stepDesc:  { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 16,
    paddingVertical: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  btnText: { fontSize: 16, fontWeight: '800', color: '#0E4166' },

  hint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
});
