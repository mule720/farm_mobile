import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { theme } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useBatches, useCreateProductionRecord, getBroilerRecommendation, calcFCR, formatK } from '../lib/data';
import { useCreateBatch } from '../lib/data';
import { NewBatchModal } from '../components/Modals';
import {
  PRODUCTION_RECORDS_QUERY,
  CREATE_PRODUCTION_RECORD_MUTATION,
  UPDATE_PRODUCTION_RECORD_MUTATION,
} from '../lib/gql';

type Tab = 'broilers' | 'village';

// ── batch card with expandable record history ─────────────────────────────────
function BatchCard({
  batch,
  onLogNew,
  onEditRecord,
}: {
  batch: any;
  onLogNew: () => void;
  onEditRecord: (record: any) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: recData, loading: recLoading, refetch: refetchRecs } = useQuery(
    PRODUCTION_RECORDS_QUERY,
    {
      variables: { batchId: batch.id, limit: 20 },
      skip: !expanded,
      fetchPolicy: 'cache-and-network',
    }
  );

  const records: any[] = recData?.productionRecords ?? [];

  const morPct = batch.initialCount > 0
    ? ((batch.mortalityCount / batch.initialCount) * 100).toFixed(2)
    : '0.00';
  const growthPct = batch.targetWeightKg > 0
    ? Math.min(100, ((batch.avgWeightKg ?? 0) / batch.targetWeightKg) * 100)
    : 0;
  const recText = getBroilerRecommendation(batch.ageInDays ?? 0, batch.avgWeightKg ?? 0);

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={s.batchHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.batchTitle}>{batch.name}</Text>
          <Text style={s.batchSub}>Day {batch.ageInDays ?? 0} · {batch.enterprise?.name ?? '—'}</Text>
        </View>
        <Badge label={batch.status ?? 'active'} color={theme.colors.success} />
      </View>

      <View style={s.batchStats}>
        <Stat label="Birds" value={(batch.currentCount ?? 0).toLocaleString()} />
        <Stat label="Mortality" value={`${morPct}%`} color={parseFloat(morPct) > 5 ? theme.colors.danger : theme.colors.success} />
        <Stat label="Avg Wt" value={`${batch.avgWeightKg ?? 0} kg`} />
        <Stat label="Cost" value={`K${formatK(batch.totalCosts ?? 0)}`} />
      </View>

      {batch.targetWeightKg > 0 && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={s.smallLabel}>Growth Progress</Text>
            <Text style={s.smallLabel}>{growthPct.toFixed(0)}% to target ({batch.targetWeightKg} kg)</Text>
          </View>
          <ProgressBar value={batch.avgWeightKg ?? 0} max={batch.targetWeightKg} color={theme.colors.primary} />
        </View>
      )}

      <View style={s.recBox}>
        <Ionicons name="bulb" size={14} color={theme.colors.accent} />
        <Text style={s.recText}>{recText}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <PrimaryButton label="Log Daily Data" icon="add-circle" onPress={onLogNew} style={{ flex: 1 }} />
        <GhostButton
          label={expanded ? 'Hide Records' : 'Records'}
          icon={expanded ? 'chevron-up' : 'time'}
          onPress={() => {
            setExpanded(v => !v);
            if (!expanded) refetchRecs();
          }}
        />
      </View>

      {/* ── Record history ──────────────────────────────────── */}
      {expanded && (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }}>
          <Text style={s.histTitle}>Recent Records</Text>
          {recLoading && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 8 }} />}
          {!recLoading && records.length === 0 && (
            <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 }}>
              No records yet. Tap "Log Daily Data" to add one.
            </Text>
          )}
          {records.map((rec: any) => {
            const d = rec.data ?? {};
            const parts: string[] = [];
            if (d.mortality_count != null) parts.push(`${d.mortality_count} dead`);
            if (d.feed_consumed_kg != null) parts.push(`${d.feed_consumed_kg} kg feed`);
            if (d.water_consumed_l != null) parts.push(`${d.water_consumed_l} L water`);
            if (d.avg_weight_kg != null) parts.push(`${d.avg_weight_kg} kg wt`);
            return (
              <View key={rec.id} style={s.recRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.recDate}>{rec.recordDate} · <Text style={{ color: theme.colors.textMuted }}>{rec.recordType ?? 'daily'}</Text></Text>
                  <Text style={s.recSummary}>{parts.length ? parts.join(' · ') : 'No metrics'}</Text>
                </View>
                <Pressable
                  onPress={() => onEditRecord(rec)}
                  style={s.editBtn}
                  hitSlop={10}
                >
                  <Ionicons name="pencil" size={15} color={theme.colors.primary} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────
export default function Poultry() {
  const [tab, setTab] = useState<Tab>('broilers');
  const [showLog, setShowLog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  // When editing an existing record these hold the record id + prefilled values
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const [mortality, setMortality] = useState('');
  const [feedKg, setFeedKg]       = useState('');
  const [waterL, setWaterL]       = useState('');
  const [weight, setWeight]       = useState('');
  const [logDate, setLogDate]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [showNewBatch, setShowNewBatch] = useState(false);

  const { data: batches, loading, refetch } = useBatches();
  const [createRecord] = useMutation(CREATE_PRODUCTION_RECORD_MUTATION, {
    onError: e => Alert.alert('Error', e.message),
  });
  const [updateRecord] = useMutation(UPDATE_PRODUCTION_RECORD_MUTATION, {
    onError: e => Alert.alert('Error', e.message),
  });

  const list = batches.filter((b: any) => {
    const t = b.enterprise?.enterpriseType ?? '';
    return tab === 'broilers'
      ? t === 'POULTRY' && b.name?.toLowerCase().includes('broil')
      : t === 'POULTRY' && !b.name?.toLowerCase().includes('broil');
  });
  const displayList = list.length > 0
    ? list
    : tab === 'broilers' ? batches.filter((b: any) => b.enterprise?.enterpriseType === 'POULTRY') : [];

  const totalBirds     = displayList.reduce((s: number, b: any) => s + (b.currentCount ?? 0), 0);
  const totalMortality = displayList.reduce((s: number, b: any) => s + (b.mortalityCount ?? 0), 0);
  const totalInitial   = displayList.reduce((s: number, b: any) => s + (b.initialCount ?? 0), 0);
  const mortalityPct   = totalInitial > 0 ? ((totalMortality / totalInitial) * 100).toFixed(2) : '0';
  const totalFeed      = displayList.reduce((s: number, b: any) => s + (b.feedConsumedKg ?? 0), 0);
  const totalWeightGain = displayList.reduce((s: number, b: any) => s + ((b.avgWeightKg - 0.04) * b.currentCount), 0);
  const fcr            = calcFCR(totalFeed, totalWeightGain);

  const openNewLog = (b: any) => {
    setSelectedBatch(b);
    setEditingRecord(null);
    const today = new Date().toISOString().split('T')[0];
    setLogDate(today);
    setMortality(''); setFeedKg(''); setWaterL(''); setWeight('');
    setShowLog(true);
  };

  const openEditLog = (b: any, rec: any) => {
    setSelectedBatch(b);
    setEditingRecord(rec);
    const d = rec.data ?? {};
    setLogDate(rec.recordDate ?? new Date().toISOString().split('T')[0]);
    setMortality(d.mortality_count != null ? String(d.mortality_count) : '');
    setFeedKg(d.feed_consumed_kg != null ? String(d.feed_consumed_kg) : '');
    setWaterL(d.water_consumed_l != null ? String(d.water_consumed_l) : '');
    setWeight(d.avg_weight_kg != null ? String(d.avg_weight_kg) : '');
    setShowLog(true);
  };

  const submitLog = async () => {
    if (!selectedBatch) return;
    const m  = parseFloat(mortality || '0') || 0;
    const f  = parseFloat(feedKg   || '0') || 0;
    const w  = parseFloat(waterL   || '0') || 0;
    const wt = parseFloat(weight   || '0') || 0;
    if (m === 0 && f === 0 && w === 0 && wt === 0) {
      Alert.alert('Empty log', 'Enter at least one value.');
      return;
    }
    const dataPayload = JSON.stringify({
      ...(m  > 0 ? { mortality_count:   m  } : {}),
      ...(f  > 0 ? { feed_consumed_kg:  f  } : {}),
      ...(w  > 0 ? { water_consumed_l:  w  } : {}),
      ...(wt > 0 ? { avg_weight_kg:     wt } : {}),
    });
    try {
      setSaving(true);
      if (editingRecord) {
        // Update the specific existing record by id
        await updateRecord({ variables: { id: editingRecord.id, data: dataPayload } });
        Alert.alert('Updated', `Record for ${logDate} updated.`);
      } else {
        // Upsert — backend merges if same enterprise+batch+date+type
        await createRecord({
          variables: {
            enterpriseId: selectedBatch.enterprise?.id,
            batchId:      selectedBatch.id,
            recordType:   'daily_check',
            recordDate:   logDate,
            data:         dataPayload,
          },
        });
        Alert.alert('Saved', `Log for ${logDate} saved.`);
      }
      await refetch();
      setMortality(''); setFeedKg(''); setWaterL(''); setWeight('');
      setShowLog(false);
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <AppHeader title="Poultry Management" subtitle="Broilers & Village Chicken" />

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        {/* Tab switcher */}
        <View style={s.tabRow}>
          <Pressable style={[s.tab, tab === 'broilers' && s.tabActive]} onPress={() => setTab('broilers')}>
            <Ionicons name="restaurant" size={16} color={tab === 'broilers' ? '#fff' : theme.colors.textMuted} />
            <Text style={[s.tabTxt, tab === 'broilers' && s.tabTxtActive]}>Broilers</Text>
          </Pressable>
          <Pressable style={[s.tab, tab === 'village' && s.tabActive]} onPress={() => setTab('village')}>
            <Ionicons name="egg" size={16} color={tab === 'village' ? '#fff' : theme.colors.textMuted} />
            <Text style={[s.tabTxt, tab === 'village' && s.tabTxtActive]}>Village Chicken</Text>
          </Pressable>
        </View>

        {loading && displayList.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        )}

        <View style={s.kpiGrid}>
          <KpiCard icon="layers"       label="Active Batches" value={displayList.length.toString()} color={theme.colors.primary} />
          <KpiCard icon="people"       label="Total Birds"    value={totalBirds.toLocaleString()}   color={theme.colors.accent} />
          <KpiCard icon="trending-down" label="Mortality"     value={`${mortalityPct}%`} sub={`${totalMortality} birds`} color={theme.colors.danger} />
          <KpiCard icon="speedometer"  label="FCR"            value={fcr} sub="target 1.65"          color={theme.colors.info} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Batch" icon="add-circle" onPress={() => setShowNewBatch(true)} style={{ flex: 1 }} />
          <GhostButton label="Vaccination" icon="medkit"
            onPress={() => Alert.alert('Vaccination', 'Record a vaccination schedule in the farm calendar.')} />
        </View>

        <SectionTitle title="Active Batches" action="+ Add" onAction={() => setShowNewBatch(true)} />

        {displayList.length === 0 && !loading && (
          <Card>
            <Text style={{ textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 24 }}>
              No poultry batches found. Tap "New Batch" to add one.
            </Text>
          </Card>
        )}

        {displayList.map((b: any) => (
          <BatchCard
            key={b.id}
            batch={b}
            onLogNew={() => openNewLog(b)}
            onEditRecord={(rec) => openEditLog(b, rec)}
          />
        ))}

        {/* Vaccination reference */}
        <Card style={{ marginTop: 4 }}>
          <SectionTitle title="Standard Vaccination Schedule" />
          {[
            { day: 1,  name: "Marek's Disease" },
            { day: 7,  name: 'Newcastle (NDV)' },
            { day: 14, name: 'Gumboro (IBD)' },
            { day: 21, name: 'Newcastle Booster' },
            { day: 28, name: 'Avian Influenza' },
          ].map((v, i) => (
            <View key={i} style={s.vaxRow}>
              <View style={[s.vaxDay, { backgroundColor: theme.colors.info + '20' }]}>
                <Text style={[s.vaxDayTxt, { color: theme.colors.info }]}>D{v.day}</Text>
              </View>
              <Text style={s.vaxName}>{v.name}</Text>
              <Badge label="Reference" color={theme.colors.info} />
            </View>
          ))}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Log / Edit Modal ──────────────────────────────────────────── */}
      <Modal visible={showLog} animationType="slide" transparent onRequestClose={() => setShowLog(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingRecord ? 'Edit Record' : 'Daily Log Entry'}</Text>
              <Pressable onPress={() => setShowLog(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            {selectedBatch && (
              <Text style={s.modalSub}>
                {selectedBatch.name} · {logDate}
                {editingRecord ? ' · editing existing record' : ''}
              </Text>
            )}

            <Field label="Mortality (birds)"   value={mortality} onChangeText={setMortality} placeholder="e.g. 3" />
            <Field label="Feed consumed (kg)"  value={feedKg}    onChangeText={setFeedKg}    placeholder="e.g. 245" />
            <Field label="Water consumed (L)"  value={waterL}    onChangeText={setWaterL}    placeholder="e.g. 480" />
            <Field label="Average weight (kg)" value={weight}    onChangeText={setWeight}    placeholder="e.g. 1.2" />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <GhostButton label="Cancel" onPress={() => setShowLog(false)} />
              <PrimaryButton
                label={saving ? 'Saving…' : editingRecord ? 'Update Record' : 'Save Log'}
                icon={saving ? 'sync' : 'save'}
                onPress={saving ? () => {} : submitLog}
                style={{ flex: 1, opacity: saving ? 0.7 : 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <NewBatchModal visible={showNewBatch} onClose={() => setShowNewBatch(false)} onSuccess={refetch} />
    </View>
  );
}

function Stat({ label, value, color = theme.colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder: string;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textSubtle}
        style={s.input}
      />
    </View>
  );
}

const s = StyleSheet.create({
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
  recBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: theme.colors.primary + '08', borderRadius: 10, padding: 10, marginTop: 12, borderWidth: 1, borderColor: theme.colors.primary + '20' },
  recText: { flex: 1, fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  histTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  recDate: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  recSummary: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  editBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.colors.primary + '12' },
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
