// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Button, EmptyNote, Reveal, ScreenHeader, SheetModal, usePad } from '../components/ui';
import { useCalc } from '../context/CalcContext';
import { isError, previewOf, showExpr, showResult } from '../utils/calcLogic';
import { COPYRIGHT } from '../branding';

// Samsung calculator layout: C ( ) % ÷ / 7 8 9 × / 4 5 6 − / 1 2 3 + / ± 0 . =
const ROWS = [
  ['C', '()', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['±', '0', '.', '='],
];
const SHOWN = { '()': '( )', '±': '+/−' };
const kindOf = (k) => (k === '=' ? 'equals' : '÷×−+'.includes(k) ? 'op' : k === 'C' || k === '()' || k === '%' ? 'fn' : 'num');

function Key({ label, onPress, colors }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v) => Animated.spring(scale, { toValue: v, speed: 45, bounciness: 4, useNativeDriver: true }).start();
  const kind = kindOf(label);
  const bg = kind === 'equals' ? colors.primary : kind === 'op' ? colors.input : colors.card;
  const fg = kind === 'equals' ? '#FFFFFF' : kind === 'op' || kind === 'fn' ? colors.primary : colors.text;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.9)}
        onPressOut={() => spring(1)}
        accessibilityLabel={label}
        style={{
          height: 64,
          margin: 5,
          borderRadius: 32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: kind === 'equals' ? 0 : StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: kind === 'equals' ? colors.glow : 'transparent',
          shadowOpacity: kind === 'equals' ? 1 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: kind === 'equals' ? 6 : 0,
        }}
      >
        <Text style={{ fontSize: kind === 'num' ? 26 : 24, fontWeight: kind === 'num' ? '500' : '600', color: fg }}>{SHOWN[label] || label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Calculator() {
  const { colors } = useTheme();
  const pad = usePad();
  const { state, key, pick, clearHistory } = useCalc();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { expr, result, done, history } = state;

  const error = done && isError(result);
  const preview = previewOf(state);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, ...pad }}>
      <ScreenHeader title="Calculator" subtitle="Quick maths for your money" />
      <Reveal style={{ flex: 1 }} from={10}>
        {/* display */}
        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 6 }}>
          {done ? (
            <>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.muted, fontSize: 24, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                {showExpr(expr)}
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ color: error ? colors.danger : colors.text, fontSize: error ? 30 : 56, fontWeight: '300', textAlign: 'right', fontVariant: ['tabular-nums'], marginTop: 4 }}
              >
                {showResult(result)}
              </Text>
            </>
          ) : (
            <>
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                style={{ color: colors.text, fontSize: 52, fontWeight: '300', textAlign: 'right', fontVariant: ['tabular-nums'] }}
              >
                {expr ? showExpr(expr) : '0'}
              </Text>
              <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 26, textAlign: 'right', marginTop: 4, fontVariant: ['tabular-nums'] }}>
                {preview !== null ? `= ${showResult(preview)}` : ' '}
              </Text>
            </>
          )}
        </View>

        {/* history + backspace, like the Samsung calculator */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6 }}>
          <Pressable onPress={() => setHistoryOpen(true)} hitSlop={14} accessibilityLabel="History">
            <Feather name="clock" size={22} color={colors.subtext} />
          </Pressable>
          <Pressable onPress={() => key('⌫')} onLongPress={() => key('C')} hitSlop={14} accessibilityLabel="Backspace">
            <Feather name="delete" size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View>
          {ROWS.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              {row.map((label) => (
                <Key key={label} label={label} colors={colors} onPress={() => key(label)} />
              ))}
            </View>
          ))}
        </View>

        <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 }}>{COPYRIGHT}</Text>
      </Reveal>

      <SheetModal visible={historyOpen} onClose={() => setHistoryOpen(false)} title="History">
        {history.length ? (
          <>
            {history.map((h, i) => (
              <Pressable
                key={`${i}-${h.expr}`}
                onPress={() => {
                  pick(h);
                  setHistoryOpen(false);
                }}
                style={{ paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
              >
                <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{showExpr(h.expr)}</Text>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: '500', textAlign: 'right', fontVariant: ['tabular-nums'] }}>{showResult(h.result)}</Text>
              </Pressable>
            ))}
            <Button title="Clear history" variant="outline" icon="trash-2" onPress={clearHistory} style={{ marginTop: 16 }} />
          </>
        ) : (
          <EmptyNote text="No calculations yet." />
        )}
      </SheetModal>
    </View>
  );
}
