'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Phone, Package, Database, ChevronRight, ArrowLeft, Upload, FileText, Globe2, MapPin, Clock, Hash } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SERVICES, getCountryFlag } from '@/lib/constants';
import { useCategories } from '@/hooks/use-categories';
import { useAuth } from '@/lib/auth-context';

interface ServiceEntry {
  id: number;
  name: string;
  range_val: string;
  country_code: string | null;
  flag: string | null;
  is_hot: boolean;
  success_count: number;
}

interface ManualServiceEntry {
  id: number;
  service_name: string;
  country_name: string;
  flag: string | null;
  stock: number;
  give_amount: number;
  otp_rate: number;
  cooldown: number;
  category_id: number | null;
}

interface ManualNumberEntry {
  id: number;
  service_id: number;
  number: string;
  created_at: string;
}

export default function AdminServicesPage() {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [manualServices, setManualServices] = useState<ManualServiceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState({ name: '', range_val: '', country_code: '' });
  const [adding, setAdding] = useState(false);

  // Manual service form
  const [newManual, setNewManual] = useState({
    service_name: '',
    country_name: '',
    category_id: '' as string | number,
    give_amount: 1,
    otp_rate: 0,
    cooldown: 0,
  });
  const [addingManual, setAddingManual] = useState(false);

  // Manual numbers drill-down
  const [drillService, setDrillService] = useState<ManualServiceEntry | null>(null);
  const [manualNumbers, setManualNumbers] = useState<ManualNumberEntry[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [addingNumber, setAddingNumber] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filePreview, setFilePreview] = useState<{ numbers: string[]; detectedCountry: string; detectedFlag: string } | null>(null);
  const [batchConfig, setBatchConfig] = useState({ cooldown: 0, batchLimit: 1000 });

  const loadData = async () => {
    const [svc, manual] = await Promise.all([
      supabase.from('services').select('*').order('name'),
      supabase.from('manual_services').select('*').order('service_name'),
    ]);
    setServices(svc.data || []);
    setManualServices(manual.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAddService = async () => {
    if (!newService.name || !newService.range_val) {
      toast.error('Fill in service name and range');
      return;
    }
    setAdding(true);
    const { error } = await supabase.from('services').insert({
      name: newService.name.toUpperCase(),
      range_val: newService.range_val,
      country_code: newService.country_code.toUpperCase() || null,
      is_hot: false,
      success_count: 0,
    });
    setAdding(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Service added');
      setNewService({ name: '', range_val: '', country_code: '' });
      loadData();
    }
  };

  const handleDeleteService = async (id: number) => {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Service deleted');
      loadData();
    }
  };

  const handleAddManualService = async () => {
    if (!newManual.service_name || !newManual.country_name) {
      toast.error('Fill in service name and country');
      return;
    }
    setAddingManual(true);
    const { error } = await supabase.from('manual_services').insert({
      service_name: newManual.service_name,
      country_name: newManual.country_name,
      category_id: newManual.category_id ? Number(newManual.category_id) : null,
      give_amount: newManual.give_amount,
      otp_rate: newManual.otp_rate,
      stock: 0,
      cooldown: newManual.cooldown,
    });
    setAddingManual(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Manual service created');
      setNewManual({ service_name: '', country_name: '', category_id: '', give_amount: 1, otp_rate: 0, cooldown: 0 });
      loadData();
    }
  };

  const handleDeleteManual = async (id: number) => {
    const { error } = await supabase.from('manual_services').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Manual service deleted');
      loadData();
    }
  };

  const loadManualNumbers = useCallback(async (serviceId: number) => {
    setNumbersLoading(true);
    const { data, error } = await supabase
      .from('manual_numbers')
      .select('*')
      .eq('service_id', serviceId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Failed to load numbers');
    } else {
      setManualNumbers(data || []);
    }
    setNumbersLoading(false);
  }, []);

  const openDrillDown = (svc: ManualServiceEntry) => {
    setDrillService(svc);
    setManualNumbers([]);
    setNewNumber('');
    setBulkNumbers('');
    setShowBulk(false);
    setShowFile(false);
    loadManualNumbers(svc.id);
  };

  const handleAddNumber = async () => {
    if (!drillService || !newNumber.trim()) {
      toast.error('Enter a phone number');
      return;
    }
    setAddingNumber(true);
    const { error } = await supabase.from('manual_numbers').insert({
      service_id: drillService.id,
      number: newNumber.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Number added & broadcast sent');
      await sendNumberBroadcast(1, drillService.service_name, drillService.country_name);
      setNewNumber('');
      loadManualNumbers(drillService.id);
      loadData();
    }
    setAddingNumber(false);
  };

  const handleAddBulkNumbers = async () => {
    if (!drillService || !bulkNumbers.trim()) {
      toast.error('Enter at least one number');
      return;
    }
    const numbers = bulkNumbers
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);

    if (numbers.length === 0) {
      toast.error('No valid numbers found');
      return;
    }

    setAddingNumber(true);
    const rows = numbers.map((n) => ({
      service_id: drillService.id,
      number: n,
    }));
    const { error } = await supabase.from('manual_numbers').insert(rows);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${numbers.length} numbers added & broadcast sent`);
      await sendNumberBroadcast(numbers.length, drillService.service_name, drillService.country_name);
      setBulkNumbers('');
      setShowBulk(false);
      loadManualNumbers(drillService.id);
      loadData();
    }
    setAddingNumber(false);
  };

  const detectCountryFromNumber = (num: string): { code: string; name: string; flag: string } => {
    let cleaned = num.trim().replace(/^\+/, '');
    const prefixes: Record<string, { code: string; name: string }> = {
      '1': { code: 'US', name: 'United States' },
      '44': { code: 'GB', name: 'United Kingdom' },
      '33': { code: 'FR', name: 'France' },
      '49': { code: 'DE', name: 'Germany' },
      '39': { code: 'IT', name: 'Italy' },
      '34': { code: 'ES', name: 'Spain' },
      '31': { code: 'NL', name: 'Netherlands' },
      '7': { code: 'RU', name: 'Russia' },
      '86': { code: 'CN', name: 'China' },
      '81': { code: 'JP', name: 'Japan' },
      '82': { code: 'KR', name: 'South Korea' },
      '91': { code: 'IN', name: 'India' },
      '92': { code: 'PK', name: 'Pakistan' },
      '880': { code: 'BD', name: 'Bangladesh' },
      '62': { code: 'ID', name: 'Indonesia' },
      '60': { code: 'MY', name: 'Malaysia' },
      '65': { code: 'SG', name: 'Singapore' },
      '66': { code: 'TH', name: 'Thailand' },
      '84': { code: 'VN', name: 'Vietnam' },
      '63': { code: 'PH', name: 'Philippines' },
      '90': { code: 'TR', name: 'Turkey' },
      '98': { code: 'IR', name: 'Iran' },
      '20': { code: 'EG', name: 'Egypt' },
      '234': { code: 'NG', name: 'Nigeria' },
      '27': { code: 'ZA', name: 'South Africa' },
      '55': { code: 'BR', name: 'Brazil' },
      '52': { code: 'MX', name: 'Mexico' },
      '54': { code: 'AR', name: 'Argentina' },
      '57': { code: 'CO', name: 'Colombia' },
      '58': { code: 'VE', name: 'Venezuela' },
      '51': { code: 'PE', name: 'Peru' },
      '56': { code: 'CL', name: 'Chile' },
      '61': { code: 'AU', name: 'Australia' },
      '64': { code: 'NZ', name: 'New Zealand' },
      '972': { code: 'IL', name: 'Israel' },
      '971': { code: 'AE', name: 'UAE' },
      '966': { code: 'SA', name: 'Saudi Arabia' },
      '974': { code: 'QA', name: 'Qatar' },
      '965': { code: 'KW', name: 'Kuwait' },
      '968': { code: 'OM', name: 'Oman' },
      '962': { code: 'JO', name: 'Jordan' },
      '961': { code: 'LB', name: 'Lebanon' },
      '963': { code: 'SY', name: 'Syria' },
      '964': { code: 'IQ', name: 'Iraq' },
      '967': { code: 'YE', name: 'Yemen' },
      '212': { code: 'MA', name: 'Morocco' },
      '213': { code: 'DZ', name: 'Algeria' },
      '216': { code: 'TN', name: 'Tunisia' },
      '218': { code: 'LY', name: 'Libya' },
      '254': { code: 'KE', name: 'Kenya' },
      '255': { code: 'TZ', name: 'Tanzania' },
      '256': { code: 'UG', name: 'Uganda' },
      '233': { code: 'GH', name: 'Ghana' },
      '225': { code: 'CI', name: 'Côte d\'Ivoire' },
      '221': { code: 'SN', name: 'Senegal' },
      '231': { code: 'LR', name: 'Liberia' },
      '232': { code: 'SL', name: 'Sierra Leone' },
      '223': { code: 'ML', name: 'Mali' },
      '226': { code: 'BF', name: 'Burkina Faso' },
      '227': { code: 'NE', name: 'Niger' },
      '228': { code: 'TG', name: 'Togo' },
      '229': { code: 'BJ', name: 'Benin' },
      '374': { code: 'AM', name: 'Armenia' },
      '994': { code: 'AZ', name: 'Azerbaijan' },
      '995': { code: 'GE', name: 'Georgia' },
      '371': { code: 'LV', name: 'Latvia' },
      '370': { code: 'LT', name: 'Lithuania' },
      '372': { code: 'EE', name: 'Estonia' },
      '48': { code: 'PL', name: 'Poland' },
      '420': { code: 'CZ', name: 'Czechia' },
      '421': { code: 'SK', name: 'Slovakia' },
      '36': { code: 'HU', name: 'Hungary' },
      '40': { code: 'RO', name: 'Romania' },
      '359': { code: 'BG', name: 'Bulgaria' },
      '385': { code: 'HR', name: 'Croatia' },
      '381': { code: 'RS', name: 'Serbia' },
      '382': { code: 'ME', name: 'Montenegro' },
      '386': { code: 'SI', name: 'Slovenia' },
      '387': { code: 'BA', name: 'Bosnia' },
      '389': { code: 'MK', name: 'N. Macedonia' },
      '30': { code: 'GR', name: 'Greece' },
      '351': { code: 'PT', name: 'Portugal' },
      '352': { code: 'LU', name: 'Luxembourg' },
      '353': { code: 'IE', name: 'Ireland' },
      '354': { code: 'IS', name: 'Iceland' },
      '358': { code: 'FI', name: 'Finland' },
      '46': { code: 'SE', name: 'Sweden' },
      '47': { code: 'NO', name: 'Norway' },
      '45': { code: 'DK', name: 'Denmark' },
      '41': { code: 'CH', name: 'Switzerland' },
      '43': { code: 'AT', name: 'Austria' },
      '32': { code: 'BE', name: 'Belgium' },
      '356': { code: 'MT', name: 'Malta' },
      '357': { code: 'CY', name: 'Cyprus' },
      '870': { code: 'IN', name: 'Inmarsat' },
      '881': { code: 'GL', name: 'Global Satellite' },
      '882': { code: 'GL', name: 'Global Satellite' },
    };
    for (let len = 3; len >= 1; len--) {
      const prefix = cleaned.slice(0, len);
      if (prefixes[prefix]) {
        const info = prefixes[prefix];
        const flag = getCountryFlag(info.code);
        return { code: info.code, name: info.name, flag };
      }
    }
    return { code: '', name: 'Unknown', flag: '🌍' };
  };

  const sendNumberBroadcast = async (count: number, serviceName: string, countryName: string, categoryId?: number) => {
    const flag = getCountryFlag(countryName.slice(0, 2).toUpperCase());
    const title = 'New Numbers Available!';
    const message = `${flag} New numbers have been added for ${serviceName} (${countryName}) — grab them now! (${count} number${count !== 1 ? 's' : ''} in stock)`;
    const actionUrl = categoryId ? `/dashboard/get-number` : `/dashboard/get-number`;
    const { data: users } = await supabase.from('profiles').select('id');
    if (users && users.length > 0) {
      const rows = users.map(u => ({
        user_id: u.id,
        title,
        message,
        icon: 'bell',
        action_url: actionUrl,
      }));
      await supabase.from('user_notifications').insert(rows);
    }
  };

  const handleDeleteNumber = async (id: number) => {
    const { error } = await supabase.from('manual_numbers').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete number');
    } else {
      toast.success('Number deleted');
      if (drillService) {
        loadManualNumbers(drillService.id);
        loadData();
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !drillService) return;

    const text = await file.text();
    const numbers = text
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (numbers.length === 0) {
      toast.error('No numbers found in file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const limited = numbers.slice(0, batchConfig.batchLimit);
    const detected = detectCountryFromNumber(limited[0]);

    setFilePreview({
      numbers: limited,
      detectedCountry: detected.name,
      detectedFlag: detected.flag,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmFileImport = async () => {
    if (!filePreview || !drillService) return;
    setAddingNumber(true);
    const rows = filePreview.numbers.map((n) => ({
      service_id: drillService.id,
      number: n,
    }));
    const { error } = await supabase.from('manual_numbers').insert(rows);
    if (error) {
      toast.error(error.message);
    } else {
      const newStock = drillService.stock + filePreview.numbers.length;
      await supabase.from('manual_services').update({ stock: newStock, cooldown: batchConfig.cooldown }).eq('id', drillService.id);
      toast.success(`${filePreview.numbers.length} numbers imported & broadcast sent`);
      await sendNumberBroadcast(filePreview.numbers.length, drillService.service_name, drillService.country_name);
      setFilePreview(null);
      setShowFile(false);
      loadManualNumbers(drillService.id);
      loadData();
    }
    setAddingNumber(false);
  };

  return (
    <DashboardLayout admin>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-orbitron), sans-serif' }}>Service Management</h1>
        <p className="text-sm text-muted-foreground">Manage range-based and manual number services</p>
      </div>

      <Tabs defaultValue="range">
        <TabsList>
          <TabsTrigger value="range">
            <Phone className="mr-2 h-4 w-4" />
            Range Services
          </TabsTrigger>
          <TabsTrigger value="manual">
            <Package className="mr-2 h-4 w-4" />
            Manual Services
          </TabsTrigger>
        </TabsList>

        {/* Range Services Tab */}
        <TabsContent value="range" className="mt-4">
          <Card className="border-border/50 bg-card/50 mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add Range Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Service Name</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newService.name}
                    onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  >
                    <option value="">Select...</option>
                    {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Range Value</Label>
                  <Input
                    placeholder="e.g. 99298XXX"
                    value={newService.range_val}
                    onChange={(e) => setNewService({ ...newService, range_val: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Country Code</Label>
                  <Input
                    placeholder="e.g. US"
                    value={newService.country_code}
                    onChange={(e) => setNewService({ ...newService, country_code: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddService} disabled={adding} className="w-full" size="sm">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Range Services ({services.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : services.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No range services configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Range</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Hits</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell className="font-mono text-sm">{s.range_val}</TableCell>
                          <TableCell>
                            {s.country_code ? `${getCountryFlag(s.country_code)} ${s.country_code}` : 'Global'}
                          </TableCell>
                          <TableCell>{s.success_count}</TableCell>
                          <TableCell>
                            {s.is_hot && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Hot</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteService(s.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
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
        </TabsContent>

        {/* Manual Services Tab */}
        <TabsContent value="manual" className="mt-4">
          {!drillService ? (
            <>
              {/* Add Manual Service Card */}
              <Card className="border-border/50 bg-card/50 mb-4">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Add Manual Service
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                    <div className="space-y-1">
                      <Label className="text-xs">Category</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm h-9"
                        value={newManual.category_id}
                        onChange={(e) => setNewManual({ ...newManual, category_id: e.target.value })}
                      >
                        <option value="">Select category...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Service Name</Label>
                      <Input
                        placeholder="e.g. Facebook"
                        value={newManual.service_name}
                        onChange={(e) => setNewManual({ ...newManual, service_name: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Country</Label>
                      <Input
                        placeholder="e.g. United States"
                        value={newManual.country_name}
                        onChange={(e) => setNewManual({ ...newManual, country_name: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Give Amount</Label>
                      <Input
                        type="number"
                        min={1}
                        value={newManual.give_amount}
                        onChange={(e) => setNewManual({ ...newManual, give_amount: parseInt(e.target.value) || 1 })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">OTP Rate ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={newManual.otp_rate}
                        onChange={(e) => setNewManual({ ...newManual, otp_rate: parseFloat(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cooldown (s)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={newManual.cooldown}
                        onChange={(e) => setNewManual({ ...newManual, cooldown: parseInt(e.target.value) || 0 })}
                        className="h-9"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleAddManualService} disabled={addingManual} className="w-full" size="sm">
                        {addingManual ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Service'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Services List */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Manual Services ({manualServices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : manualServices.length === 0 ? (
                    <div className="py-8 text-center">
                      <Database className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No manual services yet</p>
                      <p className="mt-1 text-xs text-muted-foreground">Create one above to start adding phone numbers.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Country</TableHead>
                            <TableHead>Numbers</TableHead>
                            <TableHead>Give</TableHead>
                            <TableHead>OTP Rate</TableHead>
                            <TableHead>Cooldown</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {manualServices.map((s) => (
                            <TableRow
                              key={s.id}
                              className="cursor-pointer hover:bg-muted/40"
                              onClick={() => openDrillDown(s)}
                            >
                              <TableCell className="font-medium">{s.service_name}</TableCell>
                              <TableCell>
                                {s.category_id ? (
                                  <Badge variant="outline" className="text-xs">
                                    {categories.find(c => c.id === s.category_id)?.display_name || `#${s.category_id}`}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Unlinked</span>
                                )}
                              </TableCell>
                              <TableCell>{s.country_name}</TableCell>
                              <TableCell>
                                <Badge variant={s.stock > 0 ? 'secondary' : 'outline'}>{s.stock}</Badge>
                              </TableCell>
                              <TableCell>{s.give_amount}</TableCell>
                              <TableCell>${s.otp_rate.toFixed(2)}</TableCell>
                              <TableCell>{s.cooldown}s</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openDrillDown(s)}>
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDeleteManual(s.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            /* Drill-down: manage numbers for a manual service */
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-2 -ml-2 text-muted-foreground"
                      onClick={() => setDrillService(null)}
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Back to services
                    </Button>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      {drillService.service_name} — {drillService.country_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {manualNumbers.length} number{manualNumbers.length !== 1 ? 's' : ''} in stock
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowFile(false); setShowBulk(!showBulk); }}
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {showBulk ? 'Single Add' : 'Bulk Add'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowBulk(false); setShowFile(!showFile); }}
                    >
                      <Upload className="mr-1 h-4 w-4" />
                      {showFile ? 'Single Add' : 'Upload .txt'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add number(s) */}
                {!showBulk && !showFile ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter phone number, e.g. +1234567890"
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddNumber(); }}
                    />
                    <Button onClick={handleAddNumber} disabled={addingNumber}>
                      {addingNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                ) : showFile ? (
                  <div className="space-y-4">
                    {/* Batch config */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Cooldown (s)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={batchConfig.cooldown}
                          onChange={(e) => setBatchConfig(prev => ({ ...prev, cooldown: parseInt(e.target.value) || 0 }))}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs flex items-center gap-1"><Hash className="h-3 w-3" /> Batch Limit</Label>
                        <Input
                          type="number"
                          min={1}
                          value={batchConfig.batchLimit}
                          onChange={(e) => setBatchConfig(prev => ({ ...prev, batchLimit: parseInt(e.target.value) || 1000 }))}
                          className="h-9"
                        />
                      </div>
                    </div>

                    {/* File drop zone */}
                    <div
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const dt = new DataTransfer();
                          dt.items.add(file);
                          if (fileInputRef.current) {
                            fileInputRef.current.files = dt.files;
                            fileInputRef.current.dispatchEvent(new Event('change'));
                          }
                        }
                      }}
                    >
                      <FileText className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop a .txt file here, or click to browse
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        One phone number per line
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={addingNumber}
                      >
                        {addingNumber ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                        Choose File
                      </Button>
                    </div>

                    {/* File preview with auto-detection */}
                    {filePreview && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Globe2 className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-sm">File Preview</span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Detected:</span>
                            <span className="text-lg">{filePreview.detectedFlag}</span>
                            <span className="font-medium">{filePreview.detectedCountry}</span>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Count:</span>
                            <span className="font-medium">{filePreview.numbers.length}</span>
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto rounded-md border border-border/50 bg-background p-2">
                          {filePreview.numbers.slice(0, 20).map((n, i) => (
                            <p key={i} className="font-mono text-xs text-muted-foreground">{n}</p>
                          ))}
                          {filePreview.numbers.length > 20 && (
                            <p className="text-xs text-muted-foreground italic mt-1">...and {filePreview.numbers.length - 20} more</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={confirmFileImport} disabled={addingNumber} size="sm" className="bg-primary text-primary-foreground">
                            {addingNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                            Import {filePreview.numbers.length} Numbers
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setFilePreview(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                      rows={6}
                      placeholder="Paste numbers, one per line:&#10;+1234567890&#10;+1987654321&#10;+15551234567"
                      value={bulkNumbers}
                      onChange={(e) => setBulkNumbers(e.target.value)}
                    />
                    <Button onClick={handleAddBulkNumbers} disabled={addingNumber}>
                      {addingNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add All Numbers'}
                    </Button>
                  </div>
                )}

                {/* Numbers list */}
                {numbersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : manualNumbers.length === 0 ? (
                  <div className="py-8 text-center">
                    <Phone className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No numbers added yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Add numbers above to stock this service.</p>
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto rounded-md border border-border/50">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>Phone Number</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manualNumbers.map((n, idx) => (
                          <TableRow key={n.id}>
                            <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-mono text-sm">{n.number}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(n.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleDeleteNumber(n.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
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
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
