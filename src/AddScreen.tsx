import React, { useState } from 'react';
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
import { addCapture } from './storage';
import { generateTags } from './tagger';

interface Props {
  onDone: () => void;
  onBack: () => void;
}

export default function AddScreen({ onDone, onBack }: Props) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  async function handleSave() {
    if (!content.trim()) return;

    setLoading(true);
    setStatus('Generating tags...');

    const tags = await generateTags(content.trim());

    setStatus('Saving...');
    await addCapture(content.trim(), tags);

    setLoading(false);
    onDone();
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
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Capture</Text>
        </View>

        <Text style={styles.label}>What do you want to save?</Text>
        <TextInput
          style={styles.input}
          placeholder={
            'Paste or type anything...\n\nA recipe, article, video link, tip, or any info you want to remember later.'
          }
          placeholderTextColor="#A0AEC0"
          multiline
          value={content}
          onChangeText={setContent}
          autoFocus
          textAlignVertical="top"
        />

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#5A67D8" />
            <Text style={styles.loadingText}>{status}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.saveBtn, !content.trim() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!content.trim()}
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
  container: { flex: 1, backgroundColor: '#F7F8FC' },
  inner: { padding: 20, paddingBottom: 60 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    marginBottom: 28,
  },
  backBtn: { marginBottom: 14 },
  backText: { fontSize: 16, color: '#5A67D8', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: '#1A202C' },
  label: { fontSize: 15, fontWeight: '500', color: '#4A5568', marginBottom: 10 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
