import { supabase } from './supabase';

export interface Capture {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  created_at: string;
}

export async function loadCaptures(): Promise<Capture[]> {
  const { data, error } = await supabase
    .from('captures')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('loadCaptures error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function addCapture(content: string, tags: string[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const { error } = await supabase
    .from('captures')
    .insert({ content, tags, user_id: user.id });

  if (error) throw new Error(error.message);
}

export async function removeCapture(id: string): Promise<void> {
  const { error } = await supabase.from('captures').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
