'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  Image as ImageIcon, Loader2, Tag, Eye, EyeOff, Phone, Upload, ChevronDown, ChevronUp,
} from 'lucide-react';
import type { Category } from '@/lib/types';

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [form, setForm] = useState({
    display_name: '',
    slug: '',
    description: '',
    logo_url: '',
    status: 'active' as 'active' | 'inactive',
    sort_order: 0,
    reward_per_otp: 0,
    country_availability: '',
  });
  const [saving, setSaving] = useState(false);

  // Add Number dialog state
  const [addNumberDialog, setAddNumberDialog] = useState(false);
  const [addNumberCatId, setAddNumberCatId] = useState<string>('');
  const [addNumberCountry, setAddNumberCountry] = useState('');
  const [addNumberGiveAmount, setAddNumberGiveAmount] = useState(1);
  const [addNumberOtpRate, setAddNumberOtpRate] = useState(0);
  const [addNumberCooldown, setAddNumberCooldown] = useState(0);
  const [addNumberText, setAddNumberText] = useState('');
  const [addNumberSaving, setAddNumberSaving] = useState(false);

  // Expanded categories (to show manual services inline)
  const [expandedCatId, setExpandedCatId] = useState<number | null>(null);
  const [catManualServices, setCatManualServices] = useState<Record<number, Array<{ id: number; service_name: string; country_name: string; stock: number; give_amount: number; otp_rate: number; cooldown: number }>>>({});

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data) setCategories(data as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const logAudit = async (action: string, targetId: string, details: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_type: 'category',
      target_id: targetId,
      details,
    });
  };

  const loadCatManualServices = async (catId: number) => {
    const { data } = await supabase
      .from('manual_services')
      .select('id, service_name, country_name, stock, give_amount, otp_rate, cooldown')
      .eq('category_id', catId)
      .order('created_at', { ascending: false });
    setCatManualServices(prev => ({ ...prev, [catId]: data || [] }));
  };

  const toggleExpand = (catId: number) => {
    if (expandedCatId === catId) {
      setExpandedCatId(null);
    } else {
      setExpandedCatId(catId);
      loadCatManualServices(catId);
    }
  };

  const openCreate = () => {
    setEditingCat(null);
    setForm({
      display_name: '',
      slug: '',
      description: '',
      logo_url: '',
      status: 'active',
      sort_order: categories.length + 1,
      reward_per_otp: 0,
      country_availability: '',
    });
    setEditDialog(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setForm({
      display_name: cat.display_name,
      slug: cat.slug,
      description: cat.description || '',
      logo_url: cat.logo_url || '',
      status: cat.status,
      sort_order: cat.sort_order,
      reward_per_otp: cat.reward_per_otp,
      country_availability: (cat.country_availability || []).join(', '),
    });
    setEditDialog(true);
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }
    const slug = form.slug.trim() || form.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const countries = form.country_availability
      .split(',')
      .map(c => c.trim().toUpperCase())
      .filter(Boolean);

    setSaving(true);
    const payload = {
      display_name: form.display_name.trim(),
      slug,
      description: form.description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      status: form.status,
      sort_order: form.sort_order,
      reward_per_otp: form.reward_per_otp,
      country_availability: countries,
      updated_at: new Date().toISOString(),
    };

    if (editingCat) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editingCat.id);
      if (error) {
        toast.error('Failed to update category');
      } else {
        toast.success('Category updated');
        await logAudit('category.update', String(editingCat.id), payload);
        setEditDialog(false);
        fetchCategories();
      }
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) {
        toast.error('Failed to create category');
      } else {
        toast.success('Category created');
        await logAudit('category.create', slug, payload);
        setEditDialog(false);
        fetchCategories();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteCat) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteCat.id);
    if (error) {
      toast.error('Failed to delete category — existing orders may reference it');
    } else {
      toast.success('Category deleted');
      await logAudit('category.delete', String(deleteCat.id), { name: deleteCat.display_name });
      setDeleteDialog(false);
      setDeleteCat(null);
      fetchCategories();
    }
  };

  const moveCategory = async (cat: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(c => c.id === cat.id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const swapCat = sorted[swapIdx];

    await Promise.all([
      supabase.from('categories').update({ sort_order: swapCat.sort_order, updated_at: new Date().toISOString() }).eq('id', cat.id),
      supabase.from('categories').update({ sort_order: cat.sort_order, updated_at: new Date().toISOString() }).eq('id', swapCat.id),
    ]);
    fetchCategories();
  };

  const toggleStatus = async (cat: Category) => {
    const newStatus = cat.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('categories')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', cat.id);
    if (error) {
      toast.error('Failed to toggle status');
    } else {
      toast.success(`${cat.display_name} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await logAudit('category.toggle_status', String(cat.id), { status: newStatus });
      fetchCategories();
    }
  };

  const openAddNumber = (catId?: number) => {
    setAddNumberCatId(catId ? String(catId) : '');
    setAddNumberCountry('');
    setAddNumberGiveAmount(1);
    setAddNumberOtpRate(0);
    setAddNumberCooldown(0);
    setAddNumberText('');
    setAddNumberDialog(true);
  };

  const handleAddNumbers = async () => {
    if (!addNumberCatId) {
      toast.error('Select a category');
      return;
    }
    if (!addNumberCountry.trim()) {
      toast.error('Enter a country name');
      return;
    }
    const numbers = addNumberText
      .split(/\r?\n/)
      .map(n => n.trim())
      .filter(Boolean);
    if (numbers.length === 0) {
      toast.error('Enter at least one phone number');
      return;
    }

    setAddNumberSaving(true);
    const cat = categories.find(c => c.id === Number(addNumberCatId));
    if (!cat) {
      toast.error('Category not found');
      setAddNumberSaving(false);
      return;
    }

    // Create a manual_services entry linked to the category
    const { data: newService, error: svcError } = await supabase
      .from('manual_services')
      .insert({
        service_name: cat.display_name,
        country_name: addNumberCountry.trim(),
        category_id: Number(addNumberCatId),
        give_amount: addNumberGiveAmount,
        otp_rate: addNumberOtpRate,
        cooldown: addNumberCooldown,
        stock: numbers.length,
      })
      .select('id')
      .single();

    if (svcError || !newService) {
      toast.error('Failed to create service entry');
      setAddNumberSaving(false);
      return;
    }

    // Insert the numbers
    const rows = numbers.map(n => ({
      service_id: newService.id,
      number: n,
    }));
    const { error: numError } = await supabase.from('manual_numbers').insert(rows);

    if (numError) {
      toast.error('Failed to add numbers');
      setAddNumberSaving(false);
      return;
    }

    // Send broadcast notification to all users
    const { data: users } = await supabase.from('profiles').select('id');
    if (users && users.length > 0) {
      const notifs = users.map(u => ({
        user_id: u.id,
        title: 'New Numbers Available!',
        message: `${cat.display_name} — ${addNumberCountry.trim()}: ${numbers.length} number${numbers.length !== 1 ? 's' : ''} added. Grab them now!`,
        icon: 'bell',
        action_url: '/dashboard/get-number',
      }));
      await supabase.from('user_notifications').insert(notifs);
    }

    toast.success(`${numbers.length} number${numbers.length !== 1 ? 's' : ''} added to ${cat.display_name}`);
    await logAudit('category.add_numbers', addNumberCatId, { count: numbers.length, country: addNumberCountry });

    setAddNumberDialog(false);
    if (expandedCatId === Number(addNumberCatId)) {
      loadCatManualServices(Number(addNumberCatId));
    }
    setAddNumberSaving(false);
  };

  const handleDeleteManualService = async (svcId: number, catId: number) => {
    const { error: numErr } = await supabase.from('manual_numbers').delete().eq('service_id', svcId);
    if (numErr) {
      toast.error('Failed to delete numbers');
      return;
    }
    const { error: svcErr } = await supabase.from('manual_services').delete().eq('id', svcId);
    if (svcErr) {
      toast.error('Failed to delete service');
      return;
    }
    toast.success('Service and numbers deleted');
    loadCatManualServices(catId);
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>
            Manage Categories
          </h1>
          <p className="text-sm text-muted-foreground">Manage service categories and add numbers directly</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openAddNumber()}>
            <Phone className="mr-2 h-4 w-4" />
            Add Number
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-12 text-center">
            <Tag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No categories yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCategory(cat, 'up')}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCategory(cat, 'down')}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/30">
                    {cat.logo_url ? (
                      <img src={cat.logo_url} alt={cat.display_name} className="h-full w-full object-contain" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{cat.display_name}</p>
                      <Badge variant="outline" className="text-xs font-mono">{cat.slug}</Badge>
                      {cat.status === 'active' ? (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs">Active</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                      {cat.description || 'No description'}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Order: {cat.sort_order}</span>
                      <span>Reward: ${cat.reward_per_otp.toFixed(2)}</span>
                      {(cat.country_availability || []).length > 0 && (
                        <span>{(cat.country_availability || []).length} countries</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => openAddNumber(cat.id)}
                    >
                      <Phone className="mr-1 h-3.5 w-3.5" />
                      Add Number
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleExpand(cat.id)} title="View numbers">
                      {expandedCatId === cat.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(cat)} title={cat.status === 'active' ? 'Deactivate' : 'Activate'}>
                      {cat.status === 'active' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleteCat(cat); setDeleteDialog(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded: show manual services under this category */}
                {expandedCatId === cat.id && (
                  <div className="mt-4 border-t border-border/50 pt-4">
                    {catManualServices[cat.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {catManualServices[cat.id].map(svc => (
                          <div key={svc.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                            <div className="flex items-center gap-3">
                              <Badge variant="secondary" className="text-xs">{svc.country_name}</Badge>
                              <span className="text-xs text-muted-foreground">{svc.stock} numbers</span>
                              <span className="text-xs text-muted-foreground">Give: {svc.give_amount}</span>
                              <span className="text-xs text-muted-foreground">Rate: ${svc.otp_rate.toFixed(2)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteManualService(svc.id, cat.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No manual numbers added yet for this category.</p>
                    )}
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => openAddNumber(cat.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Numbers to {cat.display_name}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edit Category' : 'New Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Display Name</Label>
                <Input
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  placeholder="Facebook"
                />
              </div>
              <div>
                <Label>Slug (auto if empty)</Label>
                <Input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="facebook"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Receive OTP codes for..."
                rows={2}
              />
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                value={form.logo_url}
                onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Paste a direct image URL. Transparent PNG recommended. Leave empty for placeholder.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Reward per OTP ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.reward_per_otp}
                  onChange={e => setForm(f => ({ ...f, reward_per_otp: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex h-9 items-center gap-2">
                  <Switch
                    checked={form.status === 'active'}
                    onCheckedChange={checked => setForm(f => ({ ...f, status: checked ? 'active' : 'inactive' }))}
                  />
                  <span className="text-sm">{form.status === 'active' ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Supported Countries (comma-separated codes)</Label>
              <Input
                value={form.country_availability}
                onChange={e => setForm(f => ({ ...f, country_availability: e.target.value }))}
                placeholder="US, GB, IN"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Number Dialog */}
      <Dialog open={addNumberDialog} onOpenChange={setAddNumberDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Add Manual Numbers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Category selector */}
            <div className="space-y-2">
              <Label>Select Category</Label>
              <Select value={addNumberCatId} onValueChange={setAddNumberCatId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country name */}
            <div className="space-y-2">
              <Label>Country Name</Label>
              <Input
                placeholder="e.g. United States"
                value={addNumberCountry}
                onChange={e => setAddNumberCountry(e.target.value)}
              />
            </div>

            {/* Give amount, OTP rate, cooldown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Give Amount</Label>
                <Input
                  type="number"
                  min={1}
                  value={addNumberGiveAmount}
                  onChange={e => setAddNumberGiveAmount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">OTP Rate ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={addNumberOtpRate}
                  onChange={e => setAddNumberOtpRate(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Cooldown (s)</Label>
                <Input
                  type="number"
                  min={0}
                  value={addNumberCooldown}
                  onChange={e => setAddNumberCooldown(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Phone numbers textarea */}
            <div className="space-y-2">
              <Label>Phone Numbers (one per line)</Label>
              <Textarea
                placeholder={'+1234567890\n+1987654321\n+15551234567'}
                rows={6}
                value={addNumberText}
                onChange={e => setAddNumberText(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Paste phone numbers with country codes, one per line. You can also upload a .txt file from the Services page.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddNumbers} disabled={addNumberSaving}>
              {addNumberSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
              Add Numbers
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteCat?.display_name}&rdquo;. Existing orders referencing this category will remain but show a blank category name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
