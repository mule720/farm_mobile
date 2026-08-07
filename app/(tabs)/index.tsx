import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, BarChart, HBar, ProgressBar } from '../components/UI';
import { enterprises, alerts, monthlyFinancials, enterpriseProfit, useBatches, formatK, calcFCR } from '../lib/data';
import { router } from 'expo-router';

export default function Dashboard() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const { data: batches, loading, refresh } = useBatches();

  const totalRevenue = monthlyFinancials.reduce((s, m) => s + m.revenue, 0);
  const totalCosts = monthlyFinancials.reduce((s, m) => s + m.costs, 0);
  const totalProfit = totalRevenue - totalCosts;

  // === REAL aggregates from the live batches table ===
  const activeBatches = batches.filter(b => b.status === 'Active').length;
  const totalAnimals = batches.reduce((s, b) => s + b.currentCount, 0);
  const totalMortality = batches.reduce((s, b) => s + b.mortality, 0);
  const totalInitial = batches.reduce((s, b) => s + b.initialCount, 0);
  const mortalityRate = totalInitial > 0 ? ((totalMortality / totalInitial) * 100).toFixed(2) : '0.00';

  // FCR for broiler batches only (most meaningful)
  const broilers = batches.filter(b => b.enterprise === 'Broilers');
  const broilerFeed = broilers.reduce((s, b) => s + b.feedConsumedKg, 0);
  const broilerGain = broilers.reduce((s, b) => s + (b.avgWeightKg - 0.04) * b.currentCount, 0);
  const avgFcr = broilerGain > 0 ? calcFCR(broilerFeed, broilerGain).toFixed(2) : '—';

  return (
    <View style={styles.container}>
      <AppHeader title="Afrivera Operations" subtitle="Investments Limited · Lusaka" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >

        {/* Welcome banner */}
        <View style={styles.welcome}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeHi}>Good afternoon, James</Text>
            <Text style={styles.welcomeMsg}>{activeBatches} batches in production · {totalAnimals.toLocaleString()} animals on farm</Text>

          </View>
          <View style={styles.welcomeBadge}>
            <Ionicons name="sunny" size={22} color={theme.colors.accent} />
            <Text style={styles.welcomeTemp}>26°C</Text>
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
          <KpiCard icon="cash" label="Revenue (YTD)" value={formatK(totalRevenue)} sub="vs last year" trend={18} color={theme.colors.success} />
          <KpiCard icon="trending-up" label="Net Profit" value={formatK(totalProfit)} sub={`${((totalProfit/totalRevenue)*100).toFixed(1)}% margin`} trend={12} color={theme.colors.primary} />
          <KpiCard icon="paw" label="Total Livestock" value={totalAnimals.toLocaleString()} sub="across 7 enterprises" color={theme.colors.accent} />
          <KpiCard icon="alert-circle" label="Mortality Rate" value={`${mortalityRate}%`} sub="target ≤ 5%" trend={-3} color={theme.colors.danger} />
          <KpiCard icon="layers" label="Active Batches" value={activeBatches.toString()} sub="6 enterprises" color={theme.colors.info} />
          <KpiCard icon="speedometer" label="Avg FCR" value={avgFcr} sub="broilers · target 1.7" trend={2} color={theme.colors.chartPurple} />

        </View>

        {/* Enterprise tiles */}
        <SectionTitle title="Enterprises" action="Manage all" />
        <View style={styles.entGrid}>
          {enterprises.map(e => (
            <Pressable
              key={e.key}
              onPress={() => {
                if (e.key === 'broilers' || e.key === 'village') router.push('/(tabs)/poultry');
                else router.push('/(tabs)/livestock');
              }}
              style={[styles.entCard, shadow]}
            >
              <View style={[styles.entIcon, { backgroundColor: e.color + '20' }]}>
                <Ionicons name={e.icon as any} size={22} color={e.color} />
              </View>
              <Text style={styles.entLabel}>{e.label}</Text>
              <Text style={styles.entCount}>{e.count > 0 ? e.count.toLocaleString() : (e.area || '—')}</Text>
              <Text style={styles.entSub}>{e.count > 0 ? 'animals' : 'cropland'}</Text>
            </Pressable>
          ))}
        </View>

        {/* Revenue chart */}
        <Card style={{ marginTop: 16 }}>
          <SectionTitle title="Revenue & Profit Trend (2026)" />
          <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
            <LegendDot color={theme.colors.primary} label="Revenue" />
            <LegendDot color={theme.colors.accent} label="Costs" />
            <LegendDot color={theme.colors.success} label="Profit" />
          </View>
          <BarChart
            data={monthlyFinancials.flatMap(m => ([
              { label: m.month, value: m.revenue / 1000, color: theme.colors.primary },
            ]))}
            height={140}
          />
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
            {monthlyFinancials.map(m => (
              <View key={m.month} style={styles.monthRow}>
                <Text style={styles.monthLbl}>{m.month}</Text>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={m.profit} max={150000} color={theme.colors.success} />
                </View>
                <Text style={styles.monthVal}>{formatK(m.profit)}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Enterprise profitability */}
        <Card style={{ marginTop: 16 }}>
          <SectionTitle title="Enterprise Profitability (April)" />
          {enterpriseProfit.map(e => (
            <HBar
              key={e.name}
              label={e.name}
              value={e.profit}
              max={70000}
              color={e.color}
              valueLabel={formatK(e.profit)}
            />
          ))}
        </Card>

        {/* Alerts */}
        <Card style={{ marginTop: 16 }}>
          <SectionTitle title="Active Alerts" action="View all" />
          {alerts.slice(0, 4).map(a => (
            <View key={a.id} style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor:
                a.severity === 'critical' ? theme.colors.danger :
                a.severity === 'warning' ? theme.colors.warning : theme.colors.info }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Badge label={a.module} color={theme.colors.primary} />
                  <Text style={styles.alertTime}>{a.time}</Text>
                </View>
                <Text style={styles.alertMsg}>{a.message}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Quick actions */}
        <SectionTitle title="Quick Actions" />
        <View style={styles.qaGrid}>
          {[
            { icon: 'add-circle', label: 'New Batch', color: theme.colors.primary },
            { icon: 'document-text', label: 'Daily Log', color: theme.colors.accent },
            { icon: 'pulse', label: 'Vet Visit', color: theme.colors.danger },
            { icon: 'cart', label: 'Record Sale', color: theme.colors.success },
            { icon: 'cube', label: 'Issue Feed', color: theme.colors.info },
            { icon: 'people', label: 'Assign Task', color: theme.colors.chartPurple },
          ].map(q => (
            <Pressable key={q.label} style={[styles.qa, shadow]}>
              <Ionicons name={q.icon as any} size={20} color={q.color} />
              <Text style={styles.qaLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ fontSize: 12, color: theme.colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  welcome: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  welcomeHi: { color: '#fff', fontWeight: '800', fontSize: 17 },
  welcomeMsg: { color: '#D4E5C9', marginTop: 4, fontSize: 12 },
  welcomeBadge: { alignItems: 'center', backgroundColor: theme.colors.primaryDark, padding: 10, borderRadius: 12 },
  welcomeTemp: { color: theme.colors.accent, fontWeight: '800', marginTop: 2 },
  periodRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: 10, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  periodBtnActive: { backgroundColor: theme.colors.primary },
  periodTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5 },
  periodTxtActive: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  entGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  entCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  entIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  entLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  entCount: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  entSub: { fontSize: 10, color: theme.colors.textSubtle },
  monthRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5, gap: 10 },
  monthLbl: { width: 36, fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  monthVal: { width: 60, textAlign: 'right', fontSize: 12, color: theme.colors.text, fontWeight: '700' },
  alertRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  alertTime: { fontSize: 10, color: theme.colors.textSubtle },
  alertMsg: { fontSize: 13, color: theme.colors.text, marginTop: 4, lineHeight: 18 },
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  qa: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, width: '48%', borderWidth: 1, borderColor: theme.colors.border, flexGrow: 1 },
  qaLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
});
