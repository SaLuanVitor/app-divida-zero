import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import AppText from '../AppText';
import { formatDonutValue } from '../../utils/adminPresentation';
import { textClampLines } from '../../utils/responsive';

type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  title: string;
  subtitle?: string;
  centerLabel: string;
  centerValue: string;
  segments: DonutSegment[];
  emptyLabel?: string;
  size?: number;
  strokeWidth?: number;
};

const clampNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const DonutChart = ({
  title,
  subtitle,
  centerLabel,
  centerValue,
  segments,
  emptyLabel = 'Sem dados no período selecionado.',
  size = 132,
  strokeWidth = 18,
}: DonutChartProps) => {
  const safeSegments = useMemo(
    () =>
      segments.map((segment) => ({
        ...segment,
        value: clampNumber(segment.value),
      })),
    [segments]
  );

  const total = safeSegments.reduce((acc, item) => acc + item.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const chartSegments = useMemo(() => {
    if (total <= 0) return [];

    let accumulated = 0;
    return safeSegments.map((segment) => {
      const ratio = segment.value / total;
      const dashLength = ratio * circumference;
      const dashOffset = circumference - accumulated;
      accumulated += dashLength;

      return {
        ...segment,
        dashLength,
        dashOffset,
      };
    });
  }, [circumference, safeSegments, total]);

  return (
    <View className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4">
      <AppText className="text-slate-900 dark:text-slate-100 text-sm font-bold" numberOfLines={textClampLines('title')} ellipsizeMode="tail">
        {title}
      </AppText>
      {subtitle ? (
        <AppText className="text-slate-500 dark:text-slate-300 text-xs mt-1" numberOfLines={textClampLines('card')} ellipsizeMode="tail">
          {subtitle}
        </AppText>
      ) : null}

      {total <= 0 ? (
        <View className="mt-4 rounded-xl bg-slate-50 dark:bg-[#0f172a] px-3 py-4">
          <AppText className="text-slate-500 dark:text-slate-300 text-xs">{emptyLabel}</AppText>
        </View>
      ) : (
        <View className="mt-3">
          <View className="items-center justify-center">
            <Svg width={size} height={size}>
              <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={strokeWidth} fill="none" />
                {chartSegments.map((segment) => (
                  <Circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="butt"
                    fill="none"
                    strokeDasharray={`${segment.dashLength} ${circumference}`}
                    strokeDashoffset={segment.dashOffset}
                  />
                ))}
              </G>
            </Svg>
            <View className="absolute items-center">
              <AppText className="text-slate-500 dark:text-slate-300 text-[11px]">{centerLabel}</AppText>
              <AppText className="text-slate-900 dark:text-slate-100 text-base font-black">{centerValue}</AppText>
            </View>
          </View>

          <View className="mt-3 gap-2">
            {safeSegments.map((segment) => (
              <View key={segment.label} className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 pr-2">
                  <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: segment.color }} />
                  <AppText className="text-slate-600 dark:text-slate-200 text-xs flex-1" numberOfLines={textClampLines('legend')} ellipsizeMode="tail">
                    {segment.label}
                  </AppText>
                </View>
                <AppText className="text-slate-900 dark:text-slate-100 text-xs font-semibold">{formatDonutValue(segment.value)}</AppText>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

export default DonutChart;
