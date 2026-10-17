'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard, Phone, KeyRound, FolderClock, Wallet,
  ArrowLeftRight, User as UserIcon, LogOut, Menu, X,
  Shield, Settings, Users, Radio, Server, Tag, Gift,
  Package, ScrollText, UserCog, Layers, Bell, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const userNav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/get-number', label: 'Get Number', icon: Phone },
  { href: '/dashboard/2fa', label: 'Get 2FA', icon: KeyRound },
  { href: '/dashboard/my-numbers', label: 'My Numbers', icon: FolderClock },
  { href: '/dashboard/otp-logs', label: 'OTP Logs', icon: FolderClock },
  { href: '/dashboard/wallet', label: 'Wallet', icon: Wallet },
  { href: '/dashboard/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/dashboard/profile', label: 'Profile', icon: UserIcon },
];

const adminNav = [
  { href: '/admin', label: 'Overview', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/services', label: 'Services', icon: Phone },
  { href: '/admin/providers', label: 'Providers', icon: Server },
  { href: '/admin/orders', label: 'Orders', icon: Package },
  { href: '/admin/otp-events', label: 'OTP Events', icon: KeyRound },
  { href: '/admin/rewards', label: 'Rewards', icon: Gift },
  { href: '/admin/admins', label: 'Admins', icon: UserCog },
  { href: '/admin/broadcasts', label: 'Broadcasts', icon: Radio },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
  { href: '/admin/settings', label: 'System', icon: Settings },
];

export function DashboardLayout({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: number; title: string; message: string; created_at: string; is_read: boolean; action_url: string | null }[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && profile?.is_banned) {
      router.push('/login');
    }
    if (admin && !loading && user && !profile?.is_admin) {
      router.push('/dashboard');
    }
  }, [user, profile, loading, router, admin]);

  useEffect(() => {
    if (!user || admin) return;
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('user_notifications')
        .select('id, title, message, created_at, is_read, action_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifs(data || []);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user, admin]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  const nav = admin ? adminNav : userNav;
  const initials = (profile?.username || user.email || 'U').slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-border/50 bg-card/30 lg:flex">
        <div className="flex h-16 items-center border-b border-border/50 px-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {profile?.is_admin && !admin && (
            <div className="mt-6 border-t border-border/50 pt-4">
              <Link href="/admin">
                <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/10">
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </div>
              </Link>
            </div>
          )}

          {admin && (
            <div className="mt-6 border-t border-border/50 pt-4">
              <Link href="/dashboard">
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <LayoutDashboard className="h-4 w-4" />
                  User Dashboard
                </div>
              </Link>
            </div>
          )}
        </ScrollArea>

        <div className="border-t border-border/50 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{profile?.username || user.email}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.balance !== undefined ? `$${profile.balance.toFixed(2)}` : ''}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex h-16 items-center justify-between border-b border-border/50 bg-card/30 px-4 lg:hidden">
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border/50 bg-card">
            <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
              <Logo size="sm" />
              <button onClick={() => setSidebarOpen(false)} className="rounded-md p-2 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ScrollArea className="h-[calc(100%-4rem)] px-3 py-4">
              <nav className="space-y-1">
                {nav.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              {profile?.is_admin && !admin && (
                <Link href="/admin" onClick={() => setSidebarOpen(false)}>
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2.5 text-sm font-medium text-accent">
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </div>
                </Link>
              )}
              {admin && (
                <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
                  <div className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground">
                    <LayoutDashboard className="h-4 w-4" />
                    User Dashboard
                  </div>
                </Link>
              )}
              <div className="mt-6 border-t border-border/50 pt-4">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </ScrollArea>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar with notifications */}
        {!admin && (
          <div className="sticky top-0 z-30 flex h-14 items-center justify-end border-b border-border/50 bg-card/30 px-4 backdrop-blur-sm lg:px-8">
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) markAllRead(); }}
                className="relative rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowNotifs(false)} />
                  <div className="absolute right-0 top-12 z-40 w-80 rounded-lg border border-border/50 bg-card shadow-xl">
                    <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                      <span className="text-sm font-semibold">Notifications</span>
                      {unreadCount > 0 && <span className="text-xs text-primary">{unreadCount} new</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
                      ) : notifs.map(n => (
                        <div key={n.id} className="border-b border-border/30 px-4 py-3 last:border-0">
                          <div className="flex items-start gap-2">
                            {!n.is_read && <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{n.title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                              <div className="mt-2 flex items-center gap-2">
                                {n.action_url && (
                                  <Link
                                    href={n.action_url}
                                    onClick={() => setShowNotifs(false)}
                                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                  >
                                    <Phone className="h-3 w-3" />
                                    Get Number
                                  </Link>
                                )}
                                <p className="text-[10px] text-muted-foreground/70">{new Date(n.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <main className="min-h-screen p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
