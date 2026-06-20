import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function buildVideoUrl(videoPath?: string | null) {
  if (!supabaseUrl || !videoPath) return '';
  const clean = videoPath.replace(/\\/g, '/').replace(/^Structured Workouts\//i, '').replace(/^\/+/,'');
  const encoded = clean.split('/').map(encodeURIComponent).join('/');
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/exercise-videos/${encoded}`;
}
