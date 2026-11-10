import { Status } from '@/db/types';
import type { StringKey } from '@/i18n';
import type { Palette } from '@/theme';

export type StatusMeta = {
  status: Status;
  label: StringKey;
  short: StringKey;
  color: (p: Palette) => { fg: string; bg: string };
};

/** Display order in the picker: the most common choice first. */
export const STATUSES: StatusMeta[] = [
  {
    status: Status.Present,
    label: 'status.present',
    short: 'status.present.short',
    color: (p) => ({ fg: p.primary, bg: p.primarySoft }),
  },
  {
    status: Status.HalfDay,
    label: 'status.half',
    short: 'status.half.short',
    color: (p) => ({ fg: p.accent, bg: p.accentSoft }),
  },
  {
    status: Status.Leave,
    label: 'status.leave',
    short: 'status.leave.short',
    color: (p) => ({ fg: p.textMuted, bg: p.surfaceMuted }),
  },
  {
    status: Status.Absent,
    label: 'status.absent',
    short: 'status.absent.short',
    color: (p) => ({ fg: p.danger, bg: p.dangerSoft }),
  },
];

export const statusMeta = (status: Status): StatusMeta =>
  STATUSES.find((s) => s.status === status) ?? STATUSES[0];
