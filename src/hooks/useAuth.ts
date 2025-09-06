import { useAuthStore } from '@/store/authStore';

/**
 * Hook principal para manejo de autenticación
 * Abstrae la complejidad del store y provee una API limpia
 */
export function useAuth() {
  const store = useAuthStore();

  return {
    // Estado básico
    session: store.session,
    user: store.user,
    isLoading: store.isLoading,
    isOnboarded: store.isOnboarded,

    // Estados derivados
    isAuthenticated: !!store.session,
    isLoggedIn: !!store.session,
    userEmail: store.user?.email || null,
    userId: store.user?.id || null,

    // Acciones
    signOut: store.signOut,
    setOnboarded: store.setOnboarded,
    clearAuth: store.clearAuth,
    initialize: store.initialize,

    // Helpers
    isReady: !store.isLoading,
    needsOnboarding: !!store.session && !store.isOnboarded,
  };
}
