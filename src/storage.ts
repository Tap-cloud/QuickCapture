import { supabase } from './supabase';

export interface Capture {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  created_at: string;
  url?: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  summary?: string;
  category?: string;
  site_name?: string;
}

export async function loadCaptures(): Promise<Capture[]> {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('loadCaptures error:', error.message); return []; }
  return data ?? [];
}

export async function addCapture(
  content: string,
  tags: string[],
  meta?: {
    url?: string;
    thumbnailUrl?: string;
    title?: string;
    description?: string;
    siteName?: string;
    category?: string;
  },
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('captures').insert({
    content,
    tags,
    user_id: user.id,
    url: meta?.url ?? null,
    thumbnail_url: meta?.thumbnailUrl ?? null,
    title: meta?.title ?? null,
    description: meta?.description ?? null,
    site_name: meta?.siteName ?? null,
    category: meta?.category ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function removeCapture(id: string): Promise<void> {
  const { error } = await supabase.from('captures').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── User collections ──────────────────────────────────────────

export interface UserCollection {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  created_at: string;
}

export async function loadUserCollections(): Promise<UserCollection[]> {
  const { data, error } = await supabase
    .from('user_collections')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('loadUserCollections:', error.message); return []; }
  return data ?? [];
}

export async function createUserCollection(name: string, emoji: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('user_collections').insert({ name, emoji, user_id: user.id });
  if (error) throw new Error(error.message);
}

export async function deleteUserCollection(id: string): Promise<void> {
  const { error } = await supabase.from('user_collections').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
