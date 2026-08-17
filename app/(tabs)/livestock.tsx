import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useBatches, getPiggeryRecommendation, formatK } from '../lib/data';
import { NewBatchModal } from '../components/Modals';
import { useMutation } from '@apollo/client';
import { CREATE_PRODUCTION_RECORD_MUTATION } from '../lib/gql';

type EntKey = 'PIGGERY' | 'FISH' | 'LIVESTOCK' | 'DAIRY';

const ENT_TABS: { key: EntKey; label: string; icon: string; color: string }[] = [
  { key: 'PIGGERY',   label: 'Piggery',   icon: 'paw',      color: '#DC2626' },
  { key: 'LIVESTOCK', label: 'Cattle',    icon: 'leaf',     color: '#16A34A' },
  { key: 'FISH',      label: 'Fish',      icon: 'fish',     color: '#0EA5E9' },
  { key: 'DAIRY',     label: 'Dairy',     icon: 'water',    color: '#7C3AED' },
];

export default function Livestock() {
  const [active, setActive] = useState<EntKey>('PIGGERY');
  const { data: allBatches, loading, refetch } = useBatches();
  const [showNewBatch, setShowNewBatch] = useState(false);

  const [createRecord] = useMutation(CREATE_PRODUCTION_RECORD_MUTATION, {
    onError: e => Alert.alert('Error', e.message),
  });

  const list = allBatches.filter((b: any) => b.enterprise?.enterpriseType === active);
  const totalAnimals = list.reduce((s: number, b: any) => s + (b.currentCount ?? 0), 0);
  const totalCost = list.reduce((s: number, b: any) => s + (b.totalCosts ?? 0), 0);
  const totalProj = list.reduce((s: number, b: any) => s + (b.projectedRevenue ?? 0), 0);
  const totalMortality = list.reduce((s: number, b: any) => s + (b.mortalityCount ?? 0), 0);

  const activeTab = ENT_TABS.find(e => e.key === active)!;

  const logHealth = async (b: any) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await createRecord({
        variables: {
          enterpriseId: b.enterprise?.id,
          batchId: b.id,
          recordType: 'health_check',
          recordDate: today,
          quantity: 0,
          unit: 'heads',
          notes: 'Health check recorded from mobile app',
        },
      });
      Alert.alert('Logged', 'Health check recorded.');
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Livestock Management" subtitle="Piggery · Cattle · Fish · Dairy" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        {/* Enterprise switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {ENT_TABS.map(e => (
            <Pressable
              key={e.key}
              onPress={() => setActive(e.key)}
              style={[styles.chip, active === e.key && { backgroundColor: e.color }]}
            >
              <Ionicons name={e.icon as any} size={15} color={active === e.key ? '#fff' : e.color} />
              <Text style={[styles.chipTxt, active === e.key && { color: '#fff' }]}>{e.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading && list.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="layers" label="Batches" value={list.length.toString()} color={activeTab.color} />
          <KpiCard icon="people" label="Animals" value={totalAnimals.toLocaleString()} color={theme.colors.accent} />
          <KpiCard icon="cash" label="Total Cost" value={`K${formatK(totalCost)}`} color={theme.colors.primary} />
          <KpiCard icon="trending-up" label="Proj. Revenue" value={`K${formatK(totalProj)}`} color={theme.colors.success} />
        </View>

        {/* Action bar */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Batch" icon="add-circle" onPress={() => setShowNewBatch(true)} style={{ flex: 1 }} />
          <GhostButton label="Deworm" icon="medkit" onPress={() => Alert.alert('Deworming', 'Record a deworming event for the selected batch.')} />
        </View>

        <SectionTitle title={`${activeTab.label} Batches`} />

        {list.length === 0 && !loading && (
          <Card>
            <Text style={styles.empty}>No {activeTab.label.toLowerCase()} batches. Tap "New Batch" to add one.</Text>
            <PrimaryButton label="New Batch" icon="add-circle" onPress={() => setShowNewBatch(true)} style={{ marginTop: 12 }} />
          </Card>
        )}

        {list.map((b: any) => {
          const recText = (active === 'PIGGERY')
            ? getPiggeryRecommendation(b.ageInDays ?? 0, b.avgWeightKg ?? 0)
            : `Day ${b.ageInDays ?? 0} · Current weight: ${b.avgWeightKg ?? 0} kg`;
          const morPct = b.initialCount > 0
            ? ((b.mortalityCount / b.initialCount) * 100).toFixed(2)
            : '0.00';

          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>{b.name}</Text>
                  <Text style={styles.batchSub}>Day {b.ageInDays ?? 0} · {b.enterprise?.name ?? '—'}</Text>
                </View>
                <Badge label={b.status ?? 'active'} color={theme.colors.success} />
              </View>

              <View style={styles.statsRow}>
                <Stat label="Animals" value={(b.currentCount ?? 0).toLocaleString()} />
                <Stat label="Mortality" value={`${morPct}%`} color={parseFloat(morPct) > 5 ? theme.colors.danger : theme.colors.success} />
                <Stat label="Avg Wt" value={`${b.avgWeightKg ?? 0} kg`} />
                <Stat label="Proj. Profit" value={`K${formatK((b.projectedRevenue ?? 0) - (b.totalCosts ?? 0))}`} />
              </View>

              {b.targetWeightKg > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.smallLabel}>Growth to target ({b.targetWeightKg} kg)</Text>
                    <Text style={styles.smallLabel}>{Math.min(100, ((b.avgWeightKg ?? 0) / b.targetWeightKg * 100)).toFixed(0)}%</Text>
                  </View>
                  <ProgressBar value={b.avgWeightKg ?? 0} max={b.targetWeightKg} color={activeTab.color} />
                </View>
              )}

              <View style={styles.recBox}>
                <Ionicons name="bulb" size={14} color={theme.colors.accent} style={{ marginTop: 2 }} />
                <Text style={styles.recText}>{recText}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <PrimaryButton label="Health Check" icon="pulse" onPress={() => logHealth(b)} style={{ flex: 1 }} />
                <GhostButton
                  label="Details"
                  icon="eye"
                  onPress={() => Alert.alert(
                    b.name,
                    `Cost: K${formatK(b.totalCosts ?? 0)}\nProjected: K${formatK(b.projectedRevenue ?? 0)}\nFeed: ${b.feedConsumedKg ?? 0} kg\nStarted: ${b.startDate ?? '—'}`
                  )}
                />
              </View>
            </Card>
          );
        })}

        {/* Feeding schedule reference */}
        {(active === 'PIGGERY') && (
          <Card style={{ marginTop: 8 }}>
            <SectionTitle title="Pig Feeding Reference" />
            {[
              { stage: 'Suckling (0–4 wks)', feed: 'Creep feed', rate: '50–100g/day' },
              { stage: 'Weaner (4–8 wks)', feed: 'Starter', rate: '200–500g/day' },
              { stage: 'Grower (8–16 wks)', feed: 'Grower meal', rate: '0.5–1.5 kg/day' },
              { stage: 'Finisher (16–20 wks)', feed: 'Finisher', rate: '2.5–3 kg/day' },
            ].map((s, i) => (
              <View key={i} style={styles.feedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedStage}>{s.stage}</Text>
                  <Text style={styles.feedType}>{s.feed}</Text>
                </View>
                <Text style={styles.feedRate}>{s.rate}</Text>
              </View>
            ))}
          </Card>
        )}

        {active === 'FISH' && (
          <Card style={{ marginTop: 8 }}>
            <SectionTitle title="Fish Feeding Reference" />
            {[
              { stage: 'Fingerling (< 5g)', rate: '10–15% body weight / day' },
              { stage: 'Juvenile (5–50g)', rate: '5–8% body weight / day' },
              { stage: 'Sub-adult (50–200g)', rate: '3–5% body weight / day' },
              { stage: 'Adult (> 200g)', rate: '2–3% body weight / day' },
            ].map((s, i) => (
              <View key={i} style={styles.feedRow}>
                <Text style={{ flex: 1, ...styles.feedStage }}>{s.stage}</Text>
                <Text style={styles.feedRate}>{s.rate}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <NewBatchModal visible={showNewBatch} onClose={() => setShowNewBatch(false)} onSuccess={refetch} />
    </View>
  );
}

function Stat({ label, value, color = theme.colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff',
  },
  chipTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 20 },
  batchTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  batchSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, padding: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '800' },
  smallLabel: { fontSize: 11, color: theme.colors.textMuted },
  recBox: { flexDirection: 'row', gap: 8, marginTop: 10, backgroundColor: theme.colors.primary + '08', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary + '20' },
  recText: { flex: 1, fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  feedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  feedStage: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  feedType: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  feedRate: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
});
