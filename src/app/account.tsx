import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useToast } from '@/components/toast';
import { Button, IconButton } from '@/components/ui/button';
import { Card, SectionTitle } from '@/components/ui/primitives';
import { Content, Screen, ScreenHeader } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { setSetting, type SubscriptionPlan } from '@/db/meta';
import { useResponsive } from '@/hooks/use-responsive';
import {
  activateLicenseOnServer,
  checkServerConnection,
  registerCustomerOnServer,
  syncDailySummaryToServer,
  syncPendingOrdersToServer,
} from '@/lib/sync-engine';
import { useDb, useDbQuery, useRevalidateAll, useSettings } from '@/providers/database';
import { radius, useTheme } from '@/theme';

const PLAN_META: Record<SubscriptionPlan, { name: string; color: string; bg: string; desc: string }> = {
  super: {
    name: 'Super Plan',
    color: '#059669',
    bg: '#ECFDF5',
    desc: 'Local Device Only. All order data is stored on this device only. No data is sent to the server.',
  },
  gold: {
    name: 'Gold Plan',
    color: '#D97706',
    bg: '#FFFBEB',
    desc: 'Offline-First + Cloud Summaries. Works without internet. Daily sales summary reports are safely backed up to the server.',
  },
  premium: {
    name: 'Premium Plan',
    color: '#7C3AED',
    bg: '#F5F3FF',
    desc: 'Offline-First + Full Real-Time Sync. Every order, item, and category syncs to the server in background batches with zero business impact.',
  },
};

export default function AccountScreen() {
  const db = useDb();
  const settings = useSettings();
  const revalidateAll = useRevalidateAll();
  const toast = useToast();
  const { colors } = useTheme();
  const { gutter } = useResponsive();

  const [businessName, setBusinessName] = useState(settings.businessName || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [email, setEmail] = useState(settings.ownerEmail || '');
  const [location, setLocation] = useState(settings.address || '');
  const [serverUrl, setServerUrl] = useState(settings.serverUrl || 'http://10.0.2.2:8005');
  const [chosenPlan, setChosenPlan] = useState<SubscriptionPlan>(settings.plan || 'super');

  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [licenseInput, setLicenseInput] = useState('');
  const [isActivatingLicense, setIsActivatingLicense] = useState(false);

  // Query pending unsynced orders count
  const { data: unsyncedCount = 0 } = useDbQuery(['unsynced_count'], async (d) => {
    try {
      const row = await d.first<{ c: number }>(
        "SELECT COUNT(*) as c FROM orders WHERE (synced = 0 OR synced IS NULL) AND status IN ('paid', 'billed')",
      );
      return row?.c ?? 0;
    } catch {
      return 0;
    }
  });

  const planInfo = PLAN_META[settings.plan || 'super'];

  const copyCustomerId = () => {
    if (!settings.customerId) return;
    Clipboard.setString(settings.customerId);
    toast({ message: 'Customer ID copied to clipboard' });
  };

  const handleTestConnection = async () => {
    const ok = await checkServerConnection(serverUrl);
    Alert.alert(
      ok ? 'Server Connected' : 'Connection Failed',
      ok
        ? `Successfully reached FastAPI server at ${serverUrl}.`
        : `Cannot connect to ${serverUrl}. Please check host IP and verify the server is running.`,
    );
  };

  const handleRegisterOrUpdate = async () => {
    if (!businessName.trim() || !phone.trim() || !location.trim()) {
      Alert.alert('Required Fields', 'Please enter Restaurant Name, Phone Number, and Address.');
      return;
    }

    setIsRegistering(true);
    try {
      // Save local settings
      await setSetting(db, 'businessName', businessName.trim());
      await setSetting(db, 'phone', phone.trim());
      await setSetting(db, 'address', location.trim());
      await setSetting(db, 'ownerEmail', email.trim());
      await setSetting(db, 'serverUrl', serverUrl.trim());
      await setSetting(db, 'plan', chosenPlan);

      // Attempt registration on server if not yet registered
      if (!settings.customerId) {
        const res = await registerCustomerOnServer(serverUrl, {
          businessName,
          phone,
          email,
          location,
          plan: chosenPlan,
        });

        if (res.success && res.customer) {
          await setSetting(db, 'customerId', res.customer.customer_id);
          await setSetting(db, 'plan', res.customer.plan);
          if (res.customer.license_expires_at) {
            await setSetting(db, 'licenseExpiresAt', res.customer.license_expires_at);
          }
          Alert.alert(
            'Registration Successful',
            `Registered successfully!\nYour unique Customer ID is: ${res.customer.customer_id}\nPlan: ${res.customer.plan.toUpperCase()}`,
          );
        } else {
          Alert.alert('Server Notice', res.error || 'Failed to register on server.');
        }
      } else {
        Alert.alert('Saved', 'Restaurant details updated locally and saved.');
      }
    } finally {
      setIsRegistering(false);
      await revalidateAll();
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseInput.trim()) {
      Alert.alert('Input Error', 'Please enter a valid license code.');
      return;
    }

    if (!settings.customerId) {
      Alert.alert('Customer ID Required', 'Please register your restaurant before activating a license code.');
      return;
    }

    setIsActivatingLicense(true);
    try {
      const res = await activateLicenseOnServer(serverUrl, settings.customerId, licenseInput.trim());
      if (res.success && res.customer) {
        await setSetting(db, 'plan', res.customer.plan);
        await setSetting(db, 'licenseCode', res.customer.license_code || licenseInput.trim());
        await setSetting(db, 'licenseExpiresAt', res.customer.license_expires_at || '');
        setLicenseModalVisible(false);
        setLicenseInput('');
        Alert.alert(
          'License Activated!',
          `Plan: ${res.customer.plan.toUpperCase()}\nRemaining Days: ${res.customer.days_remaining} days\n(Leftover days were preserved and 365 days added!)`,
        );
      } else {
        Alert.alert('Activation Failed', res.error || 'Invalid or expired license code.');
      }
    } finally {
      setIsActivatingLicense(false);
      await revalidateAll();
    }
  };

  const handleManualSync = async () => {
    if (settings.plan === 'super') {
      Alert.alert('Super Plan', 'Your data is configured for local device storage only.');
      return;
    }

    if (!settings.customerId) {
      Alert.alert('Not Registered', 'Please register your customer details first.');
      return;
    }

    setIsSyncing(true);
    try {
      if (settings.plan === 'gold') {
        const res = await syncDailySummaryToServer(db, settings);
        Alert.alert(res.success ? 'Sync Completed' : 'Sync Notice', res.message);
      } else if (settings.plan === 'premium') {
        const summaryRes = await syncDailySummaryToServer(db, settings);
        const ordersRes = await syncPendingOrdersToServer(db, settings);
        Alert.alert(
          'Sync Completed',
          `${summaryRes.message}\nOrders: ${ordersRes.message}`,
        );
      }
    } finally {
      setIsSyncing(false);
      await revalidateAll();
    }
  };

  const calculateDaysLeft = () => {
    if (!settings.licenseExpiresAt) return 0;
    const exp = new Date(settings.licenseExpiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
  };

  const daysLeft = calculateDaysLeft();

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScreenHeader back title="Account & Plan" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 64 }}>
        <Content style={styles.body}>

          {/* ACTIVE PLAN CARD */}
          <Card style={[styles.planCard, { borderColor: planInfo.color }]}>
            <View style={styles.planHeader}>
              <View>
                <View style={[styles.planBadge, { backgroundColor: planInfo.bg }]}>
                  <Text style={[styles.planBadgeText, { color: planInfo.color }]}>
                    {planInfo.name.toUpperCase()}
                  </Text>
                </View>
                <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
                  {planInfo.desc}
                </Text>
              </View>
            </View>

            {/* CUSTOMER ID */}
            <View style={styles.customerRow}>
              <View style={styles.flex}>
                <Text variant="caption" tone="muted">CUSTOMER ID (UNIQUE 9-CHAR)</Text>
                <Text style={styles.customerIdText}>
                  {settings.customerId || 'NOT REGISTERED'}
                </Text>
              </View>
              {settings.customerId ? (
                <IconButton
                  icon="copy-outline"
                  variant="ghost"
                  label="Copy"
                  onPress={copyCustomerId}
                />
              ) : null}
            </View>

            {/* LICENSE EXPIRY & DAYS REMAINING */}
            <View style={styles.licenseRow}>
              <View>
                <Text variant="caption" tone="muted">LICENSE STATUS</Text>
                <Text variant="bodyStrong" style={{ color: daysLeft > 30 ? colors.primary : colors.danger }}>
                  {daysLeft > 0 ? `${daysLeft} days remaining` : 'No active license / Expired'}
                </Text>
                {settings.licenseExpiresAt ? (
                  <Text variant="caption" tone="muted">
                    Expires: {new Date(settings.licenseExpiresAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </View>
              <Button
                label="Enter Code"
                icon="key-outline"
                variant="soft"
                size="sm"
                onPress={() => setLicenseModalVisible(true)}
              />
            </View>
          </Card>

          {/* PLAN SELECTION */}
          <View>
            <SectionTitle>Select Plan</SectionTitle>
            <View style={styles.planSelector}>
              {(['super', 'gold', 'premium'] as SubscriptionPlan[]).map((p) => {
                const meta = PLAN_META[p];
                const selected = chosenPlan === p;
                return (
                  <Pressable
                    key={p}
                    style={[
                      styles.planOption,
                      { borderColor: selected ? meta.color : colors.border },
                      selected && { backgroundColor: meta.bg },
                    ]}
                    onPress={() => setChosenPlan(p)}>
                    <View style={styles.planOptionHeader}>
                      <Text style={[styles.planOptionTitle, { color: selected ? meta.color : colors.text }]}>
                        {meta.name}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={20} color={meta.color} />
                      ) : null}
                    </View>
                    <Text variant="caption" tone="muted">
                      {meta.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* RESTAURANT OWNER DETAILS */}
          <View>
            <SectionTitle>Restaurant Owner Details</SectionTitle>
            <Card style={styles.fields}>
              <TextField
                label="Restaurant Business Name"
                placeholder="e.g. Sri Venkateshwara Restaurant"
                value={businessName}
                onChangeText={setBusinessName}
              />
              <TextField
                label="Owner Phone Number"
                placeholder="e.g. 9876543210"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <TextField
                label="Owner Email (Optional)"
                placeholder="e.g. owner@restaurant.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextField
                label="Address / Location"
                placeholder="e.g. Main Road, City Center"
                value={location}
                onChangeText={setLocation}
              />
              <TextField
                label="Backend Microservice Server URL"
                placeholder="http://10.0.2.2:8005"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
              />

              <View style={styles.rowButtons}>
                <Button
                  label="Test Server"
                  icon="wifi-outline"
                  variant="ghost"
                  onPress={handleTestConnection}
                  style={styles.flex}
                />
                <Button
                  label={settings.customerId ? 'Save Details' : 'Register Restaurant'}
                  icon="cloud-upload-outline"
                  variant="primary"
                  loading={isRegistering}
                  onPress={handleRegisterOrUpdate}
                  style={styles.flex}
                />
              </View>
            </Card>
          </View>

          {/* CLOUD SYNC SECTION (GOLD & PREMIUM) */}
          {settings.plan !== 'super' ? (
            <View>
              <SectionTitle>Cloud Synchronization</SectionTitle>
              <Card style={styles.syncCard}>
                <View style={styles.syncStatusRow}>
                  <View style={styles.flex}>
                    <Text variant="bodyStrong">
                      {settings.plan === 'gold' ? 'Daily Summary Cloud Backup' : 'Real-Time Order & Menu Sync'}
                    </Text>
                    <Text variant="caption" tone="muted">
                      Last Synced: {settings.lastSyncedAt ? new Date(settings.lastSyncedAt).toLocaleString() : 'Never'}
                    </Text>
                    {settings.plan === 'premium' ? (
                      <Text variant="caption" tone="muted">
                        Unsynced Orders in Queue: {unsyncedCount}
                      </Text>
                    ) : null}
                  </View>
                  <Button
                    label="Sync Now"
                    icon="refresh-outline"
                    variant="soft"
                    loading={isSyncing}
                    onPress={handleManualSync}
                  />
                </View>
              </Card>
            </View>
          ) : null}

        </Content>
      </ScrollView>

      {/* LICENSE ACTIVATION MODAL */}
      <Modal
        visible={licenseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLicenseModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text variant="heading">Activate License</Text>
              <Pressable onPress={() => setLicenseModalVisible(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text variant="body" tone="muted">
              Enter your 16-character license key (e.g. LIC-PRE-XXXX-XXXX).
              {'\n'}Adding a code adds 365 days and rolls over any remaining days.
            </Text>

            <TextField
              label="License Code"
              placeholder="LIC-PRE-XXXX-XXXX"
              value={licenseInput}
              onChangeText={setLicenseInput}
              autoCapitalize="characters"
            />

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setLicenseModalVisible(false)}
                style={styles.flex}
              />
              <Button
                label="Activate"
                variant="primary"
                loading={isActivatingLicense}
                onPress={handleActivateLicense}
                style={styles.flex}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20 },
  flex: { flex: 1 },
  planCard: {
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    gap: 14,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  customerIdText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#1e293b',
    marginTop: 2,
  },
  licenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planSelector: {
    gap: 10,
  },
  planOption: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  fields: {
    padding: 16,
    gap: 14,
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  syncCard: {
    padding: 16,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
