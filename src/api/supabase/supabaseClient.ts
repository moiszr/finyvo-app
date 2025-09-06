// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { AppState, Platform } from 'react-native';
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
      detectSessionInUrl: false, // en nativo manejamos el deep link manualmente
      lock: processLock,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);

// Refresco de tokens acoplado al estado de la app (recomendado en RN)
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

// Añadir la función helper de la opción 1
export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error && error.code !== 'PGRST116') {
      // PGRST116: no rows found, which is not a connection error
      throw error;
    }
    console.log('✅ Conexión con Supabase exitosa.');
    return true;
  } catch (error) {
    console.error('❌ Error conectando con Supabase:', error);
    return false;
  }
}
