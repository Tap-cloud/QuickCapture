import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { addCapture } from './storage';
import { generateTags } from './tagger';
import { isUrl, fetchURLMeta, URLMeta } from './urlPreview';
import { useTheme } from './theme';

interface Props { initialContent?: string; onDone: () => void; onBack: () => void }

export default function AddScreen({ initialContent = '', onDone, onBack }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const [content, setContent]         = useState(initialContent);
  const [note, setNote]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [status, setStatus]           = useState('');
  const [urlMeta, setUrlMeta]         = useState<URLMeta | null>(null);
  const [fetchingMeta, setFetchingMeta] = useState(false);

  const contentIsUrl = isUrl(content);

  useEffect(() => {
    if (!contentIsUrl) { setUrlMeta(null); return; }
    setFetchingMeta(true);
    setUrlMeta(null);
    fetchURLMeta(content.trim()).then(meta => { setUrlMeta(meta); setFetchingMeta(false); });
  }, [content, contentIsUrl]);

  async function handleSave() {
    const trimmedContent = content.trim();
    const trimmedNote    = note.trim();
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

  const canSave = (contentIsUrl || content.trim().length > 0) && !fetchingMeta;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>New Capture</Text>
        </View>

        {contentIsUrl ? (
          <View>
            <Text style={s.label}>Link</Text>
            <View style={s.urlCard}>
              {fetchingMeta ? (
                <View style={s.metaLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={s.metaLoadingText}>Loading preview...</Text>
                </View>
              ) : urlMeta?.thumbnail ? (
                <Image source={{ uri: urlMeta.thumbnail }} style={s.thumbnail} resizeMode="cover" />
              ) : null}
              {urlMeta?.title ? (
                <Text style={s.urlTitle} numberOfLines={2}>{urlMeta.title}</Text>
              ) : null}
              <Text style={s.urlText} numberOfLines={1}>{content.trim()}</Text>
            </View>

            <Text style={[s.label, { marginTop: 20 }]}>
              What's this about?{'  '}<Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, { minHeight: 100 }]}
              placeholder="e.g. 'tonkatsu ramen recipe I want to try'"
              placeholderTextColor={colors.textMuted}
              multiline value={note} onChangeText={setNote}
              autoFocus textAlignVertical="top"
            />
          </View>
        ) : (
          <View>
            <Text style={s.label}>What do you want to save?</Text>
            <TextInput
              style={s.input}
              placeholder={'Paste or type anything...\n\nA recipe, article, video link, tip, or any info you want to remember later.'}
              placeholderTextColor={colors.textMuted}
              multiline value={content} onChangeText={setContent}
              autoFocus textAlignVertical="top"
            />
          </View>
        )}

        {loading ? (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s.loadingText}>{status}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave} disabled={!canSave} activeOpacity={0.85}
          >
            <Text style={s.saveBtnText}>
              {fetchingMeta ? 'Loading preview…' : '✨  Save & Auto-Tag'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    inner:     { padding: 20, paddingBottom: 60 },
    header: { paddingTop: Platform.OS === 'ios' ? 48 : 32, marginBottom: 28 },
    backBtn:  { marginBottom: 14 },
    backText: { fontSize: 16, color: c.primary, fontWeight: '500' },
    title:    { fontSize: 26, fontWeight: '700', color: c.text },
    label:    { fontSize: 15, fontWeight: '500', color: c.textSub, marginBottom: 10 },
    optional: { fontSize: 13, fontWeight: '400', color: c.textMuted },
    urlCard:  { backgroundColor: c.bgSoft, borderRadius: 18, overflow: 'hidden' },
    metaLoading:     { flexDirection: 'row', alignItems: 'center', padding: 16 },
    metaLoadingText: { fontSize: 13, color: c.textMuted, marginLeft: 8 },
    thumbnail: { width: '100%', height: 180 },
    urlTitle: { fontSize: 15, fontWeight: '600', color: c.text, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
    urlText:  { fontSize: 12, color: c.textMuted, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 4 },
    input: {
      backgroundColor: c.bgSoft, borderRadius: 18,
      padding: 16, fontSize: 15, color: c.text, minHeight: 220, lineHeight: 22,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8 },
    loadingText: { fontSize: 14, color: c.textSub, marginLeft: 10 },
    saveBtn: {
      backgroundColor: c.primary, borderRadius: 14,
      paddingVertical: 16, alignItems: 'center', marginTop: 20,
      shadowColor: c.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveBtnDisabled: { backgroundColor: c.textMuted, shadowOpacity: 0 },
    saveBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  });
}
