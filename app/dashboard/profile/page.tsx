'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Mail, Calendar, Shield, User as UserIcon, MessageCircle, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [telegramId, setTelegramId] = useState('');
  const [savingTg, setSavingTg] = useState(false);

  useState(() => {
    if (user) {
      supabase.from('profiles').select('telegram_id').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.telegram_id) setTelegramId(data.telegram_id);
      });
    }
    return null;
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username, telegram_id: telegramId.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      refreshProfile();
    }
  };

  const handleChangePassword = async () => {
    if (!password || !newPassword) {
      toast.error('Fill in both password fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setChangingPwd(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password updated');
      setPassword('');
      setNewPassword('');
    }
  };

  const initials = (profile?.username || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>Profile & Security</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/10 text-lg text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{profile?.username || user?.email}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {profile?.is_admin && (
                  <Badge className="mt-1 bg-accent/10 text-accent border-accent/20">
                    <Shield className="mr-1 h-3 w-3" />
                    Administrator
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Joined {profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : 'Recently'}
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Balance: ${profile?.balance?.toFixed(2) || '0.00'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Display Name</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tgId" className="flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                Telegram ID
              </Label>
              <Input
                id="tgId"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="e.g. 7689218221"
              />
              <p className="text-xs text-muted-foreground">
                Link your Telegram to enable login via Telegram bot verification codes.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPwd} className="w-full">
              {changingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
            </Button>

            <div className="mt-6 rounded-lg border border-border/50 bg-muted/30 p-4">
              <h4 className="mb-2 text-sm font-semibold">Security Tips</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Use a unique password not used elsewhere</li>
                <li>• Your session is secured with HTTP-only cookies</li>
                <li>• OTP codes are only visible to your account</li>
                <li>• Contact support if you suspect unauthorized access</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
