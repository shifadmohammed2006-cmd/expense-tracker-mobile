// © 2026 Expense Tracker. All rights reserved. Unauthorised copying or redistribution is prohibited.
import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';

export function Donut({ data, size = 170, thickness = 24, children }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.value / total) * c;
              const gap = data.length > 1 ? Math.min(3, len * 0.2) : 0;
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={d.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${Math.max(len - gap, 0.01)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>{children}</View>
    </View>
  );
}

// data: [{ key, label, value }]. Tap a bar to select it.
export function BarChart({ data, height = 170, color, labelColor, gridColor, selected, onSelect }) {
  const { width: screenW } = useWindowDimensions();
  const barW = 16;
  const gap = 12;
  const left = 6;
  const top = 8;
  const bottom = 24;
  const innerH = height - top - bottom;
  const chartW = Math.max(screenW - 76, data.length * (barW + gap) + left * 2);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={chartW} height={height}>
        <Line x1={0} x2={chartW} y1={top + innerH} y2={top + innerH} stroke={gridColor} strokeWidth={1} />
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * innerH, 3);
          const x = left + i * (barW + gap);
          return (
            <G key={d.key} onPress={() => onSelect?.(i)}>
              <Rect x={x - gap / 2} y={0} width={barW + gap} height={height} fill="transparent" />
              <Rect
                x={x}
                y={top + innerH - h}
                width={barW}
                height={h}
                rx={4}
                fill={color}
                opacity={selected == null || selected === i ? 1 : 0.4}
              />
              <SvgText x={x + barW / 2} y={height - 7} fontSize={10} fill={labelColor} textAnchor="middle">
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}
