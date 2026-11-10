import type { ImageSource } from 'expo-image';

// Bundled photos for the sample menu. User photos are stored as file URIs instead.
const ASSETS: Record<string, number> = {
  'paneer-tikka': require('@/assets/menu/paneer-tikka.jpg'),
  'chicken-65': require('@/assets/menu/chicken-65.jpg'),
  'veg-spring-roll': require('@/assets/menu/veg-spring-roll.jpg'),
  'paneer-butter-masala': require('@/assets/menu/paneer-butter-masala.jpg'),
  'dal-makhani': require('@/assets/menu/dal-makhani.jpg'),
  'butter-chicken': require('@/assets/menu/butter-chicken.jpg'),
  'butter-naan': require('@/assets/menu/butter-naan.jpg'),
  'tandoori-roti': require('@/assets/menu/tandoori-roti.jpg'),
  'garlic-naan': require('@/assets/menu/garlic-naan.jpg'),
  'chicken-biryani': require('@/assets/menu/chicken-biryani.jpg'),
  'veg-pulao': require('@/assets/menu/veg-pulao.jpg'),
  'jeera-rice': require('@/assets/menu/jeera-rice.jpg'),
  'masala-dosa': require('@/assets/menu/masala-dosa.jpg'),
  'idli-sambar': require('@/assets/menu/idli-sambar.jpg'),
  'medu-vada': require('@/assets/menu/medu-vada.jpg'),
  'masala-chai': require('@/assets/menu/masala-chai.jpg'),
  'sweet-lassi': require('@/assets/menu/sweet-lassi.jpg'),
  'fresh-lime-soda': require('@/assets/menu/fresh-lime-soda.jpg'),
  'gulab-jamun': require('@/assets/menu/gulab-jamun.jpg'),
  kulfi: require('@/assets/menu/kulfi.jpg'),
};

export function menuImageSource(image: string | null): ImageSource | number | null {
  if (!image) return null;
  if (image.startsWith('asset:')) return ASSETS[image.slice('asset:'.length)] ?? null;
  return { uri: image };
}
