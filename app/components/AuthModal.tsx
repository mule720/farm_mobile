// Login / Sign-up modal — opened from header.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';
import { useAuth } from '../lib/auth';

export function AuthModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('Farmhand');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = () => {
    setPhone(''); setEmail(''); setPassword(''); setFullName(''); setOrgName(''); setRole('Farmhand');
    setErr(null); setInfo(null);
  };

  const handle = async () => {
    setErr(null); setInfo(null);
    if (mode === 'signin') {
      // Sign-in: use phone OR email as identifier
      const identifier = phone.trim() || email.trim();
      if (!identifier || !password) { setErr('Phone/email and password are required.'); return; }
      setBusy(true);
      try {
        const res = await signIn(identifier, password);
        if (res.error) { setErr(res.error); return; }
        reset(); onClose();
      } finally { setBusy(false); }
    } else {
      // Sign-up: phone mandatory, email optional
      if (!phone.trim()) { setErr('Phone number is required.'); return; }
      if (!fullName.trim()) { setErr('Full name is required.'); return; }
      if (!orgName.trim()) { setErr('Farm / organisation name is required.'); return; }
      if (!password) { setErr('Password is required.'); return; }
      if (password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
      setBusy(true);
      try {
        const res = await signUp(
          phone.trim(),
          email.trim() || undefined,
          password,
          fullName.trim(),
          orgName.trim(),
          role.toLowerCase().replace(/ /g, '_'),
        );
        if (res.error) { setErr(res.error); return; }
        reset(); onClose();
      } finally { setBusy(false); }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={{ padding: 22 }} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.logo}>
                <Ionicons name="leaf" size={22} color={theme.colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.title}>{mode === 'signin' ? 'Sign in to Afrivera' : 'Create your account'}</Text>
                <Text style={styles.sub}>Operations Management System</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, mode === 'signin' && styles.tabActive]}
                onPress={() => { setMode('signin'); setErr(null); setInfo(null); }}
              >
                <Text style={[styles.tabTxt, mode === 'signin' && styles.tabTxtActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => { setMode('signup'); setErr(null); setInfo(null); }}
              >
                <Text style={[styles.tabTxt, mode === 'signup' && styles.tabTxtActive]}>Create Account</Text>
              </Pressable>
            </View>

            {mode === 'signup' && (
              <>
                <Text style={styles.lbl}>Full name *</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. James Mwale"
                  placeholderTextColor={theme.colors.textSubtle}
                  style={styles.input}
                />
                <Text style={styles.lbl}>Farm / Organisation *</Text>
                <TextInput
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="e.g. Green Valley Farm"
                  placeholderTextColor={theme.colors.textSubtle}
                  style={styles.input}
                />
                <Text style={styles.lbl}>Role</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ marginBottom: 10 }}>
                  {['Director', 'General Manager', 'Production Manager', 'Finance Manager', 'Sales Manager', 'Supervisor', 'Veterinary Officer', 'Farmhand', 'Driver'].map(r => (
                    <Pressable
                      key={r}
                      onPress={() => setRole(r)}
                      style={[styles.chip, role === r && styles.chipActive]}
                    >
                      <Text style={[styles.chipTxt, role === r && styles.chipTxtActive]}>{r}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.lbl}>{mode === 'signin' ? 'Phone or Email' : 'Phone number *'}</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={mode === 'signin' ? '+260 97x xxx xxx or email' : '+260 97x xxx xxx'}
              placeholderTextColor={theme.colors.textSubtle}
              autoCapitalize="none"
              keyboardType="phone-pad"
              style={styles.input}
            />

            {mode === 'signup' && (
              <>
                <Text style={styles.lbl}>Email (optional)</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@farm.com — leave blank if none"
                  placeholderTextColor={theme.colors.textSubtle}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </>
            )}
            {mode === 'signin' && (
              <>
                <Text style={styles.lbl}>Or Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@farm.com"
                  placeholderTextColor={theme.colors.textSubtle}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </>
            )}

            <Text style={styles.lbl}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Minimum 6 characters"
              placeholderTextColor={theme.colors.textSubtle}
              secureTextEntry
              style={styles.input}
            />

            {err ? <Text style={styles.err}>{err}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            <Pressable disabled={busy} onPress={handle} style={[styles.btn, busy && { opacity: 0.6 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.btnTxt}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </Pressable>

            <Text style={styles.hint}>
              Each farm worker should have their own account so daily entries can be audited.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, maxHeight: '92%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  logo: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  sub: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: theme.colors.bg, borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff' },
  tabTxt: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted },
  tabTxtActive: { color: theme.colors.primary },
  lbl: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, marginTop: 8, marginBottom: 4, letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: theme.colors.text, backgroundColor: '#fff' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipTxt: { fontSize: 11, fontWeight: '700', color: theme.colors.text },
  chipTxtActive: { color: '#fff' },
  err: { color: theme.colors.danger, fontSize: 12, marginTop: 10, fontWeight: '700' },
  info: { color: theme.colors.info, fontSize: 12, marginTop: 10, fontWeight: '700' },
  btn: { backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
  hint: { fontSize: 11, color: theme.colors.textMuted, textAlign: 'center', marginTop: 14, lineHeight: 16 },
});
