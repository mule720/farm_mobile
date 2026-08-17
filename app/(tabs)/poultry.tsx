import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useBatches, useCreateProductionRecord, getBroilerRecommendation, calcFCR, formatK } from '../lib/data';
import { useCreateBatch } from '../lib/data';
import { NewBatchModal } from '../components/Modals';
import { useMutation } from '@apollo/client';
import { CREATE_PRODUCTION_RECORD_MUTATION } from '../lib/gql';

type Tab = 'broilers' | 'village';

export default function Poultry() {
  const [tab, setTab] = useState<Tab>('broilers');
  const [showLog, setShowLog] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [mortality, setMortality] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [waterL, setWaterL] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);

  const { data: batches, loading, refetch } = useBatches();
  const [createRecord] = useMutation(CREATE_PRODUCTION_RECORD_MUTATION, {
    onError: e => Alert.alert('Error', e.message),
  });

  // Filter by enterprise type — backend stores type like POULTRY
  const list = batches.filter((b: any) => {
    const t = b.enterprise?.enterpriseType ?? '';
    return tab === 'broilers'
      ? t === 'POULTRY' && b.name?.toLowerCase().includes('broil')
      : t === 'POULTRY' && !b.name?.toLowerCase().includes('broil');
  });

  // If no name-based split, just show all POULTRY batches on broilers tab
  const displayList = list.length > 0 ? list : (tab === 'broilers' ? batches.filter((b: any) => b.enterprise?.enterpriseType === 'POULTRY') : []);

  const totalBirds = displayList.reduce((s: number, b: any) => s + (b.currentCount ?? 0), 0);
  const totalMortality = displayList.reduce((s: number, b: any) => s + (b.mortalityCount ?? 0), 0);
  const totalInitial = displayList.reduce((s: number, b: any) => s + (b.initialCount ?? 0), 0);
  const mortalityPct = totalInitial > 0 ? ((totalMortality / totalInitial) * 100).toFixed(2) : '0';
  const totalFeed = displayList.reduce((s: number, b: any) => s + (b.feedConsumedKg ?? 0), 0);
  const totalWeightGain = displayList.reduce((s: number, b: any) => s + ((b.avgWeightKg - 0.04) * b.currentCount), 0);
  const fcr = calcFCR(totalFeed, totalWeightGain);

  const submitLog = async () => {
    if (!selected) return;
    const m = parseInt(mortality || '0', 10) || 0;
    const f = parseFloat(feedKg || '0') || 0;
    const w = parseFloat(waterL || '0') || 0;
    const wt = parseFloat(weight || '0') || 0;
    if (m === 0 && f === 0 && w === 0 && wt === 0) {
      Alert.alert('Empty log', 'Enter at least one value.');
      return;
    }
    try {
      setSaving(true);
      const today = new Date().toISOString().split('T')[0];
      await createRecord({
        variables: {
          enterpriseId: selected.enterprise?.id,
          batchId: selected.id,
          recordType: 'daily_check',
          recordDate: today,
          quantity: f || 0,
          unit: 'kg',
          notes: `Mortality:${m} Water:${w}L Weight:${wt}kg`,
          mortalityCount: m,
          avgWeightKg: wt || null,
          feedConsumedKg: f || null,
          waterConsumedL: w || null,
        },
      });
      await refetch();
      Alert.alert('Log Saved', `Batch ${selected.name}\nMortality: ${m} birds\nFeed: ${f} kg\nWater: ${w} L`);
      setMortality(''); setFeedKg(''); setWaterL(''); setWeight('');
      setShowLog(false);
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const refresh = () => refetch();

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

        {loading && displayList.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        )}

        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="layers" label="Active Batches" value={displayList.length.toString()} color={theme.colors.primary} />
          <KpiCard icon="people" label="Total Birds" value={totalBirds.toLocaleString()} color={theme.colors.accent} />
          <KpiCard icon="trending-down" label="Mortality" value={`${mortalityPct}%`} sub={`${totalMortality} birds`} color={theme.colors.danger} />
          <KpiCard icon="speedometer" label="FCR" value={fcr} sub="target 1.65" color={theme.colors.info} />
        </View>

        {/* Action bar */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Batch" icon="add-circle" onPress={() => setShowNewBatch(true)} style={{ flex: 1 }} />
          <GhostButton label="Vaccination" icon="medkit" onPress={() => Alert.alert('Vaccination', 'Record a vaccination schedule in the farm calendar.')} />
        </View>

        <SectionTitle title="Active Batches" action="+ Add" onAction={() => setShowNewBatch(true)} />

        {displayList.length === 0 && !loading && (
          <Card>
            <Text style={{ textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 24 }}>
              No poultry batches found. Tap "New Batch" to add one.
            </Text>
          </Card>
        )}

        {displayList.map((b: any) => {
          const recText = getBroilerRecommendation(b.ageInDays ?? 0, b.avgWeightKg ?? 0);
          const morPct = b.initialCount > 0
            ? ((b.mortalityCount / b.initialCount) * 100).toFixed(2)
            : '0.00';
          const growthPct = b.targetWeightKg > 0
            ? Math.min(100, ((b.avgWeightKg ?? 0) / b.targetWeightKg) * 100)
            : 0;

          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={styles.batchHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.batchTitle}>{b.name}</Text>
                  <Text style={styles.batchSub}>Day {b.ageInDays ?? 0} · {b.enterprise?.name ?? '—'}</Text>
                </View>
                <Badge label={b.status ?? 'active'} color={theme.colors.success} />
              </View>

              <View style={styles.batchStats}>
                <Stat label="Birds" value={(b.currentCount ?? 0).toLocaleString()} />
                <Stat label="Mortality" value={`${morPct}%`} color={parseFloat(morPct) > 5 ? theme.colors.danger : theme.colors.success} />
                <Stat label="Avg Wt" value={`${b.avgWeightKg ?? 0} kg`} />
                <Stat label="Cost" value={`K${formatK(b.totalCosts ?? 0)}`} />
              </View>

              {b.targetWeightKg > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={styles.smallLabel}>Growth Progress</Text>
                    <Text style={styles.smallValue}>{growthPct.toFixed(0)}% to target ({b.targetWeightKg} kg)</Text>
                  </View>
                  <ProgressBar value={b.avgWeightKg ?? 0} max={b.targetWeightKg} color={theme.colors.primary} />
                </View>
              )}

              {/* AI Recommendation */}
              <View style={styles.recBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Ionicons name="bulb" size={14} color={theme.colors.accent} />
                  <Text style={styles.recTitle}>Smart Recommendation</Text>
                </View>
                <Text style={styles.recText}>{recText}</Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <PrimaryButton
                  label="Log Daily Data"
                  icon="document-text"
                  onPress={() => { setSelected(b); setShowLog(true); }}
                  style={{ flex: 1 }}
                />
                <GhostButton
                  label="Details"
                  icon="eye"
                  onPress={() => Alert.alert(
                    b.name,
                    `Cost to date: K${formatK(b.totalCosts ?? 0)}\n` +
                    `Projected revenue: K${formatK(b.projectedRevenue ?? 0)}\n` +
                    `Feed used: ${b.feedConsumedKg ?? 0} kg\n` +
                    `Water used: ${b.waterConsumedL ?? 0} L\n` +
                    `Started: ${b.startDate ?? '—'}`
                  )}
                />
              </View>
            </Card>
          );
        })}

        {/* Static vaccination schedule reference */}
        <Card style={{ marginTop: 4 }}>
          <SectionTitle title="Standard Vaccination Schedule" />
          {[
            { day: 1,  name: "Marek's Disease",    status: 'Reference' },
            { day: 7,  name: 'Newcastle (NDV)',     status: 'Reference' },
            { day: 14, name: 'Gumboro (IBD)',       status: 'Reference' },
            { day: 21, name: 'Newcastle Booster',   status: 'Reference' },
            { day: 28, name: 'Avian Influenza',     status: 'Reference' },
          ].map((v, i) => (
            <View key={i} style={styles.vaxRow}>
              <View style={[styles.vaxDay, { backgroundColor: theme.colors.info + '20' }]}>
                <Text style={[styles.vaxDayTxt, { color: theme.colors.info }]}>D{v.day}</Text>
              </View>
              <Text style={styles.vaxName}>{v.name}</Text>
              <Badge label={v.status} color={theme.colors.info} />
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
              <Text style={styles.modalSub}>
                {selected.name} · Day {selected.ageInDays ?? 0} · {selected.currentCount ?? 0} birds
              </Text>
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

      <NewBatchModal visible={showNewBatch} onClose={() => setShowNewBatch(false)} onSuccess={refresh} />
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
  recText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  vaxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10 },
  vaxDay: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vaxDayTxt: { fontSize: 12, fontWeight: '800' },
  vaxName: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.colors.text },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  modalSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt },
});
