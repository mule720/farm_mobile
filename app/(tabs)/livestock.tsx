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
import { useBatches, getPiggeryRecommendation, formatK } from '../lib/data';
import { NewBatchModal } from '../components/Modals';
import {
  PRODUCTION_RECORDS_QUERY,
  CREATE_PRODUCTION_RECORD_MUTATION,
  UPDATE_PRODUCTION_RECORD_MUTATION,
} from '../lib/gql';

type EntKey = 'PIGGERY' | 'FISH' | 'LIVESTOCK' | 'DAIRY';

const ENT_TABS: { key: EntKey; label: string; icon: string; color: string }[] = [
  { key: 'PIGGERY',   label: 'Piggery',  icon: 'paw',   color: '#DC2626' },
  { key: 'LIVESTOCK', label: 'Cattle',   icon: 'leaf',  color: '#16A34A' },
  { key: 'FISH',      label: 'Fish',     icon: 'fish',  color: '#0EA5E9' },
  { key: 'DAIRY',     label: 'Dairy',    icon: 'water', color: '#7C3AED' },
];

// ── Batch card with expandable record history ─────────────────────────────────
function BatchCard({
  batch,
  accentColor,
  onLogNew,
  onEditRecord,
}: {
  batch: any;
  accentColor: string;
  onLogNew: () => void;
  onEditRecord: (rec: any) => void;
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

  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.batchTitle}>{batch.name}</Text>
          <Text style={s.batchSub}>Day {batch.ageInDays ?? 0} · {batch.enterprise?.name ?? '—'}</Text>
        </View>
        <Badge label={batch.status ?? 'active'} color={theme.colors.success} />
      </View>

      <View style={s.statsRow}>
        <Stat label="Animals" value={(batch.currentCount ?? 0).toLocaleString()} />
        <Stat label="Mortality" value={`${morPct}%`} color={parseFloat(morPct) > 5 ? theme.colors.danger : theme.colors.success} />
        <Stat label="Avg Wt" value={`${batch.avgWeightKg ?? 0} kg`} />
        <Stat label="Proj. Profit" value={`K${formatK((batch.projectedRevenue ?? 0) - (batch.totalCosts ?? 0))}`} />
      </View>

      {batch.targetWeightKg > 0 && (
        <View style={{ marginTop: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={s.smallLabel}>Growth to target ({batch.targetWeightKg} kg)</Text>
            <Text style={s.smallLabel}>{Math.min(100, ((batch.avgWeightKg ?? 0) / batch.targetWeightKg * 100)).toFixed(0)}%</Text>
          </View>
          <ProgressBar value={batch.avgWeightKg ?? 0} max={batch.targetWeightKg} color={accentColor} />
        </View>
      )}

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

      {/* ── Record history ────────────────────────────────── */}
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
            if (d.mortality_count != null)  parts.push(`${d.mortality_count} dead`);
            if (d.feed_consumed_kg != null)  parts.push(`${d.feed_consumed_kg} kg feed`);
            if (d.water_consumed_l != null)  parts.push(`${d.water_consumed_l} L water`);
            if (d.avg_weight_kg != null)     parts.push(`${d.avg_weight_kg} kg wt`);
            if (d.health_status != null)     parts.push(d.health_status);
            return (
              <View key={rec.id} style={s.recRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.recDate}>{rec.recordDate} · <Text style={{ color: theme.colors.textMuted }}>{rec.recordType ?? 'daily'}</Text></Text>
                  <Text style={s.recSummary}>{parts.length ? parts.join(' · ') : 'No metrics'}</Text>
                </View>
                <Pressable onPress={() => onEditRecord(rec)} style={s.editBtn} hitSlop={10}>
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
export default function Livestock() {
  const [active, setActive] = useState<EntKey>('PIGGERY');
  const { data: allBatches, loading, refetch } = useBatches();
  const [showNewBatch, setShowNewBatch] = useState(false);

  // Log / Edit modal state
  const [showLog, setShowLog]           = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [logDate, setLogDate]           = useState('');
  const [mortality, setMortality]       = useState('');
  const [feedKg, setFeedKg]             = useState('');
  const [waterL, setWaterL]             = useState('');
  const [weight, setWeight]             = useState('');
  const [healthStatus, setHealthStatus] = useState('');
  const [saving, setSaving]             = useState(false);

  const [createRecord] = useMutation(CREATE_PRODUCTION_RECORD_MUTATION, {
    onError: e => Alert.alert('Error', e.message),
  });
  const [updateRecord] = useMutation(UPDATE_PRODUCTION_RECORD_MUTATION, {
    onError: e => Alert.alert('Error', e.message),
  });

  const list = allBatches.filter((b: any) => b.enterprise?.enterpriseType === active);
  const totalAnimals   = list.reduce((s: number, b: any) => s + (b.currentCount ?? 0), 0);
  const totalCost      = list.reduce((s: number, b: any) => s + (b.totalCosts ?? 0), 0);
  const totalProj      = list.reduce((s: number, b: any) => s + (b.projectedRevenue ?? 0), 0);
  const activeTab      = ENT_TABS.find(e => e.key === active)!;

  const openNewLog = (b: any) => {
    setSelectedBatch(b);
    setEditingRecord(null);
    setLogDate(new Date().toISOString().split('T')[0]);
    setMortality(''); setFeedKg(''); setWaterL(''); setWeight(''); setHealthStatus('');
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
    setHealthStatus(d.health_status ?? '');
    setShowLog(true);
  };

  const submitLog = async () => {
    if (!selectedBatch) return;
    const m  = parseFloat(mortality    || '0') || 0;
    const f  = parseFloat(feedKg       || '0') || 0;
    const w  = parseFloat(waterL       || '0') || 0;
    const wt = parseFloat(weight       || '0') || 0;
    const hs = healthStatus.trim();
    if (m === 0 && f === 0 && w === 0 && wt === 0 && !hs) {
      Alert.alert('Empty log', 'Enter at least one value.');
      return;
    }
    const dataPayload = JSON.stringify({
      ...(m  > 0 ? { mortality_count:  m  } : {}),
      ...(f  > 0 ? { feed_consumed_kg: f  } : {}),
      ...(w  > 0 ? { water_consumed_l: w  } : {}),
      ...(wt > 0 ? { avg_weight_kg:    wt } : {}),
      ...(hs     ? { health_status:    hs } : {}),
    });
    try {
      setSaving(true);
      if (editingRecord) {
        await updateRecord({ variables: { id: editingRecord.id, data: dataPayload } });
        Alert.alert('Updated', `Record for ${logDate} updated.`);
      } else {
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
      setMortality(''); setFeedKg(''); setWaterL(''); setWeight(''); setHealthStatus('');
      setShowLog(false);
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      <AppHeader title="Livestock Management" subtitle="Piggery · Cattle · Fish · Dairy" />

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        {/* Enterprise switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {ENT_TABS.map(e => (
            <Pressable
              key={e.key}
              onPress={() => setActive(e.key)}
              style={[s.chip, active === e.key && { backgroundColor: e.color }]}
            >
              <Ionicons name={e.icon as any} size={15} color={active === e.key ? '#fff' : e.color} />
              <Text style={[s.chipTxt, active === e.key && { color: '#fff' }]}>{e.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading && list.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        <View style={s.kpiGrid}>
          <KpiCard icon="layers"       label="Batches"       value={list.length.toString()}     color={activeTab.color} />
          <KpiCard icon="people"       label="Animals"       value={totalAnimals.toLocaleString()} color={theme.colors.accent} />
          <KpiCard icon="cash"         label="Total Cost"    value={`K${formatK(totalCost)}`}   color={theme.colors.primary} />
          <KpiCard icon="trending-up"  label="Proj. Revenue" value={`K${formatK(totalProj)}`}  color={theme.colors.success} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Batch" icon="add-circle" onPress={() => setShowNewBatch(true)} style={{ flex: 1 }} />
          <GhostButton label="Deworm" icon="medkit"
            onPress={() => Alert.alert('Deworming', 'Record a deworming event for the selected batch.')} />
        </View>

        <SectionTitle title={`${activeTab.label} Batches`} />

        {list.length === 0 && !loading && (
          <Card>
            <Text style={s.empty}>No {activeTab.label.toLowerCase()} batches. Tap "New Batch" to add one.</Text>
            <PrimaryButton label="New Batch" icon="add-circle" onPress={() => setShowNewBatch(true)} style={{ marginTop: 12 }} />
          </Card>
        )}

        {list.map((b: any) => (
          <BatchCard
            key={b.id}
            batch={b}
            accentColor={activeTab.color}
            onLogNew={() => openNewLog(b)}
            onEditRecord={(rec) => openEditLog(b, rec)}
          />
        ))}

        {/* Feeding reference cards */}
        {active === 'PIGGERY' && (
          <Card style={{ marginTop: 8 }}>
            <SectionTitle title="Pig Feeding Reference" />
            {[
              { stage: 'Suckling (0–4 wks)',    feed: 'Creep feed',  rate: '50–100 g/day' },
              { stage: 'Weaner (4–8 wks)',       feed: 'Starter',     rate: '200–500 g/day' },
              { stage: 'Grower (8–16 wks)',      feed: 'Grower meal', rate: '0.5–1.5 kg/day' },
              { stage: 'Finisher (16–20 wks)',   feed: 'Finisher',    rate: '2.5–3 kg/day' },
            ].map((r, i) => (
              <View key={i} style={s.feedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.feedStage}>{r.stage}</Text>
                  <Text style={s.feedType}>{r.feed}</Text>
                </View>
                <Text style={s.feedRate}>{r.rate}</Text>
              </View>
            ))}
          </Card>
        )}

        {active === 'FISH' && (
          <Card style={{ marginTop: 8 }}>
            <SectionTitle title="Fish Feeding Reference" />
            {[
              { stage: 'Fingerling (< 5 g)',    rate: '10–15% body weight / day' },
              { stage: 'Juvenile (5–50 g)',      rate: '5–8% body weight / day' },
              { stage: 'Sub-adult (50–200 g)',   rate: '3–5% body weight / day' },
              { stage: 'Adult (> 200 g)',        rate: '2–3% body weight / day' },
            ].map((r, i) => (
              <View key={i} style={s.feedRow}>
                <Text style={{ flex: 1, ...s.feedStage }}>{r.stage}</Text>
                <Text style={s.feedRate}>{r.rate}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Log / Edit Modal ────────────────────────────────────────── */}
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

            <Field label="Mortality (animals)"  value={mortality}     onChangeText={setMortality}     placeholder="e.g. 1" />
            <Field label="Feed consumed (kg)"   value={feedKg}        onChangeText={setFeedKg}        placeholder="e.g. 50" />
            <Field label="Water consumed (L)"   value={waterL}        onChangeText={setWaterL}        placeholder="e.g. 100" />
            <Field label="Average weight (kg)"  value={weight}        onChangeText={setWeight}        placeholder="e.g. 80" />
            <View style={{ marginTop: 12 }}>
              <Text style={s.fieldLabel}>Health status (optional)</Text>
              <TextInput
                value={healthStatus}
                onChangeText={setHealthStatus}
                placeholder="e.g. Good, Watch #3, Treated"
                placeholderTextColor={theme.colors.textSubtle}
                style={s.input}
              />
            </View>

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
  histTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  recRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  recDate: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  recSummary: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  editBtn: { padding: 6, borderRadius: 8, backgroundColor: theme.colors.primary + '12' },
  feedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  feedStage: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  feedType: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  feedRate: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  modalSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt },
});
