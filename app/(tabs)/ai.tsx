import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, SectionTitle, Badge, PrimaryButton, GhostButton, KpiCard } from '../components/UI';
import { useVisionAnalyses, useRecommendations, useEnterprises } from '../lib/data';
import { useMutation } from '@apollo/client';
import { ANALYZE_IMAGE_MUTATION, ACTION_RECOMMENDATION_MUTATION, VISION_ANALYSES_QUERY, RECOMMENDATIONS_QUERY } from '../lib/gql';
import * as ImagePicker from 'expo-image-picker';

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#10B981',
};

export default function AIScreen() {
  const [tab, setTab] = useState<'scan' | 'recs'>('scan');
  const [scanning, setScanning] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'disease' | 'growth' | 'body_condition'>('disease');
  const [lastResult, setLastResult] = useState<any>(null);
  const [selectedEnterprise, setSelectedEnterprise] = useState<string | null>(null);

  const { data: analyses, loading: aLoading, refetch: refetchAnalyses } = useVisionAnalyses();
  const { data: recs, summary: recSummary, loading: rLoading, refetch: refetchRecs } = useRecommendations();
  const { data: enterprises } = useEnterprises();

  const loading = aLoading || rLoading;
  const refresh = () => { refetchAnalyses(); refetchRecs(); };

  const [analyzeImage, { loading: analyzing }] = useMutation(ANALYZE_IMAGE_MUTATION, {
    refetchQueries: [{ query: VISION_ANALYSES_QUERY }],
    onError: e => Alert.alert('Analysis failed', e.message),
  });

  const [actionRec, { loading: actioning }] = useMutation(ACTION_RECOMMENDATION_MUTATION, {
    refetchQueries: [{ query: RECOMMENDATIONS_QUERY }],
    onError: e => Alert.alert('Error', e.message),
  });

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow photo access to use AI scan.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setLastResult(null);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission required', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setLastResult(null);
    }
  };

  const runAnalysis = async () => {
    if (!imageUri) {
      Alert.alert('No image', 'Please select or take a photo first.');
      return;
    }
    // In a real app, upload to storage first and get URL.
    // For now, we pass the local URI as a placeholder so the backend can do mock analysis.
    try {
      setScanning(true);
      const { data } = await analyzeImage({
        variables: {
          analysisType,
          imageUrl: imageUri,
          userDescription: `Mobile scan - ${analysisType} analysis`,
          enterpriseId: selectedEnterprise,
          isPublic: false,
        },
      });
      setLastResult(data?.analyzeImage?.analysis ?? null);
    } catch (e: any) {
      // If backend rejects, show a helpful message
      setLastResult({
        diagnosis: 'Analysis unavailable offline',
        severity: 'low',
        confidencePct: 0,
        findings: 'Connect to the backend to run real AI analysis.',
        recommendations: 'Ensure you are connected to the farm server.',
        aiSummary: 'Image captured. AI analysis requires a network connection.',
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="AI Disease Scanner" subtitle="Powered by AgroNexus Intelligence" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        {/* Tab */}
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'scan' && styles.tabActive]} onPress={() => setTab('scan')}>
            <Ionicons name="eye" size={14} color={tab === 'scan' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabTxt, tab === 'scan' && styles.tabTxtActive]}>AI Scanner</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'recs' && styles.tabActive]} onPress={() => setTab('recs')}>
            <Ionicons name="bulb" size={14} color={tab === 'recs' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabTxt, tab === 'recs' && styles.tabTxtActive]}>
              Recommendations {recSummary?.criticalCount > 0 ? `(${recSummary.criticalCount} critical)` : ''}
            </Text>
          </Pressable>
        </View>

        {/* ─── SCANNER ─── */}
        {tab === 'scan' && (
          <>
            {/* Hero */}
            <View style={styles.hero}>
              <Ionicons name="camera" size={32} color={theme.colors.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.heroTitle}>Disease Detection</Text>
                <Text style={styles.heroSub}>
                  Take or upload a photo of your animal, crop, or feed. Our AI diagnoses diseases, checks growth, and assesses body condition.
                </Text>
              </View>
            </View>

            {/* Analysis type */}
            <SectionTitle title="Analysis Type" />
            <View style={styles.typeRow}>
              {([
                { key: 'disease',        label: 'Disease',      icon: 'medkit' },
                { key: 'growth',         label: 'Growth',       icon: 'trending-up' },
                { key: 'body_condition', label: 'Body Score',   icon: 'body' },
              ] as const).map(t => (
                <Pressable
                  key={t.key}
                  style={[styles.typeBtn, analysisType === t.key && styles.typeBtnActive]}
                  onPress={() => setAnalysisType(t.key)}
                >
                  <Ionicons name={t.icon as any} size={18} color={analysisType === t.key ? '#fff' : theme.colors.textMuted} />
                  <Text style={[styles.typeTxt, analysisType === t.key && styles.typeTxtActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Enterprise picker */}
            {enterprises.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <Pressable
                  style={[styles.entChip, !selectedEnterprise && styles.entChipActive]}
                  onPress={() => setSelectedEnterprise(null)}
                >
                  <Text style={[styles.entChipTxt, !selectedEnterprise && styles.entChipTxtActive]}>All</Text>
                </Pressable>
                {enterprises.map((e: any) => (
                  <Pressable
                    key={e.id}
                    style={[styles.entChip, selectedEnterprise === e.id && styles.entChipActive]}
                    onPress={() => setSelectedEnterprise(e.id)}
                  >
                    <Text style={[styles.entChipTxt, selectedEnterprise === e.id && styles.entChipTxtActive]}>{e.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {/* Image area */}
            <View style={styles.imageArea}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={48} color={theme.colors.textMuted} />
                  <Text style={styles.imagePlaceholderTxt}>No image selected</Text>
                  <Text style={styles.imagePlaceholderSub}>Take a clear photo of the animal, wound, or plant</Text>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <GhostButton label="Camera" icon="camera" onPress={takePhoto} style={{ flex: 1 }} />
              <GhostButton label="Gallery" icon="images" onPress={pickImage} style={{ flex: 1 }} />
            </View>

            <PrimaryButton
              label={analyzing || scanning ? 'Analysing…' : 'Run AI Analysis'}
              icon="eye"
              onPress={runAnalysis}
              style={{ opacity: analyzing || scanning ? 0.7 : 1 }}
            />
            {(analyzing || scanning) && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} />}

            {/* Last result */}
            {lastResult && (
              <Card style={[styles.resultCard, { borderLeftColor: SEVERITY_COLOR[lastResult.severity] ?? theme.colors.primary }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color={SEVERITY_COLOR[lastResult.severity] ?? theme.colors.primary} />
                  <Text style={styles.resultTitle}>AI Diagnosis Complete</Text>
                  <Badge
                    label={lastResult.severity?.toUpperCase() ?? 'N/A'}
                    color={SEVERITY_COLOR[lastResult.severity] ?? theme.colors.info}
                  />
                </View>
                <Text style={styles.resultLabel}>Diagnosis</Text>
                <Text style={styles.resultVal}>{lastResult.diagnosis ?? '—'}</Text>
                {lastResult.confidencePct > 0 && (
                  <>
                    <Text style={[styles.resultLabel, { marginTop: 10 }]}>Confidence</Text>
                    <Text style={styles.resultVal}>{lastResult.confidencePct.toFixed(0)}%</Text>
                  </>
                )}
                {lastResult.findings && (
                  <>
                    <Text style={[styles.resultLabel, { marginTop: 10 }]}>Findings</Text>
                    <Text style={styles.resultText}>{lastResult.findings}</Text>
                  </>
                )}
                {lastResult.recommendations && (
                  <>
                    <Text style={[styles.resultLabel, { marginTop: 10 }]}>Recommended Actions</Text>
                    <Text style={styles.resultText}>{lastResult.recommendations}</Text>
                  </>
                )}
                {lastResult.aiSummary && (
                  <View style={styles.summaryBox}>
                    <Ionicons name="information-circle" size={14} color={theme.colors.primary} />
                    <Text style={styles.summaryTxt}>{lastResult.aiSummary}</Text>
                  </View>
                )}
              </Card>
            )}

            {/* Past analyses */}
            <SectionTitle title="Past Analyses" style={{ marginTop: 16 }} />
            {aLoading && <ActivityIndicator color={theme.colors.primary} />}
            {analyses.length === 0 && !aLoading && (
              <Card><Text style={styles.empty}>No analyses yet. Scan your first animal to get started.</Text></Card>
            )}
            {analyses.slice(0, 10).map((a: any) => (
              <Card key={a.id} style={[styles.histCard, { borderLeftColor: SEVERITY_COLOR[a.severity] ?? theme.colors.info }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle}>{a.diagnosis ?? 'Analysed'}</Text>
                    <Text style={styles.histSub}>{a.analysisType?.replace('_', ' ')} · {a.enterprise?.name ?? 'Farm'}</Text>
                    {a.createdAt && <Text style={styles.histDate}>{new Date(a.createdAt).toLocaleDateString()}</Text>}
                  </View>
                  {a.severity && (
                    <Badge label={a.severity.toUpperCase()} color={SEVERITY_COLOR[a.severity] ?? theme.colors.info} />
                  )}
                </View>
                {a.aiSummary && <Text style={styles.histSummary}>{a.aiSummary}</Text>}
              </Card>
            ))}
          </>
        )}

        {/* ─── RECOMMENDATIONS ─── */}
        {tab === 'recs' && (
          <>
            {recSummary && (
              <View style={styles.kpiGrid}>
                <KpiCard icon="warning" label="Critical" value={recSummary.criticalCount?.toString() ?? '0'} color={theme.colors.danger} />
                <KpiCard icon="bulb" label="Active Recs" value={recSummary.totalActive?.toString() ?? '0'} color={theme.colors.primary} />
                <KpiCard icon="restaurant" label="Feed Alerts" value={recSummary.feedingAlerts?.toString() ?? '0'} color={theme.colors.accent} />
                <KpiCard icon="pulse" label="Health" value={recSummary.healthAlerts?.toString() ?? '0'} color={theme.colors.danger} />
              </View>
            )}

            <SectionTitle title="Smart Recommendations" />
            {rLoading && <ActivityIndicator color={theme.colors.primary} />}
            {recs.length === 0 && !rLoading && (
              <Card>
                <Text style={styles.empty}>No active recommendations. Your farm looks healthy!</Text>
              </Card>
            )}
            {recs.map((r: any) => (
              <Card key={r.id} style={[styles.recCard, r.urgency === 'critical' && styles.recCardCritical]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <View style={[styles.recIcon, {
                    backgroundColor: r.urgency === 'critical' ? '#FEE2E2' : r.urgency === 'high' ? '#FEF3C7' : '#DCFCE7',
                  }]}>
                    <Ionicons
                      name={r.urgency === 'critical' ? 'warning' : r.urgency === 'high' ? 'alert-circle' : 'bulb'}
                      size={18}
                      color={r.urgency === 'critical' ? '#EF4444' : r.urgency === 'high' ? '#F59E0B' : '#10B981'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recTitle}>{r.title}</Text>
                    {r.enterprise?.name && <Text style={styles.recEnt}>{r.enterprise.name}</Text>}
                    <Text style={styles.recDetail}>{r.detail}</Text>
                    {r.expiresAt && (
                      <Text style={styles.recExpiry}>Expires: {new Date(r.expiresAt).toLocaleDateString()}</Text>
                    )}
                  </View>
                  <View style={{ gap: 4 }}>
                    <Badge label={r.urgency?.toUpperCase() ?? 'INFO'} color={SEVERITY_COLOR[r.urgency] ?? theme.colors.info} />
                    <Badge label={r.impact ?? 'MEDIUM'} color={theme.colors.textMuted} />
                  </View>
                </View>
                {!r.isActioned && (
                  <PrimaryButton
                    label="Mark Done"
                    icon="checkmark-circle"
                    onPress={() => actionRec({ variables: { id: r.id } })}
                    style={[styles.recActionBtn, { opacity: actioning ? 0.7 : 1 }]}
                  />
                )}
                {r.isActioned && (
                  <View style={styles.actionedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                    <Text style={styles.actionedTxt}>Actioned</Text>
                  </View>
                )}
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: theme.colors.primary, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14,
  },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  heroSub: { color: '#D4E5C9', fontSize: 12, marginTop: 4, lineHeight: 18 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  tabActive: { backgroundColor: theme.colors.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  tabTxtActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' },
  typeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
  typeTxtActive: { color: '#fff' },
  entChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8, backgroundColor: '#fff' },
  entChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  entChipTxt: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
  entChipTxtActive: { color: '#fff' },
  imageArea: { borderRadius: 16, overflow: 'hidden', marginBottom: 12, height: 200, backgroundColor: theme.colors.surfaceAlt, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.border },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  imagePlaceholderTxt: { fontSize: 15, fontWeight: '700', color: theme.colors.textMuted, marginTop: 10 },
  imagePlaceholderSub: { fontSize: 12, color: theme.colors.textSubtle, textAlign: 'center', marginTop: 4 },
  resultCard: { marginTop: 16, borderLeftWidth: 4 },
  resultTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text, flex: 1 },
  resultLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  resultVal: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  resultText: { fontSize: 13, color: theme.colors.text, lineHeight: 20 },
  summaryBox: { flexDirection: 'row', gap: 6, marginTop: 10, backgroundColor: theme.colors.primary + '10', padding: 10, borderRadius: 8 },
  summaryTxt: { flex: 1, fontSize: 12, color: theme.colors.primaryDark, lineHeight: 18 },
  histCard: { marginBottom: 8, borderLeftWidth: 4 },
  histTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  histSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  histDate: { fontSize: 10, color: theme.colors.textSubtle, marginTop: 2 },
  histSummary: { fontSize: 12, color: theme.colors.text, marginTop: 8, lineHeight: 18 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 20 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  recCard: { marginBottom: 10 },
  recCardCritical: { borderWidth: 1, borderColor: '#FCA5A5' },
  recIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  recEnt: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  recDetail: { fontSize: 13, color: theme.colors.text, lineHeight: 18, marginTop: 4 },
  recExpiry: { fontSize: 10, color: theme.colors.textSubtle, marginTop: 4 },
  recActionBtn: { marginTop: 12 },
  actionedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  actionedTxt: { fontSize: 13, color: theme.colors.success, fontWeight: '600' },
});
