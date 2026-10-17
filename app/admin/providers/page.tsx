'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  Plus, Pencil, Trash2, Loader2, Server, Wifi, WifiOff, AlertCircle,
  Plug, Eye, EyeOff,
} from 'lucide-react';
import type { Provider } from '@/lib/types';

export default function AdminProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteProvider, setDeleteProvider] = useState<Provider | null>(null);
  const [testing, setTesting] = useState<number | null>(null);
  const [form, setForm] = useState({
    display_name: '',
    internal_id: '',
    api_base_url: '',
    api_key: '',
    status: 'inactive' as 'active' | 'inactive',
    priority: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchProviders = useCallback(async () => {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('priority', { ascending: true });
    if (!error && data) setProviders(data as Provider[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_type: 'provider',
      target_id: targetId,
      details,
    });
  };

  const openCreate = () => {
    setEditingProvider(null);
    setForm({
      display_name: '',
      internal_id: '',
      api_base_url: '',
      api_key: '',
      status: 'inactive',
      priority: providers.length + 1,
    });
    setEditDialog(true);
  };

  const openEdit = (prov: Provider) => {
    setEditingProvider(prov);
    setForm({
      display_name: prov.display_name,
      internal_id: prov.internal_id,
      api_base_url: prov.api_base_url || '',
      api_key: '',
      status: prov.status,
      priority: prov.priority,
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim() || !form.internal_id.trim()) {
      toast.error('Display name and internal ID are required');
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      display_name: form.display_name.trim(),
      internal_id: form.internal_id.trim(),
      api_base_url: form.api_base_url.trim() || null,
      status: form.status,
      priority: form.priority,
      updated_at: new Date().toISOString(),
    };
    if (form.api_key.trim()) {
      payload.api_key_encrypted = btoa(form.api_key.trim());
    }

    if (editingProvider) {
      const { error } = await supabase.from('providers').update(payload).eq('id', editingProvider.id);
      if (error) {
        toast.error('Failed to update provider');
      } else {
        toast.success('Provider updated');
        await logAudit('provider.update', String(editingProvider.id), { name: form.display_name });
        setEditDialog(false);
        fetchProviders();
      }
    } else {
      const { error } = await supabase.from('providers').insert(payload);
      if (error) {
        toast.error('Failed to create provider');
      } else {
        toast.success('Provider created');
        await logAudit('provider.create', form.internal_id, { name: form.display_name });
        setEditDialog(false);
        fetchProviders();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteProvider) return;
    const { error } = await supabase.from('providers').delete().eq('id', deleteProvider.id);
    if (error) {
      toast.error('Failed to delete provider');
    } else {
      toast.success('Provider deleted');
      await logAudit('provider.delete', String(deleteProvider.id), { name: deleteProvider.display_name });
      setDeleteDialog(false);
      setDeleteProvider(null);
      fetchProviders();
    }
  };

  const toggleStatus = async (prov: Provider) => {
    const newStatus = prov.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('providers')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', prov.id);
    if (error) {
      toast.error('Failed to toggle status');
    } else {
      toast.success(`${prov.display_name} ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
      await logAudit('provider.toggle', String(prov.id), { status: newStatus });
      fetchProviders();
    }
  };

  const handleTest = async (prov: Provider) => {
    setTesting(prov.id);
    try {
      const startTime = Date.now();
      let status: 'connected' | 'error' = 'error';
      let errorMsg: string | null = null;

      if (prov.api_base_url) {
        try {
          const apiKey = prov.api_key_encrypted
            ? atob(prov.api_key_encrypted)
            : '';
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
          const proxyUrl = `${supabaseUrl}/functions/v1/lamix-proxy/messages?limit=1`;
          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiBaseUrl: prov.api_base_url,
              apiKey,
              method: 'GET',
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (response.ok) {
            status = 'connected';
          } else if (response.status === 401) {
            status = 'error';
            errorMsg = 'Invalid API key';
          } else if (response.status === 403) {
            status = 'error';
            errorMsg = 'Extended API not enabled';
          } else {
            const errBody = await response.text();
            errorMsg = `HTTP ${response.status}: ${errBody.slice(0, 100)}`;
          }
        } catch {
          errorMsg = 'Connection failed (check proxy function)';
        }
      } else {
        errorMsg = 'No API base URL configured';
      }

      const latency = Date.now() - startTime;
      await supabase.from('providers').update({
        connection_status: status,
        last_tested_at: new Date().toISOString(),
        last_latency_ms: latency,
        last_error: errorMsg,
        updated_at: new Date().toISOString(),
      }).eq('id', prov.id);

      if (status === 'connected') {
        toast.success(`${prov.display_name}: Connected (${latency}ms)`);
      } else {
        toast.error(`${prov.display_name}: ${errorMsg}`);
      }
      await logAudit('provider.test', String(prov.id), { status, latency, error: errorMsg });
      fetchProviders();
    } catch {
      toast.error('Test failed');
    }
    setTesting(null);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-3 w-3 text-success" />;
      case 'error': return <AlertCircle className="h-3 w-3 text-destructive" />;
      case 'disconnected': return <WifiOff className="h-3 w-3 text-muted-foreground" />;
      default: return <div className="h-2 w-2 rounded-full bg-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Provider Panels
          </h1>
          <p className="text-sm text-muted-foreground">Manage number provider integrations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Provider
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : providers.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-12 text-center">
            <Server className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No providers configured. Add your first provider panel.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {providers.map(prov => (
            <Card key={prov.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-muted/30">
                      <Server className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{prov.display_name}</p>
                        {statusIcon(prov.connection_status)}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{prov.internal_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(prov)}>
                      {prov.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(prov)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteProvider(prov); setDeleteDialog(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API URL</span>
                    <span className="font-mono text-xs truncate max-w-[200px]">{prov.api_base_url || 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">API Key</span>
                    <span className="font-mono text-xs">{prov.api_key_encrypted ? '••••••••' : 'Not set'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Priority</span>
                    <span>{prov.priority}</span>
                  </div>
                  {prov.last_tested_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last Test</span>
                      <span className="text-xs">
                        {prov.connection_status === 'connected' ? `${prov.last_latency_ms}ms` : prov.last_error || 'Error'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTest(prov)}
                    disabled={testing === prov.id}
                  >
                    {testing === prov.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plug className="mr-1 h-3 w-3" />}
                    Test Connection
                  </Button>
                  {prov.status === 'active' ? (
                    <Badge className="bg-success/10 text-success border-success/20 text-xs">Enabled</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Disabled</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit Provider' : 'New Provider'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Teleroutex" />
              </div>
              <div>
                <Label>Internal ID</Label>
                <Input value={form.internal_id} onChange={e => setForm(f => ({ ...f, internal_id: e.target.value }))} placeholder="teleroutex" />
              </div>
            </div>
            <div>
              <Label>API Base URL</Label>
              <Input value={form.api_base_url} onChange={e => setForm(f => ({ ...f, api_base_url: e.target.value }))} placeholder="https://api.provider.com/v1" />
            </div>
            <div>
              <Label>API Key {editingProvider && '(leave blank to keep current)'}</Label>
              <Input
                type="password"
                value={form.api_key}
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="sk-..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Stored encrypted. Never shown in full after saving.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex h-9 items-center gap-2">
                  <Switch checked={form.status === 'active'} onCheckedChange={checked => setForm(f => ({ ...f, status: checked ? 'active' : 'inactive' }))} />
                  <span className="text-sm">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete provider?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteProvider?.display_name}&rdquo;. Existing orders will keep the provider name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
