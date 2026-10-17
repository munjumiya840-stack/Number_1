'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Radio, PlusCircle, RefreshCw, Loader2, Copy,
  KeyRound, Activity, Flame, Globe, Zap, Clock,
  CheckCircle, Hash, AlertCircle, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface LiveService {
  sid: string;
  last_at: number;
  ranges: string[];
  range_count: number;
  hit_count: number;
}

interface LiveAccessData {
  cached: boolean;
  services: LiveService[];
  rangeHits: Record<string, string[]>;
}

interface AllocatedNumber {
  id: string;
  msisdn: string;
  country: string;
  status: string;
  expiresAt: string;
  allocatedAt: string;
}

interface OtpRecord {
  id: string;
  code: string;
  service: string;
  rawMessage: string;
  receivedAt: string;
}

interface ActiveNumber extends AllocatedNumber {
  otps: OtpRecord[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

async function proxyCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  payload?: unknown,
  userId?: string
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/scarface-proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, method, payload, userId }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid response from OTP service');
  }
  if (!res.ok) {
    const errMsg = (data as Record<string, unknown>)?.['message'] || (data as Record<string, unknown>)?.['error'] || `Service error (${res.status})`;
    throw new Error(String(errMsg));
  }
  return data;
}

function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function RangeNumbersPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);

  const [liveAccess, setLiveAccess] = useState<LiveAccessData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const [prefix, setPrefix] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);

  const [polling, setPolling] = useState(false);
  const [pollResults, setPollResults] = useState<Record<string, OtpRecord[]>>({});
  const [prevOtpCount, setPrevOtpCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLiveAccess = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await proxyCall<{ data: LiveAccessData }>('/liveaccess');
      setLiveAccess(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch live ranges');
    }
    setLiveLoading(false);
  }, []);

  const fetchActiveNumbers = useCallback(async () => {
    setActiveLoading(true);
    try {
      const data = await proxyCall<ActiveNumber[]>('/numbers/active');
      setActiveNumbers(data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch active numbers');
    }
    setActiveLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchLiveAccess(), fetchActiveNumbers()]);
      setLoading(false);
    })();
  }, [fetchLiveAccess, fetchActiveNumbers]);

  const handleAllocate = async () => {
    if (!user) return;
    setAllocating(true);
    try {
      const num = await proxyCall<AllocatedNumber>(
        '/numbers/allocate',
        'POST',
        { prefix: prefix.trim() },
        user.id
      );
      toast.success(`Number allocated: ${num.msisdn}`);
      setPrefix('');
      await fetchActiveNumbers();
      await refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Allocation failed');
    }
    setAllocating(false);
  };

  const pollBatchOtps = useCallback(async () => {
    if (activeNumbers.length === 0) return;
    setPolling(true);
    try {
      const res = await proxyCall<{
        data: Record<string, OtpRecord[]>;
        numbers: ActiveNumber[];
      }>('/numbers/batch-otps', 'POST', {});
      const results = res.data || {};
      setPollResults(results);
      const totalCount = Object.values(results).flat().length;
      if (totalCount > prevOtpCount && prevOtpCount >= 0) {
        const newCount = totalCount - prevOtpCount;
        if (newCount > 0) {
          toast.success(`${newCount} new OTP received!`);
        }
      }
      setPrevOtpCount(totalCount);
    } catch {
      // silently skip polling errors
    }
    setPolling(false);
  }, [activeNumbers, prevOtpCount]);

  useEffect(() => {
    if (activeNumbers.length === 0) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    pollBatchOtps();
    pollRef.current = setInterval(pollBatchOtps, 5000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [activeNumbers, pollBatchOtps]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            <Radio className="h-6 w-6 text-primary" />
            Range Numbers &amp; Live Access
          </h1>
          <p className="text-sm text-muted-foreground">Real-time hot ranges, number allocation, and automated OTP polling</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchLiveAccess(); fetchActiveNumbers(); }}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* User Balance */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Your Balance</p>
                <p className="mt-1 text-2xl font-bold text-primary">
                  {profile ? `$${profile.balance.toFixed(2)}` : '—'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Per Number Cost</p>
                <p className="mt-1 text-2xl font-bold text-accent">
                  {profile ? `$${(profile.balance > 0 ? '0.50' : '0.50')}` : '—'}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Zap className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Live Access & Hot Ranges */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Live Access — Hot Range Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              {liveAccess?.cached && (
                <Badge variant="outline" className="text-xs">Cached</Badge>
              )}
              <Button variant="ghost" size="sm" onClick={fetchLiveAccess} disabled={liveLoading}>
                <RefreshCw className={cn('h-3.5 w-3.5', liveLoading && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {liveLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : liveAccess && liveAccess.services.length > 0 ? (
              <div className="space-y-3">
                {liveAccess.services.map((svc) => (
                  <div
                    key={svc.sid}
                    className="rounded-lg border border-border/50 bg-muted/20 p-4 transition-colors hover:border-primary/20"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-sm font-bold text-primary">
                          {svc.sid.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{svc.sid}</p>
                          <p className="text-xs text-muted-foreground">Last hit {timeAgo(svc.last_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                          <Flame className="mr-1 h-3 w-3" />
                          {svc.hit_count} hits
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Hash className="mr-1 h-3 w-3" />
                          {svc.range_count} ranges
                        </Badge>
                      </div>
                    </div>
                    {svc.ranges.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {svc.ranges.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              const cleanPrefix = r.replace(/X+$/, '');
                              setPrefix(cleanPrefix);
                              toast.info(`Prefix set to ${cleanPrefix || 'auto'}`);
                            }}
                            className="rounded-md border border-border/50 bg-card/50 px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No live range activity detected yet.</p>
              </div>
            )}

            {liveAccess && liveAccess.rangeHits && Object.keys(liveAccess.rangeHits).length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Range → Services Map</p>
                <div className="space-y-1.5">
                  {Object.entries(liveAccess.rangeHits).map(([range, services]) => (
                    <div key={range} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{range}</span>
                      <div className="flex gap-1">
                        {services.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Number Allocation */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-4 w-4 text-primary" />
              Allocate Virtual Number
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  Prefix (optional — leave empty for automatic pool allocation)
                </label>
                <Input
                  placeholder="e.g. 2246"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAllocate()}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Click a hot range above to auto-fill the prefix
                </p>
              </div>
              <Button onClick={handleAllocate} disabled={allocating} className="sm:w-auto">
                {allocating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Allocating...</>
                ) : (
                  <><PlusCircle className="mr-2 h-4 w-4" /> Allocate Number</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Numbers & Batch OTP Polling */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-primary" />
              Active Numbers &amp; Batch OTP Polling
              {polling && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Polling
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={fetchActiveNumbers} disabled={activeLoading}>
                <RefreshCw className={cn('h-3.5 w-3.5', activeLoading && 'animate-spin')} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeNumbers.length > 0 ? (
              <div className="space-y-3">
                {activeNumbers.map((num) => {
                  const otps = pollResults[num.id] || num.otps || [];
                  const expired = new Date(num.expiresAt).getTime() < Date.now();
                  return (
                    <div
                      key={num.id}
                      className={cn(
                        'rounded-lg border p-4 transition-colors',
                        otps.length > 0
                          ? 'border-success/30 bg-success/5'
                          : 'border-border/50 bg-muted/20'
                      )}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-lg',
                            otps.length > 0 ? 'bg-success/10' : 'bg-primary/10'
                          )}>
                            {otps.length > 0 ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <Radio className={cn('h-5 w-5 text-primary', !expired && polling && 'animate-pulse')} />
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-lg font-bold">{num.msisdn}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{num.country}</Badge>
                              <span className={cn(
                                'text-xs',
                                expired ? 'text-destructive' : 'text-muted-foreground'
                              )}>
                                <Clock className="mr-1 inline h-3 w-3" />
                                {expired ? 'Expired' : timeUntil(num.expiresAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            navigator.clipboard.writeText(num.msisdn);
                            toast.success('Number copied');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>

                      {otps.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {otps.map((otp) => (
                            <div
                              key={otp.id}
                              className="flex items-center justify-between rounded-lg border border-success/20 bg-success/5 px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <KeyRound className="h-4 w-4 text-success" />
                                <div>
                                  <p className="font-mono text-lg font-bold text-success">{otp.code}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {otp.service} · {new Date(otp.receivedAt).toLocaleTimeString()}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(otp.code);
                                  toast.success('OTP copied');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : !expired ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          {polling ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Polling for OTPs...</>
                          ) : (
                            <><Radio className="h-3 w-3" /> Waiting for polling cycle...</>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" /> Number expired — allocate a new one
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center">
                <Radio className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active numbers. Allocate one above to start polling.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>OTP polling runs automatically every 5 seconds across all your active numbers.</p>
              <p>Numbers are held for 20 minutes after allocation. Click any hot range to pre-fill the prefix.</p>
              <p>Each number allocation deducts from your wallet balance.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
