import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { useAccessibility } from '../context/AccessibilityContext';

const DEFAULT_FONT_SIZE = 14;

type AppTextProps = TextProps & {
  className?: string;
  disableUserFontScale?: boolean;
  maxUserFontScale?: number;
};

const AppTextBase: React.FC<AppTextProps> = ({
  style,
  children,
  disableUserFontScale = false,
  maxUserFontScale,
  ...rest
}) => {
  const { fontScale } = useAccessibility();
  const effectiveScale = disableUserFontScale
    ? 1
    : typeof maxUserFontScale === 'number'
      ? Math.min(fontScale, Math.max(1, maxUserFontScale))
      : fontScale;
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseFontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : DEFAULT_FONT_SIZE;
  const baseLineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;

  const scaledStyle: TextStyle | undefined =
    effectiveScale !== 1
      ? {
          fontSize: Math.round(baseFontSize * effectiveScale * 100) / 100,
          ...(baseLineHeight ? { lineHeight: Math.round(baseLineHeight * effectiveScale * 100) / 100 } : {}),
        }
      : undefined;

  return (
    <Text
      {...rest}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={[style, scaledStyle]}
    >
      {children}
    </Text>
  );
};

const AppText = cssInterop(AppTextBase, {
  className: 'style',
});

export default AppText;
