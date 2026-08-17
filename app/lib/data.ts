/**
 * Data hooks — all backed by the Django GraphQL API via Apollo.
 * Static reference tables (feed curves etc.) are kept locally.
 */
import { useQuery, useMutation } from '@apollo/client';
import {
  BATCHES_QUERY, CREATE_BATCH_MUTATION,
  PRODUCTION_RECORDS_QUERY, CREATE_PRODUCTION_RECORD_MUTATION,
  INVENTORY_QUERY, RECORD_INVENTORY_TRANSACTION_MUTATION, CREATE_INVENTORY_ITEM_MUTATION,
  MEMBERS_QUERY, TASKS_QUERY,
  COMMODITY_PRICES_QUERY, MARKET_LISTINGS_QUERY,
  VISION_ANALYSES_QUERY, COMMUNITY_REPORTS_QUERY,
  RECOMMENDATIONS_QUERY,
  DASHBOARD_SUMMARY_QUERY, ENTERPRISES_QUERY, BATCH_FINANCIALS_QUERY,
} from './gql';

// ── types (mirrors backend models) ───────────────────────────────────────────
export type Batch = {
  id: string;
  name: string;
  enterprise: { id: string; name: string; enterpriseType: string };
  status: 'active' | 'completed' | 'cancelled';
  initialCount: number;
  currentCount: number;
  mortalityCount: number;
  avgWeightKg: number;
  targetWeightKg: number;
  feedConsumedKg: number;
  waterConsumedL: number;
  startDate: string;
  ageInDays: number;
  totalCosts: number;
  projectedRevenue: number;
};

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  costPerUnit: number;
  supplier: string;
  isLowStock: boolean;
  enterprise?: { id: string; name: string } | null;
};

export type Member = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phone: string;
  isActive: boolean;
};

// ── helpers ───────────────────────────────────────────────────────────────────
export function formatK(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
}

export function calcFCR(feedKg: number, weightGainKg: number): string {
  if (!weightGainKg) return '—';
  return (feedKg / weightGainKg).toFixed(2);
}

export function getBroilerRecommendation(ageDays: number, avgWeightKg: number): string {
  if (ageDays < 7) return 'Early brooding: maintain 32°C, 60-70% humidity, 24h light.';
  if (ageDays < 21) return 'Starter phase: ad-lib feed, 18h light, monitor water intake.';
  if (ageDays < 35) return 'Grower phase: switch to grower feed, reduce temperature to 24°C.';
  if (avgWeightKg < 1.8 && ageDays > 35) return 'Below target weight — check feed quality and health.';
  return 'On track for slaughter. Confirm market bookings.';
}

export function getPiggeryRecommendation(ageDays: number, avgWeightKg: number): string {
  if (ageDays < 28) return 'Suckling/creep phase: ensure sow milk and creep feed.';
  if (avgWeightKg < 20) return 'Weaner phase: high-protein diet, 3 meals/day.';
  if (avgWeightKg < 60) return 'Grower phase: balanced diet, monitor FCR.';
  return 'Finisher phase: 2.5-3 kg feed/day. Target 90 kg slaughter weight.';
}

// ── broiler feed reference table ──────────────────────────────────────────────
export const broilerFeedTable = [
  { week: 1, feedGDay: 15, cumFeedKg: 0.1, cumWeightKg: 0.18 },
  { week: 2, feedGDay: 40, cumFeedKg: 0.38, cumWeightKg: 0.45 },
  { week: 3, feedGDay: 70, cumFeedKg: 0.87, cumWeightKg: 0.9 },
  { week: 4, feedGDay: 100, cumFeedKg: 1.57, cumWeightKg: 1.5 },
  { week: 5, feedGDay: 130, cumFeedKg: 2.48, cumWeightKg: 2.1 },
  { week: 6, feedGDay: 155, cumFeedKg: 3.57, cumWeightKg: 2.7 },
];

export const piggeryFeedTable = [
  { week: 4, feedKgDay: 0.2, targetWeightKg: 7 },
  { week: 8, feedKgDay: 0.5, targetWeightKg: 20 },
  { week: 12, feedKgDay: 1.2, targetWeightKg: 40 },
  { week: 16, feedKgDay: 2.0, targetWeightKg: 65 },
  { week: 20, feedKgDay: 2.5, targetWeightKg: 90 },
];

// ── hooks ─────────────────────────────────────────────────────────────────────

export function useDashboard() {
  const { data, loading, error, refetch } = useQuery(DASHBOARD_SUMMARY_QUERY);
  return {
    summary: data?.dashboardSummary ?? null,
    alerts: data?.dashboardAlerts ?? [],
    trend: data?.dashboardTrend ?? [],
    loading, error, refetch,
  };
}

export function useEnterprises() {
  const { data, loading, error, refetch } = useQuery(ENTERPRISES_QUERY);
  return { data: data?.enterprises ?? [], loading, error, refetch };
}

export function useBatches(enterpriseId?: string, status?: string) {
  const { data, loading, error, refetch } = useQuery(BATCHES_QUERY, {
    variables: { enterpriseId, status },
  });
  return { data: data?.batches ?? [], loading, error, refetch };
}

export function useCreateBatch() {
  const [mutate, { loading }] = useMutation(CREATE_BATCH_MUTATION, {
    refetchQueries: [{ query: BATCHES_QUERY }, { query: ENTERPRISES_QUERY }],
  });
  return { createBatch: mutate, loading };
}

export function useProductionRecords(enterpriseId?: string, batchId?: string, limit = 50) {
  const { data, loading, error, refetch } = useQuery(PRODUCTION_RECORDS_QUERY, {
    variables: { enterpriseId, batchId, limit },
  });
  return { data: data?.productionRecords ?? [], loading, error, refetch };
}

export function useCreateProductionRecord() {
  const [mutate, { loading }] = useMutation(CREATE_PRODUCTION_RECORD_MUTATION, {
    refetchQueries: [{ query: BATCHES_QUERY }, { query: DASHBOARD_SUMMARY_QUERY }],
  });
  return { createRecord: mutate, loading };
}

export function useInventory(category?: string, enterpriseId?: string, lowStockOnly?: boolean) {
  const { data, loading, error, refetch } = useQuery(INVENTORY_QUERY, {
    variables: { category, enterpriseId, lowStockOnly },
  });
  return {
    items: data?.inventoryItems ?? [],
    summary: data?.inventorySummary ?? null,
    loading, error, refetch,
  };
}

export function useRecordTransaction() {
  const [mutate, { loading }] = useMutation(RECORD_INVENTORY_TRANSACTION_MUTATION, {
    refetchQueries: [{ query: INVENTORY_QUERY }],
  });
  return { recordTransaction: mutate, loading };
}

export function useCreateInventoryItem() {
  const [mutate, { loading }] = useMutation(CREATE_INVENTORY_ITEM_MUTATION, {
    refetchQueries: [{ query: INVENTORY_QUERY }],
  });
  return { createItem: mutate, loading };
}

export function useMembers() {
  const { data, loading, error, refetch } = useQuery(MEMBERS_QUERY);
  return { data: data?.members ?? [], loading, error, refetch };
}

export function useTasks(status?: string) {
  const { data, loading, error, refetch } = useQuery(TASKS_QUERY, { variables: { status } });
  return { tasks: data?.tasks ?? [], myTasks: data?.myTasks ?? [], loading, error, refetch };
}

export function useCommodityPrices() {
  const { data, loading, error, refetch } = useQuery(COMMODITY_PRICES_QUERY);
  return {
    prices: data?.commodityPrices ?? [],
    latestPrices: data?.latestPrices ?? [],
    loading, error, refetch,
  };
}

export function useMarketListings() {
  const { data, loading, error, refetch } = useQuery(MARKET_LISTINGS_QUERY);
  return {
    listings: data?.marketListings ?? [],
    myListings: data?.myListings ?? [],
    loading, error, refetch,
  };
}

export function useVisionAnalyses(enterpriseId?: string) {
  const { data, loading, error, refetch } = useQuery(VISION_ANALYSES_QUERY, {
    variables: { enterpriseId, limit: 20 },
  });
  return { data: data?.visionAnalyses ?? [], loading, error, refetch };
}

export function useCommunityReports(limit = 30) {
  const { data, loading, error, refetch } = useQuery(COMMUNITY_REPORTS_QUERY, {
    variables: { limit },
  });
  return { data: data?.communityReports ?? [], loading, error, refetch };
}

export function useRecommendations(enterpriseId?: string) {
  const { data, loading, error, refetch } = useQuery(RECOMMENDATIONS_QUERY, {
    variables: { enterpriseId, limit: 20 },
  });
  return {
    data: data?.recommendations ?? [],
    summary: data?.intelligenceSummary ?? null,
    loading, error, refetch,
  };
}

export function useBatchFinancials(enterpriseId?: string) {
  const { data, loading, error, refetch } = useQuery(BATCH_FINANCIALS_QUERY, {
    variables: { enterpriseId },
  });
  return { data: data?.batches ?? [], loading, error, refetch };
}

// Legacy compat exports for screens that haven't been updated yet
export const recordDailyLog = async (_log: any) => {
  console.warn('recordDailyLog: use useCreateProductionRecord hook instead');
};
