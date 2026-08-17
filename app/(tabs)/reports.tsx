/**
 * Analysis & Reports screen
 * Lets users generate on-demand PDF/Excel reports and view past ones.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Modal, RefreshControl, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@apollo/client';
import { theme } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, SectionTitle, Badge } from '../components/UI';
import { REPORTS_QUERY, CREATE_REPORT_MUTATION } from '../lib/gql';

// ── Types ─────────────────────────────────────────────────────────────────────
type Report = {
  id: string;
  name: string;
  reportType: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  outputFormat: string;
  fileUrl: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  generatedAt: string | null;
  enterprise: { id: string; name: string } | null;
  generatedBy: { id: string; fullName: string } | null;
};

// ── Config ────────────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { key: 'production',  label: 'Production Report',  icon: 'leaf',           color: '#16A34A' },
  { key: 'financial',   label: 'Financial Report',   icon: 'cash',           color: '#D4AF37' },
  { key: 'inventory',   label: 'Inventory Report',   icon: 'cube',           color: '#0EA5E9' },
  { key: 'health',      label: 'Animal Health',      icon: 'medkit',         color: '#DC2626' },
  { key: 'custom',      label: 'Custom Report',      icon: 'document-text',  color: '#7C3AED' },
];

const STATUS_COLOR: Record<string, string> = {
  pending:    theme.colors.warning,
  processing: theme.colors.info,
  ready:      theme.colors.success,
  failed:     theme.colors.danger,
};

const FORMATS = ['pdf', 'excel', 'csv'];

// ─── helpers ──────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── New Report Modal ──────────────────────────────────────────────────────────
function NewReportModal({ visible, onClose, onCreated }: {
  visible: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [reportType, setReportType] = useState('production');
  const [format, setFormat] = useState('pdf');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '365d'>('30d');
  const [saving, setSaving] = useState(false);

  const periodLabels: Record<string, string> = {
    '7d': 'Last 7 days', '30d': 'Last 30 days',
    '90d': 'Last 90 days', '365d': 'Last 12 months',
  };
  const periodDays: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };

  const [createReport] = useMutation(CREATE_REPORT_MUTATION);

  async function submit() {
    const days = periodDays[period];
    const typeLabel = REPORT_TYPES.find(r => r.key === reportType)?.label ?? reportType;
    const name = `${typeLabel} — ${periodLabels[period]}`;
    setSaving(true);
    try {
      const { data, errors } = await createReport({
        variables: {
          name,
          reportType,
          dateFrom: daysAgo(days),
          dateTo: today(),
          outputFormat: format,
        },
      });
      if (errors?.length) { Alert.alert('Error', errors[0].message); return; }
      const status = data?.createReport?.report?.status;
      Alert.alert(
        'Report queued',
        `"${name}" is being generated. It will appear below once ready.`,
      );
      onCreated();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create report.');
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Analysis Report</Text>
            <Pressable onPress={onClose} hitSlop={10}><Ionicons name="close" size={22} color={theme.colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">

            <Text style={s.lbl}>Report type</Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {REPORT_TYPES.map(rt => (
                <Pressable
                  key={rt.key}
                  onPress={() => setReportType(rt.key)}
                  style={[s.typeRow, reportType === rt.key && { borderColor: rt.color, backgroundColor: rt.color + '10' }]}
                >
                  <View style={[s.typeIcon, { backgroundColor: rt.color + '20' }]}>
                    <Ionicons name={rt.icon as any} size={18} color={rt.color} />
                  </View>
                  <Text style={[s.typeLabel, reportType === rt.key && { color: rt.color, fontWeight: '800' }]}>
                    {rt.label}
                  </Text>
                  {reportType === rt.key && <Ionicons name="checkmark-circle" size={18} color={rt.color} />}
                </Pressable>
              ))}
            </View>

            <Text style={s.lbl}>Time period</Text>
            <View style={s.chipRow}>
              {(['7d', '30d', '90d', '365d'] as const).map(p => (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[s.chip, period === p && s.chipActive]}
                >
                  <Text style={[s.chipTxt, period === p && s.chipTxtActive]}>{periodLabels[p]}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.lbl}>Format</Text>
            <View style={s.chipRow}>
              {FORMATS.map(f => (
                <Pressable
                  key={f}
                  onPress={() => setFormat(f)}
                  style={[s.chip, format === f && s.chipActive]}
                >
                  <Text style={[s.chipTxt, format === f && s.chipTxtActive]}>{f.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={saving ? undefined : submit}
              style={[s.submitBtn, saving && { opacity: 0.6 }]}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Ionicons name="document-text" size={18} color="#fff" />
                    <Text style={s.submitTxt}>Generate Report</Text>
                  </View>
                )}
            </Pressable>
            <Pressable onPress={onClose} style={s.cancelBtn}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Report row ────────────────────────────────────────────────────────────────
function ReportRow({ report }: { report: Report }) {
  const rt = REPORT_TYPES.find(r => r.key === report.reportType);
  const color = rt?.color ?? theme.colors.primary;

  function openFile() {
    if (report.fileUrl) {
      Linking.openURL(report.fileUrl).catch(() =>
        Alert.alert('Cannot open', 'The report file could not be opened.')
      );
    }
  }

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={[s.reportIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={(rt?.icon ?? 'document-text') as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.reportName} numberOfLines={1}>{report.name}</Text>
          <Text style={s.reportMeta}>
            {report.dateFrom && report.dateTo ? `${report.dateFrom} → ${report.dateTo}` : 'Date range not set'}
            {report.enterprise ? ` · ${report.enterprise.name}` : ''}
          </Text>
          {report.generatedBy && (
            <Text style={s.reportMeta}>By {report.generatedBy.fullName}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={report.status} color={STATUS_COLOR[report.status] ?? theme.colors.textMuted} />
          <Text style={s.reportFmt}>{report.outputFormat.toUpperCase()}</Text>
        </View>
      </View>

      {report.status === 'ready' && report.fileUrl && (
        <Pressable onPress={openFile} style={[s.downloadBtn, { borderColor: color }]}>
          <Ionicons name="download-outline" size={14} color={color} />
          <Text style={[s.downloadTxt, { color }]}>Open / Download</Text>
        </Pressable>
      )}
      {report.status === 'processing' && (
        <View style={s.processingRow}>
          <ActivityIndicator size="small" color={theme.colors.info} />
          <Text style={s.processingTxt}>Generating… pull to refresh</Text>
        </View>
      )}
      {report.status === 'failed' && (
        <Text style={s.failedTxt}>Generation failed — try again.</Text>
      )}
    </Card>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const [showNew, setShowNew] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, loading, refetch } = useQuery(REPORTS_QUERY, {
    variables: { reportType: typeFilter === 'all' ? undefined : typeFilter },
    fetchPolicy: 'cache-and-network',
  });

  const reports: Report[] = data?.reports ?? [];

  const onCreated = useCallback(() => {
    setTimeout(() => refetch(), 1500);
  }, [refetch]);

  return (
    <View style={s.container}>
      <AppHeader title="Analysis & Reports" subtitle="Generate and download farm reports" />

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        {/* Quick stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Total', val: reports.length, color: theme.colors.primary },
            { label: 'Ready', val: reports.filter(r => r.status === 'ready').length, color: theme.colors.success },
            { label: 'Processing', val: reports.filter(r => r.status === 'processing').length, color: theme.colors.info },
            { label: 'Failed', val: reports.filter(r => r.status === 'failed').length, color: theme.colors.danger },
          ].map(({ label, val, color }) => (
            <View key={label} style={[s.statBox, { borderLeftColor: color }]}>
              <Text style={[s.statVal, { color }]}>{val}</Text>
              <Text style={s.statLbl}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Generate button */}
        <Pressable onPress={() => setShowNew(true)} style={s.generateBtn}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={s.generateTxt}>Generate New Report</Text>
        </Pressable>

        {/* Type filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {[{ key: 'all', label: 'All Reports' }, ...REPORT_TYPES].map(f => (
            <Pressable
              key={f.key}
              onPress={() => setTypeFilter(f.key)}
              style={[s.chip, typeFilter === f.key && s.chipActive]}
            >
              <Text style={[s.chipTxt, typeFilter === f.key && s.chipTxtActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title={`Reports (${reports.length})`} />

        {loading && reports.length === 0 ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : reports.length === 0 ? (
          <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="document-text-outline" size={40} color={theme.colors.textMuted} />
            <Text style={{ color: theme.colors.textMuted, marginTop: 10, fontSize: 14, fontWeight: '600' }}>
              No reports yet
            </Text>
            <Text style={{ color: theme.colors.textSubtle, marginTop: 4, fontSize: 12 }}>
              Tap "Generate New Report" to create your first analysis.
            </Text>
          </Card>
        ) : (
          reports.map(r => <ReportRow key={r.id} report={r} />)
        )}

        {/* Guide card */}
        <Card style={{ marginTop: 8, backgroundColor: theme.colors.primary + '08' }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.lbl, { color: theme.colors.primary }]}>About reports</Text>
              <Text style={{ fontSize: 12, color: theme.colors.textMuted, lineHeight: 18 }}>
                Reports are generated asynchronously on the server. Pull down to refresh the status.
                Once "ready", tap "Open / Download" to view or share the file.
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ height: 32 }} />
      </ScrollView>

      <NewReportModal visible={showNew} onClose={() => setShowNew(false)} onCreated={onCreated} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, borderLeftWidth: 3 },
  statVal: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 10, color: theme.colors.textMuted, marginTop: 2, fontWeight: '600' },

  generateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.primary, borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 18, marginBottom: 14, justifyContent: 'center',
  },
  generateTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },

  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  chipTxtActive: { color: '#fff' },

  reportIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportName: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  reportMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  reportFmt: { fontSize: 10, fontWeight: '700', color: theme.colors.textMuted },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start',
  },
  downloadTxt: { fontSize: 12, fontWeight: '700' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  processingTxt: { fontSize: 12, color: theme.colors.info, fontWeight: '600' },
  failedTxt: { fontSize: 12, color: theme.colors.danger, marginTop: 8, fontWeight: '600' },

  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  lbl: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },

  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, backgroundColor: '#fff',
  },
  typeIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },

  submitBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  submitTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelTxt: { color: theme.colors.textMuted, fontWeight: '600', fontSize: 14 },
});
