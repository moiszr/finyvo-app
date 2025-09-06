// src/store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/api/supabase/supabaseClient';

export interface AuthState {
  // Estado
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  isRecoverySession: boolean; // NUEVO: Flag para sesión temporal de recovery

  // Acciones
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  setOnboarded: (value: boolean) => void;
  setRecoverySession: (value: boolean) => void; // NUEVO
  clearAuth: () => void;
  clearRecoveryAndSignOut: () => Promise<void>; // NUEVO: Para después de cambiar password
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      session: null,
      user: null,
      isLoading: true,
      isOnboarded: false,
      isRecoverySession: false,

      // Inicializar autenticación
      initialize: async () => {
        try {
          console.log('🚀 Inicializando autenticación...');

          // Obtener sesión actual
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error) {
            console.error('❌ Error obteniendo sesión:', error);
            throw error;
          }

          console.log('📱 Sesión encontrada:', !!session);
          console.log('👤 Usuario:', session?.user?.email || 'No user');

          // Actualizar estado
          set({
            session,
            user: session?.user || null,
            isLoading: false,
          });

          // Escuchar cambios de autenticación
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event);
            console.log('👤 Nueva sesión:', !!session);

            // Si es un evento de recovery, marcar como sesión temporal
            if (event === 'PASSWORD_RECOVERY') {
              console.log('🔐 Sesión de recovery detectada');
              set({
                session,
                user: session?.user || null,
                isRecoverySession: true,
              });
            }
            // Si es un login normal
            else if (event === 'SIGNED_IN') {
              set({
                session,
                user: session?.user || null,
                // isRecoverySession lo controla el layout cuando procesa deep links
              });
            }

            // Si se cerró sesión
            else if (event === 'SIGNED_OUT') {
              get().clearAuth();
            }
            // Otros eventos
            else {
              set({
                session,
                user: session?.user || null,
              });
            }
          });

          console.log('✅ Auth inicializado correctamente', !!subscription);
        } catch (error) {
          console.error('❌ Error inicializando auth:', error);
          set({
            session: null,
            user: null,
            isLoading: false,
          });
        }
      },

      // Cerrar sesión normal
      signOut: async () => {
        try {
          console.log('🚪 Cerrando sesión...');

          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error('❌ Error cerrando sesión:', error);
            throw error;
          }

          // Limpiar estado local
          get().clearAuth();

          console.log('✅ Sesión cerrada correctamente');
        } catch (error) {
          console.error('❌ Error en signOut:', error);
          // Limpiar de todas formas
          get().clearAuth();
          throw error;
        }
      },

      // Cerrar sesión después de cambiar password (recovery)
      clearRecoveryAndSignOut: async () => {
        try {
          console.log('🔐 Cerrando sesión de recovery...');

          // Cerrar sesión en Supabase
          await supabase.auth.signOut();

          // Limpiar estado pero mantener onboarded
          const currentOnboarded = get().isOnboarded;
          set({
            session: null,
            user: null,
            isRecoverySession: false,
            isOnboarded: currentOnboarded,
          });

          console.log('✅ Sesión de recovery cerrada');
        } catch (error) {
          console.error('❌ Error cerrando sesión de recovery:', error);
          // Limpiar de todas formas
          get().clearAuth();
        }
      },

      // Marcar como sesión de recovery
      setRecoverySession: (value: boolean) => {
        console.log('🔐 Setting recovery session:', value);
        set({ isRecoverySession: value });
      },

      // Marcar onboarding completado
      setOnboarded: (value: boolean) => {
        console.log('📝 Setting onboarded:', value);
        set({ isOnboarded: value });
      },

      // Limpiar estado de autenticación
      clearAuth: () => {
        console.log('🧹 Limpiando estado de auth...');
        set({
          session: null,
          user: null,
          isOnboarded: false,
          isRecoverySession: false,
        });
      },
    }),
    {
      name: 'finyvo-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir isOnboarded (sesión la maneja Supabase)
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
      }),
      // Rehidratar estado al iniciar
      onRehydrateStorage: () => (state) => {
        console.log('💧 Rehidratando auth store...');
        if (state) {
          console.log('📋 Estado persistido:', {
            isOnboarded: state.isOnboarded,
          });
        }
      },
    },
  ),
);
