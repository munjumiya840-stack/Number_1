export interface Category {
  id: number;
  display_name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  logo_asset: string | null;
  status: 'active' | 'inactive';
  sort_order: number;
  provider_mapping: number[];
  country_availability: string[];
  cost_config: Record<string, number>;
  reward_per_otp: number;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: number;
  display_name: string;
  internal_id: string;
  api_base_url: string | null;
  api_key_encrypted: string | null;
  status: 'active' | 'inactive';
  priority: number;
  service_mappings: Record<string, string>;
  country_mappings: Record<string, string>;
  connection_status: 'connected' | 'disconnected' | 'error' | 'unknown';
  last_tested_at: string | null;
  last_latency_ms: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardRule {
  id: number;
  scope: 'global' | 'category' | 'service' | 'country' | 'provider';
  scope_ref: string | null;
  amount: number;
  is_active: boolean;
  precedence: number;
  created_at: string;
  updated_at: string;
}

export interface RewardLedgerEntry {
  id: number;
  user_id: string;
  amount: number;
  rule_id: number | null;
  rule_scope: string | null;
  rule_scope_ref: string | null;
  category_id: number | null;
  category_name: string | null;
  country: string | null;
  order_ref: string | null;
  event_ref: string;
  status: 'credited' | 'reversed' | 'adjusted';
  created_at: string;
}

export interface AdminRole {
  id: number;
  user_id: string;
  role: AdminRoleType;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AdminRoleType =
  | 'super_admin'
  | 'category_manager'
  | 'provider_manager'
  | 'order_manager'
  | 'finance_manager'
  | 'support_admin'
  | 'read_only_analyst';

export interface Order {
  id: number;
  user_id: string;
  category_id: number | null;
  category_name: string | null;
  provider_id: number | null;
  provider_name: string | null;
  phone_number: string | null;
  country: string | null;
  status: 'pending' | 'assigned' | 'completed' | 'cancelled' | 'expired';
  cost: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: number;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  balance: number;
  total_earnings: number;
  is_banned: boolean;
  is_admin: boolean;
  active_manual: Record<string, unknown> | null;
  manual_cooldowns: Record<string, unknown> | null;
  join_date: string;
  created_at: string;
  updated_at: string;
}

export const ADMIN_ROLE_LABELS: Record<AdminRoleType, string> = {
  super_admin: 'Super Admin',
  category_manager: 'Category Manager',
  provider_manager: 'Provider Manager',
  order_manager: 'Order Manager',
  finance_manager: 'Finance Manager',
  support_admin: 'Support Admin',
  read_only_analyst: 'Read-only Analyst',
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRoleType, string> = {
  super_admin: 'Full access to all features and settings',
  category_manager: 'Manage service categories, logos, and pricing',
  provider_manager: 'Manage provider panels and API integrations',
  order_manager: 'Manage orders and number inventory',
  finance_manager: 'Manage balances, deposits, and reward rules',
  support_admin: 'Manage users and send broadcasts',
  read_only_analyst: 'View-only access to all data',
};

export const ADMIN_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['all'],
  category_manager: ['categories.view', 'categories.edit', 'categories.create', 'categories.delete'],
  provider_manager: ['providers.view', 'providers.edit', 'providers.create', 'providers.delete', 'providers.test'],
  order_manager: ['orders.view', 'orders.edit', 'inventory.view', 'inventory.edit'],
  finance_manager: ['rewards.view', 'rewards.edit', 'balances.adjust', 'transactions.view'],
  support_admin: ['users.view', 'users.ban', 'broadcasts.send'],
  read_only_analyst: ['*.view'],
};
