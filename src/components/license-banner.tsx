import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useSettings } from '@/providers/database';
import { radius } from '@/theme';

export function LicenseBanner() {
  const settings = useSettings();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !settings.licenseExpiresAt) {
    return null;
  }

  const exp = new Date(settings.licenseExpiresAt).getTime();
  if (isNaN(exp)) return null;

  const now = Date.now();
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));

  // Only show banner if expired (daysLeft <= 0) or expiring within 7 days
  if (daysLeft > 7) {
    return null;
  }

  const isExpired = daysLeft <= 0;
  const planName = (settings.plan || 'Subscription').toUpperCase();

  const bannerColor = isExpired ? '#DC2626' : '#D97706';
  const bannerBg = isExpired ? '#FEF2F2' : '#FFFBEB';
  const bannerBorder = isExpired ? '#FCA5A5' : '#FDE68A';

  return (
    <Pressable
      style={[
        styles.banner,
        { backgroundColor: bannerBg, borderColor: bannerBorder },
      ]}
      onPress={() => router.push('/account')}>
      <Ionicons
        name={isExpired ? 'alert-circle' : 'time-outline'}
        size={20}
        color={bannerColor}
        style={styles.icon}
      />
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: bannerColor }]}>
          {isExpired ? `${planName} License Expired` : `${planName} License Expiring Soon`}
        </Text>
        <Text variant="caption" style={{ color: bannerColor }}>
          {isExpired
            ? 'Cloud sync is paused. Tap here to enter renewal code.'
            : `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Tap here to renew.`}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        style={styles.closeBtn}>
        <Ionicons name="close" size={16} color={bannerColor} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 10,
  },
  icon: {
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
});
