'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Wallet, Loader2, ArrowDownLeft, ArrowUpRight, Info, Gift, TrendingUp } from 'lucide-react';

export default function WalletPage() {
  const { user, profile } = useAuth();
  const [transactions, setTransactions] = useState<Array<{
    id: number; type: string; amount: number; status: string; description: string | null; created_at: string;
  }>>([]);
  const [rewards, setRewards] = useState<Array<{
    id: number; amount: number; category_name: string | null; created_at: string; status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [txnRes, rewardRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('reward_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      setTransactions(txnRes.data || []);
      setRewards(rewardRes.data as typeof rewards || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>Wallet</h1>
        <p className="text-sm text-muted-foreground">Your balance, earnings, and deposit information</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border-primary/30 bg-card/50 glow-cyan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-primary" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold gradient-text">
              ${Number(profile?.balance || 0).toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Available for purchases and operations</p>
          </CardContent>
        </Card>

        <Card className="border-success/30 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gift className="h-5 w-5 text-success" />
              OTP Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-success">
              ${Number(profile?.total_earnings || 0).toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">Total earned from qualifying OTP events</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-accent" />
              Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How to deposit</p>
                <p>Contact support through Telegram to add funds. Deposits are processed manually for security.</p>
              </div>
            </div>
            <a href="https://t.me/SKYOTP_SKY" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      {Number(tx.amount) >= 0 ? <ArrowDownLeft className="h-5 w-5 text-success" /> : <ArrowUpRight className="h-5 w-5 text-destructive" />}
                      <div>
                        <p className="text-sm font-medium capitalize">{tx.type}</p>
                        <p className="text-xs text-muted-foreground">{tx.description || tx.status} · {new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-bold ${Number(tx.amount) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gift className="h-4 w-4 text-success" />
              Reward History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rewards.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No rewards earned yet</p>
            ) : (
              <div className="space-y-2">
                {rewards.map(r => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Gift className="h-5 w-5 text-success" />
                      <div>
                        <p className="text-sm font-medium">{r.category_name || 'OTP Reward'}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.status} · {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={r.status === 'credited' ? 'secondary' : 'outline'} className="text-xs">
                      {r.status}
                    </Badge>
                    <p className="text-sm font-bold text-success">+${Number(r.amount).toFixed(2)}</p>
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
