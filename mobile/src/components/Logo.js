// © Expense Tracker. All rights reserved.
import React from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

export default function Logo({ size = 64, bg = '#0A0A0C' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect width={64} height={64} rx={16} fill={bg} />
      <Path d="M14 40 L26 28 L34 36 L50 18" stroke="#E5324B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={50} cy={18} r={4.5} fill="#E5324B" />
      <Rect x={14} y={44} width={36} height={4} rx={2} fill="#E5324B" opacity={0.35} />
      <SvgText x={32} y={59} fontSize={8} fontWeight="700" fill="#8E8E93" textAnchor="middle">©</SvgText>
    </Svg>
  );
}
