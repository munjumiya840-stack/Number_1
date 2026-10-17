'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Loader2, Plus, Save, Trash2, Edit2, Eye, EyeOff,
  Radar, Globe, Flame, ArrowUp, ArrowDown, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function AdminNexaRangesPage() {
  const [loading, setLoading] = useState(true);
  const [ranges, setRanges] = useState<NexaRange[]>([]);

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

  useEffect(() => {
    (async () => {
      await fetchRanges();
      setLoading(false);
    })();
  }, [fetchRanges]);

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
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Range
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="mb-6 border-primary/30 bg-card/50">
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
                <Input
                  id="svcName"
                  placeholder="e.g. WhatsApp, Facebook, Telegram"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svcSid" className="text-sm">Service SID (optional)</Label>
                <Input
                  id="svcSid"
                  placeholder="e.g. wa, fb, tg"
                  value={serviceSid}
                  onChange={(e) => setServiceSid(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rangePrefix" className="text-sm">Range Prefix *</Label>
              <Input
                id="rangePrefix"
                placeholder="e.g. 2246, 4474XX"
                value={rangePrefix}
                onChange={(e) => setRangePrefix(e.target.value)}
                disabled={saving}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                The prefix users will use to allocate numbers for this service
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-sm">Description (optional)</Label>
              <Input
                id="desc"
                placeholder="e.g. High hit rate for WhatsApp OTPs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
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

      {/* Ranges List */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Whitelisted Ranges ({ranges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ranges.length === 0 ? (
            <div className="py-10 text-center">
              <Globe className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No ranges configured yet. Click "Add Range" to create your first one.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                When no admin ranges exist, users see the live Nexa feed directly. Once you add ranges here, only whitelisted ones will be shown.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ranges.map((range, idx) => (
                <div
                  key={range.id}
                  className={cn(
                    'rounded-lg border p-4 transition-colors',
                    range.is_visible
                      ? 'border-border/50 bg-muted/20'
                      : 'border-border/30 bg-muted/10 opacity-60'
                  )}
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleReorder(range.id, 'up')}
                          disabled={idx === 0}
                          className="text-muted-foreground hover:text-primary disabled:opacity-30"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleReorder(range.id, 'down')}
                          disabled={idx === ranges.length - 1}
                          className="text-muted-foreground hover:text-primary disabled:opacity-30"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        range.is_visible ? 'bg-primary/10' : 'bg-muted'
                      )}>
                        <Flame className={cn('h-5 w-5', range.is_visible ? 'text-primary' : 'text-muted-foreground')} />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{range.service_name}</p>
                          {range.service_sid && (
                            <Badge variant="secondary" className="text-[10px] font-mono">{range.service_sid}</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-sm text-accent">{range.range_prefix}</p>
                        {range.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{range.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-1.5">
                        {range.is_visible ? (
                          <Eye className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <Switch
                          checked={range.is_visible}
                          onCheckedChange={() => handleToggle(range)}
                        />
                      </div>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(range)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(range.id)}
                      >
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
    </DashboardLayout>
  );
}
