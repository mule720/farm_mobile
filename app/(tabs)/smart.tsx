import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, SectionTitle, Badge, ProgressBar, GhostButton } from '../components/UI';
import { useBatches, broilerFeedTable, piggeryFeedTable, getBroilerRecommendation, getPiggeryRecommendation, formatK } from '../lib/data';

export default function SmartFeed() {
  const [filter, setFilter] = useState<'all' | 'Broilers' | 'Piggery' | 'Fish' | 'Ducks' | 'Goats'>('all');
  const { data: batches, loading, refresh } = useBatches();

  const filtered = useMemo(() => filter === 'all' ? batches : batches.filter(b => b.enterprise === filter), [filter, batches]);


  // Calculate today's total feed and water requirements
  const todayTotals = useMemo(() => {
    let feed = 0, water = 0, cost = 0;
    filtered.forEach(b => {
      if (b.enterprise === 'Broilers' || b.enterprise === 'Village Chicken') {
        const r = getBroilerRecommendation(b.ageDays);
        feed += (r.gramsPerBird * b.currentCount) / 1000;
        water += (r.waterMlPerBird * b.currentCount) / 1000;
        cost += ((r.gramsPerBird * b.currentCount) / 1000) * 11.5;
      } else if (b.enterprise === 'Piggery') {
        const r = getPiggeryRecommendation(b.avgWeightKg);
        feed += r.kgPerDay * b.currentCount;
        water += r.waterLPerDay * b.currentCount;
        cost += r.kgPerDay * b.currentCount * 13.5;
      } else if (b.enterprise === 'Fish') {
        const f = b.currentCount * b.avgWeightKg * 0.03;
        feed += f;
        cost += f * 25;
      } else if (b.enterprise === 'Ducks') {
        feed += b.currentCount * 0.18;
        water += b.currentCount * 0.4;
        cost += b.currentCount * 0.18 * 11;
      } else if (b.enterprise === 'Goats') {
        feed += b.currentCount * 0.4;
        water += b.currentCount * 4;
        cost += b.currentCount * 0.4 * 8;
      }
    });
    return { feed: feed.toFixed(0), water: water.toFixed(0), cost: cost.toFixed(0) };
  }, [filtered]);

  return (
    <View style={styles.container}>
      <AppHeader title="Smart Feeding & Water" subtitle="AI-driven daily recommendations" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}>

        {/* Summary banner */}
        <View style={styles.banner}>
          <View style={styles.bannerHeader}>
            <Ionicons name="bulb" size={22} color={theme.colors.accent} />
            <Text style={styles.bannerTitle}>Today's Smart Operations Plan</Text>
          </View>
          <Text style={styles.bannerSub}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>

          <View style={styles.bannerStats}>
            <BannerStat icon="nutrition" label="Total Feed" value={`${parseFloat(todayTotals.feed).toLocaleString()} kg`} />
            <BannerStat icon="water" label="Total Water" value={`${parseFloat(todayTotals.water).toLocaleString()} L`} />
            <BannerStat icon="cash" label="Daily Cost" value={formatK(parseFloat(todayTotals.cost))} />
          </View>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
          {(['all', 'Broilers', 'Piggery', 'Fish', 'Ducks', 'Goats'] as const).map(f => (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
              <Text style={[styles.chipTxt, filter === f && styles.chipTxtActive]}>{f === 'all' ? 'All Enterprises' : f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionTitle title="Daily Feeding Schedule" />

        {filtered.map(b => {
          let rec: any = null;
          let dailyFeed = 0, dailyWater = 0, perAnimalFeed = '', perAnimalWater = '', stage = '', feedType = '';

          if (b.enterprise === 'Broilers' || b.enterprise === 'Village Chicken') {
            rec = getBroilerRecommendation(b.ageDays);
            dailyFeed = +(rec.gramsPerBird * b.currentCount / 1000).toFixed(1);
            dailyWater = +(rec.waterMlPerBird * b.currentCount / 1000).toFixed(0);
            perAnimalFeed = `${rec.gramsPerBird} g/bird`;
            perAnimalWater = `${rec.waterMlPerBird} ml/bird`;
            stage = rec.stage;
            feedType = rec.feedType;
          } else if (b.enterprise === 'Piggery') {
            rec = getPiggeryRecommendation(b.avgWeightKg);
            dailyFeed = +(rec.kgPerDay * b.currentCount).toFixed(1);
            dailyWater = +(rec.waterLPerDay * b.currentCount).toFixed(0);
            perAnimalFeed = `${rec.kgPerDay} kg/pig`;
            perAnimalWater = `${rec.waterLPerDay} L/pig`;
            stage = rec.stage;
            feedType = rec.feedType;
          } else if (b.enterprise === 'Fish') {
            dailyFeed = +(b.currentCount * b.avgWeightKg * 0.03).toFixed(1);
            perAnimalFeed = `3% body weight`;
            stage = b.avgWeightKg < 0.1 ? 'Fingerling' : b.avgWeightKg < 0.3 ? 'Juvenile' : 'Grow-out';
            feedType = b.avgWeightKg < 0.1 ? 'Fish Starter Feed' : 'Fish Grower Feed';
          } else if (b.enterprise === 'Ducks') {
            dailyFeed = +(b.currentCount * 0.18).toFixed(1);
            dailyWater = +(b.currentCount * 0.4).toFixed(0);
            perAnimalFeed = '180 g/duck';
            perAnimalWater = '400 ml/duck';
            stage = b.ageDays < 21 ? 'Starter' : b.ageDays < 49 ? 'Grower' : 'Finisher';
            feedType = 'Duck Grower Feed';
          } else if (b.enterprise === 'Goats') {
            dailyFeed = +(b.currentCount * 0.4).toFixed(1);
            dailyWater = +(b.currentCount * 4).toFixed(0);
            perAnimalFeed = '0.4 kg supp/goat';
            perAnimalWater = '4 L/goat';
            stage = 'Maintenance + Grazing';
            feedType = 'Goat Concentrate + Mineral';
          }

          return (
            <Card key={b.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={[styles.batchIcon, { backgroundColor: getColor(b.enterprise) + '20' }]}>
                  <Ionicons name={getIcon(b.enterprise) as any} size={18} color={getColor(b.enterprise)} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.batchTitle}>{b.name}</Text>
                  <Text style={styles.batchSub}>{b.enterprise} · Day {b.ageDays} · {b.currentCount.toLocaleString()} animals</Text>
                </View>
                <Badge label={stage} color={theme.colors.primary} />
              </View>

              <View style={styles.feedTypeBar}>
                <Ionicons name="nutrition" size={14} color={theme.colors.accent} />
                <Text style={styles.feedTypeTxt}>Recommended: <Text style={{ fontWeight: '800' }}>{feedType}</Text></Text>
              </View>

              <View style={styles.recGrid}>
                <RecBox icon="speedometer" label="Per animal feed" value={perAnimalFeed} />
                <RecBox icon="nutrition" label="Daily total" value={`${dailyFeed} kg`} highlight />
                {dailyWater > 0 && <RecBox icon="water" label="Per animal water" value={perAnimalWater} />}
                {dailyWater > 0 && <RecBox icon="beaker" label="Daily water" value={`${dailyWater} L`} highlight />}
              </View>

              <View style={styles.predictRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.predictLbl}>Days to market</Text>
                  <Text style={styles.predictVal}>{predictDaysToMarket(b)} days</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.predictLbl}>Projected feed cost</Text>
                  <Text style={styles.predictVal}>{formatK(dailyFeed * 11.5 * Math.max(1, predictDaysToMarket(b)))}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.predictLbl}>Profit forecast</Text>
                  <Text style={[styles.predictVal, { color: theme.colors.success }]}>{formatK(b.projectedRevenue - b.costToDate)}</Text>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Feed reference table */}
        <SectionTitle title="Broiler Feeding Reference" />
        <Card>
          <View style={styles.tHead}>
            <Text style={[styles.tCell, { flex: 1.2, fontWeight: '700' }]}>Age</Text>
            <Text style={[styles.tCell, { flex: 1.5, fontWeight: '700' }]}>Stage</Text>
            <Text style={[styles.tCell, { flex: 1, fontWeight: '700' }]}>Feed/bird</Text>
            <Text style={[styles.tCell, { flex: 1, fontWeight: '700' }]}>Water/bird</Text>
          </View>
          {broilerFeedTable.map((r, i) => (
            <View key={i} style={[styles.tRow, i % 2 === 0 && { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.tCell, { flex: 1.2 }]}>D{r.ageStart}–{r.ageEnd}</Text>
              <Text style={[styles.tCell, { flex: 1.5 }]}>{r.stage}</Text>
              <Text style={[styles.tCell, { flex: 1 }]}>{r.gramsPerBird}g</Text>
              <Text style={[styles.tCell, { flex: 1 }]}>{r.waterMlPerBird}ml</Text>
            </View>
          ))}
        </Card>

        <SectionTitle title="Piggery Feeding Reference" />
        <Card>
          <View style={styles.tHead}>
            <Text style={[styles.tCell, { flex: 2, fontWeight: '700' }]}>Stage</Text>
            <Text style={[styles.tCell, { flex: 1.5, fontWeight: '700' }]}>Feed type</Text>
            <Text style={[styles.tCell, { flex: 1, fontWeight: '700' }]}>kg/day</Text>
            <Text style={[styles.tCell, { flex: 1, fontWeight: '700' }]}>Water L</Text>
          </View>
          {piggeryFeedTable.map((r, i) => (
            <View key={i} style={[styles.tRow, i % 2 === 0 && { backgroundColor: theme.colors.surfaceAlt }]}>
              <Text style={[styles.tCell, { flex: 2, fontSize: 11 }]}>{r.stage}</Text>
              <Text style={[styles.tCell, { flex: 1.5, fontSize: 11 }]}>{r.feedType}</Text>
              <Text style={[styles.tCell, { flex: 1 }]}>{r.kgPerDay}</Text>
              <Text style={[styles.tCell, { flex: 1 }]}>{r.waterLPerDay}</Text>
            </View>
          ))}
        </Card>

        {/* AI Insights */}
        <SectionTitle title="AI Operational Insights" />
        <Card>
          {[
            { icon: 'warning', color: theme.colors.warning, title: 'Feed shortage forecast', msg: 'Broiler Finisher will run out in 4 days. Order 2,000 kg by Friday.' },
            { icon: 'trending-up', color: theme.colors.success, title: 'Growth ahead of target', msg: 'Batch B-2402 averaging 8% above standard growth curve.' },
            { icon: 'water', color: theme.colors.info, title: 'Heat stress detected', msg: 'House A water intake +15% — ensure ventilation operational.' },
            { icon: 'medkit', color: theme.colors.danger, title: 'Disease risk: Coccidiosis', msg: 'Loose droppings reported in House B — administer Amprolium prophylactically.' },
          ].map((ins, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={[styles.insightIcon, { backgroundColor: ins.color + '20' }]}>
                <Ionicons name={ins.icon as any} size={16} color={ins.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.insightTitle}>{ins.title}</Text>
                <Text style={styles.insightMsg}>{ins.msg}</Text>
              </View>
            </View>
          ))}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function predictDaysToMarket(b: any) {
  const targetByEnt: Record<string, number> = { Broilers: 42, 'Village Chicken': 120, Piggery: 168, Fish: 180, Ducks: 70, Goats: 365 };
  return Math.max(0, (targetByEnt[b.enterprise] || 100) - b.ageDays);
}

function getColor(ent: string) {
  return { Broilers: '#D4AF37', 'Village Chicken': '#EA580C', Piggery: '#DC2626', Fish: '#0EA5E9', Ducks: '#7C3AED', Goats: '#16A34A' }[ent] || theme.colors.primary;
}

function getIcon(ent: string) {
  return { Broilers: 'restaurant', 'Village Chicken': 'egg', Piggery: 'paw', Fish: 'fish', Ducks: 'water', Goats: 'leaf' }[ent] || 'paw';
}

function BannerStat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.bannerStat}>
      <Ionicons name={icon} size={16} color={theme.colors.accent} />
      <Text style={styles.bannerStatLabel}>{label}</Text>
      <Text style={styles.bannerStatValue}>{value}</Text>
    </View>
  );
}

function RecBox({ icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.recBox, highlight && { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent }]}>
      <Ionicons name={icon} size={14} color={highlight ? theme.colors.primaryDark : theme.colors.textMuted} />
      <Text style={styles.recBoxLabel}>{label}</Text>
      <Text style={[styles.recBoxValue, highlight && { color: theme.colors.primaryDark }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  banner: { backgroundColor: theme.colors.primary, borderRadius: 14, padding: 16, marginBottom: 14 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  bannerSub: { color: '#D4E5C9', fontSize: 12, marginTop: 4 },
  bannerStats: { flexDirection: 'row', marginTop: 14, gap: 8 },
  bannerStat: { flex: 1, backgroundColor: theme.colors.primaryDark, borderRadius: 10, padding: 10 },
  bannerStatLabel: { color: '#D4E5C9', fontSize: 10, marginTop: 4 },
  bannerStatValue: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipTxt: { fontSize: 12, fontWeight: '700', color: theme.colors.text },
  chipTxtActive: { color: '#fff' },
  batchIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  batchTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  batchSub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  feedTypeBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.accent + '15', padding: 8, borderRadius: 8, gap: 6, marginBottom: 10 },
  feedTypeTxt: { fontSize: 12, color: theme.colors.text },
  recGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recBox: { flexBasis: '48%', flexGrow: 1, backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.colors.border },
  recBoxLabel: { fontSize: 10, color: theme.colors.textMuted, marginTop: 4 },
  recBoxValue: { fontSize: 14, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  predictRow: { flexDirection: 'row', backgroundColor: theme.colors.primary + '08', borderRadius: 10, padding: 10, marginTop: 10 },
  predictLbl: { fontSize: 10, color: theme.colors.textMuted },
  predictVal: { fontSize: 13, fontWeight: '800', color: theme.colors.text, marginTop: 2 },
  tHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: theme.colors.border },
  tRow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 4 },
  tCell: { fontSize: 12, color: theme.colors.text, paddingHorizontal: 4 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  insightIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.text },
  insightMsg: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, lineHeight: 16 },
});
