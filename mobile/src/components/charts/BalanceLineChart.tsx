import React, { useMemo } from 'react';
import Svg, { Line, Polyline, Circle, Text as SvgText } from 'react-native-svg';

export interface BalancePoint {
  label: string;
  value: number;
}

interface BalanceLineChartProps {
  points: BalancePoint[];
  darkMode: boolean;
  width: number;
  height?: number;
}

/**
 * Gráfico de linha da evolução do saldo, desenhado com SVG (sem lib externa).
 * Uma linha exige ao menos 2 pontos; com menos, renderiza nada.
 */
const BalanceLineChart = React.memo(({
  points,
  darkMode,
  width,
  height = 160,
}: BalanceLineChartProps) => {
  const plot = useMemo(() => {
    if (points.length < 2) return null;

    const chartTop = 12;
    const chartBottom = 24;
    const plotHeight = height - chartTop - chartBottom;
    const values = points.map((p) => p.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const range = max - min || 1;
    const step = (width - 16) / (points.length - 1);

    const coords = points.map((p, index) => ({
      x: 8 + index * step,
      y: chartTop + ((max - p.value) / range) * plotHeight,
    }));

    // Linha do zero (ou do mínimo), para ancorar visualmente valores negativos.
    const zeroY = chartTop + ((max - 0) / range) * plotHeight;

    return {
      coords,
      polyline: coords.map((c) => `${c.x},${c.y}`).join(' '),
      zeroY,
      chartBottom,
    };
  }, [points, width, height]);

  if (!plot) return null;

  const axisColor = darkMode ? '#334155' : '#cbd5e1';
  const labelColor = darkMode ? '#94a3b8' : '#64748b';
  const lineColor = '#0ea5e9';

  return (
    <Svg
      width={width}
      height={height}
      accessibilityRole="image"
      accessibilityLabel="Evolução do saldo ao longo dos meses"
    >
      <Line
        x1={0}
        y1={plot.zeroY}
        x2={width}
        y2={plot.zeroY}
        stroke={axisColor}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <Polyline
        points={plot.polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {plot.coords.map((c, index) => (
        <React.Fragment key={`${points[index].label}-${index}`}>
          <Circle cx={c.x} cy={c.y} r={3} fill={lineColor} />
          <SvgText
            x={c.x}
            y={height - 8}
            textAnchor="middle"
            fontSize="9"
            fill={labelColor}
          >
            {points[index].label}
          </SvgText>
        </React.Fragment>
      ))}
    </Svg>
  );
});

BalanceLineChart.displayName = 'BalanceLineChart';

export default BalanceLineChart;
