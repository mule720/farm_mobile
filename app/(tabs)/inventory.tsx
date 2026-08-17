import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  Alert, RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useInventory, useRecordTransaction, useCreateInventoryItem, formatK } from '../lib/data';

const CATEGORIES = ['All', 'feed', 'medication', 'supplement', 'equipment', 'seed', 'fertilizer', 'other'];

export default function Inventory() {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showTransact, setShowTransact] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [txnQty, setTxnQty] = useState('');
  const [txnType, setTxnType] = useState<'receive' | 'issue'>('receive');

  // New item form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('feed');
  const [newUnit, setNewUnit] = useState('kg');
  const [newStock, setNewStock] = useState('');
  const [newReorder, setNewReorder] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newSupplier, setNewSupplier] = useState('');

  const { items, summary, loading, refetch } = useInventory(
    cat !== 'All' ? cat : undefined,
    undefined,
    false,
  );
  const { recordTransaction, loading: txnLoading } = useRecordTransaction();
  const { createItem, loading: creating } = useCreateInventoryItem();

  const filtered = useMemo(() => {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter((i: any) =>
      i.name?.toLowerCase().includes(q) ||
      (i.supplier ?? '').toLowerCase().includes(q)
    );
  }, [query, items]);

  const totalValue = summary?.totalValue ?? items.reduce((s: number, i: any) => s + (i.currentStock ?? 0) * (i.costPerUnit ?? 0), 0);
  const lowStockCount = summary?.lowStockItems ?? items.filter((i: any) => i.isLowStock).length;

  const submitTransaction = async () => {
    if (!selectedItem || !txnQty) {
      Alert.alert('Required', 'Enter a quantity.');
      return;
    }
    const qty = parseFloat(txnQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid', 'Quantity must be a positive number.');
      return;
    }
    try {
      await recordTransaction({
        variables: {
          itemId: selectedItem.id,
          transactionType: txnType,
          quantity: qty,
          notes: `${txnType === 'receive' ? 'Received' : 'Issued'} from mobile app`,
        },
      });
      Alert.alert('Done', `${txnType === 'receive' ? 'Stock received' : 'Stock issued'}: ${qty} ${selectedItem.unit}`);
      setShowTransact(false);
      setTxnQty('');
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const submitNewItem = async () => {
    if (!newName || !newStock || !newReorder) {
      Alert.alert('Required', 'Fill in name, current stock, and reorder level.');
      return;
    }
    try {
      await createItem({
        variables: {
          name: newName,
          category: newCategory,
          unit: newUnit,
          currentStock: parseFloat(newStock),
          reorderLevel: parseFloat(newReorder),
          costPerUnit: parseFloat(newCost || '0'),
          supplier: newSupplier,
        },
      });
      Alert.alert('Added', `${newName} added to inventory.`);
      setShowAdd(false);
      setNewName(''); setNewCategory('feed'); setNewUnit('kg');
      setNewStock(''); setNewReorder(''); setNewCost(''); setNewSupplier('');
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Feed & Inventory" subtitle="Stock · Suppliers · Reorder Alerts" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        {/* KPIs */}
        <View style={styles.kpiGrid}>
          <KpiCard icon="cube" label="Total Items" value={(summary?.totalItems ?? items.length).toString()} color={theme.colors.primary} />
          <KpiCard icon="cash" label="Stock Value" value={`K${formatK(totalValue)}`} color={theme.colors.success} />
          <KpiCard icon="alert-circle" label="Low Stock" value={lowStockCount.toString()} color={theme.colors.danger} sub="reorder needed" />
          <KpiCard icon="layers" label="Categories" value={(summary?.categories ?? CATEGORIES.length - 1).toString()} color={theme.colors.info} />
        </View>

        {/* Action bar */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <PrimaryButton label="Add Item" icon="add-circle" onPress={() => setShowAdd(true)} style={{ flex: 1 }} />
          <GhostButton label="Reorder List" icon="cart" onPress={() => {
            const low = items.filter((i: any) => i.isLowStock);
            if (low.length === 0) { Alert.alert('All Good', 'No items need reordering right now.'); return; }
            Alert.alert('Low Stock Items', low.map((i: any) => `• ${i.name}: ${i.currentStock} ${i.unit} (min: ${i.reorderLevel})`).join('\n'));
          }} />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search items or suppliers…"
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c}
              onPress={() => setCat(c)}
              style={[styles.chip, cat === c && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, cat === c && styles.chipTxtActive]}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading && items.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {filtered.length === 0 && !loading && (
          <Card>
            <Text style={styles.empty}>No items found. Add your first inventory item.</Text>
            <PrimaryButton label="Add Item" icon="add-circle" onPress={() => setShowAdd(true)} style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* Item list */}
        {filtered.map((item: any) => {
          const stockPct = item.reorderLevel > 0
            ? Math.min(100, (item.currentStock / (item.reorderLevel * 3)) * 100)
            : 100;
          return (
            <Card key={item.id} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>{item.category} · {item.supplier || 'No supplier'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.stock, { color: item.isLowStock ? theme.colors.danger : theme.colors.success }]}>
                    {item.currentStock} {item.unit}
                  </Text>
                  {item.isLowStock && <Badge label="LOW STOCK" color={theme.colors.danger} />}
                </View>
              </View>

              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={styles.smallLabel}>Stock level (reorder at {item.reorderLevel} {item.unit})</Text>
                  <Text style={styles.smallLabel}>{item.currentStock} / ~{item.reorderLevel * 3} {item.unit}</Text>
                </View>
                <ProgressBar
                  value={item.currentStock}
                  max={item.reorderLevel * 3}
                  color={item.isLowStock ? theme.colors.danger : theme.colors.success}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                <Text style={styles.itemCost}>K{(item.costPerUnit ?? 0).toFixed(2)} per {item.unit}</Text>
                <Text style={styles.itemValue}>
                  Value: K{formatK((item.currentStock ?? 0) * (item.costPerUnit ?? 0))}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <PrimaryButton
                  label="Receive"
                  icon="add"
                  onPress={() => { setSelectedItem(item); setTxnType('receive'); setShowTransact(true); }}
                  style={{ flex: 1 }}
                />
                <GhostButton
                  label="Issue"
                  icon="remove"
                  onPress={() => { setSelectedItem(item); setTxnType('issue'); setShowTransact(true); }}
                />
              </View>
            </Card>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Transaction Modal */}
      <Modal visible={showTransact} animationType="slide" transparent onRequestClose={() => setShowTransact(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {txnType === 'receive' ? 'Receive Stock' : 'Issue Stock'}
              </Text>
              <Pressable onPress={() => setShowTransact(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            {selectedItem && (
              <Text style={styles.modalSub}>{selectedItem.name} · Current: {selectedItem.currentStock} {selectedItem.unit}</Text>
            )}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.fieldLabel}>Quantity ({selectedItem?.unit ?? 'units'})</Text>
              <TextInput
                value={txnQty}
                onChangeText={setTxnQty}
                placeholder="e.g. 50"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSubtle}
                style={styles.input}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <GhostButton label="Cancel" onPress={() => setShowTransact(false)} />
              <PrimaryButton
                label={txnLoading ? 'Saving…' : (txnType === 'receive' ? 'Confirm Receipt' : 'Confirm Issue')}
                icon={txnType === 'receive' ? 'add-circle' : 'remove-circle'}
                onPress={txnLoading ? () => {} : submitTransaction}
                style={{ flex: 1, opacity: txnLoading ? 0.7 : 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Inventory Item</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              <F label="Item name *" value={newName} onChange={setNewName} placeholder="e.g. Broiler Starter Feed" />
              <F label="Category" value={newCategory} onChange={setNewCategory} placeholder="feed / medication / equipment" />
              <F label="Unit" value={newUnit} onChange={setNewUnit} placeholder="kg / litres / pcs" />
              <F label="Current stock *" value={newStock} onChange={setNewStock} placeholder="e.g. 500" numeric />
              <F label="Reorder level *" value={newReorder} onChange={setNewReorder} placeholder="e.g. 50" numeric />
              <F label="Cost per unit (ZMW)" value={newCost} onChange={setNewCost} placeholder="e.g. 8.50" numeric />
              <F label="Supplier" value={newSupplier} onChange={setNewSupplier} placeholder="e.g. Zambeef" />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <GhostButton label="Cancel" onPress={() => setShowAdd(false)} />
              <PrimaryButton
                label={creating ? 'Adding…' : 'Add Item'}
                icon="cube"
                onPress={creating ? () => {} : submitNewItem}
                style={{ flex: 1, opacity: creating ? 0.7 : 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function F({ label, value, onChange, placeholder, numeric }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; numeric?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholderTextColor={theme.colors.textSubtle}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipTxt: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  chipTxtActive: { color: '#fff' },
  empty: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 20 },
  itemName: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  itemMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  stock: { fontSize: 15, fontWeight: '800' },
  smallLabel: { fontSize: 11, color: theme.colors.textMuted },
  itemCost: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  itemValue: { fontSize: 12, color: theme.colors.primary, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  modalSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt },
});
