import { Alert, NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

const { BluetoothPrinter } = NativeModules;
const eventEmitter = BluetoothPrinter ? new NativeEventEmitter(BluetoothPrinter) : null;

export type BluetoothDeviceItem = {
  name: string;
  address: string;
  bonded: boolean;
  isPrinter: boolean;
};

export async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    if (Platform.Version >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (e) {
    console.warn('Bluetooth permission request error:', e);
    return false;
  }
}

export async function isBluetoothEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) return false;
  try {
    return await BluetoothPrinter.isBluetoothEnabled();
  } catch {
    return false;
  }
}

/** Automatically turns on Bluetooth if not enabled. */
export async function enableBluetooth(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) return false;
  const hasPerm = await requestBluetoothPermissions();
  if (!hasPerm) return false;
  try {
    return await BluetoothPrinter.enableBluetooth();
  } catch (e) {
    console.warn('enableBluetooth error:', e);
    return false;
  }
}

export async function getPairedPrinters(): Promise<BluetoothDeviceItem[]> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) return [];
  try {
    return await BluetoothPrinter.getPairedPrinters();
  } catch {
    return [];
  }
}

export async function startDiscovery(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) return false;
  try {
    return await BluetoothPrinter.startDiscovery();
  } catch {
    return false;
  }
}

export async function stopDiscovery(): Promise<boolean> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) return false;
  try {
    return await BluetoothPrinter.stopDiscovery();
  } catch {
    return false;
  }
}

export async function pairDevice(address: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) return false;
  try {
    return await BluetoothPrinter.pairDevice(address);
  } catch {
    return false;
  }
}

export function onDeviceFound(callback: (device: BluetoothDeviceItem) => void) {
  if (!eventEmitter) return () => {};
  const sub = eventEmitter.addListener('BluetoothDeviceFound', (device: any) => callback(device));
  return () => sub.remove();
}

export function onDiscoveryFinished(callback: () => void) {
  if (!eventEmitter) return () => {};
  const sub = eventEmitter.addListener('BluetoothDiscoveryFinished', () => callback());
  return () => sub.remove();
}

export function onBondStateChanged(callback: (data: { address: string; name: string; isBonded: boolean }) => void) {
  if (!eventEmitter) return () => {};
  const sub = eventEmitter.addListener('BluetoothBondStateChanged', (data: any) => callback(data));
  return () => sub.remove();
}

export type BluetoothPrintResult =
  | { success: true; printerName?: string; printerAddress?: string }
  | { success: false; reason: 'BLUETOOTH_OFF' | 'NO_PERMISSION' | 'NO_PRINTER' | 'PRINT_FAILED' | 'UNSUPPORTED'; message: string };

export async function printBillViaBluetooth(receiptTextContent: string, deviceAddress?: string): Promise<BluetoothPrintResult> {
  if (Platform.OS !== 'android' || !BluetoothPrinter) {
    return { success: false, reason: 'UNSUPPORTED', message: 'Bluetooth direct print is only available on Android' };
  }

  const hasPerm = await requestBluetoothPermissions();
  if (!hasPerm) {
    Alert.alert('Permission Required', 'Bluetooth permission is needed to connect and print.');
    return { success: false, reason: 'NO_PERMISSION', message: 'Bluetooth permission denied' };
  }

  // Automatically enable Bluetooth if not on
  let enabled = await isBluetoothEnabled();
  if (!enabled) {
    enabled = await enableBluetooth();
  }

  if (!enabled) {
    Alert.alert('Bluetooth Required', 'Turn on bluetooth and connect printer');
    return { success: false, reason: 'BLUETOOTH_OFF', message: 'Turn on bluetooth and connect printer' };
  }

  try {
    const res = await BluetoothPrinter.printRawText(receiptTextContent, deviceAddress || null);
    return { success: true, printerName: res?.printerName, printerAddress: res?.printerAddress };
  } catch (error: any) {
    const code = error?.code || '';
    const msg = error?.message || '';

    if (code === 'BLUETOOTH_OFF') {
      return { success: false, reason: 'BLUETOOTH_OFF', message: 'Turn on bluetooth and connect printer' };
    }

    if (code === 'NO_PRINTER') {
      return {
        success: false,
        reason: 'NO_PRINTER',
        message: 'No paired Bluetooth printer found. Please pair printer.',
      };
    }

    return {
      success: false,
      reason: 'PRINT_FAILED',
      message: msg || 'Failed to print bill over Bluetooth.',
    };
  }
}
