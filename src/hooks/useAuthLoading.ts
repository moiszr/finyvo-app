import { useAuthStore } from '@/store/authStore';

/**
 * Hook para manejo específico de estados de loading de auth
 * Útil para mostrar diferentes tipos de loading
 */
export function useAuthLoading() {
  const { isLoading } = useAuthStore();

  return {
    isLoading,
    isReady: !isLoading,
    isInitializing: isLoading,

    // Helpers para diferentes estados
    showSplash: isLoading,
    showLoadingScreen: isLoading,
    canNavigate: !isLoading,
  };
}
