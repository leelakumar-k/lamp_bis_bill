import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  type BluetoothDeviceItem,
  enableBluetooth,
  getPairedPrinters,
  isBluetoothEnabled,
  onBondStateChanged,
  onDeviceFound,
  onDiscoveryFinished,
  pairDevice,
  startDiscovery,
  stopDiscovery,
} from '@/lib/bluetooth-printer';
import { radius, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectPrinter: (device: BluetoothDeviceItem) => void;
  onUseSystemPrint?: () => void;
  selectedAddress?: string;
};

export function PrinterPickerModal({
  visible,
  onClose,
  onSelectPrinter,
  onUseSystemPrint,
  selectedAddress,
}: Props) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pairingAddress, setPairingAddress] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDeviceItem[]>([]);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDeviceItem[]>([]);
  const [statusText, setStatusText] = useState('');

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    async function init() {
      setLoading(true);
      setStatusText('Turning on Bluetooth...');

      // 1. Ensure Bluetooth is ON
      let enabled = await isBluetoothEnabled();
      if (!enabled) {
        enabled = await enableBluetooth();
      }

      if (!enabled) {
        setStatusText('Bluetooth is turned off');
        setLoading(false);
        return;
      }

      // 2. Load paired devices
      setStatusText('Loading paired printers...');
      const paired = await getPairedPrinters();
      if (mounted) {
        setPairedDevices(paired);
        setLoading(false);
      }

      // 3. Start discovery for nearby devices
      startScan();
    }

    init();

    // Listeners for discovered devices
    const unsubFound = onDeviceFound((device) => {
      if (!mounted) return;
      setDiscoveredDevices((prev) => {
        // Avoid duplicates and avoid listing devices that are already paired
        if (prev.some((d) => d.address === device.address)) return prev;
        return [...prev, device];
      });
    });

    const unsubFinished = onDiscoveryFinished(() => {
      if (!mounted) return;
      setScanning(false);
      setStatusText('Scan complete');
    });

    const unsubBond = onBondStateChanged((data) => {
      if (!mounted) return;
      if (data.isBonded) {
        setPairingAddress(null);
        getPairedPrinters().then((list) => {
          if (mounted) setPairedDevices(list);
        });
      }
    });

    return () => {
      mounted = false;
      stopDiscovery();
      unsubFound();
      unsubFinished();
      unsubBond();
    };
  }, [visible]);

  const startScan = async () => {
    setScanning(true);
    setStatusText('Searching for nearby printers...');
    setDiscoveredDevices([]);
    await startDiscovery();
  };

  const handleSelect = async (device: BluetoothDeviceItem) => {
    if (!device.bonded) {
      setPairingAddress(device.address);
      setStatusText(`Pairing with ${device.name}...`);
      await pairDevice(device.address);
      // Even if pairing is in progress, attempt connection which handles pairing PIN in Android
    }
    setPairingAddress(null);
    onSelectPrinter(device);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerTitleWrap}>
              <Ionicons name="print-outline" size={22} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Bluetooth Printers</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                onPress={startScan}
                disabled={scanning}
                style={({ pressed }) => [styles.scanBtn, pressed && { opacity: 0.7 }]}>
                {scanning ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="refresh-outline" size={20} color={colors.primary} />
                )}
                <Text style={[styles.scanBtnText, { color: colors.primary }]}>
                  {scanning ? 'Scanning...' : 'Scan'}
                </Text>
              </Pressable>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Body */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {statusText ? (
              <Text style={[styles.statusBanner, { color: colors.textMuted }]}>{statusText}</Text>
            ) : null}

            {/* Paired Printers */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                PAIRED PRINTERS {pairedDevices.length > 0 ? `(${pairedDevices.length})` : ''}
              </Text>
              {pairedDevices.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No paired printers found. Turn on your printer and scan below.
                  </Text>
                </View>
              ) : (
                pairedDevices.map((d) => {
                  const isSelected = selectedAddress === d.address;
                  return (
                    <Pressable
                      key={d.address}
                      style={({ pressed }) => [
                        styles.deviceRow,
                        { borderColor: isSelected ? colors.primary : colors.border },
                        isSelected && { backgroundColor: colors.primarySoft },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleSelect(d)}>
                      <View style={styles.deviceIconWrap}>
                        <Ionicons
                          name={d.isPrinter ? 'print' : 'bluetooth'}
                          size={22}
                          color={isSelected ? colors.primary : colors.text}
                        />
                      </View>
                      <View style={styles.deviceInfo}>
                        <Text style={[styles.deviceName, { color: colors.text }]}>{d.name}</Text>
                        <Text style={[styles.deviceAddress, { color: colors.textMuted }]}>{d.address}</Text>
                      </View>
                      <View style={styles.deviceAction}>
                        <Text style={[styles.connectText, { color: colors.primary }]}>
                          {isSelected ? 'Selected' : 'Print'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>

            {/* Available Nearby Printers */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                  NEARBY PRINTERS {discoveredDevices.length > 0 ? `(${discoveredDevices.length})` : ''}
                </Text>
                {scanning && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {discoveredDevices.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {scanning
                      ? 'Looking for nearby Bluetooth printers... Please ensure printer is ON and discoverable.'
                      : 'No new printers found. Tap Scan to search again.'}
                  </Text>
                </View>
              ) : (
                discoveredDevices.map((d) => {
                  const isPairing = pairingAddress === d.address;
                  return (
                    <Pressable
                      key={d.address}
                      style={({ pressed }) => [
                        styles.deviceRow,
                        { borderColor: colors.border },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => handleSelect(d)}>
                      <View style={styles.deviceIconWrap}>
                        <Ionicons
                          name={d.isPrinter ? 'print' : 'bluetooth-outline'}
                          size={22}
                          color={colors.primary}
                        />
                      </View>
                      <View style={styles.deviceInfo}>
                        <Text style={[styles.deviceName, { color: colors.text }]}>{d.name}</Text>
                        <Text style={[styles.deviceAddress, { color: colors.textMuted }]}>
                          {d.address} {d.isPrinter ? '· Printer' : ''}
                        </Text>
                      </View>
                      <View style={styles.deviceAction}>
                        {isPairing ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Text style={[styles.connectText, { color: colors.primary }]}>Pair & Print</Text>
                            <Ionicons name="link-outline" size={16} color={colors.primary} />
                          </>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>

          {/* Footer Fallback */}
          {onUseSystemPrint ? (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Pressable
                style={({ pressed }) => [styles.fallbackBtn, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  onClose();
                  onUseSystemPrint();
                }}>
                <Ionicons name="share-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.fallbackText, { color: colors.textMuted }]}>
                  Use System Print Dialogue Instead
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '85%',
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
    gap: 18,
  },
  statusBanner: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyBox: {
    padding: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
  },
  deviceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  deviceAddress: {
    fontSize: 12,
  },
  deviceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
  },
  fallbackText: {
    fontSize: 13,
  },
});
