import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatItemVal, type ReceiptModel } from '@/lib/receipt';
import { useTheme } from '@/theme';

// On-screen widths roughly proportional to 58 mm and 80 mm rolls.
const PAPER_WIDTH = { '58': 300, '80': 380 } as const;

export function ReceiptPreview({ model, accessibilityLabel }: { model: ReceiptModel; accessibilityLabel: string }) {
  const { colors } = useTheme();
  const width = PAPER_WIDTH[model.paper];

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.paper, { width, backgroundColor: colors.paper, borderColor: colors.border }]}>
      
      {/* HEADER: Restaurant Name, Address, Phone, GSTIN */}
      <View style={styles.header}>
        {model.header.map((line, idx) => (
          <Text
            key={idx}
            style={[
              styles.headerLine,
              idx === 0 ? styles.restaurantName : styles.subHeaderLine,
              { color: colors.ink },
            ]}>
            {line}
          </Text>
        ))}
      </View>

      {/* DIVIDER */}
      <View style={[styles.dashedRule, { borderColor: colors.ink }]} />

      {/* TITLE: TAX INVOICE / BILL */}
      <Text style={[styles.title, { color: colors.ink }]}>{model.title}</Text>

      {/* DIVIDER */}
      <View style={[styles.dashedRule, { borderColor: colors.ink }]} />

      {/* META ROWS: Bill No, Token, Date, Shift, Customer */}
      <View style={styles.section}>
        {model.meta.map((m, idx) => (
          <View key={idx} style={styles.rowBetween}>
            <Text style={[styles.metaText, m.bold && styles.bold, { color: colors.ink }]}>{m.left}</Text>
            {m.right ? (
              <Text style={[styles.metaText, m.bold && styles.bold, { color: colors.ink }]}>{m.right}</Text>
            ) : null}
          </View>
        ))}
      </View>

      {/* ITEMS TABLE */}
      {model.items && model.items.length > 0 ? (
        <View style={styles.section}>
          <View style={[styles.dashedRule, { borderColor: colors.ink }]} />
          
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colItemHeader, { color: colors.ink }]}>Item</Text>
            <Text style={[styles.colQtyHeader, { color: colors.ink }]}>Qty</Text>
            {model.showPrices ? <Text style={[styles.colRateHeader, { color: colors.ink }]}>Rate</Text> : null}
            {model.showPrices ? <Text style={[styles.colAmtHeader, { color: colors.ink }]}>Amt</Text> : null}
          </View>
          
          <View style={[styles.dashedRule, { borderColor: colors.ink }]} />

          {/* Table Rows */}
          {model.items.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.colItem, { color: colors.ink }]} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={[styles.colQty, { color: colors.ink }]}>{item.qty}</Text>
              {model.showPrices ? (
                <Text style={[styles.colRate, { color: colors.ink }]}>{formatItemVal(item.rate)}</Text>
              ) : null}
              {model.showPrices ? (
                <Text style={[styles.colAmt, { color: colors.ink }]}>{formatItemVal(item.amount)}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {/* TOTALS */}
      {model.totals.length > 0 ? (
        <View style={styles.section}>
          <View style={[styles.dashedRule, { borderColor: colors.ink }]} />

          {model.totals.map((row, idx) => {
            if (row.bold) {
              return (
                <View key={idx} style={styles.grandTotalContainer}>
                  <View style={[styles.doubleRule, { borderColor: colors.ink }]} />
                  <View style={styles.rowBetween}>
                    <Text style={[styles.grandTotalLabel, { color: colors.ink }]}>{row.left}</Text>
                    <Text style={[styles.grandTotalValue, { color: colors.ink }]}>{row.right}</Text>
                  </View>
                  <View style={[styles.doubleRule, { borderColor: colors.ink }]} />
                </View>
              );
            }
            return (
              <View key={idx} style={styles.rowBetween}>
                <Text style={[styles.totalLabel, { color: colors.ink }]}>{row.left}</Text>
                <Text style={[styles.totalValue, { color: colors.ink }]}>{row.right}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* FOOTER */}
      {model.footer.length > 0 ? (
        <View style={styles.footerSection}>
          <View style={[styles.dashedRule, { borderColor: colors.ink }]} />
          {model.footer.map((f, idx) => (
            <Text key={idx} style={[styles.footerText, { color: colors.ink }]}>
              {f}
            </Text>
          ))}
        </View>
      ) : null}

      {/* TEAR EDGE */}
      <View style={[styles.tear, { borderTopColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    alignSelf: 'center',
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    gap: 2,
    marginBottom: 6,
  },
  headerLine: {
    textAlign: 'center',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subHeaderLine: {
    fontSize: 12,
    lineHeight: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    marginVertical: 4,
  },
  dashedRule: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 6,
    width: '100%',
  },
  doubleRule: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    height: 4,
    marginVertical: 4,
    width: '100%',
  },
  section: {
    gap: 3,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: 18,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  colItemHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  colQtyHeader: {
    width: 32,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  colRateHeader: {
    width: 50,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  colAmtHeader: {
    width: 56,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 2,
  },
  colItem: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    paddingRight: 4,
  },
  colQty: {
    width: 32,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  colRate: {
    width: 50,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  colAmt: {
    width: 56,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  totalLabel: {
    fontSize: 12,
    lineHeight: 18,
  },
  totalValue: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  grandTotalContainer: {
    marginVertical: 2,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  footerSection: {
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  tear: {
    marginTop: 12,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
});
