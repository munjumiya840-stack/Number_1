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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Plus, Pencil, Trash2, Loader2, Gift, DollarSign, Layers } from 'lucide-react';
import type { RewardRule, Category } from '@/lib/types';

export default function AdminRewardsPage() {
  const { user } = useAuth();
  const [rules, setRules] = useState<RewardRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<RewardRule | null>(null);
  const [form, setForm] = useState({
    scope: 'global' as RewardRule['scope'],
    scope_ref: '',
    amount: 0,
    is_active: true,
    precedence: 0,
  });
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    const [rulesRes, catRes] = await Promise.all([
      supabase.from('reward_rules').select('*').order('precedence', { ascending: false }),
      supabase.from('categories').select('*').order('display_name'),
    ]);
    if (rulesRes.data) setRules(rulesRes.data as RewardRule[]);
    if (catRes.data) setCategories(catRes.data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_type: 'reward_rule',
      target_id: targetId,
      details,
    });
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm({ scope: 'global', scope_ref: '', amount: 0, is_active: true, precedence: 0 });
    setEditDialog(true);
  };

  const openEdit = (rule: RewardRule) => {
    setEditingRule(rule);
    setForm({
      scope: rule.scope,
      scope_ref: rule.scope_ref || '',
      amount: rule.amount,
      is_active: rule.is_active,
      precedence: rule.precedence,
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      scope: form.scope,
      scope_ref: form.scope === 'global' ? null : form.scope_ref.trim() || null,
      amount: form.amount,
      is_active: form.is_active,
      precedence: form.precedence,
      updated_at: new Date().toISOString(),
    };

    if (editingRule) {
      const { error } = await supabase.from('reward_rules').update(payload).eq('id', editingRule.id);
      if (error) {
        toast.error('Failed to update rule');
      } else {
        toast.success('Reward rule updated');
        await logAudit('reward_rule.update', String(editingRule.id), payload);
        setEditDialog(false);
        fetchRules();
      }
    } else {
      const { error } = await supabase.from('reward_rules').insert(payload);
      if (error) {
        toast.error('Failed to create rule');
      } else {
        toast.success('Reward rule created');
        await logAudit('reward_rule.create', form.scope, payload);
        setEditDialog(false);
        fetchRules();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (rule: RewardRule) => {
    const { error } = await supabase.from('reward_rules').delete().eq('id', rule.id);
    if (error) {
      toast.error('Failed to delete rule');
    } else {
      toast.success('Rule deleted');
      await logAudit('reward_rule.delete', String(rule.id), { scope: rule.scope });
      fetchRules();
    }
  };

  const scopeLabel = (scope: string, ref: string | null) => {
    if (scope === 'global') return 'Global Default';
    const cat = categories.find(c => String(c.id) === ref);
    return `${scope}: ${ref || '—'}${cat ? ` (${cat.display_name})` : ''}`;
  };

  const precedenceOrder = ['provider', 'country', 'service', 'category', 'global'];

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            OTP Reward Settings
          </h1>
          <p className="text-sm text-muted-foreground">Configure how much users earn per verified OTP</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Rule
        </Button>
      </div>

      <Card className="mb-4 border-accent/20 bg-accent/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Layers className="h-5 w-5 text-accent mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Precedence Rule</p>
              <p className="text-muted-foreground">
                When multiple rules apply, the most specific one wins: Provider &gt; Country &gt; Service &gt; Category &gt; Global.
                Higher precedence value overrides lower. Historical rewards are never changed when rates update.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-primary" />
              Reward Rules ({rules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No rules configured</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Precedence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{rule.scope}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{rule.scope_ref || '—'}</TableCell>
                      <TableCell className="font-bold text-success">
                        ${rule.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{rule.precedence}</TableCell>
                      <TableCell>
                        {rule.is_active ? (
                          <Badge className="bg-success/10 text-success border-success/20 text-xs">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(rule)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'New Reward Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Scope</Label>
              <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v as RewardRule['scope'], scope_ref: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (default for all)</SelectItem>
                  <SelectItem value="category">Category-specific</SelectItem>
                  <SelectItem value="service">Service-specific</SelectItem>
                  <SelectItem value="country">Country-specific</SelectItem>
                  <SelectItem value="provider">Provider-specific</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scope !== 'global' && (
              <div>
                <Label>
                  {form.scope === 'category' ? 'Category ID' : `${form.scope.charAt(0).toUpperCase() + form.scope.slice(1)} Reference`}
                </Label>
                {form.scope === 'category' ? (
                  <Select value={form.scope_ref} onValueChange={v => setForm(f => ({ ...f, scope_ref: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.scope_ref}
                    onChange={e => setForm(f => ({ ...f, scope_ref: e.target.value }))}
                    placeholder={form.scope === 'country' ? 'US' : 'service-name'}
                  />
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount per OTP ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Precedence</Label>
                <Input
                  type="number"
                  value={form.precedence}
                  onChange={e => setForm(f => ({ ...f, precedence: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={checked => setForm(f => ({ ...f, is_active: checked }))} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
