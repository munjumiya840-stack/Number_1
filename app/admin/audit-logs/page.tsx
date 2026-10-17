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
import { Loader2, Shield, Search, RefreshCw } from 'lucide-react';
import type { AdminAuditLog } from '@/lib/types';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    let query = supabase.from('admin_audit_log').select('*').order('created_at', { ascending: false }).limit(200);
    if (actionFilter !== 'all') {
      query = query.like('action', `${actionFilter}%`);
    }
    const { data } = await query;
    setLogs(data as AdminAuditLog[] || []);
    setLoading(false);
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filtered = logs.filter(l =>
    !search ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    (l.target_id || '').includes(search) ||
    (l.target_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const actionColors: Record<string, string> = {
    create: 'bg-success/10 text-success border-success/20',
    update: 'bg-primary/10 text-primary border-primary/20',
    delete: 'bg-destructive/10 text-destructive border-destructive/20',
    toggle: 'bg-warning/10 text-warning border-warning/20',
    test: 'bg-accent/10 text-accent border-accent/20',
  };

  const getActionColor = (action: string) => {
    const prefix = action.split('.')[0];
    return actionColors[prefix] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground">Immutable record of all admin actions</p>
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
              <Shield className="h-5 w-5 text-primary" />
              Audit Trail ({filtered.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actions..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="category">Categories</SelectItem>
                  <SelectItem value="provider">Providers</SelectItem>
                  <SelectItem value="reward">Rewards</SelectItem>
                  <SelectItem value="admin_role">Admin Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
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
            <p className="py-12 text-center text-sm text-muted-foreground">No audit logs found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Target Type</TableHead>
                    <TableHead>Target ID</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={`text-xs ${getActionColor(log.action)}`}>{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.target_type || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.target_id || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {Object.keys(log.details || {}).length > 0
                          ? JSON.stringify(log.details).slice(0, 80)
                          : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.admin_id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
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
