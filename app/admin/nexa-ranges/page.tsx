'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2, Plus, Save, Trash2, Edit2, Eye, EyeOff,
  Radar, Globe, Flame, ArrowUp, ArrowDown, X, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

interface NexaRange {
  id: number;
  service_name: string;
  service_sid: string;
  range_prefix: string;
  is_visible: boolean;
  description: string | null;
  sort_order: number;
  created_at: string;
}

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

export default function AdminNexaRangesPage() {
  const [loading, setLoading] = useState(true);
  const [ranges, setRanges] = useState<NexaRange[]>([]);
  const [liveAccess, setLiveAccess] = useState<LiveAccessData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  // Add/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceSid, setServiceSid] = useState('');
  const [rangePrefix, setRangePrefix] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRanges = useCallback(async () => {
    const { data } = await supabase
      .from('nexa_ranges')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setRanges((data || []) as NexaRange[]);
  }, []);

  const fetchLiveAccess = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/scarface-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: '/liveaccess', method: 'GET' }),
      });
      const text = await res.text();
      const parsed = JSON.parse(text);
      setLiveAccess(parsed.data || parsed);
    } catch {
      // silently skip
    }
    setLiveLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchRanges(), fetchLiveAccess()]);
      setLoading(false);
    })();
  }, [fetchRanges, fetchLiveAccess]);

  const resetForm = () => {
    setEditingId(null);
    setServiceName('');
    setServiceSid('');
    setRangePrefix('');
    setDescription('');
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!serviceName.trim() || !rangePrefix.trim()) {
      toast.error('Service name and range prefix are required');
      return;
    }

    setSaving(true);

    if (editingId !== null) {
      const { error } = await supabase
        .from('nexa_ranges')
        .update({
          service_name: serviceName.trim(),
          service_sid: serviceSid.trim(),
          range_prefix: rangePrefix.trim(),
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update range');
      } else {
        toast.success('Range updated successfully');
        resetForm();
        await fetchRanges();
      }
    } else {
      const maxSort = ranges.length > 0 ? Math.max(...ranges.map(r => r.sort_order)) : 0;
      const { error } = await supabase
        .from('nexa_ranges')
        .insert({
          service_name: serviceName.trim(),
          service_sid: serviceSid.trim(),
          range_prefix: rangePrefix.trim(),
          description: description.trim() || null,
          is_visible: true,
          sort_order: maxSort + 1,
        });

      if (error) {
        toast.error('Failed to add range');
      } else {
        toast.success('Range added successfully');
        resetForm();
        await fetchRanges();
      }
    }

    setSaving(false);
  };

  const handleEdit = (range: NexaRange) => {
    setEditingId(range.id);
    setServiceName(range.service_name);
    setServiceSid(range.service_sid);
    setRangePrefix(range.range_prefix);
    setDescription(range.description || '');
    setShowForm(true);
  };

  const handleToggle = async (range: NexaRange) => {
    const { error } = await supabase
      .from('nexa_ranges')
      .update({ is_visible: !range.is_visible, updated_at: new Date().toISOString() })
      .eq('id', range.id);

    if (error) {
      toast.error('Failed to toggle visibility');
    } else {
      toast.success(`${range.service_name} is now ${!range.is_visible ? 'visible' : 'hidden'}`);
      await fetchRanges();
    }
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from('nexa_ranges')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete range');
    } else {
      toast.success('Range deleted');
      await fetchRanges();
    }
  };

  const handleQuickAdd = async (serviceNameVal: string, sid: string, prefix: string) => {
    const maxSort = ranges.length > 0 ? Math.max(...ranges.map(r => r.sort_order)) : 0;
    const { error } = await supabase
      .from('nexa_ranges')
      .insert({
        service_name: serviceNameVal,
        service_sid: sid,
        range_prefix: prefix,
        is_visible: true,
        sort_order: maxSort + 1,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This range already exists');
      } else {
        toast.error('Failed to add range');
      }
    } else {
      toast.success(`Added ${serviceNameVal} (${prefix})`);
      await fetchRanges();
    }
  };

  const handleReorder = async (id: number, direction: 'up' | 'down') => {
    const currentIndex = ranges.findIndex(r => r.id === id);
    if (currentIndex < 0) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ranges.length) return;

    const current = ranges[currentIndex];
    const target = ranges[targetIndex];

    await Promise.all([
      supabase.from('nexa_ranges').update({ sort_order: target.sort_order }).eq('id', current.id),
      supabase.from('nexa_ranges').update({ sort_order: current.sort_order }).eq('id', target.id),
    ]);

    await fetchRanges();
  };

  // Group live ranges by service SID
  const liveServices = liveAccess?.services || [];
  const liveServiceTabs = liveServices.length > 0
    ? Array.from(new Set(liveServices.map(s => s.sid)))
    : [];

  if (loading) {
    return (
      <DashboardLayout admin>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            <Radar className="h-6 w-6 text-primary" />
            Manage Nexa Ranges
          </h1>
          <p className="text-sm text-muted-foreground">Control which hot ranges are visible to users on the Range Numbers page</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLiveAccess} disabled={liveLoading}>
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', liveLoading && 'animate-spin')} />
            Sync Nexa API
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Range
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Whitelisted Ranges */}
        <div className="space-y-4">
          {/* Add/Edit Form */}
          {showForm && (
            <Card className="border-primary/30 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    {editingId !== null ? <Edit2 className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                    {editingId !== null ? 'Edit Range' : 'Add New Range'}
                  </span>
                  <Button size="icon" variant="ghost" onClick={resetForm} className="h-7 w-7">
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="svcName" className="text-sm">Service Name *</Label>
                    <Input id="svcName" placeholder="e.g. WhatsApp, Facebook, Telegram" value={serviceName} onChange={(e) => setServiceName(e.target.value)} disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="svcSid" className="text-sm">Service SID (optional)</Label>
                    <Input id="svcSid" placeholder="e.g. wa, fb, tg" value={serviceSid} onChange={(e) => setServiceSid(e.target.value)} disabled={saving} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rangePrefix" className="text-sm">Range Prefix *</Label>
                  <Input id="rangePrefix" placeholder="e.g. 2246, 4474XX" value={rangePrefix} onChange={(e) => setRangePrefix(e.target.value)} disabled={saving} className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc" className="text-sm">Description (optional)</Label>
                  <Input id="desc" placeholder="e.g. High hit rate for WhatsApp OTPs" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    {editingId !== null ? 'Update Range' : 'Add Range'}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Whitelisted Ranges */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Approved Ranges ({ranges.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {ranges.length === 0 ? (
                <div className="py-8 text-center">
                  <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No ranges approved yet. Add ranges manually or quick-add from the Nexa API feed.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {ranges.map((range, idx) => (
                    <div key={range.id} className={cn('rounded-lg border p-3 transition-colors', range.is_visible ? 'border-border/50 bg-muted/20' : 'border-border/30 bg-muted/10 opacity-60')}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => handleReorder(range.id, 'up')} disabled={idx === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleReorder(range.id, 'down')} disabled={idx === ranges.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30">
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>
                          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', range.is_visible ? 'bg-primary/10' : 'bg-muted')}>
                            <Flame className={cn('h-4 w-4', range.is_visible ? 'text-primary' : 'text-muted-foreground')} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{range.service_name}</p>
                              {range.service_sid && <Badge variant="secondary" className="text-[10px] font-mono">{range.service_sid}</Badge>}
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-accent">{range.range_prefix}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch checked={range.is_visible} onCheckedChange={() => handleToggle(range)} />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(range)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(range.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Nexa API Feed with tabs */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              Nexa API Live Feed
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchLiveAccess} disabled={liveLoading}>
              <RefreshCw className={cn('h-3.5 w-3.5', liveLoading && 'animate-spin')} />
            </Button>
          </CardHeader>
          <CardContent>
            {liveLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : liveServiceTabs.length > 0 ? (
              <Tabs defaultValue={liveServiceTabs[0]}>
                <TabsList className="flex-wrap">
                  {liveServiceTabs.map((sid) => (
                    <TabsTrigger key={sid} value={sid} className="text-xs">
                      {sid}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {liveServiceTabs.map((sid) => {
                  const svc = liveServices.find(s => s.sid === sid);
                  if (!svc) return null;
                  return (
                    <TabsContent key={sid} value={sid} className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                          <Flame className="mr-1 h-3 w-3" />
                          {svc.hit_count} hits
                        </Badge>
                        <Badge variant="outline" className="text-xs">{svc.range_count} ranges</Badge>
                      </div>
                      {svc.ranges.map((r) => {
                        const alreadyApproved = ranges.some(rg => rg.range_prefix === r && rg.service_sid === sid);
                        return (
                          <div key={r} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-accent">{r}</span>
                              {alreadyApproved && (
                                <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                                  <Eye className="mr-1 h-2.5 w-2.5" /> Approved
                                </Badge>
                              )}
                            </div>
                            {!alreadyApproved ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleQuickAdd(sid.toUpperCase(), sid, r)}>
                                <Plus className="mr-1 h-3 w-3" /> Add
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => {
                                const existing = ranges.find(rg => rg.range_prefix === r && rg.service_sid === sid);
                                if (existing) handleDelete(existing.id);
                              }}>
                                <Trash2 className="mr-1 h-3 w-3" /> Remove
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </TabsContent>
                  );
                })}
              </Tabs>
            ) : (
              <div className="py-10 text-center">
                <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No live data from Nexa API. Click "Sync Nexa API" to fetch.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
