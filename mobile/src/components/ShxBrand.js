// © Expense Tracker. All rights reserved.
// "from SHX" - the permanent SHX company mark. Rebuilt 1:1 from SHX_splash_screen.html
// (black-hole symbol + S H X wordmark + meteor shower). Reuse this file as-is in every future SHX app.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const GOLD = '#e8b04b';
const CORAL = '#ff7a5c';
const CREAM = '#f6e2b0';

// Letter colours = the gradient stops from the splash HTML (top of each gradient is the most visible part).
const LETTERS_ON_DARK = [
  { ch: 'S', color: '#fff8ea' },
  { ch: 'H', color: '#f3e3bd' },
  { ch: 'X', color: '#f1c868' },
];
const LETTERS_ON_LIGHT = [
  { ch: 'S', color: '#2b2418' },
  { ch: 'H', color: '#6e5320' },
  { ch: 'X', color: '#c58a14' },
];

// [top, left, width, delay(ms), color] - same 7 meteors as the HTML.
const METEORS = [
  [-28, -14, 34, 0, GOLD],
  [-22, 30, 26, 120, CORAL],
  [-30, 62, 38, 220, CREAM],
  [-14, -26, 28, 300, CORAL],
  [-26, 88, 30, 380, GOLD],
  [-8, 48, 22, 480, CREAM],
  [-18, 10, 30, 580, GOLD],
];

function BlackHole({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="shxDisk" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={CORAL} />
          <Stop offset="0.5" stopColor={CREAM} />
          <Stop offset="1" stopColor={GOLD} />
        </LinearGradient>
      </Defs>
      <G rotation={-20} origin="32, 32">
        <Ellipse cx={32} cy={32} rx={28} ry={8.5} fill="none" stroke="url(#shxDisk)" strokeWidth={3} />
        <Circle cx={32} cy={32} r={12} fill="#000000" stroke={CREAM} strokeWidth={1.6} />
        <Path d="M4 32A28 8.5 0 0 0 60 32" fill="none" stroke="url(#shxDisk)" strokeWidth={3.4} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function Halo({ size }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id="shxGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={GOLD} stopOpacity={0.45} />
          <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={32} cy={32} r={31} fill="url(#shxGlow)" />
    </Svg>
  );
}

function Meteor({ top, left, width, delay, color, start }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!start) return undefined;
    const anim = Animated.sequence([
      Animated.delay(start + delay),
      Animated.timing(t, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [t, start, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: top + 14,
        left,
        width,
        height: 4,
        opacity: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
        transform: [{ rotate: '30deg' }, { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-40, 70] }) }],
      }}
    >
      <View style={{ position: 'absolute', top: 1, left: 0, right: 0, height: 2, borderRadius: 2, backgroundColor: color, opacity: 0.55 }} />
      <View style={{ position: 'absolute', right: -1, top: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </Animated.View>
  );
}

/**
 * <ShxBrand />                         animated, for the splash screen (always on a dark background)
 * <ShxBrand animated={false} onDark={isDark} compact />   quiet static version for Settings / Login
 */
export default function ShxBrand({ animated = true, onDark = true, compact = false, mutedColor }) {
  const iconSize = compact ? 26 : 38;
  const fontSize = compact ? 15 : 21;
  const letters = onDark ? LETTERS_ON_DARK : LETTERS_ON_LIGHT;
  const from = mutedColor || (onDark ? '#8b9099' : '#6f7480');

  const fromA = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const holeA = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const letterA = useRef(letters.map(() => new Animated.Value(animated ? 0 : 1))).current;

  useEffect(() => {
    if (!animated) return undefined;
    const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
    const run = Animated.parallel([
      Animated.timing(fromA, { toValue: 1, duration: 600, delay: 500, useNativeDriver: true }),
      Animated.timing(holeA, { toValue: 1, duration: 900, delay: 600, easing: ease, useNativeDriver: true }),
      ...letterA.map((v, i) =>
        Animated.timing(v, { toValue: 1, duration: 650, delay: 1000 + i * 120, easing: ease, useNativeDriver: true })
      ),
    ]);
    run.start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), 1400);
    return () => {
      run.stop();
      loop.stop();
      clearTimeout(t);
    };
  }, [animated, fromA, holeA, letterA, pulse]);

  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityLabel="from SHX">
      <Animated.Text style={{ fontSize: compact ? 11 : 13, color: from, letterSpacing: 0.8, marginBottom: compact ? 6 : 10, opacity: fromA }}>
        from
      </Animated.Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 10 : 14 }}>
        {/* black-hole symbol: spins + scales in, halo breathes behind it */}
        <View style={{ width: iconSize, height: iconSize }}>
          <Animated.View style={{ position: 'absolute', opacity: onDark ? pulse : 0.0 }}>
            <Halo size={iconSize} />
          </Animated.View>
          <Animated.View
            style={{
              opacity: holeA,
              transform: [
                { scale: holeA.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                { rotate: holeA.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
              ],
            }}
          >
            <BlackHole size={iconSize} />
          </Animated.View>
        </View>

        {/* S H X wordmark with the meteor shower above it */}
        <View>
          {animated ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
              {METEORS.map(([top, left, width, delay, color], i) => (
                <Meteor key={i} top={top} left={left} width={width} delay={delay} color={color} start={700} />
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            {letters.map((l, i) => (
              <Animated.Text
                key={l.ch}
                style={{
                  fontSize,
                  fontWeight: '800',
                  color: l.color,
                  letterSpacing: 0,
                  marginRight: i < 2 ? fontSize * 0.42 : 0,
                  opacity: letterA[i],
                  transform: [{ translateY: letterA[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
                  textShadowColor: onDark ? 'rgba(232,176,75,0.28)' : 'transparent',
                  textShadowRadius: 6,
                }}
              >
                {l.ch}
              </Animated.Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}
