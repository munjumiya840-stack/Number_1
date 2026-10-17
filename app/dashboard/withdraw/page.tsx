'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  Wallet, Loader2, ArrowDownToLine, CheckCircle, Clock,
  XCircle, AlertCircle, Banknote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethod {
  id: string;
  label: string;
  color: string;
  bg: string;
  fallbackIcon: React.ReactNode;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'bkash',
    label: 'bKash',
    color: 'text-pink-600',
    bg: 'bg-pink-500',
    fallbackIcon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="6" fill="#E2136E" />
        <text x="16" y="22" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="sans-serif">bK</text>
      </svg>
    ),
  },
  {
    id: 'nagad',
    label: 'Nagad',
    color: 'text-orange-600',
    bg: 'bg-orange-500',
    fallbackIcon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="6" fill="#F48021" />
        <text x="16" y="22" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">N</text>
      </svg>
    ),
  },
  {
    id: 'rocket',
    label: 'Rocket',
    color: 'text-purple-600',
    bg: 'bg-purple-600',
    fallbackIcon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="6" fill="#8B2C9B" />
        <text x="16" y="22" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">R</text>
      </svg>
    ),
  },
  {
    id: 'binance',
    label: 'Binance USDT',
    color: 'text-yellow-600',
    bg: 'bg-yellow-500',
    fallbackIcon: (
      <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none">
        <rect width="32" height="32" rx="6" fill="#F0B90B" />
        <text x="16" y="22" textAnchor="middle" fill="#1A1A1A" fontSize="11" fontWeight="bold" fontFamily="sans-serif">B</text>
      </svg>
    ),
  },
];

interface WithdrawalRequest {
  id: number;
  payment_method: string;
  account_number: string;
  amount: number;
  status: string;
  created_at: string;
  admin_note: string | null;
}

export default function WithdrawPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('bkash');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [withdrawalMin, setWithdrawalMin] = useState(1.0);
  const [withdrawalOpen, setWithdrawalOpen] = useState(true);
  const [paymentAccounts, setPaymentAccounts] = useState<Record<string, string>>({});
  const [paymentImages, setPaymentImages] = useState<Record<string, string>>({});

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);

  useEffect(() => {
    (async () => {
      const [minRes, statusRes, bkashRes, nagadRes, rocketRes, binanceRes, bkashImgRes, nagadImgRes, rocketImgRes, binanceImgRes] = await Promise.all([
        supabase.from('config').select('value').eq('key', 'withdrawal_min_amount').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_status').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_bkash_number').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_nagad_number').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_rocket_number').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_binance_id').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_bkash_image').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_nagad_image').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_rocket_image').maybeSingle(),
        supabase.from('config').select('value').eq('key', 'withdrawal_binance_image').maybeSingle(),
      ]);

      if (minRes.data?.value) setWithdrawalMin(parseFloat(minRes.data.value));
      setWithdrawalOpen(statusRes.data?.value !== 'closed');

      setPaymentAccounts({
        bkash: bkashRes.data?.value || '',
        nagad: nagadRes.data?.value || '',
        rocket: rocketRes.data?.value || '',
        binance: binanceRes.data?.value || '',
      });
      setPaymentImages({
        bkash: bkashImgRes.data?.value || '',
        nagad: nagadImgRes.data?.value || '',
        rocket: rocketImgRes.data?.value || '',
        binance: binanceImgRes.data?.value || '',
      });

      if (user) {
        const { data } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        setRequests(data as WithdrawalRequest[] || []);
      }

      setLoading(false);
    })();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!withdrawalOpen) {
      toast.error('Withdrawals are currently closed. Please try again later.');
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amt < withdrawalMin) {
      toast.error(`Minimum withdrawal amount is $${withdrawalMin.toFixed(2)}`);
      return;
    }
    if (profile && amt > profile.balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!accountNumber.trim()) {
      toast.error('Enter your account number');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from('withdrawal_requests')
      .insert({
        user_id: user.id,
        payment_method: selectedMethod,
        account_number: accountNumber.trim(),
        amount: amt,
        status: 'pending',
      });

    if (error) {
      toast.error('Failed to submit withdrawal request');
      setSubmitting(false);
      return;
    }

    toast.success('Withdrawal request submitted successfully');
    setAmount('');
    setAccountNumber('');
    setSubmitting(false);

    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setRequests(data as WithdrawalRequest[] || []);
    await refreshProfile();
  };

  const getMethodLabel = (id: string) => paymentMethods.find(m => m.id === id)?.label || id;

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
          <ArrowDownToLine className="h-6 w-6 text-primary" />
          Withdraw Earnings
        </h1>
        <p className="text-sm text-muted-foreground">Withdraw your OTP earnings to your preferred payment method</p>
      </div>

      {/* Balance + Status */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-primary/30 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Available Balance</p>
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
                <p className="text-xs text-muted-foreground">Minimum Withdrawal</p>
                <p className="mt-1 text-2xl font-bold text-accent">${withdrawalMin.toFixed(2)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Banknote className="h-5 w-5 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Withdrawal Status</p>
                <p className="mt-1 text-2xl font-bold">
                  <Badge className={cn(
                    'text-sm',
                    withdrawalOpen ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'
                  )}>
                    {withdrawalOpen ? 'Open' : 'Closed'}
                  </Badge>
                </p>
              </div>
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                withdrawalOpen ? 'bg-success/10' : 'bg-destructive/10'
              )}>
                {withdrawalOpen ? <CheckCircle className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!withdrawalOpen && (
        <Card className="mb-6 border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                Withdrawals are currently closed by the admin. Please check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Withdrawal Form */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              New Withdrawal Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label className="text-sm">Select Payment Method</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    disabled={!withdrawalOpen}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-3 transition-all',
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/50 bg-muted/20 hover:border-primary/20',
                      !withdrawalOpen && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {paymentImages[method.id] ? (
                      <img
                        src={paymentImages[method.id]}
                        alt={method.label}
                        className="h-8 w-8 rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      method.fallbackIcon
                    )}
                    <span className="text-xs font-medium">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Number */}
            <div className="space-y-2">
              <Label htmlFor="account" className="text-sm">
                {selectedMethod === 'binance' ? 'Binance ID (UID)' : 'Account Number'}
              </Label>
              <Input
                id="account"
                placeholder={selectedMethod === 'binance' ? 'e.g. 12345678' : 'e.g. 01XXXXXXXXX'}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                disabled={!withdrawalOpen || submitting}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">Amount (USD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={withdrawalMin}
                placeholder={`Min: $${withdrawalMin.toFixed(2)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!withdrawalOpen || submitting}
              />
              <p className="text-xs text-muted-foreground">
                {profile ? `Your balance: $${profile.balance.toFixed(2)}` : ''}
              </p>
            </div>

            {/* Admin payment account info */}
            {paymentAccounts[selectedMethod] && (
              <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Send to admin account: <span className="font-mono font-medium text-foreground">{paymentAccounts[selectedMethod]}</span>
                </p>
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!withdrawalOpen || submitting || !profile || profile.balance < withdrawalMin}
              className="w-full"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <><ArrowDownToLine className="mr-2 h-4 w-4" /> Submit Withdrawal Request</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Withdrawal History */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="py-10 text-center">
                <ArrowDownToLine className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No withdrawal requests yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-lg border border-border/50 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          {req.status === 'approved' ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : req.status === 'rejected' ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Clock className="h-5 w-5 text-accent" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold">${req.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {getMethodLabel(req.payment_method)} · {req.account_number}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(req.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn(
                        'text-xs',
                        req.status === 'approved' && 'bg-success/10 text-success border-success/20',
                        req.status === 'pending' && 'bg-accent/10 text-accent border-accent/20',
                        req.status === 'rejected' && 'bg-destructive/10 text-destructive border-destructive/20',
                      )}>
                        {req.status}
                      </Badge>
                    </div>
                    {req.admin_note && req.status === 'rejected' && (
                      <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
                        <p className="text-xs text-destructive">{req.admin_note}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
