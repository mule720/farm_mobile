import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, KpiCard, SectionTitle, Badge, ProgressBar, PrimaryButton, GhostButton, HBar } from '../components/UI';
import { useCustomers, useSales, useEmployees, monthlyFinancials, enterpriseProfit, formatK, alerts } from '../lib/data';
import { useAuth } from '../lib/auth';

type ViewKey = 'menu' | 'sales' | 'finance' | 'hr' | 'reports' | 'export' | 'biosecurity' | 'assets';

export default function More() {
  const [view, setView] = useState<ViewKey>('menu');
  if (view === 'menu') return <Menu setView={setView} />;
  if (view === 'sales') return <SalesView back={() => setView('menu')} />;
  if (view === 'finance') return <FinanceView back={() => setView('menu')} />;
  if (view === 'hr') return <HRView back={() => setView('menu')} />;
  if (view === 'reports') return <ReportsView back={() => setView('menu')} />;
  if (view === 'export') return <ExportView back={() => setView('menu')} />;
  if (view === 'biosecurity') return <BiosecurityView back={() => setView('menu')} />;
  if (view === 'assets') return <AssetsView back={() => setView('menu')} />;
  return null;
}

function Menu({ setView }: { setView: (v: ViewKey) => void }) {
  const { user, profile, signOut } = useAuth();
  const items = [
    { key: 'sales', icon: 'cart', label: 'Sales & Customers', color: theme.colors.success, sub: 'Orders, deliveries, CRM' },
    { key: 'finance', icon: 'wallet', label: 'Financial Management', color: theme.colors.primary, sub: 'P&L, budgets, payroll' },
    { key: 'hr', icon: 'people', label: 'Human Resources', color: theme.colors.info, sub: 'Employees, attendance' },
    { key: 'reports', icon: 'analytics', label: 'Reports & BI', color: theme.colors.chartPurple, sub: 'Production, finance, sales' },
    { key: 'export', icon: 'airplane', label: 'DRC Export & Logistics', color: theme.colors.accent, sub: 'Cross-border, COMESA' },
    { key: 'biosecurity', icon: 'medkit', label: 'Biosecurity & Vet', color: theme.colors.danger, sub: 'Vaccinations, treatments' },
    { key: 'assets', icon: 'construct', label: 'Assets & Infrastructure', color: theme.colors.chartOrange, sub: 'Equipment, vehicles' },
    { key: 'procurement' as any, icon: 'business', label: 'Procurement', color: theme.colors.primaryLight, sub: 'Suppliers, POs' },
  ];

  return (
    <View style={styles.container}>
      <AppHeader title="All Modules" subtitle="Operations Management Suite" />
      <ScrollView contentContainerStyle={styles.content}>
        {user && (
          <Card style={{ marginBottom: 14, backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '40', borderWidth: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuLabel}>{profile?.full_name || user.email}</Text>
                <Text style={styles.menuSub}>{profile?.role || 'Farmhand'} · {user.email}</Text>
              </View>
              <Badge label="Signed in" color={theme.colors.success} />
            </View>
          </Card>
        )}

        <SectionTitle title="Modules" />
        {items.map(it => (
          <Pressable
            key={it.key}
            onPress={() => {
              if (it.key === 'procurement') Alert.alert('Procurement', 'Procurement module: Suppliers, Purchase Orders, Delivery tracking.');
              else setView(it.key as ViewKey);
            }}
            style={[styles.menuRow, shadow]}
          >
            <View style={[styles.menuIcon, { backgroundColor: it.color + '20' }]}>
              <Ionicons name={it.icon as any} size={22} color={it.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuLabel}>{it.label}</Text>
              <Text style={styles.menuSub}>{it.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </Pressable>
        ))}

        <SectionTitle title="System" />
        {[
          { icon: 'person-circle', label: 'My Profile', sub: profile ? `${profile.full_name} · ${profile.role}` : 'Sign in to view profile' },
          { icon: 'shield-checkmark', label: 'User Roles & Permissions', sub: '9 roles configured' },
          { icon: 'cloud-upload', label: 'Backup & Sync', sub: 'Last sync: 12 minutes ago' },
          { icon: 'phone-portrait', label: 'Mobile App Settings', sub: 'Offline mode, GPS, push' },
          { icon: 'help-circle', label: 'Help & Support', sub: 'Documentation, training' },
        ].map(s => (
          <Pressable key={s.label} style={styles.sysRow} onPress={() => Alert.alert(s.label, s.sub)}>
            <Ionicons name={s.icon as any} size={20} color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sysLabel}>{s.label}</Text>
              <Text style={styles.menuSub}>{s.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </Pressable>
        ))}

        {user && (
          <Pressable
            onPress={() => {
              Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
              ]);
            }}
            style={[styles.sysRow, { marginTop: 12, borderColor: theme.colors.danger + '40' }]}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.sysLabel, { color: theme.colors.danger }]}>Sign Out</Text>
              <Text style={styles.menuSub}>End your session on this device</Text>
            </View>
          </Pressable>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function BackHeader({ title, subtitle, back }: { title: string; subtitle: string; back: () => void }) {
  return (
    <View style={{ backgroundColor: theme.colors.primary }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 50 }}>
        <Pressable onPress={back} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{title}</Text>
          <Text style={{ color: '#D4E5C9', fontSize: 11, marginTop: 2 }}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

function SalesView({ back }: { back: () => void }) {
  const { data: customers, loading: cl } = useCustomers();
  const { data: recentSales, loading: sl } = useSales();
  const totalSales = (recentSales || []).reduce((s, r) => s + r.total, 0);
  const outstanding = (customers || []).reduce((s, c) => s + c.balance, 0);

  return (
    <View style={styles.container}>
      <BackHeader title="Sales & Customers" subtitle="Orders, invoicing, distribution" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard icon="cart" label="Recent Sales" value={formatK(totalSales)} color={theme.colors.success} />
          <KpiCard icon="people" label="Customers" value={(customers || []).length.toString()} color={theme.colors.info} />
          <KpiCard icon="alert-circle" label="Outstanding" value={formatK(outstanding)} color={theme.colors.danger} />
          <KpiCard icon="trending-up" label="Orders MTD" value="74" color={theme.colors.primary} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <PrimaryButton label="New Order" icon="add-circle" onPress={() => Alert.alert('New Order', 'Create new sales order.')} style={{ flex: 1 }} />
          <GhostButton label="Invoice" icon="receipt" onPress={() => Alert.alert('Invoice', 'Generate invoice.')} />
        </View>

        <SectionTitle title="Recent Sales" action="View all" />
        {sl && <ActivityIndicator color={theme.colors.primary} />}
        {(recentSales || []).map(s => (
          <Card key={s.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.text }}>{s.product}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 2 }}>{s.customer}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSubtle, marginTop: 2 }}>{s.id} · {s.date} · Qty {s.qty}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.success }}>{formatK(s.total)}</Text>
                <Badge label={s.status} color={s.status === 'Delivered' ? theme.colors.success : s.status === 'In Transit' ? theme.colors.info : theme.colors.warning} />
              </View>
            </View>
          </Card>
        ))}

        <SectionTitle title="Top Customers" />
        {cl && <ActivityIndicator color={theme.colors.primary} />}
        {(customers || []).map(c => (
          <Card key={c.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name={c.type === 'Export' ? 'airplane' : c.type === 'Restaurant' || c.type === 'Hotel' ? 'restaurant' : 'storefront'} size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuLabel}>{c.name}</Text>
                <Text style={styles.menuSub}>{c.type} · {c.totalOrders} orders · {c.contact}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {c.balance > 0 ? <Badge label={formatK(c.balance)} color={theme.colors.danger} /> : <Badge label="Paid" color={theme.colors.success} />}
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function FinanceView({ back }: { back: () => void }) {
  const totalRev = monthlyFinancials.reduce((s, m) => s + m.revenue, 0);
  const totalCost = monthlyFinancials.reduce((s, m) => s + m.costs, 0);
  return (
    <View style={styles.container}>
      <BackHeader title="Financial Management" subtitle="P&L · Budgets · Cash flow" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard icon="cash" label="Revenue YTD" value={formatK(totalRev)} color={theme.colors.success} trend={18} />
          <KpiCard icon="trending-down" label="Costs YTD" value={formatK(totalCost)} color={theme.colors.danger} trend={9} />
          <KpiCard icon="trending-up" label="Net Profit" value={formatK(totalRev - totalCost)} color={theme.colors.primary} trend={26} />
          <KpiCard icon="wallet" label="Cash on hand" value={formatK(284000)} color={theme.colors.info} />
        </View>

        <Card>
          <SectionTitle title="Profitability by Enterprise" />
          {enterpriseProfit.map(e => {
            const margin = ((e.profit / e.revenue) * 100).toFixed(1);
            return (
              <View key={e.name} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontWeight: '700', color: theme.colors.text }}>{e.name}</Text>
                  <Text style={{ fontWeight: '700', color: theme.colors.success }}>{formatK(e.profit)} ({margin}%)</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <View style={{ flex: e.cost / 1000, height: 8, backgroundColor: theme.colors.danger + '60', borderRadius: 4 }} />
                  <View style={{ flex: e.profit / 1000, height: 8, backgroundColor: e.color, borderRadius: 4 }} />
                </View>
              </View>
            );
          })}
        </Card>

        <SectionTitle title="Cost Categories (April)" />
        <Card>
          {[
            { name: 'Feed', amt: 145000, color: theme.colors.accent },
            { name: 'Labour', amt: 38000, color: theme.colors.info },
            { name: 'Medication & Vet', amt: 18500, color: theme.colors.danger },
            { name: 'Utilities', amt: 12400, color: theme.colors.chartPurple },
            { name: 'Transport & Logistics', amt: 9800, color: theme.colors.chartOrange },
            { name: 'Maintenance', amt: 4300, color: theme.colors.success },
          ].map(c => (
            <HBar key={c.name} label={c.name} value={c.amt} max={150000} color={c.color} valueLabel={formatK(c.amt)} />
          ))}
        </Card>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function HRView({ back }: { back: () => void }) {
  const { data: employees, loading } = useEmployees();
  const list = employees || [];
  const avgAtt = list.length ? list.reduce((s, e) => s + e.attendance, 0) / list.length : 0;
  const avgPerf = list.length ? list.reduce((s, e) => s + e.performance, 0) / list.length : 0;

  return (
    <View style={styles.container}>
      <BackHeader title="Human Resources" subtitle="Staff · Attendance · Performance" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard icon="people" label="Employees" value={list.length.toString()} color={theme.colors.primary} />
          <KpiCard icon="calendar" label="Attendance" value={`${avgAtt.toFixed(0)}%`} color={theme.colors.success} />
          <KpiCard icon="trophy" label="Avg Performance" value={`${avgPerf.toFixed(0)}%`} color={theme.colors.accent} />
          <KpiCard icon="cash" label="Monthly Payroll" value={formatK(48500)} color={theme.colors.info} />
        </View>

        <SectionTitle title="Team Members" />
        {loading && <ActivityIndicator color={theme.colors.primary} />}
        {list.map(e => (
          <Card key={e.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '30' }]}>
                <Text style={{ fontWeight: '800', color: theme.colors.primary }}>{e.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuLabel}>{e.name}</Text>
                <Text style={styles.menuSub}>{e.role} · {e.dept}</Text>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>Attendance</Text>
                    <ProgressBar value={e.attendance} max={100} color={theme.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: theme.colors.textMuted }}>Performance</Text>
                    <ProgressBar value={e.performance} max={100} color={theme.colors.accent} />
                  </View>
                </View>
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function ReportsView({ back }: { back: () => void }) {
  const reports = [
    { icon: 'today', label: 'Daily Production Report', desc: 'Mortality, feed, water across all batches' },
    { icon: 'calendar', label: 'Weekly Operational Report', desc: 'Performance summary, alerts, KPIs' },
    { icon: 'document-text', label: 'Monthly Management Report', desc: 'Full P&L and operational overview' },
    { icon: 'pulse', label: 'Mortality Analysis', desc: 'Trends, causes, prevention' },
    { icon: 'speedometer', label: 'Feed Efficiency Report', desc: 'FCR by batch, enterprise, time period' },
    { icon: 'cash', label: 'Enterprise Profitability', desc: 'Cost, revenue, margin per unit' },
    { icon: 'cart', label: 'Sales & Market Report', desc: 'By customer, product, region' },
    { icon: 'airplane', label: 'DRC Export Report', desc: 'Volumes, revenue, customs' },
    { icon: 'cube', label: 'Inventory Report', desc: 'Stock levels, valuation, movement' },
    { icon: 'analytics', label: 'Predictive Forecast', desc: 'AI projections for next 30/60/90 days' },
  ];
  return (
    <View style={styles.container}>
      <BackHeader title="Reports & BI" subtitle="10 standard reports + custom" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        {reports.map((r, i) => (
          <Pressable key={i} onPress={() => Alert.alert('Report Generated', `${r.label} is being prepared.`)} style={[styles.menuRow, shadow]}>
            <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name={r.icon as any} size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.menuLabel}>{r.label}</Text>
              <Text style={styles.menuSub}>{r.desc}</Text>
            </View>
            <Ionicons name="download" size={18} color={theme.colors.primary} />
          </Pressable>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function ExportView({ back }: { back: () => void }) {
  return (
    <View style={styles.container}>
      <BackHeader title="DRC Export & Logistics" subtitle="Cross-border · COMESA · Currency" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard icon="airplane" label="Active Shipments" value="3" color={theme.colors.primary} />
          <KpiCard icon="cash" label="Export Revenue MTD" value={formatK(70000)} color={theme.colors.success} />
          <KpiCard icon="logo-usd" label="USD Balance" value="$ 18,400" color={theme.colors.info} />
          <KpiCard icon="people" label="DRC Customers" value="2" color={theme.colors.accent} />
        </View>
        <SectionTitle title="Shipments" />
        {[
          { id: 'EXP-201', customer: 'Congo Fresh Imports DRC', product: 'Live broilers · 800 birds', status: 'In Transit', value: 'USD 1,200', border: 'Kasumbalesa' },
          { id: 'EXP-202', customer: 'Lubumbashi Foods Ltd', product: 'Live broilers · 1,200 birds', status: 'Cleared Customs', value: 'USD 1,800', border: 'Kasumbalesa' },
          { id: 'EXP-203', customer: 'Lubumbashi Foods Ltd', product: 'Frozen pork · 480 kg', status: 'Pending COMESA', value: 'USD 2,400', border: 'Sakania' },
        ].map(s => (
          <Card key={s.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuLabel}>{s.id} · {s.customer}</Text>
                <Text style={styles.menuSub}>{s.product}</Text>
                <Text style={[styles.menuSub, { marginTop: 4 }]}>Border: {s.border}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '800', color: theme.colors.success }}>{s.value}</Text>
                <Badge label={s.status} color={s.status === 'In Transit' ? theme.colors.info : s.status === 'Cleared Customs' ? theme.colors.success : theme.colors.warning} />
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function BiosecurityView({ back }: { back: () => void }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Biosecurity & Vet" subtitle="Vaccinations · Treatments · Inspections" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard icon="medkit" label="Vaccinations MTD" value="14" color={theme.colors.primary} />
          <KpiCard icon="warning" label="Disease Incidents" value="1" color={theme.colors.danger} />
          <KpiCard icon="shield-checkmark" label="Inspections" value="8" color={theme.colors.success} />
          <KpiCard icon="leaf" label="Quarantines Active" value="0" color={theme.colors.info} />
        </View>
        <SectionTitle title="Active Alerts" />
        {alerts.filter(a => a.module === 'Poultry' || a.module === 'Vaccination' || a.module === 'Fish').map(a => (
          <Card key={a.id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10, backgroundColor: a.severity === 'critical' ? theme.colors.danger : a.severity === 'warning' ? theme.colors.warning : theme.colors.info }} />
              <View style={{ flex: 1 }}>
                <Badge label={a.module} color={theme.colors.primary} />
                <Text style={{ marginTop: 6, color: theme.colors.text }}>{a.message}</Text>
                <Text style={{ fontSize: 11, color: theme.colors.textSubtle, marginTop: 4 }}>{a.time}</Text>
              </View>
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function AssetsView({ back }: { back: () => void }) {
  return (
    <View style={styles.container}>
      <BackHeader title="Assets & Infrastructure" subtitle="Equipment · Vehicles · Maintenance" back={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <KpiCard icon="construct" label="Total Assets" value="42" color={theme.colors.primary} />
          <KpiCard icon="cash" label="Asset Value" value={formatK(2840000)} color={theme.colors.success} />
          <KpiCard icon="warning" label="Due Maintenance" value="5" color={theme.colors.warning} />
          <KpiCard icon="car" label="Vehicles" value="4" color={theme.colors.info} />
        </View>
        <SectionTitle title="Critical Infrastructure" />
        {[
          { icon: 'snow', name: 'Cold Room (5,000L)', status: 'Operational', val: '-2°C' },
          { icon: 'water', name: 'Borehole #1', status: 'Operational', val: '420 L/h' },
          { icon: 'sunny', name: 'Solar System (15kW)', status: 'Operational', val: '12.4 kW' },
          { icon: 'water', name: 'Borehole #2', status: 'Maintenance', val: '0 L/h' },
        ].map((a, i) => (
          <Card key={i} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name={a.icon as any} size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.menuLabel}>{a.name}</Text>
                <Text style={styles.menuSub}>{a.val}</Text>
              </View>
              <Badge label={a.status} color={a.status === 'Operational' ? theme.colors.success : theme.colors.danger} />
            </View>
          </Card>
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border },
  menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  menuSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  sysRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: theme.colors.border },
  sysLabel: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
