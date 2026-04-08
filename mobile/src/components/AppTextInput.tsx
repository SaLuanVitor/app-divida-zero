import React from 'react';
import { StyleSheet, TextInput, TextInputProps, TextStyle } from 'react-native';
import { cssInterop } from 'nativewind';
import { useAccessibility } from '../context/AccessibilityContext';
import { useFormKeyboard } from '../context/FormKeyboardContext';

const DEFAULT_INPUT_FONT_SIZE = 16;

type AppTextInputProps = TextInputProps & { className?: string };

const AppTextInputBase: React.FC<AppTextInputProps> = ({ style, onFocus, ...rest }) => {
  const { fontScale, largerTouchTargets } = useAccessibility();
  const { onInputFocus } = useFormKeyboard();
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const baseFontSize = typeof flattened?.fontSize === 'number' ? flattened.fontSize : DEFAULT_INPUT_FONT_SIZE;
  const baseLineHeight = typeof flattened?.lineHeight === 'number' ? flattened.lineHeight : undefined;
  const baseHeight = typeof flattened?.height === 'number' ? flattened.height : 44;
  const scaledHeight = Math.round(baseHeight * Math.max(fontScale, 1));
  const targetHeight = Math.max(scaledHeight, largerTouchTargets ? 52 : 44);

  const scaledStyle: TextStyle | undefined =
    fontScale !== 1
      ? {
          fontSize: Math.round(baseFontSize * fontScale * 100) / 100,
          ...(baseLineHeight ? { lineHeight: Math.round(baseLineHeight * fontScale * 100) / 100 } : {}),
        }
      : undefined;

  const scaledFieldStyle: TextStyle | undefined =
    rest.multiline
      ? undefined
      : {
          minHeight: targetHeight,
          ...(typeof flattened?.height === 'number' ? { height: targetHeight } : {}),
        };

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    onInputFocus?.((event as any)?.nativeEvent?.target);
    onFocus?.(event);
  };

  return (
    <TextInput
      {...rest}
      onFocus={handleFocus}
      allowFontScaling={false}
      maxFontSizeMultiplier={1}
      style={[style, scaledStyle, scaledFieldStyle]}
    />
  );
};

const AppTextInput = cssInterop(AppTextInputBase, {
  className: 'style',
});

export default AppTextInput;
