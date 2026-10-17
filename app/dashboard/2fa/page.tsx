'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { KeyRound, Loader2, Copy, RefreshCw, Lock } from 'lucide-react';

export default function TwoFAPage() {
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [remaining, setRemaining] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          generateCode(secret);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [code, secret]);

  const generateCode = (key: string) => {
    try {
      const cleanKey = key.replace(/\s/g, '').toUpperCase();
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bytes: number[] = [];
      let buffer = 0;
      let bitsLeft = 0;
      for (const c of cleanKey) {
        const val = chars.indexOf(c);
        if (val === -1) continue;
        buffer = (buffer << 5) | val;
        bitsLeft += 5;
        if (bitsLeft >= 8) {
          bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
          bitsLeft -= 8;
        }
      }
      if (bitsLeft > 0) {
        bytes.push((buffer << (8 - bitsLeft)) & 0xff);
      }
      const time = Math.floor(Date.now() / 1000 / 30);
      const timeBuffer = new ArrayBuffer(8);
      const timeView = new DataView(timeBuffer);
      timeView.setUint32(0, Math.floor(time / 0x100000000));
      timeView.setUint32(4, time & 0xffffffff);
      const keyBuffer = new Uint8Array(bytes).buffer;
      return crypto.subtle.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']).then(cryptoKey => {
        return crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
      }).then(sig => {
        const sigBytes = new Uint8Array(sig);
        const offset = sigBytes[sigBytes.length - 1] & 0xf;
        const code = ((sigBytes[offset] & 0x7f) << 24 | (sigBytes[offset + 1] & 0xff) << 16 | (sigBytes[offset + 2] & 0xff) << 8 | (sigBytes[offset + 3] & 0xff)).toString().padStart(6, '0').slice(-6);
        setCode(code);
        setRemaining(30);
      }).catch(() => {
        toast.error('Invalid secret key');
      });
    } catch {
      toast.error('Invalid secret key format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret || secret.length < 8) {
      toast.error('Please enter a valid 2FA secret key');
      return;
    }
    setLoading(true);
    await generateCode(secret);
    setLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>Get 2FA Code</h1>
        <p className="text-sm text-muted-foreground">Generate TOTP codes from your 2FA secret key</p>
      </div>

      <div className="mx-auto max-w-lg">
        {!code ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <Lock className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Paste your 2FA secret key (e.g., JBSWY3DPEHPK3PXP). The key is used locally in your browser and never sent to our servers.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secret">2FA Secret Key</Label>
                  <Input
                    id="secret"
                    placeholder="JBSWY3DPEHPK3PXP"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value.toUpperCase())}
                    className="font-mono"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Code'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/30 bg-card/50 glow-cyan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <KeyRound className="h-5 w-5 text-primary" />
                Your 2FA Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="font-mono text-5xl font-bold tracking-widest gradient-text">{code}</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(remaining / 30) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{remaining}s</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Code refreshes every 30 seconds</p>
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { navigator.clipboard.writeText(code); toast.success('Code copied'); }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Code
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => { setCode(''); setSecret(''); }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  New Key
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
