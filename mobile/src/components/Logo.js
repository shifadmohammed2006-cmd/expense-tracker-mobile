import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export default function Logo({ size = 64, bg = '#14231F' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width={64} height={64} rx={16} fill={bg} />
      <Path d="M14 40 L26 28 L34 36 L50 18" stroke="#D6A317" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={50} cy={18} r={4.5} fill="#D6A317" />
      <Rect x={14} y={44} width={36} height={4} rx={2} fill="#2F6F4E" />
    </Svg>
  );
}
