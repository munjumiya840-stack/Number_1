'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Phone, Copy, Loader2, X, Clock, KeyRound, CheckCircle } from 'lucide-react';
import { getCountryFlag } from '@/lib/constants';

interface ReceivedOtp {
  otp_code: string;
  service_name: string;
  timestamp: string;
}

function stripCountryCode(num: string): string {
  let cleaned = num.trim();
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  const match = cleaned.match(/^\d{1,3}(\d{7,})$/);
  if (match) return match[1];
  return cleaned;
}

function getFlagForCountry(countryName: string): string {
  const code = countryName.slice(0, 2).toUpperCase();
  if (code.length === 2) return getCountryFlag(code);
  return '🌍';
}

export default function MyNumbersPage() {
  const { user } = useAuth();
  const [activeData, setActiveData] = useState<{
    svc_id: number;
    svc: string;
    c: string;
    nums: string[];
    buy_time: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [includeCountryCode, setIncludeCountryCode] = useState(true);
  const [otps, setOtps] = useState<ReceivedOtp[]>([]);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_active_manual')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.active_data) {
        setActiveData(data.active_data);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!activeData) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor(Date.now() / 1000 - activeData.buy_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeData]);

  const formatNumber = (num: string): string => {
    if (includeCountryCode) {
      return num.startsWith('+') ? num : `+${num}`;
    }
    return stripCountryCode(num);
  };

  // OTP polling
  useEffect(() => {
    if (!activeData || !user) return;
    let cancelled = false;

    const pollOtp = async () => {
      if (cancelled) return;
      setPolling(true);
      for (const num of activeData.nums) {
        const cleanNum = stripCountryCode(num);
        const { data: existing } = await supabase
          .from('otp_success_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('phone_number', num)
          .order('timestamp', { ascending: false })
          .limit(5);

        if (existing) {
          for (const log of existing) {
            if (!otps.find(o => o.otp_code === log.otp_code && o.timestamp === log.timestamp)) {
              setOtps(prev => [...prev, {
                otp_code: log.otp_code,
                service_name: log.service_name || activeData.svc,
                timestamp: log.timestamp,
              }]);
              toast.success(`OTP received: ${log.otp_code}`);
            }
          }
        }

        // Check Lamix provider
        const { data: providers } = await supabase
          .from('providers')
          .select('api_base_url, api_key_encrypted')
          .eq('internal_id', 'lamix')
          .eq('status', 'active')
          .maybeSingle();

        if (providers?.api_base_url && providers?.api_key_encrypted) {
          try {
            const apiKey = atob(providers.api_key_encrypted);
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const proxyUrl = `${supabaseUrl}/functions/v1/lamix-proxy/messages?number=${cleanNum}&limit=5`;
            const resp = await fetch(proxyUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                apiBaseUrl: providers.api_base_url,
                apiKey,
                method: 'GET',
              }),
              signal: AbortSignal.timeout(10000),
            });
            if (resp.ok) {
              const body = await resp.json();
              const records = body.records || [];
              for (const rec of records) {
                if (rec.status === 'cleared' || rec.status === 'pending') {
                  const codeMatch = rec.content?.match(/\b(\d{4,8})\b/);
                  if (codeMatch) {
                    const code = codeMatch[1];
                    if (!otps.find(o => o.otp_code === code)) {
                      setOtps(prev => [...prev, {
                        otp_code: code,
                        service_name: rec.cli || activeData.svc,
                        timestamp: rec.time,
                      }]);
                      await supabase.from('otp_success_logs').insert({
                        user_id: user.id,
                        phone_number: num,
                        otp_code: code,
                        service_name: rec.cli || activeData.svc,
                      });
                      toast.success(`OTP received: ${code}`);
                    }
                  }
                }
              }
            }
          } catch {
            // silently skip
          }
        }
      }
      setPolling(false);
    };

    pollOtp();
    const interval = setInterval(pollOtp, 10000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeData, user]);

  const handleCancel = async () => {
    if (!user || !activeData) return;
    await supabase.from('user_active_manual').delete().eq('user_id', user.id);
    setActiveData(null);
    setOtps([]);
    toast.success('Number released');
  };

  const remaining = activeData ? Math.max(0, 1200 - elapsed) : 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const flag = activeData ? getFlagForCountry(activeData.c) : '🌍';

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>My Numbers</h1>
        <p className="text-sm text-muted-foreground">Your active and assigned virtual numbers</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeData ? (
        <Card className="border-primary/30 bg-card/50 glow-cyan max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Active Number{activeData.nums.length > 1 ? 's' : ''}
              </span>
              <Badge className="bg-success/10 text-success border-success/20">
                <Clock className="mr-1 h-3 w-3" />
                {mm}:{ss.toString().padStart(2, '0')} left
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-lg">{flag}</span>
              <span>Service: <span className="font-medium text-foreground">{activeData.svc}</span></span>
              <span>·</span>
              <span>Country: <span className="font-medium text-foreground">{activeData.c}</span></span>
            </div>

            {/* Country code toggle */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <div>
                  <p className="text-sm font-medium">Country code format</p>
                  <p className="text-xs text-muted-foreground">
                    {includeCountryCode ? 'Numbers include + and country code' : 'Raw numbers only'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Raw</span>
                <Switch
                  checked={includeCountryCode}
                  onCheckedChange={setIncludeCountryCode}
                />
                <span className="text-xs text-muted-foreground">+ Code</span>
              </div>
            </div>

            <div className="space-y-3">
              {activeData.nums.map((num, i) => {
                const formatted = formatNumber(num);
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{flag}</span>
                      <p className="font-mono text-lg font-bold">{formatted}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(formatted);
                        toast.success('Copied to clipboard');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* OTP display */}
            {otps.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-success">
                  <CheckCircle className="h-4 w-4" />
                  OTP Codes Received
                </div>
                {otps.map((otp, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <KeyRound className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-mono text-lg font-bold text-success">{otp.otp_code}</p>
                        <p className="text-xs text-muted-foreground">{otp.service_name}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(otp.otp_code);
                        toast.success('OTP copied');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {polling && otps.length === 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking for OTP...
              </div>
            )}

            <div className="mt-4">
              <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(remaining / 1200) * 100}%` }}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Number expires in {mm}:{ss.toString().padStart(2, '0')}. {otps.length > 0 ? 'OTP received!' : 'Waiting for OTP...'}
              </p>
            </div>
            <Button variant="outline" className="mt-4 w-full" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Release Number
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 bg-card/50 max-w-2xl">
          <CardContent className="p-12 text-center">
            <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">You have no active numbers.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Go to Get Number to request a virtual number.
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
