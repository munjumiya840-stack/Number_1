'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Mail, Lock, Loader2, Send, KeyRound, MessageCircle, Zap } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Telegram login state
  const [tgStep, setTgStep] = useState<'id' | 'code'>('id');
  const [telegramId, setTelegramId] = useState('');
  const [tgCode, setTgCode] = useState('');
  const [tgLoading, setTgLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'email' | 'telegram'>('email');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Welcome back!');
    router.push('/dashboard');
  };

  const handleSendTgCode = async () => {
    if (!telegramId.trim()) {
      toast.error('Enter your Telegram ID');
      return;
    }
    setTgLoading(true);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/telegram-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', telegramId: telegramId.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data.message || data.error || 'Failed to send code';
        toast.error(errMsg);
      } else {
        toast.success('Code sent to your Telegram');
        setTgStep('code');
      }
    } catch {
      toast.error('Network error reaching Telegram service. Check your connection and try again.');
    }
    setTgLoading(false);
  };

  const handleVerifyTgCode = async () => {
    if (!tgCode.trim()) {
      toast.error('Enter the code from Telegram');
      return;
    }
    setTgLoading(true);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/telegram-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', telegramId: telegramId.trim(), code: tgCode.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data.message || data.error || 'Verification failed';
        toast.error(errMsg);
      } else if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) {
          toast.error('Verified successfully, but could not start your session. Please try email login.');
        } else {
          toast.success('Login successful! Welcome back.');
          router.push(data.isAdmin ? '/admin' : '/dashboard');
        }
      } else {
        toast.error('Verification succeeded but no session was returned. Please try email login.');
      }
    } catch {
      toast.error('Network error during verification. Check your connection and try again.');
    }
    setTgLoading(false);
  };

  const handleInstantTgLogin = async () => {
    if (!telegramId.trim()) {
      toast.error('Enter your Telegram ID first');
      return;
    }
    setTgLoading(true);
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/telegram-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_login', telegramId: telegramId.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        const errMsg = data.message || data.error || 'Auto-login failed';
        toast.error(errMsg);
      } else if (data.access_token && data.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sessionError) {
          toast.error('Login succeeded but session could not start. Please try again.');
        } else {
          toast.success('Logged in via Telegram! Welcome back.');
          router.push(data.isAdmin ? '/admin' : '/dashboard');
        }
      } else {
        toast.error('No session returned. Please use the code login instead.');
      }
    } catch {
      toast.error('Network error during login. Check your connection and try again.');
    }
    setTgLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Link href="/" className="mb-8">
            <Logo size="lg" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Welcome <span className="gradient-text">Back</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your GLOBAL NUMBER account</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex rounded-lg border border-border/50 bg-card/30 p-1">
          <button
            onClick={() => setLoginMode('email')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              loginMode === 'email' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email
          </button>
          <button
            onClick={() => setLoginMode('telegram')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              loginMode === 'telegram' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Telegram
          </button>
        </div>

        {loginMode === 'email' ? (
          <form onSubmit={handleSubmit} className="glass space-y-4 rounded-xl border border-border/50 p-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>
        ) : (
          <div className="glass space-y-4 rounded-xl border border-border/50 p-6">
            {tgStep === 'id' ? (
              <>
                <div className="text-center">
                  <MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Enter your Telegram ID to receive a login code
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tgId">Telegram ID</Label>
                  <Input
                    id="tgId"
                    placeholder="e.g. 7689218221"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
                    disabled={tgLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find your ID by messaging @userinfobot on Telegram
                  </p>
                </div>
                <Button
                  onClick={handleSendTgCode}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
                  disabled={tgLoading || !telegramId.trim()}
                >
                  {tgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Code
                </Button>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <Button
                  onClick={handleInstantTgLogin}
                  variant="outline"
                  className="w-full"
                  disabled={tgLoading || !telegramId.trim()}
                >
                  {tgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                  Instant Login (no code)
                </Button>
              </>
            ) : (
              <>
                <div className="text-center">
                  <KeyRound className="mx-auto mb-3 h-10 w-10 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Enter the 6-digit code sent to your Telegram
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Code expires in 2 minutes
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tgCode">Verification Code</Label>
                  <Input
                    id="tgCode"
                    placeholder="000000"
                    value={tgCode}
                    onChange={(e) => setTgCode(e.target.value)}
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                    disabled={tgLoading}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyTgCode(); }}
                  />
                </div>
                <Button
                  onClick={handleVerifyTgCode}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
                  disabled={tgLoading || !tgCode.trim()}
                >
                  {tgLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                  Verify & Login
                </Button>
                <button
                  onClick={() => { setTgStep('id'); setTgCode(''); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Use a different Telegram ID
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="text-primary hover:underline">
            Create one
          </Link>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
