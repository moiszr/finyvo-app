// src/hooks/useSupabaseAutoRefresh.ts
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase } from '@/api/supabase/supabaseClient';

export function useSupabaseAutoRefresh() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Arranque inicial: programa la renovación del token
    supabase.auth.startAutoRefresh();

    // Pausa/reanuda según estado de la app
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    // Limpieza: evita listeners duplicados con Fast Refresh
    return () => {
      sub.remove?.();
      supabase.auth.stopAutoRefresh();
    };
  }, []);
}
