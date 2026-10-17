'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const TG_SESSION_KEY = 'tg_auto_login_done';
const TG_PENDING_KEY = 'tg_pending_login';

interface TelegramWebApp {
  initData?: string;
}

function getTelegramInitData(): string | null {
  if (typeof window === 'undefined') return null;
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
  return tg?.initData || null;
}

async function autoLogin(initData: string): Promise<boolean> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/telegram-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'auto_login', initData }),
    });
    const data = await resp.json();
    if (resp.ok && data.access_token && data.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function TelegramAutoLogin() {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'idle' | 'loading' | 'failed'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const run = async () => {
      const initData = getTelegramInitData();
      const alreadyDone = sessionStorage.getItem(TG_SESSION_KEY) === '1';
      const pending = localStorage.getItem(TG_PENDING_KEY);

      // Case 1: inside Telegram Mini App with initData and no active session
      if (initData && !alreadyDone) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('loading');
          const ok = await autoLogin(initData);
          sessionStorage.setItem(TG_SESSION_KEY, '1');
          if (ok) {
            localStorage.removeItem(TG_PENDING_KEY);
            router.push('/dashboard');
          } else {
            setStatus('failed');
          }
          return;
        }
        sessionStorage.setItem(TG_SESSION_KEY, '1');
      }

      // Case 2: returning from Telegram UID login page with pending session
      if (pending) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.removeItem(TG_PENDING_KEY);
        }
      }
    };

    run();
  }, [router, pathname]);

  if (status !== 'loading') return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-primary">Signing you in via Telegram…</p>
      <p className="mt-1 text-xs text-muted-foreground">Verifying your Telegram account securely</p>
    </div>
  );
}
