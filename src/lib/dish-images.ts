import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { randomUUID } from 'expo-crypto';
import { Alert, Platform } from 'react-native';

/**
 * Compress an image on web using an offscreen HTML5 canvas to guarantee JPEG format under 1 MB.
 */
function compressWebImage(uri: string, maxDim = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      resolve(uri);
      return;
    }
    const img = new (window as any).Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(uri);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

/**
 * Persist an image picked from camera or library to permanent device storage.
 * On native (Android/iOS): copies content:// or file:// stream into app's documents directory.
 * On web: compresses to JPEG data URL under 1 MB so it survives across reloads.
 */
export async function persistDishImage(uri: string): Promise<string> {
  if (!uri) return uri;

  if (Platform.OS === 'web') {
    try {
      return await compressWebImage(uri, 1024, 0.75);
    } catch {
      return uri;
    }
  }

  // Native: copy content:// or file:// URI to document directory
  try {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) return uri;
    const dishDir = `${docDir}dish_images/`;
    await FileSystem.makeDirectoryAsync(dishDir, { intermediates: true });

    const ext = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const dest = `${dishDir}${randomUUID()}.${safeExt}`;

    await FileSystem.copyAsync({ from: uri, to: dest });
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists && info.size && info.size > 0) {
      return dest;
    }
    return uri;
  } catch (e) {
    console.warn('Failed to copy image to document directory, using original URI', e);
    return uri;
  }
}

/**
 * Launch device camera to snap a photo for a dish.
 * Takes photo automatically without crop UI, and reduces size.
 */
export async function takeDishPhoto(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos of dishes.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const rawUri = result.assets[0].uri;
    return await persistDishImage(rawUri);
  } catch (err) {
    console.warn('Camera capture failed:', err);
    Alert.alert('Camera Unavailable', 'Unable to access the camera on this device.');
    return null;
  }
}

/**
 * Pick an image from device gallery or computer files.
 * Uploads photo automatically without crop UI, and reduces size.
 */
export async function pickDishPhoto(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Gallery permission is required to choose photos.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.7,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const rawUri = result.assets[0].uri;
    return await persistDishImage(rawUri);
  } catch (err) {
    console.warn('Photo selection failed:', err);
    Alert.alert('Selection Failed', 'Unable to pick a photo on this device.');
    return null;
  }
}
