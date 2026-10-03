import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/theme';
import { T } from '@/components/ui';

const PAD = { l: 44, r: 12, t: 12, b: 24 };

export function LineChart({
  data,
  height = 180,
  formatY = (v) => String(Math.round(v)),
  formatX = (x) => new Date(x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
}: {
  data: { x: number; y: number }[];
  height?: number;
  formatY?: (v: number) => string;
  formatX?: (x: number) => string;
}) {
  const [width, setWidth] = useState(0);
  if (data.length === 0) return <T faint>No data yet.</T>;
  const xs = data.map((d) => d.x);
  const ys = data.map((d) => d.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const w = width - PAD.l - PAD.r;
  const h = height - PAD.t - PAD.b;
  const px = (x: number) => PAD.l + (maxX === minX ? w / 2 : ((x - minX) / (maxX - minX)) * w);
  const py = (y: number) => PAD.t + h - ((y - minY) / (maxY - minY)) * h;
  const points = data.map((d) => `${px(d.x)},${py(d.y)}`).join(' ');
  const ticks = [minY, (minY + maxY) / 2, maxY];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {ticks.map((t, i) => (
            <React.Fragment key={i}>
              <Line x1={PAD.l} x2={width - PAD.r} y1={py(t)} y2={py(t)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={PAD.l - 6} y={py(t) + 4} fontSize={10} fill={colors.textFaint} textAnchor="end">
                {formatY(t)}
              </SvgText>
            </React.Fragment>
          ))}
          <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={2} />
          {data.map((d, i) => (
            <Circle key={i} cx={px(d.x)} cy={py(d.y)} r={3} fill={colors.primary} />
          ))}
          <SvgText x={PAD.l} y={height - 6} fontSize={10} fill={colors.textFaint}>
            {formatX(minX)}
          </SvgText>
          <SvgText x={width - PAD.r} y={height - 6} fontSize={10} fill={colors.textFaint} textAnchor="end">
            {formatX(maxX)}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

export function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...data.map((d) => d.value));
  const gap = 4;
  const barW = width > 0 ? (width - gap * (data.length - 1)) / data.length : 0;
  const h = height - 18;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const bh = (d.value / max) * (h - 12);
            const x = i * (barW + gap);
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={h - bh} width={barW} height={Math.max(bh, 1)} rx={3} fill={d.value ? colors.primary : colors.border} />
                {d.value > 0 && (
                  <SvgText x={x + barW / 2} y={h - bh - 3} fontSize={10} fill={colors.textDim} textAnchor="middle">
                    {d.value}
                  </SvgText>
                )}
                <SvgText x={x + barW / 2} y={height - 4} fontSize={9} fill={colors.textFaint} textAnchor="middle">
                  {d.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
