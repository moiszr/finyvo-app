// src/utils/deeplink.ts
import * as Linking from 'expo-linking';

/**
 * Construye URL de redirect para diferentes contextos
 * - Para OAuth: Retorna URL simple sin Linking.createURL
 * - Para otros casos: Usa Linking.createURL normal
 */
// src/utils/deeplink.ts
export function buildRedirect(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return Linking.createURL(clean);
}

/**
 * Parsea callback URL de Supabase
 * Maneja tanto hash fragments (#) como query params (?)
 */
export function parseAuthCallback(url: string): {
  access_token?: string;
  refresh_token?: string;
  code?: string;
  token_hash?: string;
  type?: string;
  email?: string;
  error?: string;
  error_description?: string;
} {
  const result: Record<string, string | undefined> = {};

  try {
    // Normalizar URLs con triple slash
    const normalizedUrl = url.replace(':///', '://');

    console.log('[ParseAuth] Original URL:', url);
    console.log('[ParseAuth] Normalized URL:', normalizedUrl);

    // 1) Parsear query params usando Linking
    const parsed = Linking.parse(normalizedUrl);
    const queryParams = parsed.queryParams || {};

    // Extraer todos los parámetros posibles
    const paramKeys = [
      'code',
      'access_token',
      'refresh_token',
      'token_hash',
      'type',
      'email',
      'error',
      'error_description',
    ];

    for (const key of paramKeys) {
      const value = queryParams[key];
      if (value !== undefined && value !== null) {
        result[key] = Array.isArray(value) ? value[0] : String(value);
      }
    }

    // 2) Intentar extraer hash fragment (#access_token=...&refresh_token=...)
    // Esto es para el flujo de implicit grant
    const hashIndex = normalizedUrl.indexOf('#');
    if (hashIndex >= 0) {
      const hashFragment = normalizedUrl.slice(hashIndex + 1);

      // Parsear el hash como query string
      const hashParams = new URLSearchParams(hashFragment);

      for (const [key, value] of hashParams.entries()) {
        if (value && paramKeys.includes(key)) {
          result[key] = value;
        }
      }
    }

    console.log(
      '[ParseAuth] Extracted params:',
      Object.keys(result).join(', '),
    );
  } catch (error) {
    console.error('[ParseAuth] Error parsing URL:', error);
  }

  return result;
}

/**
 * Verifica si una URL es un callback de OAuth
 */
export function isOAuthCallback(url: string): boolean {
  if (!url) return false;
  const normalized = url.replace(':///', '://').toLowerCase();
  return /\/(?:auth\/)?callback(\?|#|$)/i.test(normalized);
}

/**
 * Extrae el tipo de callback de la URL
 */
export function getCallbackType(
  url: string,
): 'oauth' | 'recovery' | 'verify' | 'unknown' {
  const params = parseAuthCallback(url);

  // OAuth: tiene code o access_token
  if (params.code || params.access_token) {
    return 'oauth';
  }

  // Recovery: token_hash con type=recovery
  if (params.token_hash && params.type === 'recovery') {
    return 'recovery';
  }

  // Verify: token_hash con type=signup o email_change
  if (
    params.token_hash &&
    (params.type === 'signup' || params.type === 'email_change')
  ) {
    return 'verify';
  }

  return 'unknown';
}
