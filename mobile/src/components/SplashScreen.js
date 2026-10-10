import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from './Logo';

export default function SplashScreen({ slow }) {
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
    Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 700, useNativeDriver: true }).start();
  }, [scale, logoOpacity, textOpacity]);

  return (
    <View style={{ flex: 1, backgroundColor: '#14231F', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale }] }}>
        <Logo size={96} bg="#1A2622" />
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={{ marginTop: 24, fontSize: 28, fontWeight: '700', color: '#F1F3F0' }}>Expense Tracker</Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: '#8B9490' }}>Made by Shifad</Text>
      </Animated.View>
      {slow ? (
        <Text style={{ position: 'absolute', bottom: insets.bottom + 40, color: '#8B9490', fontSize: 13, textAlign: 'center', paddingHorizontal: 40 }}>
          Waking up the server - this can take up to a minute the first time.
        </Text>
      ) : null}
    </View>
  );
}
