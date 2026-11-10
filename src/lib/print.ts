import { Alert, Platform } from 'react-native';
import * as Print from 'expo-print';

import { printBillViaBluetooth } from './bluetooth-printer';
import { shareFile } from './file-io';
import { type ReceiptModel, receiptHtml, receiptText } from './receipt';

// Paper width in points (1 mm = 2.835 pt), used by iOS AirPrint for the page size.
const POINTS = { '58': 164, '80': 227 } as const;

export async function printSystemReceipt(model: ReceiptModel) {
  try {
    await Print.printAsync({ html: receiptHtml(model), width: POINTS[model.paper] });
  } catch (err) {
    console.warn('Print dialogue dismissed or failed:', err);
  }
}

/**
 * Direct print:
 * 1. Verifies Bluetooth status.
 * 2. If Bluetooth is turned off, shows: "Turn on bluetooth and connect printer".
 * 3. If Bluetooth is turned on and printer is connected, sends ESC/POS bill directly to the printer.
 * 4. If no Bluetooth printer is connected, prompts user and offers system print spooler fallback.
 */
export async function printReceipt(model: ReceiptModel): Promise<boolean> {
  if (Platform.OS === 'android') {
    const text = receiptText(model);
    const result = await printBillViaBluetooth(text);
    if (result.success) {
      return true;
    }

    if (result.reason === 'BLUETOOTH_OFF' || result.reason === 'NO_PERMISSION') {
      // Alert has already been displayed
      return false;
    }

    // For NO_PRINTER or PRINT_FAILED, allow fallback to system print
    return new Promise((resolve) => {
      Alert.alert(
        'Bluetooth Printer',
        `${result.message}\n\nWould you like to print using the system print dialogue instead?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'System Print',
            onPress: async () => {
              await printSystemReceipt(model);
              resolve(true);
            },
          },
        ],
      );
    });
  }

  // iOS or other platforms
  await printSystemReceipt(model);
  return true;
}

/** Shares the plain-text receipt, e.g. to RawBT or another ESC/POS Bluetooth printer app. */
export async function shareReceipt(model: ReceiptModel, name: string) {
  await shareFile(`${name}.txt`, 'text/plain', receiptText(model));
}
