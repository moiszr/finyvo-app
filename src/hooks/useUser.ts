import { useAuthStore } from '@/store/index';

/**
 * Hook específico para obtener información del usuario
 * Más limpio cuando solo necesitas datos del user
 */
export function useUser() {
  const { user, session } = useAuthStore();

  return {
    user,
    isAuthenticated: !!session,

    // Datos específicos del usuario
    email: user?.email || null,
    id: user?.id || null,
    fullName: user?.user_metadata?.full_name || null,
    avatarUrl: user?.user_metadata?.avatar_url || null,
    createdAt: user?.created_at || null,

    // Helpers
    hasProfile: !!user?.user_metadata?.full_name,
    initials: user?.user_metadata?.full_name
      ? user.user_metadata.full_name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
      : user?.email?.charAt(0).toUpperCase() || '?',
  };
}
