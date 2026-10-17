'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Shield, Plus, Loader2, UserCog, Trash2, Crown, ArrowUpCircle } from 'lucide-react';
import type { AdminRole, AdminRoleType } from '@/lib/types';
import { ADMIN_ROLE_LABELS, ADMIN_ROLE_DESCRIPTIONS } from '@/lib/types';

interface AdminUser {
  id: string;
  email: string;
  username: string | null;
  roles: AdminRole[];
}

export default function AdminAdminsPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialog, setAddDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AdminRoleType>('support_admin');
  const [saving, setSaving] = useState(false);

  const fetchAdmins = useCallback(async () => {
    const { data: roles } = await supabase
      .from('admin_roles')
      .select('*, profiles!inner(username, full_name)')
      .order('created_at', { ascending: false });

    if (roles) {
      const grouped: Record<string, AdminUser> = {};
      for (const r of roles) {
        const profile = r.profiles as unknown as { username: string | null; full_name: string | null };
        if (!grouped[r.user_id]) {
          grouped[r.user_id] = {
            id: r.user_id,
            email: profile?.full_name || r.user_id,
            username: profile?.username || null,
            roles: [],
          };
        }
        grouped[r.user_id].roles.push(r as unknown as AdminRole);
      }
      setAdmins(Object.values(grouped));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_type: 'admin_role',
      target_id: targetId,
      details,
    });
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    setSaving(true);

    const { data: authUser } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('full_name', newEmail.trim())
      .maybeSingle();

    if (!authUser) {
      toast.error('No user found with that email. The person must register first.');
      setSaving(false);
      return;
    }

    const { error: roleError } = await supabase.from('admin_roles').insert({
      user_id: authUser.id,
      role: newRole,
      permissions: {},
      is_active: true,
    });

    if (roleError) {
      if (roleError.message.includes('duplicate')) {
        toast.error('This user already has that role');
      } else {
        toast.error('Only a Super Admin can add admin roles');
      }
      setSaving(false);
      return;
    }

    if (!authUser.is_admin) {
      await supabase.from('profiles').update({ is_admin: true }).eq('id', authUser.id);
    }

    toast.success('Admin role assigned');
    await logAudit('admin_role.create', authUser.id, { email: newEmail, role: newRole });
    setNewEmail('');
    setNewRole('support_admin');
    setAddDialog(false);
    setSaving(false);
    fetchAdmins();
  };

  const toggleRoleActive = async (role: AdminRole) => {
    const { error } = await supabase
      .from('admin_roles')
      .update({ is_active: !role.is_active, updated_at: new Date().toISOString() })
      .eq('id', role.id);
    if (error) {
      toast.error('Failed to toggle role — requires Super Admin');
    } else {
      toast.success(`Role ${role.is_active ? 'deactivated' : 'activated'}`);
      await logAudit('admin_role.toggle', String(role.id), { role: role.role, active: !role.is_active });
      fetchAdmins();
    }
  };

  const removeRole = async (role: AdminRole) => {
    const { error } = await supabase.from('admin_roles').delete().eq('id', role.id);
    if (error) {
      toast.error('Failed to remove role — requires Super Admin');
    } else {
      toast.success('Role removed');
      await logAudit('admin_role.delete', String(role.id), { role: role.role });
      fetchAdmins();
    }
  };

  const promoteToSuperAdmin = async (admin: AdminUser) => {
    setSaving(true);
    const { error } = await supabase.from('admin_roles').insert({
      user_id: admin.id,
      role: 'super_admin',
      permissions: {},
      is_active: true,
    });
    if (error) {
      if (error.message.includes('duplicate')) {
        toast.error('This user is already a Super Admin');
      } else {
        toast.error('Failed to promote — requires Super Admin');
      }
    } else {
      await supabase.from('profiles').update({ is_admin: true, is_super_admin: true }).eq('id', admin.id);
      toast.success(`${admin.username || admin.email} promoted to Super Admin`);
      await logAudit('admin_role.promote_super', admin.id, { email: admin.email });
      fetchAdmins();
    }
    setSaving(false);
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Admin Accounts
          </h1>
          <p className="text-sm text-muted-foreground">Manage administrator roles and permissions</p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Admin
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {admins.map(admin => (
            <Card key={admin.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/5">
                      <Shield className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">{admin.username || admin.email}</p>
                      <p className="text-xs text-muted-foreground font-mono">{admin.id.slice(0, 12)}...</p>
                    </div>
                  </div>
                  {!admin.roles.some(r => r.role === 'super_admin') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-warning/30 text-warning hover:bg-warning/10"
                      onClick={() => promoteToSuperAdmin(admin)}
                      disabled={saving}
                    >
                      <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />
                      Promote to Super Admin
                    </Button>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {admin.roles.map(role => (
                    <div key={role.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5">
                      {role.role === 'super_admin' && <Crown className="h-3 w-3 text-warning" />}
                      <Badge
                        className={
                          role.role === 'super_admin'
                            ? 'bg-warning/10 text-warning border-warning/20 text-xs'
                            : 'bg-accent/10 text-accent border-accent/20 text-xs'
                        }
                      >
                        {ADMIN_ROLE_LABELS[role.role]}
                      </Badge>
                      <Switch
                        checked={role.is_active}
                        onCheckedChange={() => toggleRoleActive(role)}
                        className="scale-75"
                      />
                      {role.role !== 'super_admin' && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeRole(role)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6 border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-primary" />
            Available Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(ADMIN_ROLE_LABELS) as AdminRoleType[]).map(role => (
              <div key={role} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  {role === 'super_admin' && <Crown className="h-4 w-4 text-warning" />}
                  <p className="font-medium text-sm">{ADMIN_ROLE_LABELS[role]}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{ADMIN_ROLE_DESCRIPTIONS[role]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Admin Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User Email</Label>
              <Input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The user must have a registered account first.
              </p>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as AdminRoleType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ADMIN_ROLE_LABELS) as AdminRoleType[]).map(r => (
                    <SelectItem key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleAddAdmin} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
