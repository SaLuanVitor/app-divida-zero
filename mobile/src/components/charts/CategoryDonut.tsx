import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import AppText from '../AppText';
import { ReportCategoryBreakdownItemDto } from '../../types/report';

export const CATEGORY_PALETTE = ['#16a34a', '#f48c25', '#0ea5e9', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#ec4899', '#64748b', '#f97316'];

type Segment = {
  id: string;
  label: string;
  color: string;
  ratio: number;
  dashLength: number;
  dashOffset: number;
};

const clampPercentage = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
};

type CategoryDonutProps = {
  items: ReportCategoryBreakdownItemDto[];
  darkMode: boolean;
  size?: number;
  strokeWidth?: number;
};

const CategoryDonut = ({
  items,
  darkMode,
  size = 148,
  strokeWidth = 24,
}: CategoryDonutProps) => {
  const safeItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        percentage: clampPercentage(item.percentage),
      })),
    [items]
  );

  const segments: Segment[] = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const dashLengths = safeItems.map((item) => (item.percentage / 100) * circumference);
    return safeItems.map((item, index) => {
      const dashLength = dashLengths[index];
      const previous = dashLengths.slice(0, index).reduce((sum, value) => sum + value, 0);
      const dashOffset = circumference - previous;
      return {
        id: `${item.category}-${index}`,
        label: item.category,
        color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
        ratio: item.percentage / 100,
        dashLength,
        dashOffset,
      };
    });
  }, [safeItems, size, strokeWidth]);

  const trackColor = darkMode ? '#334155' : '#e2e8f0';

  if (safeItems.length === 0 || safeItems.every((item) => item.percentage <= 0)) {
    return (
      <AppText className="text-slate-500 dark:text-slate-200 text-sm">
        Sem dados de categoria para o per\u00edodo.
      </AppText>
    );
  }

  const radius = (size - strokeWidth) / 2;

  return (
    <View className="flex-row items-center">
      <Svg
        width={size}
        height={size}
        accessibilityLabel="Gráfico de pizza por categoria"
      >
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((segment) => (
            <Circle
              key={segment.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              fill="none"
              strokeDasharray={`${segment.dashLength} ${2 * Math.PI * radius}`}
              strokeDashoffset={segment.dashOffset}
            />
          ))}
        </G>
      </Svg>
      <View className="ml-4 flex-1">
        {segments.map((segment) => {
          const item = safeItems[Number(segment.id.split('-').pop())];
          return (
            <View key={segment.id} className="flex-row items-center justify-between py-0.5">
              <View className="flex-row items-center flex-1 pr-2">
                <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: segment.color }} />
                <AppText className="text-slate-600 dark:text-slate-200 text-xs flex-1" numberOfLines={1}>{segment.label}</AppText>
              </View>
              <AppText className="text-slate-900 dark:text-slate-100 text-xs font-semibold">{item.percentage.toFixed(1)}%</AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(CategoryDonut);
