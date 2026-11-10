import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { radius, useTheme } from '@/theme';
import { Text } from '../ui/text';

type Props = {
  name: string;
  seats: number;
  isSubTable?: boolean;
  parentName?: string | null;
  status?: 'vacant' | 'open' | 'billed';
  partyLabel?: string | null;
  size?: 'sm' | 'md' | 'lg';
};

function distributeChairs(seats: number) {
  const safe = Number.isFinite(seats) && seats > 0 ? Math.floor(seats) : 4;
  const count = Math.max(1, safe);
  if (count === 1) return { top: 1, bottom: 0, left: 0, right: 0 };
  if (count === 2) return { top: 1, bottom: 1, left: 0, right: 0 };
  if (count === 3) return { top: 1, bottom: 2, left: 0, right: 0 };
  if (count === 4) return { top: 2, bottom: 2, left: 0, right: 0 };

  let left = count >= 6 ? 1 : 0;
  let right = count >= 5 ? 1 : 0;
  if (count >= 12) {
    left = 2;
    right = 2;
  }
  const remaining = Math.max(0, count - (left + right));
  const top = Math.ceil(remaining / 2);
  const bottom = Math.floor(remaining / 2);
  return { top, bottom, left, right };
}

export function TableChairLayout({
  name,
  seats,
  isSubTable,
  parentName,
  status = 'vacant',
  partyLabel,
  size = 'md',
}: Props) {
  const { colors } = useTheme();
  const { top, bottom, left, right } = distributeChairs(seats);

  const isBilled = status === 'billed';
  const isOpen = status === 'open';
  const isOccupied = isOpen || isBilled;

  // Sizing tokens based on scale
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const chairHWidth = isSm ? 14 : isLg ? 26 : 20;
  const chairHHeight = isSm ? 5 : isLg ? 9 : 7;
  const chairVWidth = isSm ? 5 : isLg ? 9 : 7;
  const chairVHeight = isSm ? 14 : isLg ? 26 : 20;
  const chairGap = isSm ? 4 : isLg ? 8 : 6;

  const chairBg = isBilled
    ? colors.accentSoft
    : isOpen
      ? colors.primarySoft
      : colors.surfaceMuted;
  const chairBorder = isBilled
    ? colors.accent
    : isOpen
      ? colors.primary
      : colors.border;

  const tableBg = isBilled
    ? colors.accentSoft
    : isOpen
      ? colors.primarySoft
      : colors.surface;
  const tableBorder = isBilled
    ? colors.accent
    : isOpen
      ? colors.primary
      : isSubTable
        ? colors.primary
        : colors.border;

  return (
    <View style={styles.container}>
      {/* TOP CHAIRS */}
      {top > 0 ? (
        <View style={[styles.chairRow, { gap: chairGap }]}>
          {Array.from({ length: top }).map((_, i) => (
            <View
              key={`top-${i}`}
              style={[
                styles.chairH,
                {
                  width: chairHWidth,
                  height: chairHHeight,
                  backgroundColor: chairBg,
                  borderColor: chairBorder,
                },
              ]}
            />
          ))}
        </View>
      ) : null}

      {/* MIDDLE: LEFT CHAIRS + TABLE SURFACE + RIGHT CHAIRS */}
      <View style={[styles.middleRow, { gap: isSm ? 4 : 8 }]}>
        {/* Left chairs */}
        {left > 0 ? (
          <View style={[styles.chairCol, { gap: chairGap }]}>
            {Array.from({ length: left }).map((_, i) => (
              <View
                key={`left-${i}`}
                style={[
                  styles.chairV,
                  {
                    width: chairVWidth,
                    height: chairVHeight,
                    backgroundColor: chairBg,
                    borderColor: chairBorder,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={{ width: chairVWidth }} />
        )}

        {/* Central Table Surface */}
        <View
          style={[
            styles.tableSurface,
            {
              backgroundColor: tableBg,
              borderColor: tableBorder,
              borderWidth: isOccupied ? 2 : 1,
              paddingVertical: isSm ? 6 : isLg ? 16 : 10,
              paddingHorizontal: isSm ? 10 : isLg ? 20 : 14,
              minWidth: isSm ? 80 : isLg ? 160 : 110,
            },
          ]}>
          <View style={styles.tableCenter}>
            <View style={styles.nameRow}>
              {isSubTable ? (
                <Ionicons
                  name="git-branch-outline"
                  size={isSm ? 12 : 16}
                  color={colors.primary}
                  style={{ marginRight: 2 }}
                />
              ) : null}
              <Text
                variant={isSm ? 'bodyStrong' : isLg ? 'heading' : 'title'}
                style={[
                  isSubTable && { color: colors.primary },
                  styles.tableNameText,
                ]}
                numberOfLines={1}>
                {name}
              </Text>
            </View>

            {isSubTable && parentName ? (
              <Text
                variant="caption"
                tone="muted"
                style={{ fontSize: isSm ? 10 : 11 }}
                numberOfLines={1}>
                ↳ {parentName}
              </Text>
            ) : null}

            <View style={[styles.seatPill, { backgroundColor: colors.surfaceMuted }]}>
              <Ionicons
                name="people-outline"
                size={isSm ? 10 : 12}
                color={colors.textMuted}
              />
              <Text
                variant="caption"
                tone="muted"
                style={{ fontSize: isSm ? 10 : 11, fontWeight: '600' }}>
                {Number.isFinite(seats) && seats > 0 ? seats : 4}{' '}
                {(Number.isFinite(seats) && seats > 0 ? seats : 4) === 1 ? 'seat' : 'seats'}
              </Text>
            </View>

            {partyLabel ? (
              <Text
                variant="caption"
                tone={isBilled ? 'accent' : 'primary'}
                style={{ fontWeight: '700', fontSize: isSm ? 10 : 11 }}>
                {partyLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right chairs */}
        {right > 0 ? (
          <View style={[styles.chairCol, { gap: chairGap }]}>
            {Array.from({ length: right }).map((_, i) => (
              <View
                key={`right-${i}`}
                style={[
                  styles.chairV,
                  {
                    width: chairVWidth,
                    height: chairVHeight,
                    backgroundColor: chairBg,
                    borderColor: chairBorder,
                  },
                ]}
              />
            ))}
          </View>
        ) : (
          <View style={{ width: chairVWidth }} />
        )}
      </View>

      {/* BOTTOM CHAIRS */}
      {bottom > 0 ? (
        <View style={[styles.chairRow, { gap: chairGap }]}>
          {Array.from({ length: bottom }).map((_, i) => (
            <View
              key={`bottom-${i}`}
              style={[
                styles.chairH,
                {
                  width: chairHWidth,
                  height: chairHHeight,
                  backgroundColor: chairBg,
                  borderColor: chairBorder,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  chairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chairCol: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chairH: {
    borderWidth: 1,
    borderRadius: 3,
  },
  chairV: {
    borderWidth: 1,
    borderRadius: 3,
  },
  tableSurface: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableNameText: {
    textAlign: 'center',
  },
  seatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginTop: 2,
  },
});
