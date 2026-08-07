import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useBatches, getBroilerRecommendation, calcFCR, formatK, recordDailyLog, Batch } from '../lib/data';

type Tab = 'broilers' | 'village';

export default function Poultry() {
  const [tab, setTab] = useState<Tab>('broilers');
  const [showLog, setShowLog] = useState(false);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [mortality, setMortality] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [waterL, setWaterL] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: batches, loading, refresh } = useBatches();

  const list = batches.filter(b => b.enterprise === (tab === 'broilers' ? 'Broilers' : 'Village Chicken'));
  const totalBirds = list.reduce((s, b) => s + b.currentCount, 0);
  const totalMortality = list.reduce((s, b) => s + b.mortality, 0);
  const totalInitial = list.reduce((s, b) => s + b.initialCount, 0);
  const mortalityPct = totalInitial > 0 ? ((totalMortality / totalInitial) * 100).toFixed(2) : '0';
  const totalFeed = list.reduce((s, b) => s + b.feedConsumedKg, 0);
  const totalWeight = list.reduce((s, b) => s + b.avgWeightKg * b.currentCount, 0);
  const fcr = calcFCR(totalFeed, totalWeight - list.reduce((s, b) => s + 0.04 * b.initialCount, 0));

  const submitLog = async () => {
    if (!selected) return;
    const m = parseInt(mortality || '0', 10) || 0;
    const f = parseFloat(feedKg || '0') || 0;
    const w = parseFloat(waterL || '0') || 0;
    const wt = parseFloat(weight || '0') || 0;

    if (m === 0 && f === 0 && w === 0 && wt === 0) {
      Alert.alert('Empty log', 'Please enter at least one value before saving.');
      return;
    }

    try {
      setSaving(true);
      await recordDailyLog({
        batch: selected,
        mortality: m,
        feedKg: f,
        waterL: w,
        avgWeightKg: wt > 0 ? wt : null,
        recordedBy: 'James Mwale',
      });
      await refresh();
      Alert.alert(
        'Daily Log Saved',
        `Batch ${selected.id}\n\nMortality: ${m} birds\nFeed: ${f} kg\nWater: ${w} L${wt > 0 ? `\nAvg weight: ${wt} kg` : ''}\n\nBatch totals updated. All managers will see the new numbers.`
      );
      setMortality(''); setFeedKg(''); setWaterL(''); setWeight('');
      setShowLog(false);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Could not save log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Poultry Management" subtitle="Broilers & Village Chicken" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'broilers' && styles.tabActive]} onPress={() => setTab('broilers')}>
            <Ionicons name="restaurant" size={16} color={tab === 'broilers' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabTxt, tab === 'broilers' && styles.tabTxtActive]}>Broilers</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'village' && styles.tabActive]} onPress={() => setTab('village')}>
            <Ionicons name="egg" size={16} color={tab === 'village' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabTxt, tab === 'village' && styles.tabTxtActive]}>Village Chicken</Text>
          </Pressable>
        </View>

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="layers" label="Active Batches" value={list.length.toString()} color={theme.colors.primary} />
          <KpiCard icon="people" label="Total Birds" value={totalBirds.toLocaleString()} color={theme.colors.accent} />
          <KpiCard icon="trending-down" label="Mortality" value={`${mortalityPct}%`} sub={`${totalMortality} birds`} color={theme.colors.danger} />
          <KpiCard icon="speedometer" label="FCR" value={fcr.toFixed(2)} sub="target 1.65" color={theme.colors.info} />
        </View>

        {/* Action bar */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Batch" icon="add-circle" onPress={() => Alert.alert('New Batch', 'Batch creation form would open here.')} style={{ flex: 1 }} />
          <GhostButton label="Vaccination" icon="medkit" onPress={() => Alert.alert('Vaccination', 'Schedule a vaccination round.')} />
        </View>

        <SectionTitle title="Active Batches" action="+ Add" onAction={() => Alert.alert('New Batch', 'Batch creation form would open here.')} />

        {list.map(b => {
          const rec = b.enterprise === 'Broilers' ? getBroilerRecommendation(b.ageDays) : null;
          const recDailyFeed = rec ? (rec.gramsPerBird * b.currentCount / 1000).toFixed(1) : '—';
          const recDailyWater = rec ? (rec.waterMlPerBird * b.currentCount / 1000).toFixed(1) : '—';
          const morPct = ((b.mortality / b.initialCount) * 100).toFixed(2);
          const growthPct = (b.avgWeightKg / b.targetWeightKg) * 100;

          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={styles.batchHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>{b.name}</Text>
                  <Text style={styles.batchSub}>{b.id} · {b.house} · Day {b.ageDays}</Text>
                </View>
                <Badge label={b.status} color={theme.colors.success} />
              </View>

              <View style={styles.batchStats}>
                <Stat label="Birds" value={b.currentCount.toLocaleString()} />
                <Stat label="Mortality" value={`${morPct}%`} color={parseFloat(morPct) > 5 ? theme.colors.danger : theme.colors.success} />
                <Stat label="Avg Wt" value={`${b.avgWeightKg} kg`} />
                <Stat label="Cost" value={formatK(b.costToDate)} />
              </View>

              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.smallLabel}>Growth Progress</Text>
                  <Text style={styles.smallValue}>{growthPct.toFixed(0)}% to target ({b.targetWeightKg}kg)</Text>
                </View>
                <ProgressBar value={b.avgWeightKg} max={b.targetWeightKg} color={theme.colors.primary} />
              </View>

              {rec && (
                <View style={styles.recBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Ionicons name="bulb" size={14} color={theme.colors.accent} />
                    <Text style={styles.recTitle}>Smart Recommendation · {rec.stage} Stage</Text>
                  </View>
                  <View style={styles.recGrid}>
                    <RecCell label="Feed type" value={rec.feedType} />
                    <RecCell label="Per bird" value={`${rec.gramsPerBird} g`} />
                    <RecCell label="Daily feed" value={`${recDailyFeed} kg`} highlight />
                    <RecCell label="Water/bird" value={`${rec.waterMlPerBird} ml`} />
                    <RecCell label="Daily water" value={`${recDailyWater} L`} highlight />
                    <RecCell label="Days to sale" value={`${Math.max(0, 42 - b.ageDays)}d`} />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <PrimaryButton
                  label="Log Daily Data"
                  icon="document-text"
                  onPress={() => { setSelected(b); setShowLog(true); }}
                  style={{ flex: 1 }}
                />
                <GhostButton label="Details" icon="eye" onPress={() => Alert.alert(b.name, `Cost to date: ${formatK(b.costToDate)}\nProjected revenue: ${formatK(b.projectedRevenue)}\nProjected profit: ${formatK(b.projectedRevenue - b.costToDate)}\nFeed used: ${b.feedConsumedKg} kg\nWater used: ${b.waterConsumedL} L`)} />
              </View>
            </Card>
          );
        })}

        {/* Houses */}
        <SectionTitle title="House Management" />
        <View style={styles.houseGrid}>
          {['House A', 'House B', 'House C', 'House D'].map((h, i) => {
            const occupied = list.find(b => b.house === h);
            return (
              <View key={h} style={[styles.houseCard, shadow]}>
                <View style={styles.houseHeader}>
                  <Ionicons name="home" size={18} color={theme.colors.primary} />
                  <Text style={styles.houseTitle}>{h}</Text>
                </View>
                <Text style={styles.houseCap}>Capacity: 2,500</Text>
                {occupied ? (
                  <>
                    <Text style={styles.houseOcc}>{occupied.currentCount} birds</Text>
                    <Text style={styles.houseAge}>Day {occupied.ageDays}</Text>
                    <Badge label="Occupied" color={theme.colors.success} />
                  </>
                ) : (
                  <>
                    <Text style={styles.houseOcc}>Empty</Text>
                    <Text style={styles.houseAge}>Ready for placement</Text>
                    <Badge label="Available" color={theme.colors.info} />
                  </>
                )}
              </View>
            );
          })}
        </View>

        {/* Vaccination schedule */}
        <Card style={{ marginTop: 16 }}>
          <SectionTitle title="Vaccination Schedule" />
          {[
            { day: 1, name: 'Marek\'s', batch: 'B-2404', status: 'Done' },
            { day: 7, name: 'Newcastle (NDV)', batch: 'B-2403', status: 'Done' },
            { day: 14, name: 'Gumboro (IBD)', batch: 'B-2402', status: 'Due Today' },
            { day: 21, name: 'Newcastle Booster', batch: 'B-2401', status: 'Upcoming' },
            { day: 28, name: 'Avian Flu', batch: 'B-2401', status: 'Upcoming' },
          ].map((v, i) => (
            <View key={i} style={styles.vaxRow}>
              <View style={[styles.vaxDay, { backgroundColor: v.status === 'Done' ? theme.colors.success + '20' : v.status === 'Due Today' ? theme.colors.danger + '20' : theme.colors.info + '20' }]}>
                <Text style={[styles.vaxDayTxt, { color: v.status === 'Done' ? theme.colors.success : v.status === 'Due Today' ? theme.colors.danger : theme.colors.info }]}>D{v.day}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaxName}>{v.name}</Text>
                <Text style={styles.vaxBatch}>Batch {v.batch}</Text>
              </View>
              <Badge label={v.status} color={v.status === 'Done' ? theme.colors.success : v.status === 'Due Today' ? theme.colors.danger : theme.colors.info} />
            </View>
          ))}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Daily Log Modal */}
      <Modal visible={showLog} animationType="slide" transparent onRequestClose={() => setShowLog(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Log Entry</Text>
              <Pressable onPress={() => setShowLog(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            {selected && (
              <Text style={styles.modalSub}>{selected.name} · Day {selected.ageDays} · {selected.currentCount} birds</Text>
            )}
            <Field label="Mortality (birds)" value={mortality} onChangeText={setMortality} placeholder="e.g. 3" />
            <Field label="Feed consumed (kg)" value={feedKg} onChangeText={setFeedKg} placeholder="e.g. 245" />
            <Field label="Water consumed (L)" value={waterL} onChangeText={setWaterL} placeholder="e.g. 480" />
            <Field label="Average weight (kg)" value={weight} onChangeText={setWeight} placeholder="e.g. 1.2" />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <GhostButton label="Cancel" onPress={() => setShowLog(false)} />
              <PrimaryButton
                label={saving ? 'Saving…' : 'Save Log'}
                icon={saving ? 'sync' : 'save'}
                onPress={saving ? () => {} : submitLog}
                style={{ flex: 1, opacity: saving ? 0.7 : 1 }}
              />
            </View>

          </View>
        </View>
      </Modal>
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

function RecCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.recCell, highlight && { backgroundColor: theme.colors.accent + '20' }]}>
      <Text style={styles.recLabel}>{label}</Text>
      <Text style={[styles.recValue, highlight && { color: theme.colors.primaryDark }]}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; placeholder: string }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textSubtle}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: theme.colors.primary },
  tabTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  tabTxtActive: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  batchHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  batchTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  batchSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  batchStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, padding: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800' },
  smallLabel: { fontSize: 11, color: theme.colors.textMuted },
  smallValue: { fontSize: 11, color: theme.colors.text, fontWeight: '600' },
  recBox: { backgroundColor: theme.colors.primary + '08', borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: theme.colors.primary + '20' },
  recTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.primaryDark, marginLeft: 6 },
  recGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recCell: { flexBasis: '31%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: theme.colors.border },
  recLabel: { fontSize: 10, color: theme.colors.textMuted },
  recValue: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  houseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  houseCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, width: '48%', flexGrow: 1, borderWidth: 1, borderColor: theme.colors.border },
  houseHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  houseTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  houseCap: { fontSize: 11, color: theme.colors.textMuted },
  houseOcc: { fontSize: 16, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
  houseAge: { fontSize: 11, color: theme.colors.textSubtle, marginBottom: 6 },
  vaxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  vaxDay: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vaxDayTxt: { fontSize: 12, fontWeight: '800' },
  vaxName: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  vaxBatch: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  modalSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt },
});
