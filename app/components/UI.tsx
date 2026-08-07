import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function KpiCard({
  icon, label, value, sub, color = theme.colors.primary, trend,
}: { icon: any; label: string; value: string; sub?: string; color?: string; trend?: number }) {
  return (
    <View style={[styles.kpi, shadow]}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      <View style={styles.kpiSubRow}>
        {sub && <Text style={styles.kpiSub}>{sub}</Text>}
        {trend !== undefined && (
          <View style={[styles.trendBadge, { backgroundColor: trend >= 0 ? theme.colors.success + '20' : theme.colors.danger + '20' }]}>
            <Ionicons name={trend >= 0 ? 'trending-up' : 'trending-down'} size={10} color={trend >= 0 ? theme.colors.success : theme.colors.danger} />
            <Text style={[styles.trendTxt, { color: trend >= 0 ? theme.colors.success : theme.colors.danger }]}>{Math.abs(trend)}%</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function Badge({ label, color, bg }: { label: string; color: string; bg?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg || color + '18' }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color = theme.colors.primary, height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <View style={[styles.progressTrack, { height }]}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color, height }]} />
    </View>
  );
}

export function PrimaryButton({ label, icon, onPress, color = theme.colors.primary, style }: { label: string; icon?: any; onPress?: () => void; color?: string; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }, style]}>
      {icon && <Ionicons name={icon} size={16} color="#fff" style={{ marginRight: 6 }} />}
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, icon, onPress }: { label: string; icon?: any; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}>
      {icon && <Ionicons name={icon} size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />}
      <Text style={styles.ghostBtnTxt}>{label}</Text>
    </Pressable>
  );
}

// Lightweight bar chart
export function BarChart({ data, height = 140, color = theme.colors.primary }: { data: { label: string; value: number; color?: string }[]; height?: number; color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={[styles.barChart, { height: height + 30 }]}>
      <View style={[styles.barRow, { height }]}>
        {data.map((d, i) => {
          const h = (d.value / max) * height;
          return (
            <View key={i} style={styles.barCol}>
              <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
                <View style={{ width: '70%', height: h, backgroundColor: d.color || color, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.barLabels}>
        {data.map((d, i) => (
          <Text key={i} style={styles.barLabel} numberOfLines={1}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

// Horizontal bar (for enterprise breakdowns)
export function HBar({ label, value, max, color, valueLabel }: { label: string; value: number; max: number; color: string; valueLabel?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: theme.colors.text, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 13, color: theme.colors.textMuted, fontWeight: '600' }}>{valueLabel || value}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: theme.colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  sectionAction: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  kpi: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 14,
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '500' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  kpiSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  kpiSub: { fontSize: 11, color: theme.colors.textSubtle },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  trendTxt: { fontSize: 10, fontWeight: '700', marginLeft: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  progressTrack: { backgroundColor: theme.colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  progressFill: { borderRadius: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  ghostBtnTxt: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
  barChart: { width: '100%' },
  barRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { flex: 1, alignItems: 'center' },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: theme.colors.textMuted },
});
