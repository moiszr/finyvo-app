// src/config/env.ts
import { z } from 'zod';

// Schema de validación para variables de entorno
const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url('Supabase URL debe ser una URL válida'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'Supabase Anon Key es requerida'),
});

// Validar variables de entorno al iniciar
function validateEnv() {
  const env = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((err) => err.path.join('.'))
        .join(', ');
      throw new Error(
        `❌ Variables de entorno faltantes o inválidas: ${missingVars}\n\n` +
          '🔧 Asegúrate de que tu archivo .env contenga:\n' +
          'EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co\n' +
          'EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key',
      );
    }
    throw error;
  }
}

export const env = validateEnv();
