import { Platform } from 'react-native';

interface ShareIntentResult {
  hasShareIntent: boolean;
  shareIntent: { text?: string; webUrl?: string } | null;
  resetShareIntent: () => void;
}

// expo-share-intent only works on iOS and Android — not on web.
// This wrapper returns empty values on web so the app still loads on Vercel.
export function useShareIntentSafe(): ShareIntentResult {
  if (Platform.OS === 'web') {
    return { hasShareIntent: false, shareIntent: null, resetShareIntent: () => {} };
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useShareIntent } = require('expo-share-intent');
  return useShareIntent();
}
