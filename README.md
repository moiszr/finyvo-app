# Finyvo — App de finanzas personales (Expo + Supabase)

App móvil construida con **Expo + React Native + TypeScript** y **Supabase**.  
Incluye todo el flujo de **autenticación** con UX cuidada y animaciones:

- Registro con email/contraseña
- Inicio de sesión
- Login social (Apple, Google, Facebook)
- Verificación de correo
- Recuperar contraseña (enviar enlace)
- Reset de contraseña con animación de éxito
- Guardias/estados alrededor de sesiones de recuperación
- Theming centralizado (`colors.ts`, `spacing.ts`)
- Linting con ESLint y reglas para hooks

> ⚠️ Actualmente el foco del proyecto es **autenticación**. Los módulos de presupuestos, metas, transacciones y dashboard ya están esqueletonados.

---

## Tech stack

- **Expo** (React Native)
- **TypeScript**
- **Expo Router**
- **Supabase** (Auth)
- **ESLint** (con reglas de hooks)
- Theming propio: `src/themes/colors.ts` y `src/themes/spacing.ts`

---

## Configuración

### 1) Prerrequisitos

- Node LTS
- npm (o yarn/pnpm si prefieres, aquí usamos **npm** por `package-lock.json`)
- Cuenta de Supabase con proyecto y Auth habilitado

### 2) Variables de entorno

Crea un archivo `.env` en la raíz (no se versiona):

```bash
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...
# OAuth (si usas social login):
GOOGLE_EXPO_CLIENT_ID=...
GOOGLE_IOS_CLIENT_ID=...
GOOGLE_ANDROID_CLIENT_ID=...
APPLE_SERVICE_ID=...
FACEBOOK_APP_ID=...
```
