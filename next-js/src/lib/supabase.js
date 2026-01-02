import { createClient } from '@supabase/supabase-js';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

const normalizeSupabaseUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim().replace(/\/?$/, '');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const isSupabase = CONFIG.auth.method === 'supabase';
const supabaseUrl = normalizeSupabaseUrl(CONFIG.supabase.url);
const supabaseKey = CONFIG.supabase.key;

export const supabase =
  isSupabase && supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : {};
