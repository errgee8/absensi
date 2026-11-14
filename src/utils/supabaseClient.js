import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lmnxmaauxvhqlfxkxruq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BUF7h-NV1YNYauHAZSquJw_9vjaVr4e';

export const isSupabaseClientConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseClientConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

/**
 * Uploads a base64 encoded photo directly from client to Supabase Storage 'attendance-photos' bucket
 * Returns public HTTPS URL if successful, or null if storage fails/is restricted by RLS (allows safe fallback to server upload).
 */
export async function uploadAttendancePhotoClient(base64Data, filenamePrefix = 'selfie') {
  if (!supabase || !base64Data || typeof base64Data !== 'string') return null;
  if (!base64Data.startsWith('data:image')) return null;

  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const mimeExt = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const byteCharacters = atob(matches[2]);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: `image/${matches[1]}` });

    const filename = `${filenamePrefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${mimeExt}`;
    const filePath = `uploads/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('attendance-photos')
      .upload(filePath, blob, {
        contentType: `image/${matches[1]}`,
        upsert: true
      });

    if (uploadError) {
      // Storage RLS or permission restriction — return null to seamlessly fallback to server
      return null;
    }

    const { data: publicData } = supabase.storage
      .from('attendance-photos')
      .getPublicUrl(filePath);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.warn('Client-side storage upload fallback to server:', err?.message);
    return null;
  }
}

/**
 * Direct client-side read of app_settings JSON data (Announcements, Points, etc.)
 */
export async function fetchSettingFromSupabase(key) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;
    return data.value;
  } catch {
    return null;
  }
}
