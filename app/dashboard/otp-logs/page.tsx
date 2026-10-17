'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { Loader2, Search, KeyRound, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

interface OtpLog {
  id: number;
  phone_number: string;
  otp_code: string;
  service_name: string | null;
  timestamp: string;
}

export default function OtpLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<OtpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('otp_success_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    })();
  }, [user]);

  const filtered = logs.filter(l =>
    !search ||
    l.phone_number.includes(search) ||
    l.otp_code.includes(search) ||
    (l.service_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const csv = ['Phone Number,OTP,Service,Time'];
    filtered.forEach(l => {
      csv.push(`${l.phone_number},${l.otp_code},${l.service_name || ''},${new Date(l.timestamp).toISOString()}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otp_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('OTP logs exported');
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>OTP Logs</h1>
          <p className="text-sm text-muted-foreground">Your OTP verification code history</p>
        </div>
        {logs.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">History ({filtered.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <KeyRound className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No OTP logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>OTP Code</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.phone_number}</TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-primary">{log.otp_code}</span>
                      </TableCell>
                      <TableCell>
                        {log.service_name && <Badge variant="secondary">{log.service_name}</Badge>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            navigator.clipboard.writeText(log.otp_code);
                            toast.success('Code copied');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
