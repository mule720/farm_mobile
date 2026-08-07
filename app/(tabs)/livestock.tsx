import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useBatches, getPiggeryRecommendation, formatK } from '../lib/data';

const enterprises = [
  { key: 'Piggery', icon: 'paw', color: '#DC2626' },
  { key: 'Fish', icon: 'fish', color: '#0EA5E9' },
  { key: 'Ducks', icon: 'water', color: '#7C3AED' },
  { key: 'Goats', icon: 'leaf', color: '#16A34A' },
] as const;

export default function Livestock() {
  const [active, setActive] = useState<typeof enterprises[number]['key']>('Piggery');
  const { data: batches, loading, refresh } = useBatches();
  const list = batches.filter(b => b.enterprise === active);

  const totalAnimals = list.reduce((s, b) => s + b.currentCount, 0);
  const totalCost = list.reduce((s, b) => s + b.costToDate, 0);
  const totalProj = list.reduce((s, b) => s + b.projectedRevenue, 0);

  return (
    <View style={styles.container}>
      <AppHeader title="Livestock Management" subtitle="Piggery · Fish · Ducks · Goats" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >

        {/* Enterprise switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {enterprises.map(e => (
            <Pressable
              key={e.key}
              onPress={() => setActive(e.key)}
              style={[styles.chip, active === e.key && { backgroundColor: e.color }]}
            >
              <Ionicons name={e.icon as any} size={15} color={active === e.key ? '#fff' : e.color} />
              <Text style={[styles.chipTxt, active === e.key && { color: '#fff' }]}>{e.key}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="layers" label="Active Batches" value={list.length.toString()} color={theme.colors.primary} />
          <KpiCard icon="paw" label="Total Animals" value={totalAnimals.toLocaleString()} color={theme.colors.accent} />
          <KpiCard icon="cash" label="Cost to Date" value={formatK(totalCost)} color={theme.colors.danger} />
          <KpiCard icon="trending-up" label="Projected Revenue" value={formatK(totalProj)} color={theme.colors.success} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Batch" icon="add-circle" onPress={() => Alert.alert('New Batch', `Create new ${active} batch.`)} style={{ flex: 1 }} />
          <GhostButton label="Health Log" icon="medkit" onPress={() => Alert.alert('Health Log', 'Record health observations.')} />
        </View>

        {/* Module-specific extras */}
        {active === 'Piggery' && <PiggeryExtras />}
        {active === 'Fish' && <FishExtras />}
        {active === 'Ducks' && <DuckExtras />}
        {active === 'Goats' && <GoatExtras />}

        <SectionTitle title={`${active} Batches`} />

        {list.length === 0 && (
          <Card>
            <Text style={{ textAlign: 'center', color: theme.colors.textMuted, padding: 20 }}>No active batches in {active}.</Text>
          </Card>
        )}

        {list.map(b => {
          const morPct = ((b.mortality / b.initialCount) * 100).toFixed(2);
          const growthPct = (b.avgWeightKg / b.targetWeightKg) * 100;
          const rec = active === 'Piggery' ? getPiggeryRecommendation(b.avgWeightKg) : null;
          const dailyFeed = rec ? (rec.kgPerDay * b.currentCount).toFixed(1) : null;
          const dailyWater = rec ? (rec.waterLPerDay * b.currentCount).toFixed(0) : null;

          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={styles.batchHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>{b.name}</Text>
                  <Text style={styles.batchSub}>{b.id} · {b.house} · Day {b.ageDays}</Text>
                </View>
                <Badge label={b.status} color={theme.colors.success} />
              </View>

              <View style={styles.statsRow}>
                <Stat label="Animals" value={b.currentCount.toString()} />
                <Stat label="Mortality" value={`${morPct}%`} color={parseFloat(morPct) > 5 ? theme.colors.danger : theme.colors.success} />
                <Stat label="Avg Wt" value={`${b.avgWeightKg} kg`} />
                <Stat label="Cost" value={formatK(b.costToDate)} />
              </View>

              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.smallLabel}>Growth to target</Text>
                  <Text style={styles.smallValue}>{growthPct.toFixed(0)}% ({b.targetWeightKg} kg)</Text>
                </View>
                <ProgressBar value={b.avgWeightKg} max={b.targetWeightKg} color={theme.colors.primary} />
              </View>

              {rec && (
                <View style={styles.recBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="bulb" size={14} color={theme.colors.accent} />
                    <Text style={styles.recTitle}>{rec.stage}</Text>
                  </View>
                  <View style={styles.recRow}>
                    <RecCell label="Feed" value={rec.feedType} />
                    <RecCell label="Per pig" value={`${rec.kgPerDay} kg`} />
                    <RecCell label="Daily" value={`${dailyFeed} kg`} highlight />
                    <RecCell label="Water" value={`${dailyWater} L`} highlight />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <PrimaryButton label="Log Data" icon="document-text" onPress={() => Alert.alert('Log Daily Data', `Recording for ${b.name}`)} style={{ flex: 1 }} />
                <GhostButton label="Details" icon="eye" onPress={() => Alert.alert(b.name, `Cost: ${formatK(b.costToDate)}\nProjected revenue: ${formatK(b.projectedRevenue)}\nProjected profit: ${formatK(b.projectedRevenue - b.costToDate)}`)} />
              </View>
            </Card>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function PiggeryExtras() {
  return (
    <Card style={{ marginBottom: 12 }}>
      <SectionTitle title="Sow & Breeding Records" />
      {[
        { id: 'SOW-01', name: 'Sow #1 (Large White)', status: 'Lactating', piglets: 11, day: 18 },
        { id: 'SOW-02', name: 'Sow #2 (Landrace)', status: 'Pregnant', piglets: 0, day: 92 },
        { id: 'SOW-03', name: 'Sow #3 (Duroc)', status: 'Weaned', piglets: 9, day: 32 },
      ].map(s => (
        <View key={s.id} style={styles.sowRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sowName}>{s.name}</Text>
            <Text style={styles.sowSub}>{s.id} · {s.piglets > 0 ? `${s.piglets} piglets · day ${s.day}` : `Gestation day ${s.day}`}</Text>
          </View>
          <Badge label={s.status} color={s.status === 'Lactating' ? theme.colors.success : s.status === 'Pregnant' ? theme.colors.info : theme.colors.warning} />
        </View>
      ))}
      <View style={styles.compostBox}>
        <Ionicons name="leaf" size={18} color={theme.colors.success} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.compostTitle}>Compost Generated This Month</Text>
          <Text style={styles.compostValue}>2,840 kg → transferred to Horticulture</Text>
        </View>
      </View>
    </Card>
  );
}

function FishExtras() {
  return (
    <Card style={{ marginBottom: 12 }}>
      <SectionTitle title="Pond Water Quality" />
      {[
        { pond: 'Pond A', oxygen: 6.8, ph: 8.4, temp: 24.5, alert: true },
        { pond: 'Pond B', oxygen: 7.2, ph: 7.8, temp: 25.1, alert: false },
        { pond: 'Pond C', oxygen: 7.5, ph: 7.6, temp: 24.8, alert: false },
      ].map(p => (
        <View key={p.pond} style={styles.pondRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sowName}>{p.pond}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Text style={styles.pondMetric}>O₂ {p.oxygen} mg/L</Text>
              <Text style={[styles.pondMetric, p.alert && { color: theme.colors.danger, fontWeight: '700' }]}>pH {p.ph}</Text>
              <Text style={styles.pondMetric}>{p.temp}°C</Text>
            </View>
          </View>
          {p.alert ? <Badge label="Alert" color={theme.colors.danger} /> : <Badge label="Optimal" color={theme.colors.success} />}
        </View>
      ))}
    </Card>
  );
}

function DuckExtras() {
  return (
    <Card style={{ marginBottom: 12 }}>
      <SectionTitle title="Egg Production (Last 7 Days)" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 }}>
        {[182, 195, 188, 201, 215, 198, 224].map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '60%', height: (v / 230) * 70, backgroundColor: theme.colors.chartPurple, borderRadius: 4 }} />
            <Text style={{ fontSize: 10, color: theme.colors.textMuted, marginTop: 4 }}>{['M','T','W','T','F','S','S'][i]}</Text>
          </View>
        ))}
      </View>
      <Text style={{ textAlign: 'center', fontSize: 12, color: theme.colors.textMuted, marginTop: 6 }}>Avg 200 eggs/day · 89% hatch rate</Text>
    </Card>
  );
}

function GoatExtras() {
  return (
    <Card style={{ marginBottom: 12 }}>
      <SectionTitle title="Tagged Animals" />
      {[
        { tag: 'GT-001', breed: 'Boer', age: '14m', weight: '32kg', status: 'Pregnant' },
        { tag: 'GT-002', breed: 'Kalahari', age: '11m', weight: '28kg', status: 'Healthy' },
        { tag: 'GT-003', breed: 'Boer', age: '8m', weight: '24kg', status: 'Healthy' },
        { tag: 'GT-004', breed: 'Saanen', age: '20m', weight: '38kg', status: 'Lactating' },
      ].map(g => (
        <View key={g.tag} style={styles.sowRow}>
          <View style={{ width: 60 }}>
            <Text style={{ fontWeight: '800', color: theme.colors.primary }}>{g.tag}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sowName}>{g.breed}</Text>
            <Text style={styles.sowSub}>{g.age} · {g.weight}</Text>
          </View>
          <Badge label={g.status} color={g.status === 'Pregnant' ? theme.colors.info : g.status === 'Lactating' ? theme.colors.success : theme.colors.primary} />
        </View>
      ))}
    </Card>
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

function RecCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.recCell, highlight && { backgroundColor: theme.colors.accent + '20' }]}>
      <Text style={styles.recLabel}>{label}</Text>
      <Text style={[styles.recValue, highlight && { color: theme.colors.primaryDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  chipTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  batchHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  batchTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  batchSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, padding: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800' },
  smallLabel: { fontSize: 11, color: theme.colors.textMuted },
  smallValue: { fontSize: 11, color: theme.colors.text, fontWeight: '600' },
  recBox: { backgroundColor: theme.colors.primary + '08', borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: theme.colors.primary + '20' },
  recTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.primaryDark, marginLeft: 6 },
  recRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recCell: { flexBasis: '23%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: theme.colors.border },
  recLabel: { fontSize: 10, color: theme.colors.textMuted },
  recValue: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  sowRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  pondRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  pondMetric: { fontSize: 11, color: theme.colors.textMuted },
  sowName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sowSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  compostBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.success + '10', padding: 10, borderRadius: 10, marginTop: 10 },
  compostTitle: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  compostValue: { fontSize: 14, fontWeight: '800', color: theme.colors.success },
});
