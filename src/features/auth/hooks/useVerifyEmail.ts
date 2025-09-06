import { useState, useCallback } from 'react';
import { authService } from '../services/auth';

export function useVerifyEmail(initialEmail?: string) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const mask = (e: string) => {
    const [u, d = ''] = e.split('@');
    if (!u) return e;
    return `${u[0]}***${u.slice(-1)}@${d}`;
  };

  const resend = useCallback(async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    setError(null);
    try {
      await authService.resendVerification(email);
      setSent(true);
      // 45s de cooldown para evitar spam
      setCooldown(45);
      const timer = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo reenviar el correo');
    } finally {
      setSending(false);
    }
  }, [email, sending, cooldown]);

  return {
    email,
    setEmail,
    sending,
    sent,
    error,
    cooldown,
    resend,
    maskEmail: mask(email),
  };
}
