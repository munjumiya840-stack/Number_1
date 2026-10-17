'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Phone, KeyRound, Clock, TrendingUp, Loader2, Gift, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardOverview() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalOtp: 0,
    todayOtp: 0,
    activeNumbers: 0,
    totalEarnings: 0,
    rewardCount: 0,
    recentOtps: [] as Array<{ id: number; phone_number: string; otp_code: string; service_name: string | null; timestamp: string }>,
    recentTransactions: [] as Array<{ id: number; type: string; amount: number; status: string; created_at: string }>,
    recentRewards: [] as Array<{ id: number; amount: number; category_name: string | null; created_at: string; status: string }>,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const [otpCount, todayCount, otpLogs, txns, activeManual, rewardSum, rewardCount, recentRewards] = await Promise.all([
        supabase.from('otp_success_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('otp_success_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('timestamp', `${today}T00:00:00`),
        supabase.from('otp_success_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(5),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('user_active_manual').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('reward_ledger').select('amount').eq('user_id', user.id).eq('status', 'credited'),
        supabase.from('reward_ledger').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'credited'),
        supabase.from('reward_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const rewards = (rewardSum.data || []) as Array<{ amount: number }>;
      const totalEarnings = rewards.reduce((sum, r) => sum + Number(r.amount), 0);

      setStats({
        totalOtp: otpCount.count || 0,
        todayOtp: todayCount.count || 0,
        activeNumbers: activeManual.data ? 1 : 0,
        totalEarnings,
        rewardCount: rewardCount.count || 0,
        recentOtps: otpLogs.data || [],
        recentTransactions: txns.data || [],
        recentRewards: recentRewards.data as typeof stats.recentRewards || [],
      });
      setLoading(false);
    })();
  }, [user]);

  const cards = [
    { label: 'Available Balance', value: profile ? `$${Number(profile.balance || 0).toFixed(2)}` : '—', icon: Wallet, color: 'text-primary' },
    { label: 'OTP Earnings', value: `$${stats.totalEarnings.toFixed(2)}`, icon: Gift, color: 'text-success' },
    { label: 'Total OTPs Received', value: stats.totalOtp, icon: KeyRound, color: 'text-accent' },
    { label: "Today's OTPs", value: stats.todayOtp, icon: TrendingUp, color: 'text-success' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
          Overview
        </h1>
        <p className="text-sm text-muted-foreground">Welcome back, {profile?.username || user?.email}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {cards.map((card) => (
              <Card key={card.label} className="border-border/50 bg-card/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <p className="mt-1 text-xl font-bold">{card.value}</p>
                    </div>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Recent OTP Codes</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentOtps.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No OTP history yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.recentOtps.map((otp) => (
                      <div key={otp.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <KeyRound className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{otp.service_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{otp.phone_number}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-sm font-bold text-primary">{otp.otp_code}</p>
                          <p className="text-xs text-muted-foreground">{new Date(otp.timestamp).toLocaleTimeString()}</p>
                        </div>
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
                  Recent Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentRewards.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No rewards earned yet</p>
                ) : (
                  <div className="space-y-2">
                    {stats.recentRewards.map(r => (
                      <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <DollarSign className="h-4 w-4 text-success" />
                          <div>
                            <p className="text-sm font-medium">{r.category_name || 'OTP Reward'}</p>
                            <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="font-bold text-success">+${Number(r.amount).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentTransactions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {stats.recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium capitalize">{tx.type}</p>
                            <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
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
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
