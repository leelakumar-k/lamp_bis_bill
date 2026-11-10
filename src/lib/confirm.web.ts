import type { ConfirmOptions } from './confirm';

export type { ConfirmOptions };

export async function confirm({ title, message }: ConfirmOptions) {
  return window.confirm(message ? `${title}\n\n${message}` : title);
}

export function notify(title: string, message?: string) {
  window.alert(message ? `${title}\n\n${message}` : title);
}
