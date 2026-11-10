import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const UTI: Record<string, string> = {
  'application/json': 'public.json',
  'text/csv': 'public.comma-separated-values-text',
};

/** Writes the file to the cache and opens the share sheet (WhatsApp, Drive, email, Files…). */
export async function shareFile(name: string, mimeType: string, content: string) {
  try {
    const isAvail = await Sharing.isAvailableAsync();
    if (!isAvail) {
      console.warn('Sharing is not supported on this platform');
      return;
    }
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    await file.write(content);
    await Sharing.shareAsync(file.uri, { mimeType, UTI: UTI[mimeType], dialogTitle: name });
  } catch (err) {
    console.warn('Sharing file failed:', err);
  }
}

export async function pickTextFile(types: string[]) {
  const result = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}
