import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Modal, Pressable,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import {
  createBatch, recordSale, receiveStock, issueStock, recordDailyLog,
  useInventory, useBatches, Batch, NewBatchInput,
} from '../lib/data';
import { useAuth } from '../lib/auth';

// ── Shared helpers ────────────────────────────────────────────────────────────
function ModalShell({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.lbl}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSubtle}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function Chips<T extends string>({ options, value, onSelect, colorMap }: {
  options: T[]; value: T; onSelect: (v: T) => void; colorMap?: Record<string, string>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
      {options.map(o => (
        <Pressable
          key={o}
          onPress={() => onSelect(o)}
          style={[s.chip, value === o && { backgroundColor: colorMap?.[o] ?? theme.colors.primary, borderColor: colorMap?.[o] ?? theme.colors.primary }]}
        >
          <Text style={[s.chipTxt, value === o && { color: '#fff' }]}>{o}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function SaveBtn({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return (
    <Pressable
      onPress={loading ? undefined : onPress}
      style={[s.saveBtn, loading && { opacity: 0.6 }]}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={s.saveBtnTxt}>{label}</Text>}
    </Pressable>
  );
}

// ── 1. New Batch Modal ─────────────────────────────────────────────────────────
const ENT_OPTIONS: NewBatchInput['enterprise'][] = ['Broilers', 'Village Chicken', 'Piggery', 'Fish', 'Ducks', 'Goats', 'Sheep'];
const ENT_COLORS: Record<string, string> = {
  Broilers: '#D4AF37', 'Village Chicken': '#EA580C', Piggery: '#DC2626',
  Fish: '#0EA5E9', Ducks: '#7C3AED', Goats: '#16A34A', Sheep: '#059669',
};
const DEFAULT_TARGET: Record<string, number> = {
  Broilers: 2.4, 'Village Chicken': 1.5, Piggery: 100, Fish: 0.5, Ducks: 3.5, Goats: 35, Sheep: 40,
};

export function NewBatchModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [enterprise, setEnterprise] = useState<NewBatchInput['enterprise']>('Broilers');
  const [house, setHouse] = useState('');
  const [count, setCount] = useState('');
  const [targetWt, setTargetWt] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setTargetWt(String(DEFAULT_TARGET[enterprise] ?? '')); }, [enterprise]);

  const reset = () => {
    setName(''); setHouse(''); setCount(''); setEnterprise('Broilers');
    setTargetWt(String(DEFAULT_TARGET['Broilers'])); setStartDate(today);
  };

  async function save() {
    if (!name.trim()) { Alert.alert('Required', 'Batch name is required.'); return; }
    const cnt = parseInt(count, 10);
    if (!cnt || cnt <= 0) { Alert.alert('Required', 'Initial count must be greater than 0.'); return; }
    if (!house.trim()) { Alert.alert('Required', 'House / location is required.'); return; }
    const tw = parseFloat(targetWt) || DEFAULT_TARGET[enterprise];

    // Range validation — target weight uses species-specific limits
    const cntErr = checkRange('initialCount', cnt);
    if (cntErr) { Alert.alert('Value out of range', cntErr); return; }
    const twErr = checkRange('targetWeightKg', tw, enterprise);
    if (twErr) { Alert.alert('Value out of range', twErr); return; }

    setSaving(true);
    try {
      await createBatch({ name: name.trim(), enterprise, startDate, initialCount: cnt, house: house.trim(), targetWeightKg: tw });
      Alert.alert('Batch Created', `${name} has been added to ${enterprise}.`);
      reset(); onSuccess(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create batch.');
    } finally { setSaving(false); }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="New Batch">
      <Field label="Batch Name" value={name} onChangeText={setName} placeholder="e.g. Broiler Batch B-2501" />

      <Text style={s.lbl}>Enterprise</Text>
      <Chips options={ENT_OPTIONS} value={enterprise} onSelect={setEnterprise} colorMap={ENT_COLORS} />

      <Field label="House / Location" value={house} onChangeText={setHouse} placeholder="e.g. House A, Pond 1" />
      <Field label="Initial Count" value={count} onChangeText={setCount} placeholder="e.g. 2500" keyboardType="numeric" />
      <Field label="Target Weight (kg)" value={targetWt} onChangeText={setTargetWt} placeholder="e.g. 2.4" keyboardType="decimal-pad" />
      <Field label="Start Date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />

      <SaveBtn label="Create Batch" onPress={save} loading={saving} />
      <Pressable onPress={onClose} style={s.cancelBtn}>
        <Text style={s.cancelTxt}>Cancel</Text>
      </Pressable>
    </ModalShell>
  );
}

// ── Range validation helpers ──────────────────────────────────────────────────
const RANGES: Record<string, [number, number, string]> = {
  mortality:      [0, 5000,   'Mortality'],
  feedKg:         [0, 50000,  'Feed (kg)'],
  waterL:         [0, 200000, 'Water (L)'],
  avgWeightKg:    [0.001, 350, 'Average weight (kg)'],   // generic — overridden per-species below
  targetWeightKg: [0.001, 350, 'Target weight (kg)'],
  initialCount:   [1, 100000, 'Initial count'],
  qty:            [0.001, 1000000, 'Quantity'],
  unitPrice:      [0.01, 1000000, 'Unit price'],
};

// Per-species weight limits (kg) — used when the batch enterprise is known
const WEIGHT_LIMITS: Record<string, [number, number]> = {
  'Broilers':        [0.01, 5],
  'Village Chicken': [0.01, 5],
  'Ducks':           [0.01, 6],
  'Fish':            [0.001, 5],
  'Piggery':         [0.5, 350],
  'Goats':           [1, 120],
  'Sheep':           [1, 150],
};

function checkRange(fieldKey: string, value: number, enterprise?: string): string | null {
  // Weight fields get species-specific limits when enterprise is known
  if ((fieldKey === 'avgWeightKg' || fieldKey === 'targetWeightKg') && enterprise) {
    const limits = WEIGHT_LIMITS[enterprise];
    if (limits) {
      const [lo, hi] = limits;
      if (value < lo || value > hi) {
        return `Weight ${value} kg is outside the expected range for ${enterprise} (${lo}–${hi} kg). Did you mean ${value < 1 ? value * 1000 + ' g' : value / 1000 + ' t'}? Please check and resubmit.`;
      }
      return null;
    }
  }
  const r = RANGES[fieldKey];
  if (!r) return null;
  const [lo, hi, label] = r;
  if (value < lo || value > hi) {
    return `${label} value ${value} is outside the expected range (${lo}–${hi}). Please check and resubmit.`;
  }
  return null;
}

// ── 2. Livestock Daily Log Modal ───────────────────────────────────────────────
export function LivestockLogModal({ visible, onClose, onSuccess, batch }: {
  visible: boolean; onClose: () => void; onSuccess: () => void; batch: Batch | null;
}) {
  const { user } = useAuth();
  const [mortality, setMortality] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [waterL, setWaterL] = useState('');
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setMortality(''); setFeedKg(''); setWaterL(''); setWeight(''); setNotes(''); };

  async function save() {
    if (!batch) return;
    const m = parseInt(mortality || '0', 10) || 0;
    const f = parseFloat(feedKg || '0') || 0;
    const w = parseFloat(waterL || '0') || 0;
    const wt = parseFloat(weight || '0') || 0;
    if (m === 0 && f === 0 && w === 0 && wt === 0) {
      Alert.alert('Empty log', 'Enter at least one value.'); return;
    }
    // Range validation — weight uses species-specific limits
    const checks: Array<[string, number]> = [
      ['mortality', m], ['feedKg', f], ['waterL', w],
      ...(wt > 0 ? [['avgWeightKg', wt] as [string, number]] : []),
    ];
    for (const [k, v] of checks) {
      if (v > 0) {
        const err = checkRange(k, v, k === 'avgWeightKg' ? batch.enterprise : undefined);
        if (err) { Alert.alert('Value out of range', err); return; }
      }
    }
    setSaving(true);
    try {
      await recordDailyLog({
        batch, mortality: m, feedKg: f, waterL: w,
        avgWeightKg: wt > 0 ? wt : null,
        notes: notes || undefined,
        recordedBy: user?.fullName || 'Staff',
      });
      Alert.alert('Saved', `Daily log for ${batch.name} saved.`);
      reset(); onSuccess(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save log.');
    } finally { setSaving(false); }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title={`Log: ${batch?.name ?? '—'}`}>
      {batch && <Text style={s.subLabel}>{batch.enterprise} · {batch.house} · Day {batch.ageDays} · {batch.currentCount} animals</Text>}
      <Field label="Mortality" value={mortality} onChangeText={setMortality} placeholder="0" keyboardType="numeric" />
      <Field label="Feed (kg)" value={feedKg} onChangeText={setFeedKg} placeholder="0" keyboardType="decimal-pad" />
      <Field label="Water (L)" value={waterL} onChangeText={setWaterL} placeholder="0" keyboardType="decimal-pad" />
      <Field label="Avg Weight (kg)" value={weight} onChangeText={setWeight} placeholder="optional" keyboardType="decimal-pad" />
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Observations..." multiline />
      <SaveBtn label={saving ? 'Saving…' : 'Save Log'} onPress={save} loading={saving} />
      <Pressable onPress={onClose} style={s.cancelBtn}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
    </ModalShell>
  );
}

// ── 3. New Sale Modal ──────────────────────────────────────────────────────────
const PRODUCTS = ['Live Broilers', 'Live Village Chicken', 'Pork (kg)', 'Live Fish', 'Duck Eggs', 'Goat Meat', 'Vegetables', 'Other'];

export function NewSaleModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [customer, setCustomer] = useState('');
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [qty, setQty] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const total = (parseFloat(qty || '0') * parseFloat(unitPrice || '0')).toFixed(2);

  const reset = () => { setCustomer(''); setProduct(PRODUCTS[0]); setQty(''); setUnitPrice(''); };

  async function save() {
    if (!customer.trim()) { Alert.alert('Required', 'Customer name is required.'); return; }
    const q = parseFloat(qty);
    const p = parseFloat(unitPrice);
    if (!q || !p) { Alert.alert('Required', 'Quantity and unit price are required.'); return; }
    const qErr = checkRange('qty', q);
    if (qErr) { Alert.alert('Value out of range', qErr); return; }
    const pErr = checkRange('unitPrice', p);
    if (pErr) { Alert.alert('Value out of range', pErr); return; }
    setSaving(true);
    try {
      await recordSale({ customer: customer.trim(), product, qty: q, unitPrice: p });
      Alert.alert('Sale Recorded', `K ${total} sale to ${customer} recorded.`);
      reset(); onSuccess(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to record sale.');
    } finally { setSaving(false); }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Record Sale">
      <Field label="Customer Name" value={customer} onChangeText={setCustomer} placeholder="e.g. Shoprite Lusaka" />

      <Text style={s.lbl}>Product</Text>
      <Chips options={PRODUCTS as any} value={product} onSelect={setProduct as any} />

      <Field label="Quantity" value={qty} onChangeText={setQty} placeholder="e.g. 200" keyboardType="decimal-pad" />
      <Field label="Unit Price (K)" value={unitPrice} onChangeText={setUnitPrice} placeholder="e.g. 85" keyboardType="decimal-pad" />

      {parseFloat(qty) > 0 && parseFloat(unitPrice) > 0 && (
        <View style={s.totalBox}>
          <Text style={s.totalLbl}>Total</Text>
          <Text style={s.totalVal}>K {parseFloat(total).toLocaleString()}</Text>
        </View>
      )}

      <SaveBtn label="Record Sale" onPress={save} loading={saving} />
      <Pressable onPress={onClose} style={s.cancelBtn}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
    </ModalShell>
  );
}

// ── 4. Receive Stock Modal ─────────────────────────────────────────────────────
export function ReceiveStockModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { data: items } = useInventory();
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedItem = items.find(i => i.id === selectedId);

  async function save() {
    if (!selectedId) { Alert.alert('Required', 'Select an inventory item.'); return; }
    const q = parseFloat(qty);
    if (!q || q <= 0) { Alert.alert('Required', 'Quantity must be greater than 0.'); return; }
    setSaving(true);
    try {
      await receiveStock(selectedId, q, cost ? parseFloat(cost) : undefined);
      Alert.alert('Stock Received', `${q} ${selectedItem?.unit || 'kg'} of ${selectedItem?.name} added.`);
      setSelectedId(''); setQty(''); setCost('');
      onSuccess(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to receive stock.');
    } finally { setSaving(false); }
  }

  return (
    <ModalShell visible={visible} onClose={onClose} title="Receive Stock">
      <Text style={s.lbl}>Select Item</Text>
      <ScrollView style={{ maxHeight: 200, marginBottom: 14 }}>
        {items.map(i => (
          <Pressable
            key={i.id}
            onPress={() => { setSelectedId(i.id); setCost(String(i.costPerKg)); }}
            style={[s.itemRow, selectedId === i.id && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
          >
            <Text style={[s.itemName, selectedId === i.id && { color: theme.colors.primary }]}>{i.name}</Text>
            <Text style={s.itemStock}>{i.stockKg} {i.unit || 'kg'} in stock</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Field label={`Quantity (${selectedItem?.unit || 'kg'})`} value={qty} onChangeText={setQty} placeholder="e.g. 500" keyboardType="decimal-pad" />
      <Field label="Cost per unit (K) — optional" value={cost} onChangeText={setCost} placeholder="leave blank to keep current" keyboardType="decimal-pad" />

      <SaveBtn label="Receive Stock" onPress={save} loading={saving} />
      <Pressable onPress={onClose} style={s.cancelBtn}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
    </ModalShell>
  );
}

// ── 5. Issue Feed Modal ────────────────────────────────────────────────────────
export function IssueFeedModal({ visible, onClose, onSuccess }: {
  visible: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const { data: items } = useInventory();
  const feedItems = items.filter(i => i.category.toLowerCase().includes('feed') || i.category.toLowerCase().includes('supplement'));
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedItem = items.find(i => i.id === selectedId);

  async function save() {
    if (!selectedId) { Alert.alert('Required', 'Select a feed item.'); return; }
    const q = parseFloat(qty);
    if (!q || q <= 0) { Alert.alert('Required', 'Quantity must be greater than 0.'); return; }
    if (selectedItem && q > selectedItem.stockKg) {
      Alert.alert('Insufficient Stock', `Only ${selectedItem.stockKg} ${selectedItem.unit || 'kg'} available.`); return;
    }
    setSaving(true);
    try {
      await issueStock(selectedId, q);
      Alert.alert('Feed Issued', `${q} ${selectedItem?.unit || 'kg'} of ${selectedItem?.name} issued.`);
      setSelectedId(''); setQty('');
      onSuccess(); onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to issue stock.');
    } finally { setSaving(false); }
  }

  const displayItems = feedItems.length > 0 ? feedItems : items;

  return (
    <ModalShell visible={visible} onClose={onClose} title="Issue Feed">
      <Text style={s.lbl}>Select Feed / Item</Text>
      <ScrollView style={{ maxHeight: 200, marginBottom: 14 }}>
        {displayItems.map(i => (
          <Pressable
            key={i.id}
            onPress={() => setSelectedId(i.id)}
            style={[s.itemRow, selectedId === i.id && { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary }]}
          >
            <Text style={[s.itemName, selectedId === i.id && { color: theme.colors.primary }]}>{i.name}</Text>
            <Text style={[s.itemStock, i.stockKg < i.reorderKg && { color: theme.colors.danger }]}>
              {i.stockKg} {i.unit || 'kg'} in stock
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Field label={`Quantity to issue (${selectedItem?.unit || 'kg'})`} value={qty} onChangeText={setQty} placeholder="e.g. 120" keyboardType="decimal-pad" />

      <SaveBtn label="Issue Feed" onPress={save} loading={saving} />
      <Pressable onPress={onClose} style={s.cancelBtn}><Text style={s.cancelTxt}>Cancel</Text></Pressable>
    </ModalShell>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  subLabel: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 16 },
  lbl: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 14,
    color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt,
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  chipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  saveBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelTxt: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
  totalBox: { backgroundColor: theme.colors.success + '15', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalLbl: { fontSize: 13, color: theme.colors.textMuted, fontWeight: '700' },
  totalVal: { fontSize: 20, fontWeight: '800', color: theme.colors.success },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 6, backgroundColor: '#fff' },
  itemName: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  itemStock: { fontSize: 11, color: theme.colors.textMuted },
});
