'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Radio, Loader2, Send, CheckCircle, Bell } from 'lucide-react';

export default function AdminBroadcastsPage() {
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ total: number; success: number } | null>(null);
  const [userCount, setUserCount] = useState(0);
  const [recentBroadcasts, setRecentBroadcasts] = useState<{ id: number; title: string; message: string; created_at: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      setUserCount(count || 0);

      const { data: notifs } = await supabase
        .from('user_notifications')
        .select('id, title, message, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentBroadcasts(notifs || []);
    })();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Enter a message to broadcast');
      return;
    }
    setSending(true);
    const { data: users } = await supabase.from('profiles').select('id');
    let success = 0;
    if (users && users.length > 0) {
      const rows = users.map(u => ({
        user_id: u.id,
        title: title.trim() || 'Announcement',
        message: message.trim(),
        icon: 'bell',
      }));
      const { error } = await supabase.from('user_notifications').insert(rows);
      if (!error) {
        success = users.length;
      }
    }
    setSending(false);
    setResult({ total: users?.length || 0, success });
    toast.success(`Broadcast sent to ${success} users`);
    setMessage('');
    setTitle('');

    const { data: notifs } = await supabase
      .from('user_notifications')
      .select('id, title, message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    setRecentBroadcasts(notifs || []);
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>Broadcasts</h1>
        <p className="text-sm text-muted-foreground">Send announcements to all users</p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              New Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <Badge variant="secondary">{userCount} recipients</Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="e.g. New Numbers Available!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">Message</Label>
              <Input
                id="msg"
                placeholder="Enter your broadcast message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={sending}
              />
            </div>
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>

            {result && (
              <div className="rounded-lg border border-success/20 bg-success/5 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <p className="text-sm font-medium text-success">Broadcast Complete</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Delivered to {result.success} out of {result.total} users.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {recentBroadcasts.length > 0 && (
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Recent Broadcasts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentBroadcasts.map((b) => (
                <div key={b.id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{b.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{b.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
