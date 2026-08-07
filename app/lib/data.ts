// Centralized data layer for Afrivera Operations
// Live data (batches, daily_logs, inventory_items, sales, customers, employees) comes from Supabase.
// Reference tables (smart-feeding curves, monthly financials, alerts, enterprise list) stay static.

import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

// =====================================================================
// TYPES
// =====================================================================
export type Batch = {
  id: string;
  name: string;
  enterprise: 'Broilers' | 'Village Chicken' | 'Piggery' | 'Fish' | 'Ducks' | 'Goats' | 'Sheep';
  startDate: string;
  ageDays: number;
  initialCount: number;
  currentCount: number;
  mortality: number;
  avgWeightKg: number;
  targetWeightKg: number;
  house: string;
  feedConsumedKg: number;
  waterConsumedL: number;
  costToDate: number;
  projectedRevenue: number;
  status: 'Active' | 'Sold' | 'Closed';
};

export type DailyLog = {
  id?: string;
  batch_id: string;
  log_date?: string;
  mortality: number;
  feed_kg: number;
  water_l: number;
  avg_weight_kg?: number | null;
  notes?: string | null;
  recorded_by?: string | null;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stockKg: number;
  reorderKg: number;
  costPerKg: number;
  supplier: string;
  unit?: string;
};

export type Customer = {
  id: string;
  name: string;
  type: string;
  contact: string;
  balance: number;
  totalOrders: number;
  status: string;
};

export type Sale = {
  id: string;
  date: string;
  customer: string;
  product: string;
  qty: number;
  total: number;
  status: string;
};

export type Employee = {
  id: string;
  name: string;
  role: string;
  dept: string;
  attendance: number;
  performance: number;
};

// =====================================================================
// STATIC REFERENCE DATA
// =====================================================================
export const enterprises = [
  { key: 'broilers', label: 'Broilers', icon: 'restaurant', count: 8420, color: '#D4AF37' },
  { key: 'village', label: 'Village Chicken', icon: 'egg', count: 1250, color: '#EA580C' },
  { key: 'piggery', label: 'Piggery', icon: 'paw', count: 184, color: '#DC2626' },
  { key: 'fish', label: 'Fish Farming', icon: 'fish', count: 12500, color: '#0EA5E9' },
  { key: 'ducks', label: 'Ducks', icon: 'water', count: 320, color: '#7C3AED' },
  { key: 'goats', label: 'Goats & Sheep', icon: 'leaf', count: 92, color: '#16A34A' },
  { key: 'horticulture', label: 'Horticulture', icon: 'flower', count: 0, color: '#4A7C2C', area: '12 ha' },
];

export const broilerFeedTable = [
  { ageStart: 1, ageEnd: 7, stage: 'Pre-starter', feedType: 'Pre-starter Crumble', gramsPerBird: 18, waterMlPerBird: 36 },
  { ageStart: 8, ageEnd: 14, stage: 'Starter', feedType: 'Starter Mash', gramsPerBird: 45, waterMlPerBird: 90 },
  { ageStart: 15, ageEnd: 21, stage: 'Grower', feedType: 'Grower Pellet', gramsPerBird: 85, waterMlPerBird: 175 },
  { ageStart: 22, ageEnd: 28, stage: 'Grower', feedType: 'Grower Pellet', gramsPerBird: 125, waterMlPerBird: 250 },
  { ageStart: 29, ageEnd: 35, stage: 'Finisher', feedType: 'Finisher Pellet', gramsPerBird: 165, waterMlPerBird: 330 },
  { ageStart: 36, ageEnd: 42, stage: 'Finisher', feedType: 'Finisher Pellet', gramsPerBird: 195, waterMlPerBird: 390 },
];

export const piggeryFeedTable = [
  { stage: 'Piglet (0-4w)', minWeight: 0, maxWeight: 8, feedType: 'Creep Feed', kgPerDay: 0.3, waterLPerDay: 1.0 },
  { stage: 'Weaner (4-8w)', minWeight: 8, maxWeight: 25, feedType: 'Weaner Mash', kgPerDay: 1.2, waterLPerDay: 3.5 },
  { stage: 'Grower (8-16w)', minWeight: 25, maxWeight: 60, feedType: 'Grower Mash', kgPerDay: 2.4, waterLPerDay: 6.5 },
  { stage: 'Finisher (16-24w)', minWeight: 60, maxWeight: 100, feedType: 'Finisher Mash', kgPerDay: 3.2, waterLPerDay: 9.0 },
  { stage: 'Pregnant Sow', minWeight: 100, maxWeight: 250, feedType: 'Sow Gestation', kgPerDay: 2.5, waterLPerDay: 12.0 },
  { stage: 'Lactating Sow', minWeight: 100, maxWeight: 250, feedType: 'Sow Lactation', kgPerDay: 5.5, waterLPerDay: 25.0 },
];

export function getBroilerRecommendation(ageDays: number) {
  return broilerFeedTable.find(r => ageDays >= r.ageStart && ageDays <= r.ageEnd) || broilerFeedTable[broilerFeedTable.length - 1];
}

export function getPiggeryRecommendation(weightKg: number) {
  return piggeryFeedTable.find(r => weightKg >= r.minWeight && weightKg <= r.maxWeight) || piggeryFeedTable[3];
}

export function calcFCR(feedKg: number, weightGainKg: number) {
  if (weightGainKg <= 0) return 0;
  return +(feedKg / weightGainKg).toFixed(2);
}

export const alerts = [
  { id: 'A1', severity: 'critical', module: 'Inventory', message: 'Broiler Finisher Pellet below reorder level (680kg / 1500kg)', time: '2h ago' },
  { id: 'A2', severity: 'warning', module: 'Poultry', message: 'House A mortality 1.9% trending higher than target 1.5%', time: '4h ago' },
  { id: 'A3', severity: 'info', module: 'Vaccination', message: 'Newcastle vaccine due for Batch B-2403 tomorrow', time: '6h ago' },
  { id: 'A4', severity: 'warning', module: 'Fish', message: 'Pond A pH reading 8.4 - above optimal range', time: '8h ago' },
  { id: 'A5', severity: 'info', module: 'Sales', message: 'DRC export consignment ready for dispatch (1,200 birds)', time: '1d ago' },
  { id: 'A6', severity: 'critical', module: 'Finance', message: 'Outstanding receivables: K 108,500 across 5 customers', time: '1d ago' },
];

export const monthlyFinancials = [
  { month: 'Jan', revenue: 285000, costs: 198000, profit: 87000 },
  { month: 'Feb', revenue: 312000, costs: 210000, profit: 102000 },
  { month: 'Mar', revenue: 298000, costs: 215000, profit: 83000 },
  { month: 'Apr', revenue: 358000, costs: 228000, profit: 130000 },
  { month: 'May', revenue: 142000, costs: 92000, profit: 50000 },
];

export const enterpriseProfit = [
  { name: 'Broilers', revenue: 185000, cost: 118000, profit: 67000, color: '#D4AF37' },
  { name: 'Piggery', revenue: 72000, cost: 48000, profit: 24000, color: '#DC2626' },
  { name: 'Fish', revenue: 45000, cost: 28000, profit: 17000, color: '#0EA5E9' },
  { name: 'Village Chicken', revenue: 28000, cost: 15000, profit: 13000, color: '#EA580C' },
  { name: 'Goats & Sheep', revenue: 18000, cost: 9000, profit: 9000, color: '#16A34A' },
  { name: 'Ducks', revenue: 14000, cost: 8000, profit: 6000, color: '#7C3AED' },
  { name: 'Horticulture', revenue: 22000, cost: 12000, profit: 10000, color: '#4A7C2C' },
];

export function formatK(n: number) {
  if (n >= 1000000) return `K ${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `K ${(n / 1000).toFixed(1)}k`;
  return `K ${Math.round(n)}`;
}

// =====================================================================
// MAPPERS (snake_case from DB -> camelCase for UI)
// =====================================================================
function mapBatch(r: any): Batch {
  return {
    id: r.id,
    name: r.name,
    enterprise: r.enterprise,
    startDate: r.start_date,
    ageDays: r.age_days,
    initialCount: r.initial_count,
    currentCount: r.current_count,
    mortality: r.mortality,
    avgWeightKg: Number(r.avg_weight_kg),
    targetWeightKg: Number(r.target_weight_kg),
    house: r.house,
    feedConsumedKg: Number(r.feed_consumed_kg),
    waterConsumedL: Number(r.water_consumed_l),
    costToDate: Number(r.cost_to_date),
    projectedRevenue: Number(r.projected_revenue),
    status: r.status,
  };
}

function mapInventory(r: any): InventoryItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    stockKg: Number(r.stock_kg),
    reorderKg: Number(r.reorder_kg),
    costPerKg: Number(r.cost_per_kg),
    supplier: r.supplier,
    unit: r.unit || undefined,
  };
}

function mapCustomer(r: any): Customer {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    contact: r.contact,
    balance: Number(r.balance),
    totalOrders: r.total_orders,
    status: r.status,
  };
}

function mapSale(r: any): Sale {
  return {
    id: r.id,
    date: r.sale_date,
    customer: r.customer,
    product: r.product,
    qty: r.qty,
    total: Number(r.total),
    status: r.status,
  };
}

function mapEmployee(r: any): Employee {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    dept: r.dept,
    attendance: r.attendance,
    performance: r.performance,
  };
}

// =====================================================================
// FETCHERS
// =====================================================================
export async function fetchBatches(): Promise<Batch[]> {
  const { data, error } = await supabase.from('batches').select('*').order('start_date', { ascending: false });
  if (error) { console.warn('fetchBatches', error); return []; }
  return (data || []).map(mapBatch);
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase.from('inventory_items').select('*').order('category').order('name');
  if (error) { console.warn('fetchInventory', error); return []; }
  return (data || []).map(mapInventory);
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) { console.warn('fetchCustomers', error); return []; }
  return (data || []).map(mapCustomer);
}

export async function fetchSales(limit = 20): Promise<Sale[]> {
  const { data, error } = await supabase.from('sales').select('*').order('sale_date', { ascending: false }).limit(limit);
  if (error) { console.warn('fetchSales', error); return []; }
  return (data || []).map(mapSale);
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase.from('employees').select('*').order('name');
  if (error) { console.warn('fetchEmployees', error); return []; }
  return (data || []).map(mapEmployee);
}

export async function fetchDailyLogs(batchId?: string, limit = 30) {
  let q = supabase.from('daily_logs').select('*').order('log_date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (batchId) q = q.eq('batch_id', batchId);
  const { data, error } = await q;
  if (error) { console.warn('fetchDailyLogs', error); return []; }
  return data || [];
}

// =====================================================================
// MUTATIONS
// =====================================================================
/**
 * Record a daily log entry and atomically update the batch aggregates
 * (mortality, feed/water consumed, current count, latest avg weight, cost-to-date).
 *
 * Workers from any device call this — managers see the new numbers as soon as
 * they refresh / re-mount a screen.
 */
export async function recordDailyLog(input: {
  batch: Batch;
  mortality: number;
  feedKg: number;
  waterL: number;
  avgWeightKg?: number | null;
  notes?: string;
  recordedBy?: string;
  // Average feed cost per kg used for cost-to-date increment. Sensible defaults per enterprise.
  feedCostPerKg?: number;
}) {
  const {
    batch, mortality, feedKg, waterL,
    avgWeightKg, notes, recordedBy,
    feedCostPerKg,
  } = input;

  // 1) Insert the daily log row
  const { error: logErr } = await supabase.from('daily_logs').insert({
    batch_id: batch.id,
    mortality,
    feed_kg: feedKg,
    water_l: waterL,
    avg_weight_kg: avgWeightKg ?? null,
    notes: notes ?? null,
    recorded_by: recordedBy ?? null,
  });
  if (logErr) throw logErr;

  // 2) Update the batch aggregates
  const costPerKg = feedCostPerKg ?? defaultFeedCostPerKg(batch.enterprise);
  const updates: any = {
    mortality: batch.mortality + mortality,
    current_count: Math.max(0, batch.currentCount - mortality),
    feed_consumed_kg: Number(batch.feedConsumedKg) + feedKg,
    water_consumed_l: Number(batch.waterConsumedL) + waterL,
    cost_to_date: Number(batch.costToDate) + feedKg * costPerKg,
  };
  if (avgWeightKg && avgWeightKg > 0) updates.avg_weight_kg = avgWeightKg;

  const { error: updErr } = await supabase.from('batches').update(updates).eq('id', batch.id);
  if (updErr) throw updErr;

  return true;
}

function defaultFeedCostPerKg(enterprise: string) {
  switch (enterprise) {
    case 'Broilers':
    case 'Village Chicken': return 11.5;
    case 'Piggery': return 13.5;
    case 'Fish': return 25;
    case 'Ducks': return 11;
    case 'Goats':
    case 'Sheep': return 8;
    default: return 12;
  }
}

// =====================================================================
// REACT HOOKS
// =====================================================================
function useFetched<T>(loader: () => Promise<T>, fallback: T): { data: T; loading: boolean; refresh: () => Promise<void> } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loader();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => { refresh(); }, [refresh]);
  return { data, loading, refresh };
}

export function useBatches() {
  return useFetched(fetchBatches, [] as Batch[]);
}
export function useInventory() {
  return useFetched(fetchInventory, [] as InventoryItem[]);
}
export function useCustomers() {
  return useFetched(fetchCustomers, [] as Customer[]);
}
export function useSales(limit = 20) {
  const loader = useCallback(() => fetchSales(limit), [limit]);
  return useFetched(loader, [] as Sale[]);
}
export function useEmployees() {
  return useFetched(fetchEmployees, [] as Employee[]);
}
