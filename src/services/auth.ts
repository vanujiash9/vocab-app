import type { Profile, UserRole } from '../types';
import { supabase } from '../lib/supabase';

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function createProfileForUser(input: {
  userId: string;
  email: string;
  displayName: string;
  role?: UserRole;
}): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: input.userId,
      email: input.email,
      display_name: input.displayName.trim() || input.email.split('@')[0] || 'Người dùng',
      role: input.role ?? 'student',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Profile;
}
