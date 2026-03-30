import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { useAccessibility } from '../context/AccessibilityContext';

const DEFAULT_FONT_SIZE = 14;

type AppTextProps = TextProps & { className?: string };

const AppTextBase: React.FC<AppTextProps> = ({ style, children, ...rest }) => {
  const { fontScale } = useAccessibility();
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseFontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : DEFAULT_FONT_SIZE;
  const baseLineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;

  const scaledStyle: TextStyle | undefined =
    fontScale !== 1
      ? {
          fontSize: Math.round(baseFontSize * fontScale * 100) / 100,
          ...(baseLineHeight ? { lineHeight: Math.round(baseLineHeight * fontScale * 100) / 100 } : {}),
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
