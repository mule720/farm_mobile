import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton } from '../components/UI';
import { useInventory, formatK } from '../lib/data';

const categories = ['All', 'Poultry Feed', 'Pig Feed', 'Fish Feed', 'Vaccines', 'Medication', 'Supplements', 'Seeds', 'Fertilizer'];

export default function Inventory() {
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const { data: items, loading, refresh } = useInventory();

  const filtered = useMemo(() => {
    const list = items || [];
    return list.filter(i =>
      (cat === 'All' || i.category === cat) &&
      (query === '' || i.name.toLowerCase().includes(query.toLowerCase()) || (i.supplier || '').toLowerCase().includes(query.toLowerCase()))
    );
  }, [cat, query, items]);

  const list = items || [];
  const totalValue = list.reduce((s, i) => s + i.stockKg * i.costPerKg, 0);
  const lowStock = list.filter(i => i.stockKg < i.reorderKg).length;
  const totalItems = list.length;
  const totalKg = list.filter(i => !i.unit).reduce((s, i) => s + i.stockKg, 0);

  return (
    <View style={styles.container}>
      <AppHeader title="Feed & Inventory" subtitle="Stock · Suppliers · Reorder Alerts" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
      >
        <View style={styles.kpiGrid}>
          <KpiCard icon="cube" label="Total Items" value={totalItems.toString()} color={theme.colors.primary} />
          <KpiCard icon="cash" label="Stock Value" value={formatK(totalValue)} color={theme.colors.success} />
          <KpiCard icon="alert-circle" label="Low Stock" value={lowStock.toString()} color={theme.colors.danger} sub="reorder needed" />
          <KpiCard icon="scale" label="Total Weight" value={`${(totalKg / 1000).toFixed(1)}t`} color={theme.colors.info} />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            placeholder="Search items or suppliers..."
            placeholderTextColor={theme.colors.textSubtle}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {categories.map(c => (
            <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, cat === c && styles.chipActive]}>
              <Text style={[styles.chipTxt, cat === c && styles.chipTxtActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="Receive Stock" icon="add-circle" onPress={() => Alert.alert('Receive Stock', 'Record inbound delivery from supplier.')} style={{ flex: 1 }} />
          <GhostButton label="Issue Feed" icon="arrow-redo" onPress={() => Alert.alert('Issue Feed', 'Issue feed to a department/batch.')} />
        </View>

        <SectionTitle title={`Inventory (${filtered.length})`} />

        {loading && list.length === 0 && (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {filtered.map(i => {
          const low = i.stockKg < i.reorderKg;
          const value = i.stockKg * i.costPerKg;

          return (
            <Card key={i.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.itemIcon, { backgroundColor: getCatColor(i.category) + '20' }]}>
                  <Ionicons name={getCatIcon(i.category) as any} size={18} color={getCatColor(i.category)} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{i.name}</Text>
                      <Text style={styles.itemSupplier}>{i.supplier}</Text>
                    </View>
                    {low && <Badge label="LOW" color={theme.colors.danger} />}
                  </View>

                  <View style={styles.itemMetrics}>
                    <View>
                      <Text style={styles.metricLbl}>Stock</Text>
                      <Text style={styles.metricVal}>{i.stockKg.toLocaleString()} {i.unit || 'kg'}</Text>
                    </View>
                    <View>
                      <Text style={styles.metricLbl}>Reorder at</Text>
                      <Text style={styles.metricVal}>{i.reorderKg} {i.unit || 'kg'}</Text>
                    </View>
                    <View>
                      <Text style={styles.metricLbl}>Cost/{i.unit || 'kg'}</Text>
                      <Text style={styles.metricVal}>K{i.costPerKg}</Text>
                    </View>
                    <View>
                      <Text style={styles.metricLbl}>Value</Text>
                      <Text style={[styles.metricVal, { color: theme.colors.success }]}>{formatK(value)}</Text>
                    </View>
                  </View>

                  <ProgressBar
                    value={i.stockKg}
                    max={Math.max(i.reorderKg * 3, i.stockKg, 1)}
                    color={low ? theme.colors.danger : i.stockKg < i.reorderKg * 1.5 ? theme.colors.warning : theme.colors.success}
                  />
                </View>
              </View>
            </Card>
          );
        })}

        {/* Reorder forecast */}
        <SectionTitle title="Reorder Forecast (Next 7 Days)" />
        <Card>
          {[
            { item: 'Broiler Finisher Pellet', qty: '2,000 kg', supplier: 'Novatek Feeds', cost: 21600, days: 4 },
            { item: 'Sow Gestation Feed', qty: '500 kg', supplier: 'National Milling', cost: 7400, days: 5 },
            { item: 'Fish Starter Feed', qty: '300 kg', supplier: 'Aquafeed Zambia', cost: 8550, days: 6 },
            { item: 'Newcastle Vaccine', qty: '200 doses', supplier: 'Vet Supplies Co.', cost: 17000, days: 7 },
          ].map((r, i) => (
            <View key={i} style={styles.reorderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.reorderItem}>{r.item}</Text>
                <Text style={styles.reorderSub}>{r.qty} · {r.supplier}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.reorderCost}>{formatK(r.cost)}</Text>
                <Badge label={`In ${r.days}d`} color={r.days <= 4 ? theme.colors.danger : theme.colors.warning} />
              </View>
            </View>
          ))}
          <PrimaryButton
            label="Generate Purchase Orders"
            icon="document-text"
            onPress={() => Alert.alert('Purchase Orders Generated', '4 POs created and sent to suppliers.')}
            style={{ marginTop: 12 }}
          />
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function getCatColor(cat: string) {
  const map: Record<string, string> = {
    'Poultry Feed': '#D4AF37',
    'Pig Feed': '#DC2626',
    'Fish Feed': '#0EA5E9',
    'Vaccines': '#7C3AED',
    'Medication': '#EC4899',
    'Supplements': '#16A34A',
    'Seeds': '#4A7C2C',
    'Fertilizer': '#EA580C',
  };
  return map[cat] || theme.colors.primary;
}

function getCatIcon(cat: string) {
  const map: Record<string, string> = {
    'Poultry Feed': 'nutrition',
    'Pig Feed': 'nutrition',
    'Fish Feed': 'fish',
    'Vaccines': 'medkit',
    'Medication': 'flask',
    'Supplements': 'leaf',
    'Seeds': 'flower',
    'Fertilizer': 'water',
  };
  return map[cat] || 'cube';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: theme.colors.text },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  chipTxtActive: { color: '#fff' },
  itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  itemSupplier: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  itemMetrics: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 },
  metricLbl: { fontSize: 10, color: theme.colors.textMuted },
  metricVal: { fontSize: 12, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  reorderRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center' },
  reorderItem: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  reorderSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  reorderCost: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginBottom: 4 },
});
