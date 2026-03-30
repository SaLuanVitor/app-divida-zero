import React from 'react';
import { StyleSheet, TextInput, TextInputProps, TextStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { useAccessibility } from '../context/AccessibilityContext';

const DEFAULT_INPUT_FONT_SIZE = 16;

type AppTextInputProps = TextInputProps & { className?: string };

const AppTextInputBase: React.FC<AppTextInputProps> = ({ style, ...rest }) => {
  const { fontScale } = useAccessibility();
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseFontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : DEFAULT_INPUT_FONT_SIZE;
  const baseLineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;

  const scaledStyle: TextStyle | undefined =
    fontScale !== 1
      ? {
          fontSize: Math.round(baseFontSize * fontScale * 100) / 100,
          ...(baseLineHeight ? { lineHeight: Math.round(baseLineHeight * fontScale * 100) / 100 } : {}),
        }
      : undefined;

  return (
    <TextInput
      {...rest}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={[style, scaledStyle]}
    />
  );
};

const AppTextInput = cssInterop(AppTextInputBase, {
  className: 'style',
});

export default AppTextInput;
