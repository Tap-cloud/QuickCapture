import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/supabase';
import HomeScreen from './src/HomeScreen';
import AddScreen from './src/AddScreen';
import AuthScreen from './src/AuthScreen';
import { Capture, loadCaptures } from './src/storage';

type Screen = 'home' | 'add';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [captures, setCaptures] = useState<Capture[]>([]);

  const refresh = useCallback(async () => {
    const data = await loadCaptures();
    setCaptures(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) refresh();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {!session ? (
        <AuthScreen />
      ) : screen === 'home' ? (
        <HomeScreen
          captures={captures}
          onAdd={() => setScreen('add')}
          onRefresh={refresh}
        />
      ) : (
        <AddScreen
          onDone={() => {
            refresh();
            setScreen('home');
          }}
          onBack={() => setScreen('home')}
        />
      )}
    </View>
  );
}
