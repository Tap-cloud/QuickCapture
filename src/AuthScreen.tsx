import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from './supabase';
import { useTheme } from './theme';

type Tab = 'signin' | 'signup';

const OCEAN: [string, string, string] = ['#0B1D35', '#0E4166', '#0B7A75'];

export default function AuthScreen() {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab]                         = useState<Tab>('signin');
  const [username, setUsername]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  function switchTab(t: Tab) { setTab(t); setError(''); setConfirmPassword(''); }

  async function handleSubmit() {
    if (tab === 'signup') {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all fields.'); return;
      }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    } else {
      if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    }

    setLoading(true); setError('');

    if (tab === 'signup') {
      const { data: signUpData, error: err } = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { data: { username: username.trim() } },
      });
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already in use')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(err.message);
        }
      } else if (signUpData.user?.identities?.length === 0) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInErr) setError('Account created! Please sign in.');
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) setError('Incorrect email or password.');
    }

    setLoading(false);
  }

  return (
    <LinearGradient colors={OCEAN} style={s.gradient} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
      {/* Decorative circles */}
      <View style={s.circleTopLeft} />
      <View style={s.circleBottomRight} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo / wordmark ── */}
          <View style={s.logoArea}>
            <View style={s.iconRing}>
              <Ionicons name="water" size={26} color="#57C9C4" />
            </View>

            <Text style={s.wordmark}>Cove</Text>
            <View style={s.wordmarkUnderline} />
            <Text style={s.tagline}>Your personal corner of the internet</Text>
          </View>

          {/* ── Form card ── */}
          <View style={s.card}>
            {/* Tabs */}
            <View style={s.tabs}>
              <TouchableOpacity style={[s.tab, tab === 'signin' && s.tabActive]} onPress={() => switchTab('signin')}>
                <Text style={[s.tabText, tab === 'signin' && s.tabTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.tab, tab === 'signup' && s.tabActive]} onPress={() => switchTab('signup')}>
                <Text style={[s.tabText, tab === 'signup' && s.tabTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {tab === 'signup' && (
              <View style={s.inputWrap}>
                <Ionicons name="person-outline" size={16} color="#94A3B8" style={s.inputIcon} />
                <TextInput
                  style={s.input} placeholder="Username" placeholderTextColor="#94A3B8"
                  value={username} onChangeText={t => { setUsername(t); setError(''); }}
                  autoCapitalize="none" autoCorrect={false}
                />
              </View>
            )}

            <View style={s.inputWrap}>
              <Ionicons name="mail-outline" size={16} color="#94A3B8" style={s.inputIcon} />
              <TextInput
                style={s.input} placeholder="Email" placeholderTextColor="#94A3B8"
                value={email} onChangeText={t => { setEmail(t); setError(''); }}
                autoCapitalize="none" keyboardType="email-address" autoCorrect={false}
              />
            </View>

            <View style={s.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" style={s.inputIcon} />
              <TextInput
                style={s.input} placeholder="Password" placeholderTextColor="#94A3B8"
                value={password} onChangeText={t => { setPassword(t); setError(''); }}
                secureTextEntry returnKeyType="go" onSubmitEditing={handleSubmit}
              />
            </View>

            {tab === 'signup' && (
              <View style={s.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color="#94A3B8" style={s.inputIcon} />
                <TextInput
                  style={s.input} placeholder="Confirm Password" placeholderTextColor="#94A3B8"
                  value={confirmPassword} onChangeText={t => { setConfirmPassword(t); setError(''); }}
                  secureTextEntry returnKeyType="go" onSubmitEditing={handleSubmit}
                />
              </View>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitText}>{tab === 'signin' ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => switchTab(tab === 'signin' ? 'signup' : 'signin')} activeOpacity={0.7}>
              <Text style={s.switchText}>
                {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={s.switchLink}>{tab === 'signin' ? 'Sign up' : 'Sign in'}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    gradient: { flex: 1 },

    // Decorative background circles
    circleTopLeft: {
      position: 'absolute', top: -80, left: -80,
      width: 260, height: 260, borderRadius: 130,
      backgroundColor: 'rgba(87, 201, 196, 0.12)',
    },
    circleBottomRight: {
      position: 'absolute', bottom: -100, right: -60,
      width: 300, height: 300, borderRadius: 150,
      backgroundColor: 'rgba(14, 65, 102, 0.5)',
    },

    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingTop: Platform.OS === 'ios' ? 80 : 60,
      paddingBottom: 60,
    },

    // Logo / wordmark
    logoArea: { alignItems: 'center', marginBottom: 40 },
    iconRing: {
      width: 54, height: 54, borderRadius: 27,
      borderWidth: 1.5, borderColor: 'rgba(87,201,196,0.5)',
      backgroundColor: 'rgba(87,201,196,0.12)',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 18,
    },
    wordmark: {
      fontSize: 64,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 6,
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowOffset: { width: 0, height: 3 },
      textShadowRadius: 8,
    },
    wordmarkUnderline: {
      width: 48, height: 3, borderRadius: 2,
      backgroundColor: '#57C9C4',
      marginTop: 8, marginBottom: 14,
    },
    tagline: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.6)',
      letterSpacing: 0.3,
      textAlign: 'center',
    },

    // Form card
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 28,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: '#F1F5F9',
      borderRadius: 14, padding: 4, marginBottom: 20,
    },
    tab:           { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive:     { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    tabText:       { fontSize: 14, fontWeight: '500', color: '#94A3B8' },
    tabTextActive: { color: '#0E4166', fontWeight: '700' },

    inputWrap: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#F8FAFC',
      borderRadius: 14, marginBottom: 12,
      paddingHorizontal: 14,
    },
    inputIcon: { marginRight: 10 },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15, color: '#0F172A',
    },

    error:      { fontSize: 13, color: '#E53E3E', textAlign: 'center', marginBottom: 10 },
    submitBtn: {
      backgroundColor: '#0E4166',
      borderRadius: 14, paddingVertical: 16,
      alignItems: 'center', marginTop: 4, marginBottom: 16,
      shadowColor: '#0E4166',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    submitText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
    switchText:  { fontSize: 13, color: '#94A3B8', textAlign: 'center' },
    switchLink:  { color: '#0B7A75', fontWeight: '700' },
  });
}
