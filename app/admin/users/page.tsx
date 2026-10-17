'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  Search, Ban, CheckCircle, Loader2, Users as UsersIcon, Eye, DollarSign,
  TrendingUp, ArrowLeftRight, AlertTriangle,
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  balance: number;
  total_earnings: number;
  is_banned: boolean;
  is_admin: boolean;
  join_date: string;
}

interface UserDetail {
  profile: UserProfile;
  otpCount: number;
  orderCount: number;
  rewardTotal: number;
  recentTransactions: Array<{ id: number; type: string; amount: number; status: string; created_at: string }>;
  recentRewards: Array<{ id: number; amount: number; category_name: string | null; created_at: string; status: string }>;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [adjustUser, setAdjustUser] = useState<UserProfile | null>(null);
  const [adjustForm, setAdjustForm] = useState({ amount: 0, reason: '', type: 'adjustment' as string });
  const [adjusting, setAdjusting] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('join_date', { ascending: false })
      .limit(100);
    setUsers(data as UserProfile[] || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(u =>
    !search ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    u.id.includes(search)
  );

  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_type: 'user',
      target_id: targetId,
      details,
    });
  };

  const toggleBan = async (uid: string, currentlyBanned: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_banned: !currentlyBanned })
      .eq('id', uid);
    if (error) {
      toast.error('Failed to update user');
    } else {
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, is_banned: !currentlyBanned } : u));
      toast.success(`User ${currentlyBanned ? 'unbanned' : 'banned'}`);
      await logAudit('user.toggle_ban', uid, { banned: !currentlyBanned });
    }
  };

  const openDetail = async (u: UserProfile) => {
    setDetailOpen(true);
    setDetailLoading(true);
    const [otpRes, orderRes, rewardRes, txnRes, rewardsRes] = await Promise.all([
      supabase.from('otp_success_logs').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('user_id', u.id),
      supabase.from('reward_ledger').select('amount').eq('user_id', u.id).eq('status', 'credited'),
      supabase.from('transactions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('reward_ledger').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const rewards = (rewardRes.data || []) as Array<{ amount: number }>;
    const rewardTotal = rewards.reduce((sum, r) => sum + Number(r.amount), 0);

    setDetail({
      profile: u,
      otpCount: otpRes.count || 0,
      orderCount: orderRes.count || 0,
      rewardTotal,
      recentTransactions: txnRes.data as UserDetail['recentTransactions'] || [],
      recentRewards: rewardsRes.data as UserDetail['recentRewards'] || [],
    });
    setDetailLoading(false);
  };

  const openAdjust = (u: UserProfile) => {
    setAdjustUser(u);
    setAdjustForm({ amount: 0, reason: '', type: 'adjustment' });
    setAdjustDialog(true);
  };

  const handleAdjust = async () => {
    if (!adjustUser) return;
    if (!adjustForm.reason.trim()) {
      toast.error('A reason is required for balance adjustments');
      return;
    }
    if (adjustForm.amount === 0) {
      toast.error('Amount must be non-zero');
      return;
    }
    setAdjusting(true);

    const newBalance = Number(adjustUser.balance) + adjustForm.amount;
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: adjustUser.id,
      type: adjustForm.type,
      amount: adjustForm.amount,
      balance_after: newBalance,
      description: adjustForm.reason.trim(),
      status: 'completed',
    });
    if (txError) {
      toast.error('Failed to create ledger entry');
      setAdjusting(false);
      return;
    }

    const { error: balError } = await supabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', adjustUser.id);
    if (balError) {
      toast.error('Failed to update balance');
    } else {
      toast.success(`Balance adjusted by ${adjustForm.amount >= 0 ? '+' : ''}$${adjustForm.amount.toFixed(2)}`);
      await logAudit('user.balance_adjust', adjustUser.id, {
        amount: adjustForm.amount,
        reason: adjustForm.reason,
        new_balance: newBalance,
      });
      setUsers(prev => prev.map(u => u.id === adjustUser.id ? { ...u, balance: newBalance } : u));
      setAdjustDialog(false);
    }
    setAdjusting(false);
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>User Management</h1>
        <p className="text-sm text-muted-foreground">Search, view, and manage user accounts</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="h-5 w-5 text-primary" />
              Users ({filtered.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium">{u.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}...</p>
                      </TableCell>
                      <TableCell className="text-sm">{u.full_name || '—'}</TableCell>
                      <TableCell className="font-bold">${Number(u.balance || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-success">${Number(u.total_earnings || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {u.is_banned ? (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">Banned</Badge>
                        ) : (
                          <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                        )}
                        {u.is_admin && <Badge className="ml-1 bg-accent/10 text-accent border-accent/20">Admin</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.join_date ? new Date(u.join_date).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(u)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openAdjust(u)} title="Adjust balance">
                            <DollarSign className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleBan(u.id, u.is_banned)}
                          >
                            {u.is_banned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : detail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Username</p>
                  <p className="font-semibold">{detail.profile.username || '—'}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{detail.profile.full_name || '—'}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                  <DollarSign className="mx-auto mb-1 h-4 w-4 text-primary" />
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-bold">${Number(detail.profile.balance || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-success/20 bg-success/5 p-3 text-center">
                  <TrendingUp className="mx-auto mb-1 h-4 w-4 text-success" />
                  <p className="text-xs text-muted-foreground">Earnings</p>
                  <p className="font-bold text-success">${Number(detail.profile.total_earnings || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-center">
                  <ArrowLeftRight className="mx-auto mb-1 h-4 w-4 text-accent" />
                  <p className="text-xs text-muted-foreground">Orders</p>
                  <p className="font-bold">{detail.orderCount}</p>
                </div>
                <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-center">
                  <Eye className="mx-auto mb-1 h-4 w-4 text-warning" />
                  <p className="text-xs text-muted-foreground">OTPs</p>
                  <p className="font-bold">{detail.otpCount}</p>
                </div>
              </div>

              {detail.recentRewards.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Recent Rewards</p>
                  <div className="space-y-1">
                    {detail.recentRewards.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm">
                        <span>{r.category_name || '—'}</span>
                        <span className="font-bold text-success">+${Number(r.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.recentTransactions.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Recent Transactions</p>
                  <div className="space-y-1">
                    {detail.recentTransactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-sm">
                        <span className="capitalize">{tx.type}</span>
                        <span className={Number(tx.amount) >= 0 ? 'text-success font-bold' : 'text-destructive font-bold'}>
                          {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Balance — {adjustUser?.username || adjustUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This creates a ledger transaction and updates the user balance. Current balance: ${Number(adjustUser?.balance || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={adjustForm.type} onValueChange={v => setAdjustForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (use negative for deductions)</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustForm.amount}
                onChange={e => setAdjustForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Textarea
                value={adjustForm.reason}
                onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Explain why this adjustment is being made..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
