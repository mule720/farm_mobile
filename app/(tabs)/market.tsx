import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, shadow } from '../lib/theme';
import { AppHeader } from '../components/Header';
import { Card, SectionTitle, Badge, PrimaryButton, GhostButton, KpiCard } from '../components/UI';
import { useCommodityPrices, useMarketListings, formatK } from '../lib/data';
import { useMutation } from '@apollo/client';
import { CREATE_LISTING_MUTATION, ADD_COMMODITY_PRICE_MUTATION, MARKET_LISTINGS_QUERY, COMMODITY_PRICES_QUERY } from '../lib/gql';

type Tab = 'prices' | 'listings' | 'my';

export default function MarketScreen() {
  const [tab, setTab] = useState<Tab>('prices');
  const [showListing, setShowListing] = useState(false);
  const [title, setTitle] = useState('');
  const [commodity, setCommodity] = useState('');
  const [quantity, setQuantity] = useState('');
  const [priceUnit, setPriceUnit] = useState('');
  const [location, setLocation] = useState('');
  const [contact, setContact] = useState('');

  const { prices, latestPrices, loading: pLoading, refetch: refetchPrices } = useCommodityPrices();
  const { listings, myListings, loading: lLoading, refetch: refetchListings } = useMarketListings();
  const loading = pLoading || lLoading;

  const [createListing, { loading: creating }] = useMutation(CREATE_LISTING_MUTATION, {
    refetchQueries: [{ query: MARKET_LISTINGS_QUERY }],
    onCompleted: () => {
      Alert.alert('Listed!', 'Your market listing is now live.');
      setShowListing(false);
      setTitle(''); setCommodity(''); setQuantity(''); setPriceUnit(''); setLocation(''); setContact('');
    },
    onError: e => Alert.alert('Error', e.message),
  });

  const refresh = () => { refetchPrices(); refetchListings(); };

  const submitListing = () => {
    if (!title || !commodity || !quantity || !priceUnit) {
      Alert.alert('Required', 'Please fill in title, commodity, quantity, and price.');
      return;
    }
    createListing({
      variables: {
        title, commodity,
        quantity: parseFloat(quantity),
        unit: 'kg',
        pricePerUnit: parseFloat(priceUnit),
        currency: 'ZMW',
        location, contactPhone: contact,
      },
    });
  };

  const displayPrices = latestPrices.length > 0 ? latestPrices : prices.slice(0, 20);

  return (
    <View style={styles.container}>
      <AppHeader title="AgroNexus Market" subtitle="Prices · Listings · Buyers" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.colors.primary} />}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="storefront" size={28} color="#fff" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroTitle}>Marketplace</Text>
            <Text style={styles.heroSub}>Live commodity prices · Buy & sell direct</Text>
          </View>
          <PrimaryButton label="Sell" icon="add-circle" onPress={() => setShowListing(true)} style={styles.heroBtn} />
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          {(['prices', 'listings', 'my'] as Tab[]).map(t => (
            <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>
                {t === 'prices' ? 'Market Prices' : t === 'listings' ? 'All Listings' : 'My Listings'}
              </Text>
            </Pressable>
          ))}
        </View>

        {loading && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}

        {/* Market Prices */}
        {tab === 'prices' && (
          <>
            <SectionTitle title="Current Market Prices" />
            {displayPrices.length === 0 && !loading && (
              <Card><Text style={styles.empty}>No price data available. Prices are updated from local markets.</Text></Card>
            )}
            {displayPrices.map((p: any) => (
              <Card key={p.id} style={styles.priceCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commodity}>{p.commodity}</Text>
                    <Text style={styles.market}>{p.marketName}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>{p.currency ?? 'ZMW'} {(p.price ?? 0).toFixed(2)}</Text>
                    <Text style={styles.unit}>per {p.unit ?? 'kg'}</Text>
                  </View>
                </View>
                {p.priceDate && (
                  <Text style={styles.date}>Updated: {new Date(p.priceDate).toLocaleDateString()}</Text>
                )}
              </Card>
            ))}
            {/* Static reference prices if backend has none */}
            {displayPrices.length === 0 && !loading && (
              <Card style={{ marginTop: 8, backgroundColor: theme.colors.primary + '08' }}>
                <Text style={styles.infoTitle}>Reference Prices (Zambia)</Text>
                {[
                  { c: 'Broiler (live)', p: 38, u: 'per kg' },
                  { c: 'Maize', p: 3.2, u: 'per kg' },
                  { c: 'Soya beans', p: 7.5, u: 'per kg' },
                  { c: 'Cattle (live)', p: 45000, u: 'per head' },
                  { c: 'Goat', p: 1800, u: 'per head' },
                  { c: 'Pig (100kg)', p: 8500, u: 'per head' },
                ].map(r => (
                  <View key={r.c} style={styles.refRow}>
                    <Text style={styles.refCommodity}>{r.c}</Text>
                    <Text style={styles.refPrice}>ZMW {r.p.toLocaleString()} {r.u}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* All Listings */}
        {tab === 'listings' && (
          <>
            <SectionTitle title={`${listings.length} Active Listings`} action="Sell yours" onAction={() => setShowListing(true)} />
            {listings.length === 0 && !loading && (
              <Card><Text style={styles.empty}>No listings yet. Be the first to sell!</Text></Card>
            )}
            {listings.map((l: any) => (
              <Card key={l.id} style={styles.listingCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listingTitle}>{l.title}</Text>
                    <Text style={styles.listingSub}>{l.commodity} · {l.quantity} {l.unit}</Text>
                    {l.location && <Text style={styles.listingLocation}>📍 {l.location}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.listingPrice}>{l.currency ?? 'ZMW'} {(l.pricePerUnit ?? 0).toFixed(2)}</Text>
                    <Text style={styles.unit}>per {l.unit}</Text>
                  </View>
                </View>
                {l.organization?.name && (
                  <Text style={styles.seller}>Seller: {l.organization.name}</Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <PrimaryButton
                    label="Contact Seller"
                    icon="call"
                    onPress={() => Alert.alert('Contact', l.contactPhone ? `Call: ${l.contactPhone}` : 'No contact info provided.')}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        {/* My Listings */}
        {tab === 'my' && (
          <>
            <SectionTitle title="My Listings" action="+ New" onAction={() => setShowListing(true)} />
            {myListings.length === 0 && !loading && (
              <Card>
                <Text style={styles.empty}>You have no listings. Start selling your produce!</Text>
                <PrimaryButton label="Create Listing" icon="add-circle" onPress={() => setShowListing(true)} style={{ marginTop: 12 }} />
              </Card>
            )}
            {myListings.map((l: any) => (
              <Card key={l.id} style={styles.listingCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={styles.listingTitle}>{l.title}</Text>
                    <Text style={styles.listingSub}>{l.commodity} · {l.quantity} {l.unit}</Text>
                  </View>
                  <Badge label={l.status ?? 'active'} color={l.status === 'sold' ? theme.colors.success : theme.colors.primary} />
                </View>
                <Text style={styles.listingPrice}>{l.currency ?? 'ZMW'} {(l.pricePerUnit ?? 0).toFixed(2)} / {l.unit}</Text>
                {l.createdAt && <Text style={styles.date}>Listed: {new Date(l.createdAt).toLocaleDateString()}</Text>}
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Create Listing Modal */}
      <Modal visible={showListing} animationType="slide" transparent onRequestClose={() => setShowListing(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Market Listing</Text>
              <Pressable onPress={() => setShowListing(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              <MField label="Listing title" value={title} onChangeText={setTitle} placeholder="e.g. Fresh Broilers for Sale" />
              <MField label="Commodity" value={commodity} onChangeText={setCommodity} placeholder="e.g. Broiler chicken" />
              <MField label="Quantity (kg / heads)" value={quantity} onChangeText={setQuantity} placeholder="e.g. 500" numeric />
              <MField label="Price per kg/head (ZMW)" value={priceUnit} onChangeText={setPriceUnit} placeholder="e.g. 38" numeric />
              <MField label="Location" value={location} onChangeText={setLocation} placeholder="e.g. Lusaka, Zambia" />
              <MField label="Contact phone" value={contact} onChangeText={setContact} placeholder="e.g. +260 97 000 0000" />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <GhostButton label="Cancel" onPress={() => setShowListing(false)} />
              <PrimaryButton
                label={creating ? 'Listing…' : 'Post Listing'}
                icon="storefront"
                onPress={creating ? () => {} : submitListing}
                style={{ flex: 1, opacity: creating ? 0.7 : 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MField({ label, value, onChangeText, placeholder, numeric }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; numeric?: boolean;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
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
  hero: {
    backgroundColor: theme.colors.primary, borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  heroTitle: { color: '#fff', fontWeight: '800', fontSize: 17 },
  heroSub: { color: '#D4E5C9', fontSize: 12, marginTop: 2 },
  heroBtn: { backgroundColor: theme.colors.accent, paddingHorizontal: 12, paddingVertical: 8 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.primary },
  tabTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted },
  tabTxtActive: { color: '#fff' },
  priceCard: { marginBottom: 8 },
  commodity: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  market: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  price: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  unit: { fontSize: 11, color: theme.colors.textSubtle },
  date: { fontSize: 10, color: theme.colors.textSubtle, marginTop: 6 },
  listingCard: { marginBottom: 10 },
  listingTitle: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  listingSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  listingLocation: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  listingPrice: { fontSize: 16, fontWeight: '800', color: theme.colors.primary, marginTop: 4 },
  seller: { fontSize: 11, color: theme.colors.textMuted, marginTop: 6 },
  empty: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 20 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: theme.colors.primaryDark, marginBottom: 10 },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  refCommodity: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  refPrice: { fontSize: 13, color: theme.colors.primary, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surfaceAlt },
});
