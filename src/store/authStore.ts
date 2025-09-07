// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase/supabaseClient';

type OnboardMap = Record<string, boolean>;

export interface AuthState {
  // Estado auth
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isRecoverySession: boolean;

  // Onboarding por usuario
  onboardedByUserId: OnboardMap;

  // LEGACY: boolean global que quizá tengas en el storage de versiones anteriores.
  // Lo usamos SOLO para migrar al mapa por usuario.
  _legacyIsOnboarded?: boolean;

  // Acciones
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  clearRecoveryAndSignOut: () => Promise<void>;
  setRecoverySession: (value: boolean) => void;

  // Onboarding helpers
  setOnboarded: (value: boolean) => void; // marca para el user actual
  isOnboarded: () => boolean; // lee el flag del user actual
  resetOnboardingForCurrentUser: () => void;

  // Limpieza
  clearAuth: () => void;

  // Evitar listeners duplicados
  _unsubscribeAuth?: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      session: null,
      user: null,
      isLoading: true,
      isRecoverySession: false,

      // Onboarding por usuario
      onboardedByUserId: {},
      _legacyIsOnboarded: undefined,

      // ======================
      // INIT
      // ======================
      initialize: async () => {
        try {
          console.log('🚀 Inicializando autenticación...');

          // 1) Sesión actual
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) throw error;

          console.log('📱 Sesión encontrada:', !!session);
          console.log('👤 Usuario:', session?.user?.email || 'No user');

          set({ session, user: session?.user || null, isLoading: false });

          // 2) Migración LEGACY (booleano global → mapa por user)
          const uid = session?.user?.id;
          const { _legacyIsOnboarded, onboardedByUserId } = get();
          if (uid && _legacyIsOnboarded && !onboardedByUserId[uid]) {
            set({
              onboardedByUserId: { ...onboardedByUserId, [uid]: true },
              _legacyIsOnboarded: false, // limpiar legacy
            });
            console.log('🧭 Migrado isOnboarded → por usuario:', uid);
          }

          // 3) Evitar listeners duplicados (Fast Refresh / re-init)
          get()._unsubscribeAuth?.();

          // 4) Listener Auth
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event);
            console.log('👤 Nueva sesión:', !!session);

            // Estados base del usuario
            if (
              event === 'INITIAL_SESSION' ||
              event === 'SIGNED_IN' ||
              event === 'TOKEN_REFRESHED' ||
              event === 'USER_UPDATED'
            ) {
              set({ session, user: session?.user || null });
              // Migración por si llegó user aquí
              const u = session?.user?.id;
              if (u) {
                const { _legacyIsOnboarded: legacy, onboardedByUserId: map } =
                  get();
                if (legacy && !map[u]) {
                  set({
                    onboardedByUserId: { ...map, [u]: true },
                    _legacyIsOnboarded: false,
                  });
                  console.log(
                    '🧭 Migrado (listener) isOnboarded → por usuario:',
                    u,
                  );
                }
              }
            }

            if (event === 'PASSWORD_RECOVERY') {
              set({
                session,
                user: session?.user || null,
                isRecoverySession: true,
              });
            }

            if (event === 'SIGNED_OUT') {
              // No borramos el mapa de onboards (es por usuario), solo estado volátil
              set({ session: null, user: null, isRecoverySession: false });
            }
          });

          set({ _unsubscribeAuth: () => subscription.unsubscribe() });
          console.log('✅ Auth inicializado correctamente', !!subscription);
        } catch (e) {
          console.error('❌ Error inicializando auth:', e);
          set({ session: null, user: null, isLoading: false });
        }
      },

      // ======================
      // SIGN OUTS
      // ======================
      signOut: async () => {
        try {
          console.log('🚪 Cerrando sesión...');
          await supabase.auth.signOut();
          // Limpiamos estado volátil; NO tocamos el mapa de onboarding
          set({ session: null, user: null, isRecoverySession: false });
          console.log('✅ Sesión cerrada correctamente');
        } catch (e) {
          console.error('❌ Error en signOut:', e);
          set({ session: null, user: null, isRecoverySession: false });
          throw e;
        }
      },

      clearRecoveryAndSignOut: async () => {
        try {
          console.log('🔐 Cerrando sesión de recovery...');
          await supabase.auth.signOut();
          set({ session: null, user: null, isRecoverySession: false });
          console.log('✅ Sesión de recovery cerrada');
        } catch (e) {
          console.error('❌ Error cerrando sesión de recovery:', e);
          set({ session: null, user: null, isRecoverySession: false });
        }
      },

      // ======================
      // RECOVERY FLAG
      // ======================
      setRecoverySession: (value: boolean) => {
        console.log('🔐 Setting recovery session:', value);
        set({ isRecoverySession: value });
      },

      // ======================
      // ONBOARDING API
      // ======================
      setOnboarded: (value: boolean) => {
        const uid = get().user?.id;
        if (!uid) {
          console.warn('setOnboarded: no hay usuario actual');
          // Si no hay usuario (caso rarísimo), usa el legacy para no perder la intención:
          set({ _legacyIsOnboarded: value });
          return;
        }
        set((state) => ({
          onboardedByUserId: { ...state.onboardedByUserId, [uid]: value },
        }));
      },

      isOnboarded: () => {
        const uid = get().user?.id;
        if (!uid) return !!get()._legacyIsOnboarded; // fallback legacy
        return !!get().onboardedByUserId[uid];
      },

      resetOnboardingForCurrentUser: () => {
        const uid = get().user?.id;
        if (!uid) return;
        set((state) => {
          const next = { ...state.onboardedByUserId };
          delete next[uid];
          return { onboardedByUserId: next };
        });
        console.log('🔄 Onboarding reiniciado para el usuario actual');
      },

      // ======================
      // LIMPIEZA VOLÁTIL
      // ======================
      clearAuth: () => {
        console.log('🧹 Limpiando estado de auth (volátil) ...');
        // OJO: NO tocamos onboardedByUserId para no perder flags por usuario
        set({ session: null, user: null, isRecoverySession: false });
      },
    }),
    {
      name: 'finyvo-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),

      // ⬅️ Nueva versión de storage
      version: 2,

      // ⬅️ Migración: elimina la clave legacy 'isOnboarded' si existe (boolean vieja)
      migrate: (persisted: any, fromVersion) => {
        const p = persisted ?? {};
        if ('isOnboarded' in p && typeof p.isOnboarded !== 'function') {
          delete p.isOnboarded;
        }
        // Asegura defaults por si no existieran
        if (!p.onboardedByUserId) p.onboardedByUserId = {};
        if (typeof p._legacyIsOnboarded === 'undefined')
          p._legacyIsOnboarded = false;
        return p;
      },

      // Solo persiste lo que necesitas (como ya tenías)
      partialize: (state) => ({
        onboardedByUserId: state.onboardedByUserId,
        _legacyIsOnboarded: state._legacyIsOnboarded ?? false,
      }),

      onRehydrateStorage: () => (state) => {
        console.log('💧 Rehidratando auth store...');
        if (state) {
          console.log(
            '📋 Onboarded map keys:',
            Object.keys(state.onboardedByUserId || {}),
          );
          if ((state as any)._legacyIsOnboarded) {
            console.log(
              '⚠️ Legacy isOnboarded=true detectado (migrará al iniciar sesión)',
            );
          }
        }
      },
    },
  ),
);
