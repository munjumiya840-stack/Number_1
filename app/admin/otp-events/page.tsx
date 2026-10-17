'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { Loader2, KeyRound, Search, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface OtpLog {
  id: number;
  user_id: string;
  phone_number: string;
  otp_code: string;
  service_name: string | null;
  timestamp: string;
}

export default function AdminOtpEventsPage() {
  const [logs, setLogs] = useState<OtpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    let query = supabase.from('otp_success_logs').select('*').order('timestamp', { ascending: false }).limit(200);
    if (serviceFilter !== 'all') {
      query = query.eq('service_name', serviceFilter);
    }
    const { data } = await query;
    setLogs(data as OtpLog[] || []);
    setLoading(false);
  }, [serviceFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter(l =>
    !search ||
    l.phone_number.includes(search) ||
    (l.service_name || '').toLowerCase().includes(search.toLowerCase()) ||
    l.otp_code.includes(search) ||
    l.user_id.includes(search)
  );

  const services = Array.from(new Set(logs.map(l => l.service_name).filter(Boolean))) as string[];

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            OTP Events
          </h1>
          <p className="text-sm text-muted-foreground">All successful OTP deliveries across the platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              OTP Logs ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search phone, code..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map(s => (
                    <SelectItem key={s} value={s!}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No OTP events found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>OTP Code</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">#{log.id}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.user_id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-mono text-sm">{log.phone_number}</TableCell>
                      <TableCell>
                        <button
                          className="font-mono text-sm font-bold text-primary hover:underline"
                          onClick={() => { navigator.clipboard.writeText(log.otp_code); toast.success('Copied'); }}
                        >
                          {log.otp_code}
                        </button>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{log.service_name || '—'}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
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
