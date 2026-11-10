import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { PrinterPickerModal } from '@/components/pos/printer-picker-modal';
import { useToast } from '@/components/toast';
import { setSetting } from '@/db/meta';
import {
  type BluetoothDeviceItem,
  enableBluetooth,
  getPairedPrinters,
  isBluetoothEnabled,
  printBillViaBluetooth,
} from '@/lib/bluetooth-printer';
import { printSystemReceipt, shareReceipt } from '@/lib/print';
import { type ReceiptModel, receiptText } from '@/lib/receipt';
import { useDb, useRevalidateAll, useSettings } from '@/providers/database';

type PrinterContextType = {
  printBill: (model: ReceiptModel) => Promise<boolean>;
  openPrinterPicker: (pendingModel?: ReceiptModel) => void;
  selectedPrinter: { name: string; address: string } | null;
};

const PrinterContext = createContext<PrinterContextType | null>(null);

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const settings = useSettings();
  const revalidateAll = useRevalidateAll();
  const showToast = useToast();

  const [modalVisible, setModalVisible] = useState(false);
  const [pendingModel, setPendingModel] = useState<ReceiptModel | null>(null);

  const selectedAddress = settings?.bluetoothPrinterAddress || '';
  const selectedName = settings?.bluetoothPrinterName || '';

  const saveSelectedPrinter = async (device: BluetoothDeviceItem) => {
    try {
      await setSetting(db, 'bluetoothPrinterAddress', device.address);
      await setSetting(db, 'bluetoothPrinterName', device.name);
      await revalidateAll();
    } catch (e) {
      console.warn('Failed to save printer setting:', e);
    }
  };

  const executePrint = async (model: ReceiptModel, address?: string): Promise<boolean> => {
    const text = receiptText(model);
    const res = await printBillViaBluetooth(text, address);
    if (res.success) {
      showToast({ message: `Printed on ${res.printerName || 'Bluetooth Printer'}` });
      return true;
    }
    Alert.alert('Printing Failed', res.message || 'Could not communicate with the printer.');
    return false;
  };

  const printBill = async (model: ReceiptModel): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      await printSystemReceipt(model);
      return true;
    }

    // 1. Automatically turn on Bluetooth if not enabled
    let enabled = await isBluetoothEnabled();
    if (!enabled) {
      enabled = await enableBluetooth();
    }

    if (!enabled) {
      Alert.alert('Bluetooth Required', 'Turn on bluetooth and connect printer');
      return false;
    }

    // 2. Check paired devices
    const paired = await getPairedPrinters();

    // 3. If a paired printer exists:
    let targetDevice: BluetoothDeviceItem | undefined;

    if (selectedAddress) {
      targetDevice = paired.find((d) => d.address.toLowerCase() === selectedAddress.toLowerCase());
    }

    if (!targetDevice) {
      // Find a device that is recognized as a printer
      targetDevice = paired.find((d) => d.isPrinter);
    }

    if (!targetDevice && paired.length === 1) {
      // If there's only one paired device, use it
      targetDevice = paired[0];
    }

    if (targetDevice) {
      // Auto-connect and print
      try {
        const ok = await executePrint(model, targetDevice.address);
        if (ok) return true;
      } catch (_e) {
        // Fallthrough to show picker if printing failed
      }
    }

    // 4. No paired printer or auto-connect failed: show available printers modal
    setPendingModel(model);
    setModalVisible(true);
    return false;
  };

  const openPrinterPicker = (model?: ReceiptModel) => {
    setPendingModel(model || null);
    setModalVisible(true);
  };

  const handleSelectPrinter = async (device: BluetoothDeviceItem) => {
    setModalVisible(false);
    await saveSelectedPrinter(device);

    if (pendingModel) {
      const model = pendingModel;
      setPendingModel(null);
      await executePrint(model, device.address);
    } else {
      showToast({ message: `Printer set to ${device.name}` });
    }
  };

  const handleUseSystemPrint = async () => {
    if (pendingModel) {
      const model = pendingModel;
      setPendingModel(null);
      await printSystemReceipt(model);
    }
  };

  return (
    <PrinterContext.Provider
      value={{
        printBill,
        openPrinterPicker,
        selectedPrinter: selectedAddress ? { name: selectedName, address: selectedAddress } : null,
      }}>
      {children}
      <PrinterPickerModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setPendingModel(null);
        }}
        onSelectPrinter={handleSelectPrinter}
        onUseSystemPrint={pendingModel ? handleUseSystemPrint : undefined}
        selectedAddress={selectedAddress}
      />
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider');
  return ctx;
}
