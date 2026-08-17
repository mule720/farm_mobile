import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { AuthModal } from './AuthModal';

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const initials = (() => {
    if (!user) return 'AF';
    const src = user.fullName || user.username || user.email || '';
    const parts = src.replace(/@.*/, '').split(/\s+|\.|_/).filter(Boolean);
    return ((parts[0]?.[0] || 'A') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase().slice(0, 2);
  })();

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.row}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Ionicons name="leaf" size={20} color={theme.colors.accent} />
          </View>
          <View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="notifications" size={18} color="#fff" />
            <View style={styles.dot} />
          </Pressable>

          {loading ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>...</Text>
            </View>
          ) : user ? (
            <Pressable onPress={() => setShowAuth(true)} style={styles.avatar}>
              <Text style={styles.avatarTxt}>{initials}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setShowAuth(true)} style={styles.signInBtn}>
              <Ionicons name="log-in-outline" size={14} color={theme.colors.primaryDark} />
              <Text style={styles.signInTxt}>Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>

      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: theme.colors.primary },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { color: '#D4E5C9', fontSize: 11, marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: theme.colors.primaryDark,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.danger, position: 'absolute', top: 7, right: 7 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: theme.colors.accent,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 8,
  },
  avatarTxt: { color: theme.colors.primaryDark, fontWeight: '800', fontSize: 11 },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, marginLeft: 8,
  },
  signInTxt: { color: theme.colors.primaryDark, fontWeight: '800', fontSize: 12 },
});
