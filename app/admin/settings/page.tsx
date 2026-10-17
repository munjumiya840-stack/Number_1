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
import { Settings, Loader2, Wrench, Activity, Key, Eye, EyeOff, Save, Bot, Lock, ShieldCheck, Webhook, Server, DollarSign, Radio } from 'lucide-react';
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

  // ScarFace / Nexa provider config
  const [scarfaceKey, setScarfaceKey] = useState('');
  const [savedScarfaceKey, setSavedScarfaceKey] = useState('');
  const [showScarfaceKey, setShowScarfaceKey] = useState(false);
  const [scarfaceBaseUrl, setScarfaceBaseUrl] = useState('');
  const [savedScarfaceBaseUrl, setSavedScarfaceBaseUrl] = useState('');
  const [scarfaceOtpPrice, setScarfaceOtpPrice] = useState('');
  const [savedScarfaceOtpPrice, setSavedScarfaceOtpPrice] = useState('');
  const [savingScarface, setSavingScarface] = useState(false);
  const [scarfaceKeyChanged, setScarfaceKeyChanged] = useState(false);

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

      // Load ScarFace config
      const { data: sfKey } = await supabase.from('config').select('value').eq('key', 'scarface_api_key').maybeSingle();
      if (sfKey?.value) { setSavedScarfaceKey(sfKey.value); setScarfaceKey(sfKey.value); }

      const { data: sfUrl } = await supabase.from('config').select('value').eq('key', 'scarface_base_url').maybeSingle();
      if (sfUrl?.value) { setSavedScarfaceBaseUrl(sfUrl.value); setScarfaceBaseUrl(sfUrl.value); }
      else { setSavedScarfaceBaseUrl('https://nexaotpservice.com/api/v1'); setScarfaceBaseUrl('https://nexaotpservice.com/api/v1'); }

      const { data: sfPrice } = await supabase.from('config').select('value').eq('key', 'scarface_otp_price').maybeSingle();
      if (sfPrice?.value) { setSavedScarfaceOtpPrice(sfPrice.value); setScarfaceOtpPrice(sfPrice.value); }
      else { setSavedScarfaceOtpPrice('0.50'); setScarfaceOtpPrice('0.50'); }

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

  const handleSaveScarface = async () => {
    if (!scarfaceKey.trim()) {
      toast.error('Enter a ScarFace API key');
      return;
    }
    setSavingScarface(true);
    const updates = [
      supabase.from('config').upsert({ key: 'scarface_api_key', value: scarfaceKey.trim() }),
      supabase.from('config').upsert({ key: 'scarface_base_url', value: scarfaceBaseUrl.trim() || 'https://nexaotpservice.com/api/v1' }),
      supabase.from('config').upsert({ key: 'scarface_otp_price', value: scarfaceOtpPrice.trim() || '0.50' }),
    ];
    const results = await Promise.all(updates);
    setSavingScarface(false);
    if (results.some(r => r.error)) {
      toast.error('Failed to save some ScarFace settings');
    } else {
      setSavedScarfaceKey(scarfaceKey.trim());
      setSavedScarfaceBaseUrl(scarfaceBaseUrl.trim() || 'https://nexaotpservice.com/api/v1');
      setSavedScarfaceOtpPrice(scarfaceOtpPrice.trim() || '0.50');
      setScarfaceKeyChanged(false);
      toast.success('ScarFace provider settings saved');
    }
  };

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

          {/* ScarFace / Nexa Provider Config */}
          <Card className="border-border/50 bg-card/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                OTP Provider (ScarFace / Nexa)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure the backend OTP provider. These settings are used server-side by the Range Numbers feature. Users never see or interact with these keys.
              </p>
              <div className="space-y-2">
                <Label htmlFor="sfKey" className="text-sm">API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sfKey"
                      type={showScarfaceKey ? 'text' : 'password'}
                      placeholder="sk_live_..."
                      value={scarfaceKey}
                      onChange={(e) => { setScarfaceKey(e.target.value); setScarfaceKeyChanged(true); }}
                      className="pl-9 pr-10 font-mono"
                      disabled={savingScarface}
                    />
                    <button
                      type="button"
                      onClick={() => setShowScarfaceKey(!showScarfaceKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showScarfaceKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sfUrl" className="text-sm">API Base URL</Label>
                  <Input
                    id="sfUrl"
                    placeholder="https://nexaotpservice.com/api/v1"
                    value={scarfaceBaseUrl}
                    onChange={(e) => setScarfaceBaseUrl(e.target.value)}
                    className="font-mono text-sm"
                    disabled={savingScarface}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sfPrice" className="text-sm">Price per Number (USD)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="sfPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.50"
                      value={scarfaceOtpPrice}
                      onChange={(e) => setScarfaceOtpPrice(e.target.value)}
                      className="pl-9"
                      disabled={savingScarface}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveScarface} disabled={savingScarface || (!scarfaceKeyChanged && scarfaceBaseUrl === savedScarfaceBaseUrl && scarfaceOtpPrice === savedScarfaceOtpPrice)}>
                  {savingScarface ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                  Save Provider Settings
                </Button>
                {savedScarfaceKey ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    <Radio className="mr-1 h-3 w-3" /> Provider configured
                  </Badge>
                ) : (
                  <Badge variant="outline">No key set</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The price per number is automatically deducted from the user wallet balance when they allocate a number on the Range Numbers page.
              </p>
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
