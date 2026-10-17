'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useCategories } from '@/hooks/use-categories';
import { toast } from 'sonner';
import { Phone, Globe, Loader2, RefreshCw, Copy, ChevronRight, Package, Image as ImageIcon, KeyRound, CheckCircle, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryName, getCountryFlag } from '@/lib/constants';
import type { Category } from '@/lib/types';

interface ManualService {
  id: number;
  service_name: string;
  country_name: string;
  flag: string | null;
  stock: number;
  give_amount: number;
  cooldown: number;
  category_id: number | null;
}

interface RangeService {
  id: number;
  name: string;
  range_val: string;
  country_code: string | null;
  flag: string | null;
  is_hot: boolean;
  success_count: number;
}

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

export default function GetNumberPage() {
  const { user } = useAuth();
  const { categories, loading: catLoading } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [manualServices, setManualServices] = useState<ManualService[]>([]);
  const [rangeServices, setRangeServices] = useState<RangeService[]>([]);
  const [loading, setLoading] = useState(false);
  const [assignedNumbers, setAssignedNumbers] = useState<string[] | null>(null);
  const [assignedCountry, setAssignedCountry] = useState<string>('');
  const [includeCountryCode, setIncludeCountryCode] = useState(true);
  const [otps, setOtps] = useState<ReceivedOtp[]>([]);
  const [polling, setPolling] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnreadNotifs(count || 0);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedCategory) return;
    (async () => {
      setLoading(true);
      const [manuals, ranges] = await Promise.all([
        supabase.from('manual_services').select('*').eq('category_id', selectedCategory.id).gt('stock', 0),
        supabase.from('services').select('*').eq('name', selectedCategory.display_name).order('is_hot', { ascending: false }).order('success_count', { ascending: false }),
      ]);
      setManualServices(manuals.data || []);
      setRangeServices(ranges.data || []);
      setLoading(false);
    })();
  }, [selectedCategory]);

  const formatNumber = (num: string): string => {
    if (includeCountryCode) {
      return num.startsWith('+') ? num : `+${num}`;
    }
    return stripCountryCode(num);
  };

  const handleGetManualNumber = async (svcId: number) => {
    if (!user) return;
    setLoading(true);
    try {
      const svc = manualServices.find(s => s.id === svcId);
      if (!svc) return;
      const { data: nums } = await supabase
        .from('manual_numbers')
        .select('*')
        .eq('service_id', svcId)
        .limit(svc.give_amount);
      if (!nums || nums.length < svc.give_amount) {
        toast.error('Not enough numbers in stock');
        setLoading(false);
        return;
      }
      for (const n of nums) {
        await supabase.from('manual_numbers').delete().eq('id', n.id);
      }
      const newStock = svc.stock - nums.length;
      await supabase.from('manual_services').update({ stock: newStock }).eq('id', svcId);
      const numStrings = nums.map(n => n.number);
      await supabase.from('user_active_manual').upsert({
        user_id: user.id,
        active_data: {
          svc_id: svcId,
          svc: svc.service_name,
          c: svc.country_name,
          nums: numStrings,
          buy_time: Date.now() / 1000,
        },
      });
      if (selectedCategory) {
        await supabase.from('orders').insert({
          user_id: user.id,
          category_id: selectedCategory.id,
          category_name: selectedCategory.display_name,
          phone_number: numStrings[0],
          country: svc.country_name,
          status: 'assigned',
          cost: 0,
        });
      }
      setAssignedNumbers(numStrings);
      setAssignedCountry(svc.country_name);
      setOtps([]);
      toast.success(`Got ${numStrings.length} number(s)!`);
      setManualServices(prev => prev.map(s => s.id === svcId ? { ...s, stock: newStock } : s));
    } catch {
      toast.error('Failed to get number');
    }
    setLoading(false);
  };

  // OTP polling
  useEffect(() => {
    if (!assignedNumbers || !user || !selectedCategory) return;
    let cancelled = false;

    const pollOtp = async () => {
      if (cancelled) return;
      setPolling(true);
      for (const num of assignedNumbers) {
        const cleanNum = stripCountryCode(num);
        const { data: existing } = await supabase
          .from('otp_success_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('phone_number', num)
          .order('timestamp', { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          const log = existing[0];
          if (!otps.find(o => o.otp_code === log.otp_code && o.timestamp === log.timestamp)) {
            setOtps(prev => [...prev, {
              otp_code: log.otp_code,
              service_name: log.service_name || selectedCategory.display_name,
              timestamp: log.timestamp,
            }]);
            toast.success(`OTP received: ${log.otp_code}`);
          }
        }

        // Check Lamix provider messages for this number
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
                        service_name: rec.cli || selectedCategory.display_name,
                        timestamp: rec.time,
                      }]);
                      await supabase.from('otp_success_logs').insert({
                        user_id: user.id,
                        phone_number: num,
                        otp_code: code,
                        service_name: rec.cli || selectedCategory.display_name,
                      });
                      toast.success(`OTP received: ${code}`);
                    }
                  }
                }
              }
            }
          } catch {
            // silently skip API errors during polling
          }
        }
      }
      setPolling(false);
    };

    pollOtp();
    const interval = setInterval(pollOtp, 10000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedNumbers, user, selectedCategory]);

  if (catLoading) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>Get Number</h1>
        <p className="text-sm text-muted-foreground">Select a service and country to get a virtual number</p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <Card
              key={cat.id}
              className="group cursor-pointer border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:glow-cyan"
              onClick={() => { setSelectedCategory(cat); setAssignedNumbers(null); setOtps([]); }}
            >
              <CardContent className="p-6 text-center">
                <div className="mb-3 mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/30">
                  {cat.logo_url ? (
                    <img src={cat.logo_url} alt={cat.display_name} className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <h3 className="font-semibold">{cat.display_name}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{cat.description || ''}</p>
                {cat.reward_per_otp > 0 && (
                  <Badge className="mt-2 bg-success/10 text-success border-success/20 text-xs">
                    Earn ${cat.reward_per_otp.toFixed(2)}/OTP
                  </Badge>
                )}
                <Button className="mt-4 w-full" size="sm" variant="outline">
                  Select <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {categories.length === 0 && (
            <Card className="col-span-full border-border/50 bg-card/50">
              <CardContent className="p-12 text-center">
                <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No services available yet. Please check back later.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : assignedNumbers ? (
        <Card className="border-primary/30 bg-card/50 glow-cyan max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Phone className="h-5 w-5 text-primary" />
              Your Number{assignedNumbers.length > 1 ? 's' : ''} Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Country code toggle */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getFlagForCountry(assignedCountry)}</span>
                <div>
                  <p className="text-sm font-medium">Country code format</p>
                  <p className="text-xs text-muted-foreground">
                    {includeCountryCode ? 'Numbers include + and country code' : 'Raw numbers only (no + or country code)'}
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
              {assignedNumbers.map((num, i) => {
                const formatted = formatNumber(num);
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getFlagForCountry(assignedCountry)}</span>
                      <div>
                        <p className="font-mono text-lg font-bold">{formatted}</p>
                        <p className="text-xs text-muted-foreground">
                          {otps.length > 0 ? 'OTP received!' : 'Waiting for OTP...'}
                        </p>
                      </div>
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

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setAssignedNumbers(null); setOtps([]); }}
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Get New Number
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setSelectedCategory(null); setAssignedNumbers(null); setOtps([]); }}
                className="flex-1"
              >
                Change Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                <ChevronRight className="mr-1 h-4 w-4 rotate-180" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded border border-border/50 bg-muted/30">
                  {selectedCategory.logo_url ? (
                    <img src={selectedCategory.logo_url} alt={selectedCategory.display_name} className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <h2 className="text-lg font-semibold">{selectedCategory.display_name}</h2>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
              Change Service
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Country code preference toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Number format preference</p>
                  <p className="text-xs text-muted-foreground">
                    Choose whether numbers include the country code and + sign
                  </p>
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

              {manualServices.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Package className="h-4 w-4 text-primary" />
                    Premium Numbers (In Stock)
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {manualServices.map((svc) => (
                      <Card key={svc.id} className="border-border/50 bg-card/50">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getFlagForCountry(svc.country_name)}</span>
                            <div>
                              <p className="font-medium">{svc.country_name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">{svc.stock} in stock</Badge>
                                {svc.cooldown > 0 && <Badge variant="outline" className="text-xs">{svc.cooldown}s cooldown</Badge>}
                              </div>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleGetManualNumber(svc.id)} disabled={loading}>
                            Get Number
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {rangeServices.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <Globe className="h-4 w-4 text-accent" />
                    Range-Based Numbers
                  </h3>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {rangeServices.map((svc) => (
                      <Card key={svc.id} className={cn("border-border/50 bg-card/50", svc.is_hot && "border-primary/20")}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{svc.country_code ? getCountryFlag(svc.country_code) : '🌍'}</span>
                            <div>
                              <p className="font-medium">{svc.country_code ? getCountryName(svc.country_code) : 'Global'}</p>
                              <p className="text-xs text-muted-foreground">Range: {svc.range_val}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {svc.is_hot && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Hot</Badge>}
                            {svc.success_count > 0 && <Badge variant="outline" className="text-xs">{svc.success_count} hits</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {manualServices.length === 0 && rangeServices.length === 0 && (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-12 text-center">
                    <Phone className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No numbers currently available for {selectedCategory.display_name}. Please check back later.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
