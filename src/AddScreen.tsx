import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { addCapture } from './storage';
import { generateTags } from './tagger';
import { isUrl, fetchURLMeta, URLMeta } from './urlPreview';

interface Props {
  initialContent?: string;
  onDone: () => void;
  onBack: () => void;
}

export default function AddScreen({ initialContent = '', onDone, onBack }: Props) {
  const [content, setContent] = useState(initialContent);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [urlMeta, setUrlMeta] = useState<URLMeta | null>(null);
  const [fetchingMeta, setFetchingMeta] = useState(false);

  const contentIsUrl = isUrl(content);

  useEffect(() => {
    if (!contentIsUrl) {
      setUrlMeta(null);
      return;
    }
    setFetchingMeta(true);
    setUrlMeta(null);
    fetchURLMeta(content.trim()).then(meta => {
      setUrlMeta(meta);
      setFetchingMeta(false);
    });
  }, [content, contentIsUrl]);

  async function handleSave() {
    const trimmedContent = content.trim();
    const trimmedNote = note.trim();
    if (!trimmedContent && !trimmedNote) return;

    setLoading(true);
    setStatus('Generating tags...');

    let tagSource: string;
    if (contentIsUrl) {
      tagSource = [urlMeta?.title, urlMeta?.description, trimmedNote].filter(Boolean).join('. ');
      if (!tagSource) tagSource = trimmedContent;
    } else {
      tagSource = trimmedContent;
    }

    const tags = await generateTags(tagSource, trimmedContent);
    setStatus('Saving...');

    if (contentIsUrl) {
      const savedContent = trimmedNote || urlMeta?.title || trimmedContent;
      await addCapture(savedContent, tags, {
        url: trimmedContent,
        thumbnailUrl: urlMeta?.thumbnail || undefined,
        title: urlMeta?.title || undefined,
        description: urlMeta?.description || undefined,
        siteName: urlMeta?.siteName || undefined,
        category: tags[0] || undefined,
      });
    } else {
      await addCapture(trimmedContent, tags);
    }

    setLoading(false);
    onDone();
  }

  const canSave = contentIsUrl || content.trim().length > 0;

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
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Capture</Text>
        </View>

        {contentIsUrl ? (
          <View>
            <Text style={styles.label}>Link</Text>
            <View style={styles.urlCard}>
              {fetchingMeta ? (
                <View style={styles.metaLoading}>
                  <ActivityIndicator size="small" color="#5A67D8" />
                  <Text style={styles.metaLoadingText}>Loading preview...</Text>
                </View>
              ) : urlMeta?.thumbnail ? (
                <Image
                  source={{ uri: urlMeta.thumbnail }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : null}
              {urlMeta?.title ? (
                <Text style={styles.urlTitle} numberOfLines={2}>{urlMeta.title}</Text>
              ) : null}
              <Text style={styles.urlText} numberOfLines={1}>{content.trim()}</Text>
            </View>

            <Text style={[styles.label, { marginTop: 20 }]}>
              What's this about?{'  '}
              <Text style={styles.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[styles.input, { minHeight: 100 }]}
              placeholder="e.g. 'tonkatsu ramen recipe I want to try'"
              placeholderTextColor="#A0AEC0"
              multiline
              value={note}
              onChangeText={setNote}
              autoFocus
              textAlignVertical="top"
            />
          </View>
        ) : (
          <View>
            <Text style={styles.label}>What do you want to save?</Text>
            <TextInput
              style={styles.input}
              placeholder={'Paste or type anything...\n\nA recipe, article, video link, tip, or any info you want to remember later.'}
              placeholderTextColor="#A0AEC0"
              multiline
              value={content}
              onChangeText={setContent}
              autoFocus
              textAlignVertical="top"
            />
          </View>
        )}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#5A67D8" />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>✨  Save & Auto-Tag</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  inner: { padding: 20, paddingBottom: 60 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    marginBottom: 28,
  },
  backBtn: { marginBottom: 14 },
  backText: { fontSize: 16, color: '#5A67D8', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A202C' },
  label: { fontSize: 15, fontWeight: '500', color: '#4A5568', marginBottom: 10 },
  optional: { fontSize: 13, fontWeight: '400', color: '#A0AEC0' },
  urlCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 18,
    overflow: 'hidden',
  },
  metaLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  metaLoadingText: { fontSize: 13, color: '#A0AEC0', marginLeft: 8 },
  thumbnail: {
    width: '100%',
    height: 180,
  },
  urlTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  urlText: {
    fontSize: 12,
    color: '#A0AEC0',
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  input: {
    backgroundColor: '#F7F8FC',
    borderRadius: 18,
    borderWidth: 0,
    padding: 16,
    fontSize: 15,
    color: '#1A202C',
    minHeight: 220,
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  loadingText: { fontSize: 14, color: '#718096', marginLeft: 10 },
  saveBtn: {
    backgroundColor: '#5A67D8',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#5A67D8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#A0AEC0', shadowOpacity: 0 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
