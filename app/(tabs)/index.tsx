import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, BarChart, HBar, ProgressBar } from '../components/UI';
import { useDashboard, useEnterprises, useBatches, formatK, calcFCR } from '../lib/data';
import { useAuth } from '../lib/auth';
import { router } from 'expo-router';
import { NewBatchModal, LivestockLogModal, NewSaleModal, IssueFeedModal } from '../components/Modals';

const ENTERPRISE_ICONS: Record<string, { icon: string; color: string }> = {
  POULTRY:    { icon: 'restaurant', color: '#F59E0B' },
  LIVESTOCK:  { icon: 'paw',        color: '#8B5CF6' },
  PIGGERY:    { icon: 'paw',        color: '#EC4899' },
  FISH:       { icon: 'fish',       color: '#06B6D4' },
  CROP:       { icon: 'leaf',       color: '#10B981' },
  DAIRY:      { icon: 'water',      color: '#3B82F6' },
  OTHER:      { icon: 'grid',       color: '#6B7280' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showSale, setShowSale] = useState(false);
  const [showIssueFeed, setShowIssueFeed] = useState(false);

  const { summary, alerts, trend, loading: dLoading, refetch: refetchDash } = useDashboard();
  const { data: enterprises, loading: eLoading, refetch: refetchEnt } = useEnterprises();
  const { data: batches, refetch: refetchBatches } = useBatches();

  const loading = dLoading || eLoading;
  const refresh = () => { refetchDash(); refetchEnt(); refetchBatches(); };

  const activeBatchCount = summary?.activeBatches ?? 0;
  const totalAnimals = summary?.totalAnimals ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const totalCosts = summary?.totalCosts ?? 0;
  const grossProfit = summary?.grossProfit ?? 0;
  const mortalityRate = summary?.mortalityRate ?? 0;
  const avgFcr = summary?.avgFcr ?? 0;
  const inventoryAlerts = summary?.inventoryAlerts ?? 0;
  const pendingTasks = summary?.pendingTasks ?? 0;

  const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  return (
    <View style={styles.container}>
      <AppHeader title="AgroNexus Farm" subtitle={user?.organization?.name ?? 'Farm Management'} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        {loading && !summary && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={{ marginTop: 12, color: theme.colors.textMuted }}>Loading farm data…</Text>
          </View>
        )}

        {/* Welcome banner */}
        <View style={styles.welcome}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeHi}>Welcome, {user?.fullName?.split(' ')[0] ?? 'Farmer'} 👋</Text>
            <Text style={styles.welcomeMsg}>
              {activeBatchCount} batch{activeBatchCount !== 1 ? 'es' : ''} in production · {totalAnimals.toLocaleString()} animals on farm
            </Text>
          </View>
          <View style={styles.welcomeBadge}>
            <Ionicons name="sunny" size={22} color={theme.colors.accent} />
            <Text style={styles.welcomeRole}>{user?.role?.toUpperCase() ?? 'FARMER'}</Text>
          </View>
        </View>

        {/* Period toggle */}
        <View style={styles.periodRow}>
          {(['today', 'week', 'month'] as const).map(p => (
            <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.periodBtn, period === p && styles.periodBtnActive]}>
              <Text style={[styles.periodTxt, period === p && styles.periodTxtActive]}>{p.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {/* KPI grid */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="cash" label="Revenue" value={`K${formatK(totalRevenue)}`} sub={`${margin}% margin`} trend={12} color={theme.colors.success} />
          <KpiCard icon="trending-up" label="Net Profit" value={`K${formatK(grossProfit)}`} sub="vs last period" trend={8} color={theme.colors.primary} />
          <KpiCard icon="paw" label="Animals" value={totalAnimals.toLocaleString()} sub={`${activeBatchCount} active batches`} color={theme.colors.accent} />
          <KpiCard icon="alert-circle" label="Mortality" value={`${mortalityRate.toFixed(2)}%`} sub="target ≤ 5%" trend={mortalityRate > 5 ? -5 : 3} color={theme.colors.danger} />
          <KpiCard icon="cube" label="Stock Alerts" value={inventoryAlerts.toString()} sub="low-stock items" color={theme.colors.info} />
          <KpiCard icon="speedometer" label="Avg FCR" value={avgFcr > 0 ? avgFcr.toFixed(2) : '—'} sub="broilers · target 1.7" color={theme.colors.chartPurple} />
        </View>

        {/* Enterprise tiles */}
        <SectionTitle title="Enterprises" action="Manage all" />
        <View style={styles.entGrid}>
          {enterprises.map(e => {
            const meta = ENTERPRISE_ICONS[e.enterpriseType] ?? ENTERPRISE_ICONS.OTHER;
            const total = e.activeBatches?.reduce((s: number, b: any) => s + (b.currentCount ?? 0), 0) ?? 0;
            return (
              <Pressable
                key={e.id}
                onPress={() => {
                  const t = e.enterpriseType;
                  if (t === 'POULTRY') router.push('/(tabs)/poultry');
                  else if (t === 'LIVESTOCK' || t === 'PIGGERY' || t === 'DAIRY') router.push('/(tabs)/livestock');
                  else router.push('/(tabs)/more');
                }}
                style={[styles.entCard, shadow]}
              >
                <View style={[styles.entIcon, { backgroundColor: meta.color + '20' }]}>
                  <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                </View>
                <Text style={styles.entLabel}>{e.name}</Text>
                <Text style={styles.entCount}>{total > 0 ? total.toLocaleString() : '—'}</Text>
                <Text style={styles.entSub}>{total > 0 ? 'animals' : 'enterprise'}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Revenue trend chart */}
        {trend.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <SectionTitle title="Revenue Trend" />
            <BarChart
              data={trend.map((t: any) => ({
                label: t.label,
                value: (t.revenue ?? 0) / 1000,
                color: theme.colors.primary,
              }))}
              height={120}
            />
          </Card>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <Card style={{ marginTop: 16 }}>
            <SectionTitle title="Active Alerts" action="View all" />
            {alerts.slice(0, 5).map((a: any) => (
              <View key={a.id} style={styles.alertRow}>
                <View style={[styles.alertDot, { backgroundColor:
                  a.severity === 'critical' ? theme.colors.danger :
                  a.severity === 'warning'  ? theme.colors.warning : theme.colors.info }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertMsg}>{a.message ?? a.title}</Text>
                  <Text style={styles.alertTime}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Quick actions */}
        <SectionTitle title="Quick Actions" />
        <View style={styles.qaGrid}>
          {([
            { icon: 'add-circle',    label: 'New Batch',   color: theme.colors.primary,      onPress: () => setShowNewBatch(true) },
            { icon: 'document-text', label: 'Daily Log',   color: theme.colors.accent,       onPress: () => setShowDailyLog(true) },
            { icon: 'pulse',         label: 'Vet Visit',   color: theme.colors.danger,       onPress: () => router.push('/(tabs)/livestock') },
            { icon: 'cart',          label: 'Market',      color: theme.colors.success,      onPress: () => router.push('/(tabs)/market') },
            { icon: 'eye',           label: 'AI Scan',     color: theme.colors.info,         onPress: () => router.push('/(tabs)/ai') },
            { icon: 'people',        label: 'Community',   color: theme.colors.chartPurple,  onPress: () => router.push('/(tabs)/community') },
          ] as const).map(q => (
            <Pressable key={q.label} onPress={q.onPress} style={[styles.qa, shadow]}>
              <Ionicons name={q.icon as any} size={20} color={q.color} />
              <Text style={styles.qaLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Tasks pill */}
        {pendingTasks > 0 && (
          <Pressable onPress={() => router.push('/(tabs)/more')} style={styles.taskPill}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.taskPillTxt}>{pendingTasks} pending task{pendingTasks !== 1 ? 's' : ''} — tap to view</Text>
          </Pressable>
        )}

        <NewBatchModal visible={showNewBatch} onClose={() => setShowNewBatch(false)} onSuccess={refresh} />
        <LivestockLogModal
          visible={showDailyLog}
          onClose={() => setShowDailyLog(false)}
          onSuccess={refresh}
          batch={batches[0] ?? null}
        />
        <NewSaleModal visible={showSale} onClose={() => setShowSale(false)} onSuccess={() => {}} />
        <IssueFeedModal visible={showIssueFeed} onClose={() => setShowIssueFeed(false)} onSuccess={() => {}} />

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  welcome: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  welcomeHi: { color: '#fff', fontWeight: '800', fontSize: 17 },
  welcomeMsg: { color: '#D4E5C9', marginTop: 4, fontSize: 12 },
  welcomeBadge: { alignItems: 'center', backgroundColor: theme.colors.primaryDark, padding: 10, borderRadius: 12 },
  welcomeRole: { color: theme.colors.accent, fontWeight: '800', marginTop: 2, fontSize: 10 },
  periodRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: theme.colors.primary },
  periodTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5 },
  periodTxtActive: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  entGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  entCard: {
    backgroundColor: theme.colors.surface, borderRadius: 14, padding: 14,
    width: '31%', minWidth: 100, flexGrow: 1,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  entIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  entLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  entCount: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  entSub: { fontSize: 10, color: theme.colors.textSubtle },
  alertRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  alertTime: { fontSize: 10, color: theme.colors.textSubtle },
  alertMsg: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  qa: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    gap: 8, padding: 12, borderRadius: 10, width: '48%',
    borderWidth: 1, borderColor: theme.colors.border, flexGrow: 1,
  },
  qaLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  taskPill: {
    marginTop: 16, backgroundColor: theme.colors.primary,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center',
    gap: 8, padding: 14,
  },
  taskPillTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
