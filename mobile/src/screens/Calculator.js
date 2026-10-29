// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Reveal, ScreenHeader, usePad } from '../components/ui';
import { COPYRIGHT } from '../branding';

// Immediate-execution calculator, Apple-style: big soft keys, springy presses.
const ROWS = [
  ['AC', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

const apply = (a, op, b) => (op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : b === 0 ? NaN : a / b);

const fmt = (n) => {
  if (!Number.isFinite(n)) return 'Error';
  return String(Math.round(n * 1e8) / 1e8);
};

function Key({ label, onPress, kind = 'num', colors }) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (v) => Animated.spring(scale, { toValue: v, speed: 45, bounciness: 4, useNativeDriver: true }).start();
  const isOp = kind === 'op';
  const isFn = kind === 'fn';
  return (
    <Animated.View style={{ flex: label === '0' ? 2 : 1, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.9)}
        onPressOut={() => spring(1)}
        accessibilityLabel={label}
        style={{
          height: 64,
          margin: 5,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isOp ? colors.primary : isFn ? colors.input : colors.card,
          borderWidth: isOp ? 0 : StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: isOp ? colors.glow : 'transparent',
          shadowOpacity: isOp ? 1 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: isOp ? 6 : 0,
        }}
      >
        <Text style={{ fontSize: 23, fontWeight: '600', color: isOp ? '#FFFFFF' : isFn ? colors.primary : colors.text }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}


export default function Calculator() {
  const { colors } = useTheme();
  const pad = usePad();
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);
  const [history, setHistory] = useState([]);

  const digit = (d) => {
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
      return;
    }
    if (d === '.' && display.includes('.')) return;
    setDisplay(display === '0' && d !== '.' ? d : display + d);
  };

  const chooseOp = (nextOp) => {
    const cur = parseFloat(display) || 0;
    if (op && !fresh) {
      const r = apply(acc, op, cur);
      setAcc(r);
      setDisplay(fmt(r));
    } else {
      setAcc(cur);
    }
    setOp(nextOp);
    setFresh(true);
  };

  const equals = () => {
    if (op && acc != null) {
      const cur = parseFloat(display) || 0;
      const r = apply(acc, op, cur);
      const line = `${fmt(acc)} ${op} ${fmt(cur)} = ${fmt(r)}`;
      setHistory((h) => [line, ...h].slice(0, 12));
      setDisplay(fmt(r));
      setAcc(null);
      setOp(null);
      setFresh(true);
    }
  };

  const clearAll = () => {
    setDisplay('0');
    setAcc(null);
    setOp(null);
    setFresh(true);
  };

  const negate = () => {
    if (display === '0' || display === 'Error') return;
    setDisplay(display.startsWith('-') ? display.slice(1) : `-${display}`);
  };

  const percent = () => {
    const cur = parseFloat(display) || 0;
    setDisplay(fmt(cur / 100));
    setFresh(true);
  };

  const press = (label) => {
    if (label === 'AC') return clearAll();
    if (label === '±') return negate();
    if (label === '%') return percent();
    if (label === '=') return equals();
    if ('÷×−+'.includes(label)) return chooseOp(label);
    return digit(label);
  };

  const kind = (label) => ('÷×−+'.includes(label) || label === '=' ? 'op' : label === 'AC' || label === '±' || label === '%' ? 'fn' : 'num');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, ...pad }}>
      <ScreenHeader title="Calculator" subtitle="Quick maths for your money" />
      <Reveal style={{ flex: 1 }} from={10}>
        {history.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 8, gap: 8 }}
          >
            {history.map((line, i) => (
              <Text key={i} style={{ color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                {line}   ·
              </Text>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
            {acc != null && op ? `${fmt(acc)} ${op}` : ' '}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: colors.text, fontSize: 52, fontWeight: '300', textAlign: 'right', fontVariant: ['tabular-nums'] }}
          >
            {display}
          </Text>
        </View>

        <View>
          {ROWS.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row' }}>
              {row.map((label) => (
                <Key key={label} label={label} kind={kind(label)} colors={colors} onPress={() => press(label)} />
              ))}
            </View>
          ))}
        </View>

        <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 }}>{COPYRIGHT}</Text>
      </Reveal>
    </View>
  );
}
