'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Settings, Loader2, Wrench, Activity, Key, Eye, EyeOff, Save, Bot, Lock, ShieldCheck, Webhook } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Bot API key
  const [botApiKey, setBotApiKey] = useState('');
  const [savedBotKey, setSavedBotKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keyLoaded, setKeyLoaded] = useState(false);

  // Admin password reset
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [resettingPwd, setResettingPwd] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('config')
        .select('*')
        .eq('key', 'maintenance_mode')
        .maybeSingle();
      setMaintenance(data?.value === 'on');

      const { data: keyData } = await supabase
        .from('config')
        .select('*')
        .eq('key', 'bot_api_key')
        .maybeSingle();

      if (keyData?.value) {
        setSavedBotKey(keyData.value);
        setBotApiKey(keyData.value);
      }
      setKeyLoaded(true);
      setLoading(false);
    })();
  }, []);

  const toggleMaintenance = async () => {
    setToggling(true);
    const newVal = !maintenance ? 'on' : 'off';
    const { error } = await supabase
      .from('config')
      .update({ value: newVal })
      .eq('key', 'maintenance_mode');
    setToggling(false);
    if (error) {
      toast.error('Failed to toggle maintenance mode');
    } else {
      setMaintenance(!maintenance);
      toast.success(`Maintenance mode ${!maintenance ? 'enabled' : 'disabled'}`);
    }
  };

  const handleSaveBotKey = async () => {
    if (!botApiKey.trim()) {
      toast.error('Enter a Bot API key');
      return;
    }
    setSavingKey(true);
    const { error: upErr } = await supabase
      .from('config')
      .upsert({ key: 'bot_api_key', value: botApiKey.trim() });

    setSavingKey(false);
    if (upErr) {
      toast.error('Failed to save Bot API key');
    } else {
      setSavedBotKey(botApiKey.trim());
      toast.success('Bot API key updated');
    }
  };

  const handleClearBotKey = async () => {
    setSavingKey(true);
    const { error } = await supabase
      .from('config')
      .delete()
      .eq('key', 'bot_api_key');
    setSavingKey(false);
    if (error) {
      toast.error('Failed to clear Bot API key');
    } else {
      setBotApiKey('');
      setSavedBotKey('');
      toast.success('Bot API key cleared');
    }
  };

  const keyChanged = botApiKey !== savedBotKey;

  const handleSetupWebhook = async () => {
    setSettingWebhook(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const resp = await fetch(`${supabaseUrl}/functions/v1/telegram-webhook?setup=true`, { method: 'GET' });
      const data = await resp.json();
      if (!resp.ok) {
        toast.error(data.message || 'Failed to set up webhook');
      } else {
        toast.success('Telegram webhook registered — bot is now listening for /start');
      }
    } catch {
      toast.error('Failed to connect to webhook setup');
    }
    setSettingWebhook(false);
  };

  const handleAdminPasswordReset = async () => {
    if (!adminNewPassword || !adminConfirmPassword) {
      toast.error('Fill in both password fields');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (adminNewPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResettingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: adminNewPassword });
    setResettingPwd(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Admin password updated successfully');
      setAdminNewPassword('');
      setAdminConfirmPassword('');
    }
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>System Settings</h1>
        <p className="text-sm text-muted-foreground">Manage platform configuration</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Bot API Key Card */}
          <Card className="border-border/50 bg-card/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Telegram Bot API Key
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botkey" className="text-sm">Bot Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="botkey"
                      type={showKey ? 'text' : 'password'}
                      placeholder="Enter your Telegram Bot API token"
                      value={botApiKey}
                      onChange={(e) => setBotApiKey(e.target.value)}
                      className="pl-9 pr-10 font-mono"
                      disabled={savingKey}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={handleSaveBotKey}
                    disabled={savingKey || !keyChanged}
                    size="default"
                  >
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Save
                  </Button>
                  {savedBotKey && (
                    <Button
                      onClick={handleClearBotKey}
                      disabled={savingKey}
                      variant="outline"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {savedBotKey ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    Key configured
                  </Badge>
                ) : (
                  <Badge variant="outline">No key set</Badge>
                )}
                <p className="text-xs text-muted-foreground">
                  Get your token from @BotFather on Telegram. This key lets your website control the bot directly.
                </p>
              </div>
              {savedBotKey && (
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Bot Webhook</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Register the webhook so the bot listens for /start and captures Telegram IDs
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSetupWebhook}
                    disabled={settingWebhook}
                  >
                    {settingWebhook ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Webhook className="mr-1 h-3.5 w-3.5" />}
                    Setup Webhook
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <div>
                  <Label htmlFor="maint" className="font-medium">Enable Maintenance</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Blocks non-admin users from accessing the platform
                  </p>
                </div>
                <Switch
                  id="maint"
                  checked={maintenance}
                  onCheckedChange={toggleMaintenance}
                  disabled={toggling}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={maintenance ? 'destructive' : 'secondary'}>
                  {maintenance ? 'Maintenance ON' : 'Operational'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <span className="text-sm">Database Connection</span>
                <Badge className="bg-success/10 text-success border-success/20">Online</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <span className="text-sm">Authentication Service</span>
                <Badge className="bg-success/10 text-success border-success/20">Online</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <span className="text-sm">Telegram Bot</span>
                <Badge variant={savedBotKey ? 'secondary' : 'outline'}>
                  {savedBotKey ? 'Key Set' : 'No Key'}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                <span className="text-sm">Provider API (Teleroutex)</span>
                <Badge variant="outline">External</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Super Admin Password Reset */}
          <Card className="border-border/50 bg-card/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Admin Password Reset
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Change your admin account password directly. Make sure to use a strong, unique password.
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminNewPwd" className="text-sm">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="adminNewPwd"
                      type="password"
                      placeholder="At least 6 characters"
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      className="pl-9"
                      disabled={resettingPwd}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminConfirmPwd" className="text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="adminConfirmPwd"
                      type="password"
                      placeholder="Re-enter new password"
                      value={adminConfirmPassword}
                      onChange={(e) => setAdminConfirmPassword(e.target.value)}
                      className="pl-9"
                      disabled={resettingPwd}
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleAdminPasswordReset}
                disabled={resettingPwd || !adminNewPassword || !adminConfirmPassword}
              >
                {resettingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1 h-4 w-4" />}
                Reset Password
              </Button>
            </CardContent>
          </Card>

          {/* Platform Info */}
          <Card className="border-border/50 bg-card/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Platform Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Platform Name</p>
                  <p className="font-medium">GLOBAL NUMBER</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-medium">1.0.0</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Database</p>
                  <p className="font-medium">PostgreSQL (Supabase)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Frontend</p>
                  <p className="font-medium">Next.js 13</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
