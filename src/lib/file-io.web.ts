import * as DocumentPicker from 'expo-document-picker';

export async function shareFile(name: string, mimeType: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mimeType};charset=utf-8` }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickTextFile(types: string[]) {
  const result = await DocumentPicker.getDocumentAsync({ type: types });
  if (result.canceled) return null;
  const asset = result.assets[0];
  return asset.file ? asset.file.text() : (await fetch(asset.uri)).text();
}
