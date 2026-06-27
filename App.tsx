import 'react-native-url-polyfill/auto';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { useShareIntentSafe } from './src/useShareIntentSafe';
import { supabase } from './src/supabase';
import HomeScreen from './src/HomeScreen';
import AddScreen from './src/AddScreen';
import AuthScreen from './src/AuthScreen';
import CollectionsScreen from './src/CollectionsScreen';
import ProfileScreen from './src/ProfileScreen';
import BottomNav, { MainTab } from './src/BottomNav';
import WebLayout from './src/WebLayout';
import { Capture, loadCaptures } from './src/storage';

type AppScreen = 'main' | 'add';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<AppScreen>('main');
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [sharedContent, setSharedContent] = useState('');

  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentSafe();

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

  useEffect(() => {
    if (hasShareIntent && session) {
      const text = shareIntent?.text ?? shareIntent?.webUrl ?? '';
      if (text) {
        setSharedContent(text);
        setScreen('add');
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, session, resetShareIntent]);

  if (!session) {
    return <AuthScreen />;
  }

  if (screen === 'add') {
    return (
      <>
        <StatusBar style="dark" />
        <AddScreen
          initialContent={sharedContent}
          onDone={() => { setSharedContent(''); refresh(); setScreen('main'); }}
          onBack={() => { setSharedContent(''); setScreen('main'); }}
        />
      </>
    );
  }

  const mainContent = (
    <>
      {activeTab === 'home' && (
        <HomeScreen captures={captures} session={session} onRefresh={refresh} />
      )}
      {activeTab === 'collections' && (
        <CollectionsScreen captures={captures} />
      )}
      {activeTab === 'profile' && (
        <ProfileScreen session={session} captures={captures} />
      )}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <WebLayout
          captures={captures}
          activeTab={activeTab}
          onTabPress={setActiveTab}
          onAdd={() => setScreen('add')}
        >
          {mainContent}
        </WebLayout>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {mainContent}
      <BottomNav
        activeTab={activeTab}
        onTabPress={setActiveTab}
        onAdd={() => setScreen('add')}
      />
    </View>
  );
}
