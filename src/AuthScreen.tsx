import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from './supabase';

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const [tab, setTab] = useState<Tab>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signedUp, setSignedUp] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError('');
    setSignedUp(false);
    setConfirmPassword('');
  }

  function clearError() {
    setError('');
  }

  async function handleSubmit() {
    if (tab === 'signup') {
      if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
        setError('Please fill in all fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setError('Please enter your email and password.');
        return;
      }
    }

    setLoading(true);
    setError('');

    if (tab === 'signup') {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username: username.trim() } },
      });
      if (err) {
        setError(err.message);
      } else {
        // Try to sign in immediately — works if email auto-confirm is enabled.
        // If email confirmation is required, this will fail and we show the check-email screen.
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          setSignedUp(true); // Show "check your email" as fallback
        }
        // If sign-in succeeds, App.tsx onAuthStateChange navigates to home automatically
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) setError('Incorrect email or password.');
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoArea}>
          <Text style={styles.logo}>📥</Text>
          <Text style={styles.appName}>QuickCapture</Text>
          <Text style={styles.tagline}>Save anything. Find it fast.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, tab === 'signin' && styles.tabActive]}
              onPress={() => switchTab('signin')}
            >
              <Text style={[styles.tabText, tab === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'signup' && styles.tabActive]}
              onPress={() => switchTab('signup')}
            >
              <Text style={[styles.tabText, tab === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {signedUp ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>📬</Text>
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successText}>
                We sent a confirmation link to{' '}
                <Text style={{ fontWeight: '700' }}>{email.trim()}</Text>.
                {'\n'}Click it, then come back to sign in.
              </Text>
              <TouchableOpacity onPress={() => switchTab('signin')} style={styles.btn}>
                <Text style={styles.btnText}>Go to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              {tab === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#A0AEC0"
                  value={username}
                  onChangeText={t => { setUsername(t); clearError(); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#A0AEC0"
                value={email}
                onChangeText={t => { setEmail(t); clearError(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={t => { setPassword(t); clearError(); }}
                secureTextEntry
                autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                onSubmitEditing={tab === 'signup' ? undefined : handleSubmit}
              />
              {tab === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#A0AEC0"
                  value={confirmPassword}
                  onChangeText={t => { setConfirmPassword(t); clearError(); }}
                  secureTextEntry
                  autoComplete="new-password"
                  onSubmitEditing={handleSubmit}
                />
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {loading ? (
                <ActivityIndicator color="#5A67D8" style={{ marginVertical: 20 }} />
              ) : (
                <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.85}>
                  <Text style={styles.btnText}>
                    {tab === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 56 },
  appName: { fontSize: 28, fontWeight: '700', color: '#1A202C', marginTop: 12 },
  tagline: { fontSize: 14, color: '#718096', marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#5A67D8',
  },
  tabText: { fontSize: 15, fontWeight: '500', color: '#A0AEC0' },
  tabTextActive: { color: '#5A67D8' },
  form: { padding: 20, paddingTop: 4 },
  input: {
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A202C',
    marginTop: 12,
  },
  error: { color: '#E53E3E', fontSize: 13, marginTop: 8 },
  btn: {
    backgroundColor: '#5A67D8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  successBox: { alignItems: 'center', padding: 24 },
  successIcon: { fontSize: 40 },
  successTitle: { fontSize: 18, fontWeight: '700', color: '#1A202C', marginTop: 12 },
  successText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});
