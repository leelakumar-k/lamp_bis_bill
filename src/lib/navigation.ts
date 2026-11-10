import { type Href, router } from 'expo-router';

/** Goes back when there is history (e.g. after a deep link there may be none). */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
