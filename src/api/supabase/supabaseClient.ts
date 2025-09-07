// src/api/supabase/supabaseClient.ts
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  processLock,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { env } from '@/config/env';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage as any } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web', // web: true, nativo: false
      lock: processLock,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);

/**
 * Comprobación de conectividad simple. Considera "OK" algunos errores
 * esperables (sin filas / RLS / no autorizado) que indican que sí hubo
 * conexión al backend.
 */
export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      // OK si: no hay filas, RLS/forbidden o no autorizado
      const okCodes = new Set(['PGRST116', 'PGRST301', 'PGRST302']);
      const okStatus = new Set([401, 403]);
      if (!okCodes.has(error.code as string)) {
        throw error;
      }
    }
    console.log('✅ Conexión con Supabase OK');
    return true;
  } catch (e) {
    console.error('❌ Error conectando con Supabase:', e);
    return false;
  }
}
