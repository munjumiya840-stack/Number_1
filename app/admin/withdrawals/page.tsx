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
  Loader2, Banknote, CheckCircle, XCircle, Clock,
  DollarSign, Save, Eye, EyeOff, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WithdrawalRow {
  id: number;
  user_id: string;
  payment_method: string;
  account_number: string;
  amount: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  user_email?: string;
}

const methodLabels: Record<string, string> = {
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  binance: 'Binance USDT',
};

export default function AdminWithdrawalsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<WithdrawalRow[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Config
  const [minAmount, setMinAmount] = useState('1.00');
  const [savedMinAmount, setSavedMinAmount] = useState('');
  const [withdrawalOpen, setWithdrawalOpen] = useState(true);
  const [savedWithdrawalOpen, setSavedWithdrawalOpen] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Payment accounts
  const [bkashNumber, setBkashNumber] = useState('');
  const [savedBkashNumber, setSavedBkashNumber] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [savedNagadNumber, setSavedNagadNumber] = useState('');
  const [rocketNumber, setRocketNumber] = useState('');
  const [savedRocketNumber, setSavedRocketNumber] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [savedBinanceId, setSavedBinanceId] = useState('');

  // Payment method image URLs
  const [bkashImage, setBkashImage] = useState('');
  const [savedBkashImage, setSavedBkashImage] = useState('');
  const [nagadImage, setNagadImage] = useState('');
  const [savedNagadImage, setSavedNagadImage] = useState('');
  const [rocketImage, setRocketImage] = useState('');
  const [savedRocketImage, setSavedRocketImage] = useState('');
  const [binanceImage, setBinanceImage] = useState('');
  const [savedBinanceImage, setSavedBinanceImage] = useState('');

  // Reject dialog
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;

    // Fetch user emails
    const rows = (data || []) as WithdrawalRow[];
    if (rows.length > 0) {
      const userIds = Array.from(new Set(rows.map(r => r.user_id)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const emailMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || 'Unknown']));
      rows.forEach(r => { r.user_email = emailMap.get(r.user_id) || 'Unknown'; });
    }

    setRequests(rows);
  }, [filterStatus]);

  useEffect(() => {
    (async () => {
      const keys = [
        'withdrawal_min_amount', 'withdrawal_status',
        'withdrawal_bkash_number', 'withdrawal_nagad_number',
        'withdrawal_rocket_number', 'withdrawal_binance_id',
        'withdrawal_bkash_image', 'withdrawal_nagad_image',
        'withdrawal_rocket_image', 'withdrawal_binance_image',
      ];
      const { data } = await supabase.from('config').select('key, value').in('key', keys);
      const cfg: Record<string, string> = {};
      for (const row of (data || [])) {
        cfg[row.key] = row.value;
      }

      const minVal = cfg['withdrawal_min_amount'] || '1.00';
      setMinAmount(minVal);
      setSavedMinAmount(minVal);

      const isOpen = cfg['withdrawal_status'] !== 'closed';
      setWithdrawalOpen(isOpen);
      setSavedWithdrawalOpen(isOpen);

      setBkashNumber(cfg['withdrawal_bkash_number'] || '');
      setSavedBkashNumber(cfg['withdrawal_bkash_number'] || '');
      setNagadNumber(cfg['withdrawal_nagad_number'] || '');
      setSavedNagadNumber(cfg['withdrawal_nagad_number'] || '');
      setRocketNumber(cfg['withdrawal_rocket_number'] || '');
      setSavedRocketNumber(cfg['withdrawal_rocket_number'] || '');
      setBinanceId(cfg['withdrawal_binance_id'] || '');
      setSavedBinanceId(cfg['withdrawal_binance_id'] || '');

      setBkashImage(cfg['withdrawal_bkash_image'] || '');
      setSavedBkashImage(cfg['withdrawal_bkash_image'] || '');
      setNagadImage(cfg['withdrawal_nagad_image'] || '');
      setSavedNagadImage(cfg['withdrawal_nagad_image'] || '');
      setRocketImage(cfg['withdrawal_rocket_image'] || '');
      setSavedRocketImage(cfg['withdrawal_rocket_image'] || '');
      setBinanceImage(cfg['withdrawal_binance_image'] || '');
      setSavedBinanceImage(cfg['withdrawal_binance_image'] || '');

      await fetchRequests();
      setLoading(false);
    })();
  }, [fetchRequests]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const updates = [
      supabase.from('config').upsert({ key: 'withdrawal_min_amount', value: minAmount || '1.00' }),
      supabase.from('config').upsert({ key: 'withdrawal_status', value: withdrawalOpen ? 'open' : 'closed' }),
      supabase.from('config').upsert({ key: 'withdrawal_bkash_number', value: bkashNumber }),
      supabase.from('config').upsert({ key: 'withdrawal_nagad_number', value: nagadNumber }),
      supabase.from('config').upsert({ key: 'withdrawal_rocket_number', value: rocketNumber }),
      supabase.from('config').upsert({ key: 'withdrawal_binance_id', value: binanceId }),
      supabase.from('config').upsert({ key: 'withdrawal_bkash_image', value: bkashImage }),
      supabase.from('config').upsert({ key: 'withdrawal_nagad_image', value: nagadImage }),
      supabase.from('config').upsert({ key: 'withdrawal_rocket_image', value: rocketImage }),
      supabase.from('config').upsert({ key: 'withdrawal_binance_image', value: binanceImage }),
    ];
    const results = await Promise.all(updates);
    setSavingConfig(false);

    if (results.some(r => r.error)) {
      toast.error('Failed to save some settings');
    } else {
      setSavedMinAmount(minAmount);
      setSavedWithdrawalOpen(withdrawalOpen);
      setSavedBkashNumber(bkashNumber);
      setSavedNagadNumber(nagadNumber);
      setSavedRocketNumber(rocketNumber);
      setSavedBinanceId(binanceId);
      setSavedBkashImage(bkashImage);
      setSavedNagadImage(nagadImage);
      setSavedRocketImage(rocketImage);
      setSavedBinanceImage(binanceImage);
      toast.success('Withdrawal settings saved');
    }
  };

  const handleApprove = async (id: number, userId: string, amount: number) => {
    setProcessing(true);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast.error('Failed to approve request');
      setProcessing(false);
      return;
    }

    // Deduct from user balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ balance: Math.max(0, profile.balance - amount) })
        .eq('id', userId);
    }

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'withdrawal',
      amount: -amount,
      status: 'completed',
      description: `Withdrawal approved (${id})`,
    });

    toast.success('Withdrawal approved and balance deducted');
    setProcessing(false);
    await fetchRequests();
  };

  const handleReject = async () => {
    if (rejectingId === null) return;
    setProcessing(true);
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        admin_note: rejectNote.trim() || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', rejectingId);

    if (error) {
      toast.error('Failed to reject request');
    } else {
      toast.success('Withdrawal request rejected');
    }

    setRejectingId(null);
    setRejectNote('');
    setProcessing(false);
    await fetchRequests();
  };

  const configChanged =
    minAmount !== savedMinAmount ||
    withdrawalOpen !== savedWithdrawalOpen ||
    bkashNumber !== savedBkashNumber ||
    nagadNumber !== savedNagadNumber ||
    rocketNumber !== savedRocketNumber ||
    binanceId !== savedBinanceId ||
    bkashImage !== savedBkashImage ||
    nagadImage !== savedNagadImage ||
    rocketImage !== savedRocketImage ||
    binanceImage !== savedBinanceImage;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
          Withdrawal Management
        </h1>
        <p className="text-sm text-muted-foreground">Manage withdrawal settings and process user requests</p>
      </div>

      {/* Settings Cards */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Control Settings */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Withdrawal Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minAmount" className="text-sm">Minimum Withdrawal Amount (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="minAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="pl-9"
                  disabled={savingConfig}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <div>
                <Label className="font-medium text-sm">Withdrawal Status</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {withdrawalOpen ? 'Open — users can submit requests' : 'Closed — blocked for users'}
                </p>
              </div>
              <Switch
                checked={withdrawalOpen}
                onCheckedChange={setWithdrawalOpen}
                disabled={savingConfig}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Accounts */}
        <Card className="border-border/50 bg-card/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Payment Method Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-pink-600">bKash Number</Label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={bkashNumber}
                  onChange={(e) => setBkashNumber(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-orange-600">Nagad Number</Label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={nagadNumber}
                  onChange={(e) => setNagadNumber(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-600">Rocket Number</Label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={rocketNumber}
                  onChange={(e) => setRocketNumber(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-yellow-600">Binance ID (UID)</Label>
                <Input
                  placeholder="12345678"
                  value={binanceId}
                  onChange={(e) => setBinanceId(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
            </div>
            {/* Image URL inputs */}
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-pink-600">bKash Logo URL</Label>
                <Input
                  placeholder="https://example.com/bkash.png"
                  value={bkashImage}
                  onChange={(e) => setBkashImage(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-orange-600">Nagad Logo URL</Label>
                <Input
                  placeholder="https://example.com/nagad.png"
                  value={nagadImage}
                  onChange={(e) => setNagadImage(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-600">Rocket Logo URL</Label>
                <Input
                  placeholder="https://example.com/rocket.png"
                  value={rocketImage}
                  onChange={(e) => setRocketImage(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-yellow-600">Binance Logo URL</Label>
                <Input
                  placeholder="https://example.com/binance.png"
                  value={binanceImage}
                  onChange={(e) => setBinanceImage(e.target.value)}
                  disabled={savingConfig}
                  className="text-sm"
                />
              </div>
            </div>
            <Button onClick={handleSaveConfig} disabled={savingConfig || !configChanged} className="w-full">
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Save All Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Requests Table */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg">Withdrawal Requests</CardTitle>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <Button
                key={status}
                size="sm"
                variant={filterStatus === status ? 'default' : 'outline'}
                onClick={() => setFilterStatus(status)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="py-10 text-center">
              <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No withdrawal requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left text-xs text-muted-foreground">
                    <th className="pb-3 pr-3 font-medium">User</th>
                    <th className="pb-3 pr-3 font-medium">Method</th>
                    <th className="pb-3 pr-3 font-medium">Account</th>
                    <th className="pb-3 pr-3 font-medium">Amount</th>
                    <th className="pb-3 pr-3 font-medium">Date</th>
                    <th className="pb-3 pr-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b border-border/30">
                      <td className="py-3 pr-3">
                        <span className="text-xs">{req.user_email}</span>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant="secondary" className="text-xs">
                          {methodLabels[req.payment_method] || req.payment_method}
                        </Badge>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">{req.account_number}</td>
                      <td className="py-3 pr-3 font-bold text-primary">${req.amount.toFixed(2)}</td>
                      <td className="py-3 pr-3 text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge className={cn(
                          'text-xs',
                          req.status === 'approved' && 'bg-success/10 text-success border-success/20',
                          req.status === 'pending' && 'bg-accent/10 text-accent border-accent/20',
                          req.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/20',
                        )}>
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {req.status === 'pending' ? (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              disabled={processing}
                              onClick={() => handleApprove(req.id, req.user_id, req.amount)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              disabled={processing}
                              onClick={() => { setRejectingId(req.id); setRejectNote(''); }}
                            >
                              <XCircle className="mr-1 h-3 w-3" /> Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Modal */}
      {rejectingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setRejectingId(null)} />
          <Card className="relative z-10 w-full max-w-md border-border/50 bg-card shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                Reject Withdrawal Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rejectNote" className="text-sm">Reason (optional)</Label>
                <Input
                  id="rejectNote"
                  placeholder="e.g. Invalid account number"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleReject} disabled={processing} className="flex-1">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Reject'}
                </Button>
                <Button variant="outline" onClick={() => setRejectingId(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
