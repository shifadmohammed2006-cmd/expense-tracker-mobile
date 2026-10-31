// © Expense Tracker. All rights reserved.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from './Logo';
import ShxBrand from './ShxBrand';
import { BRAND_LINE, COPYRIGHT } from '../branding';

export default function SplashScreen({ slow }) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 700, useNativeDriver: true }).start();
  }, [scale, logoOpacity, glow, textOpacity]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0C', alignItems: 'center', justifyContent: 'center' }}>
      <View>
        {/* Soft red glow that breathes behind the logo */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -28,
            left: -28,
            width: 152,
            height: 152,
            borderRadius: 76,
            backgroundColor: 'rgba(229,50,75,0.28)',
            opacity: glow,
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.2] }) }],
          }}
        />
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale }] }}>
          <Logo size={96} bg="#17171B" />
        </Animated.View>
      </View>
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={{ marginTop: 24, fontSize: 28, fontWeight: '700', color: '#F5F5F7' }}>Expense Tracker</Text>
        {BRAND_LINE ? <Text style={{ marginTop: 6, fontSize: 14, color: '#8E8E93' }}>{BRAND_LINE}</Text> : null}
      </Animated.View>
      {slow ? (
        <Text style={{ position: 'absolute', bottom: insets.bottom + 150, color: '#8E8E93', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
          Waking up the server - this can take up to a minute the first time.
        </Text>
      ) : null}
      {/* "from SHX" - permanent company mark, sits at the bottom like the splash design */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 52, left: 0, right: 0, alignItems: 'center' }}>
        <ShxBrand />
      </View>
      <Text style={{ position: 'absolute', bottom: insets.bottom + 20, color: '#5E5E64', fontSize: 11 }}>{COPYRIGHT}</Text>
    </View>
  );
}
