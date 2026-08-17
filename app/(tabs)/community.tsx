import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, SectionTitle, Badge, PrimaryButton, GhostButton } from '../components/UI';
import { useCommunityReports } from '../lib/data';
import { useMutation } from '@apollo/client';
import {
  SUBMIT_FARMER_REPORT_MUTATION,
  MARK_REPORT_HELPFUL_MUTATION,
  COMMUNITY_REPORTS_QUERY,
} from '../lib/gql';

const STATUS_COLOR: Record<string, string> = {
  open:       '#3B82F6',
  resolved:   '#10B981',
  in_review:  '#F59E0B',
};

export default function CommunityScreen() {
  const [tab, setTab] = useState<'feed' | 'ask'>('feed');
  const [showPost, setShowPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postCrop, setPostCrop] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [runAI, setRunAI] = useState(true);

  const { data: reports, loading, refetch } = useCommunityReports(50);

  const [submitReport, { loading: submitting }] = useMutation(SUBMIT_FARMER_REPORT_MUTATION, {
    refetchQueries: [{ query: COMMUNITY_REPORTS_QUERY, variables: { limit: 50 } }],
    onCompleted: d => {
      const rep = d.submitFarmerReport?.report;
      const msg = rep?.hasAiAnalysis
        ? `Posted! AI Diagnosis: ${rep.aiDiagnosis ?? 'Analysing...'}`
        : 'Your report has been posted to the community.';
      Alert.alert('Posted!', msg);
      setShowPost(false);
      setPostTitle(''); setPostDesc(''); setPostCrop(''); setPostLocation('');
    },
    onError: e => Alert.alert('Error', e.message),
  });

  const [markHelpful] = useMutation(MARK_REPORT_HELPFUL_MUTATION, {
    refetchQueries: [{ query: COMMUNITY_REPORTS_QUERY, variables: { limit: 50 } }],
    onError: e => Alert.alert('Error', e.message),
  });

  const submitPost = () => {
    if (!postTitle || !postDesc) {
      Alert.alert('Required', 'Please add a title and description.');
      return;
    }
    submitReport({
      variables: {
        title: postTitle,
        description: postDesc,
        cropOrLivestock: postCrop,
        location: postLocation,
        isPublic: true,
        runAiAnalysis: runAI,
      },
    });
  };

  const openReports = reports.filter((r: any) => r.status === 'open' || !r.status);
  const resolvedReports = reports.filter((r: any) => r.status === 'resolved');

  return (
    <View style={styles.container}>
      <AppHeader title="Farmer Community" subtitle="Share · Learn · Solve Together" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={theme.colors.primary} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="people" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Community Knowledge Hub</Text>
            <Text style={styles.heroSub}>
              Share challenges, learn from other farmers, and get AI-assisted diagnoses on real farm issues.
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <Pressable style={[styles.tab, tab === 'feed' && styles.tabActive]} onPress={() => setTab('feed')}>
            <Ionicons name="list" size={14} color={tab === 'feed' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabTxt, tab === 'feed' && styles.tabTxtActive]}>Community Feed</Text>
          </Pressable>
          <Pressable style={[styles.tab, tab === 'ask' && styles.tabActive]} onPress={() => setTab('ask')}>
            <Ionicons name="help-circle" size={14} color={tab === 'ask' ? '#fff' : theme.colors.textMuted} />
            <Text style={[styles.tabTxt, tab === 'ask' && styles.tabTxtActive]}>Ask a Question</Text>
          </Pressable>
        </View>

        <PrimaryButton
          label="Post Issue / Report"
          icon="add-circle"
          onPress={() => setShowPost(true)}
          style={{ marginBottom: 14 }}
        />

        {loading && reports.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
          </View>
        )}

        {/* Feed */}
        {tab === 'feed' && (
          <>
            {openReports.length === 0 && resolvedReports.length === 0 && !loading && (
              <Card>
                <Text style={styles.empty}>No community reports yet. Be the first to share an experience!</Text>
              </Card>
            )}

            {openReports.length > 0 && (
              <SectionTitle title={`Open Issues (${openReports.length})`} />
            )}
            {openReports.map((r: any) => (
              <ReportCard key={r.id} r={r} onHelpful={() => markHelpful({ variables: { reportId: r.id } })} />
            ))}

            {resolvedReports.length > 0 && (
              <SectionTitle title={`Resolved & Helpful (${resolvedReports.length})`} style={{ marginTop: 8 }} />
            )}
            {resolvedReports.map((r: any) => (
              <ReportCard key={r.id} r={r} onHelpful={() => markHelpful({ variables: { reportId: r.id } })} />
            ))}
          </>
        )}

        {/* Ask a question tab */}
        {tab === 'ask' && (
          <>
            <Card style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Ionicons name="bulb" size={20} color={theme.colors.accent} />
                <Text style={styles.tipTitle}>How it works</Text>
              </View>
              <Text style={styles.tipText}>
                1. Post your farming challenge or question below.{'\n'}
                2. Our AI analyses your description and suggests a diagnosis.{'\n'}
                3. Other farmers who faced the same issue can share how they solved it.{'\n'}
                4. Resolved questions become searchable knowledge for all farmers.
              </Text>
            </Card>

            {/* Common Questions Reference */}
            <SectionTitle title="Common Questions" />
            {[
              { q: 'My broilers are dying suddenly. What could it be?', a: 'Check for Newcastle disease, infectious bronchitis, or heat stress. Ensure proper ventilation and water access.' },
              { q: 'Pig is losing weight despite eating well.', a: 'Could be internal parasites (worms). Deworm with Albendazole or Levamisole. Consult a vet if condition worsens.' },
              { q: 'Maize leaves turning yellow from the bottom.', a: 'Nitrogen deficiency is most common. Top-dress with urea fertilizer. Also check for armyworms.' },
              { q: 'Cattle cow not coming in heat (anoestrus).', a: 'Common after calving. Ensure adequate nutrition, check BCS. Progesterone treatment may help.' },
              { q: 'Fish dying at the surface of the pond.', a: 'Low dissolved oxygen. Run aerators, reduce stocking density. Avoid overfeeding causing algae bloom.' },
            ].map((item, i) => (
              <Card key={i} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <View style={styles.qIcon}>
                    <Text style={styles.qLetter}>Q</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.qText}>{item.q}</Text>
                    <View style={styles.answerBox}>
                      <Text style={styles.answerLabel}>Community Answer</Text>
                      <Text style={styles.answerText}>{item.a}</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Post Modal */}
      <Modal visible={showPost} animationType="slide" transparent onRequestClose={() => setShowPost(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Issue / Report</Text>
              <Pressable onPress={() => setShowPost(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              <MField label="Title / Subject *" value={postTitle} onChange={setPostTitle} placeholder="e.g. Broilers dying at 2 weeks" />
              <MField label="Describe the problem in detail *" value={postDesc} onChange={setPostDesc} placeholder="What did you observe? When did it start? How many animals affected?" multiline />
              <MField label="Crop or livestock type" value={postCrop} onChange={setPostCrop} placeholder="e.g. Broiler chicken, Maize" />
              <MField label="Location" value={postLocation} onChange={setPostLocation} placeholder="e.g. Kabwe, Zambia" />

              <Pressable style={styles.aiToggle} onPress={() => setRunAI(!runAI)}>
                <Ionicons name={runAI ? 'checkbox' : 'square-outline'} size={20} color={theme.colors.primary} />
                <Text style={styles.aiToggleTxt}>Run AI diagnosis on this report</Text>
              </Pressable>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <GhostButton label="Cancel" onPress={() => setShowPost(false)} />
              <PrimaryButton
                label={submitting ? 'Posting…' : 'Post to Community'}
                icon="people"
                onPress={submitting ? () => {} : submitPost}
                style={{ flex: 1, opacity: submitting ? 0.7 : 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ReportCard({ r, onHelpful }: { r: any; onHelpful: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={styles.reportCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportTitle}>{r.title}</Text>
          {r.cropOrLivestock && <Text style={styles.reportMeta}>{r.cropOrLivestock}</Text>}
          {r.location && <Text style={styles.reportMeta}>📍 {r.location}</Text>}
          {r.submittedBy?.fullName && (
            <Text style={styles.reportBy}>Posted by {r.submittedBy.fullName}</Text>
          )}
        </View>
        <Badge label={(r.status ?? 'open').replace('_', ' ').toUpperCase()} color={STATUS_COLOR[r.status ?? 'open'] ?? theme.colors.info} />
      </View>

      {!expanded && (
        <Text style={styles.reportDesc} numberOfLines={2}>{r.description}</Text>
      )}
      {expanded && (
        <>
          <Text style={styles.reportDesc}>{r.description}</Text>
          {r.hasAiAnalysis && (
            <View style={styles.aiBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="eye" size={14} color={theme.colors.primary} />
                <Text style={styles.aiBoxTitle}>AI Diagnosis</Text>
              </View>
              {r.aiDiagnosis && <Text style={styles.aiText}>{r.aiDiagnosis}</Text>}
              {r.aiRecommendations && (
                <>
                  <Text style={[styles.aiBoxTitle, { marginTop: 8 }]}>Recommendation</Text>
                  <Text style={styles.aiText}>{r.aiRecommendations}</Text>
                </>
              )}
            </View>
          )}
        </>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 }}>
        <Pressable onPress={onHelpful} style={styles.helpBtn}>
          <Ionicons name="thumbs-up" size={14} color={theme.colors.primary} />
          <Text style={styles.helpCount}>{r.helpfulCount ?? 0} helpful</Text>
        </Pressable>
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.expandBtn}>
          <Text style={styles.expandTxt}>{expanded ? 'Show less' : 'Read more'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={theme.colors.textMuted} />
        </Pressable>
        {r.hasAiAnalysis && (
          <View style={styles.aiBadge}>
            <Ionicons name="eye" size={12} color={theme.colors.primary} />
            <Text style={styles.aiBadgeTxt}>AI Analysed</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

function MField({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        placeholderTextColor={theme.colors.textSubtle}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
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
  empty: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 20 },
  reportCard: { marginBottom: 10 },
  reportTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text, flex: 1 },
  reportMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  reportBy: { fontSize: 10, color: theme.colors.textSubtle, marginTop: 2 },
  reportDesc: { fontSize: 13, color: theme.colors.text, lineHeight: 19, marginTop: 8 },
  aiBox: { marginTop: 10, backgroundColor: theme.colors.primary + '08', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: theme.colors.primary + '20' },
  aiBoxTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.primaryDark },
  aiText: { fontSize: 13, color: theme.colors.text, lineHeight: 18, marginTop: 2 },
  helpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  helpCount: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandTxt: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  aiBadgeTxt: { fontSize: 10, color: theme.colors.primary, fontWeight: '700' },
  tipTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  tipText: { fontSize: 13, color: theme.colors.text, lineHeight: 22 },
  qIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  qLetter: { color: '#fff', fontWeight: '800', fontSize: 13 },
  qText: { fontSize: 13, fontWeight: '700', color: theme.colors.text, lineHeight: 20 },
  answerBox: { marginTop: 8, backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10 },
  answerLabel: { fontSize: 10, fontWeight: '800', color: '#15803D', marginBottom: 4, textTransform: 'uppercase' },
  answerText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  aiToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, padding: 10, backgroundColor: theme.colors.primary + '08', borderRadius: 10 },
  aiToggleTxt: { fontSize: 13, color: theme.colors.primaryDark, fontWeight: '600' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt },
});
