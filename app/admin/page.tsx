'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  Users, KeyRound, Phone, Database, Shield, Loader2, Ban, CheckCircle,
  Activity, Server, Tag, Gift, Package, ScrollText,
} from 'lucide-react';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    bannedUsers: 0,
    totalOtp: 0,
    todayOtp: 0,
    totalServices: 0,
    totalManualServices: 0,
    totalTransactions: 0,
    totalCategories: 0,
    totalProviders: 0,
    totalOrders: 0,
    totalRewards: 0,
    auditEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [users, banned, otpAll, otpToday, services, manual, txns, cats, provs, orders, rewards, audit] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('otp_success_logs').select('*', { count: 'exact', head: true }),
        supabase.from('otp_success_logs').select('*', { count: 'exact', head: true }).gte('timestamp', `${today}T00:00:00`),
        supabase.from('services').select('*', { count: 'exact', head: true }),
        supabase.from('manual_services').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('providers').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('reward_ledger').select('*', { count: 'exact', head: true }),
        supabase.from('admin_audit_log').select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        totalUsers: users.count || 0,
        bannedUsers: banned.count || 0,
        totalOtp: otpAll.count || 0,
        todayOtp: otpToday.count || 0,
        totalServices: services.count || 0,
        totalManualServices: manual.count || 0,
        totalTransactions: txns.count || 0,
        totalCategories: cats.count || 0,
        totalProviders: provs.count || 0,
        totalOrders: orders.count || 0,
        totalRewards: rewards.count || 0,
        auditEntries: audit.count || 0,
      });
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-primary' },
    { label: 'Banned', value: stats.bannedUsers, icon: Ban, color: 'text-destructive' },
    { label: 'Total OTPs', value: stats.totalOtp, icon: KeyRound, color: 'text-accent' },
    { label: "Today's OTPs", value: stats.todayOtp, icon: Activity, color: 'text-success' },
    { label: 'Categories', value: stats.totalCategories, icon: Tag, color: 'text-primary' },
    { label: 'Providers', value: stats.totalProviders, icon: Server, color: 'text-accent' },
    { label: 'Range Services', value: stats.totalServices, icon: Phone, color: 'text-warning' },
    { label: 'Manual Services', value: stats.totalManualServices, icon: Database, color: 'text-primary' },
    { label: 'Orders', value: stats.totalOrders, icon: Package, color: 'text-accent' },
    { label: 'Rewards', value: stats.totalRewards, icon: Gift, color: 'text-success' },
    { label: 'Transactions', value: stats.totalTransactions, icon: Shield, color: 'text-primary' },
    { label: 'Audit Logs', value: stats.auditEntries, icon: ScrollText, color: 'text-muted-foreground' },
  ];

  return (
    <DashboardLayout admin>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
          Admin Overview
        </h1>
        <p className="text-sm text-muted-foreground">System statistics and health monitoring</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold">{card.value}</p>
                  </div>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
