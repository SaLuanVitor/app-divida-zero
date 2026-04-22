import React, { useMemo, useState } from 'react';
import { Modal, Pressable, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleHelp } from 'lucide-react-native';
import AppText from './AppText';
import Button from './Button';
import { useThemeMode } from '../context/ThemeContext';

type ScreenHelpButtonProps = {
  title: string;
  bullets: string[];
  accessibilityLabel: string;
};

const ScreenHelpButton: React.FC<ScreenHelpButtonProps> = ({ title, bullets, accessibilityLabel }) => {
  const [visible, setVisible] = useState(false);
  const { darkMode } = useThemeMode();
  const insets = useSafeAreaInsets();

  const sheetBottom = useMemo(() => Math.max(insets.bottom + 16, 24), [insets.bottom]);
  const iconColor = darkMode ? '#cbd5e1' : '#475569';

  return (
    <>
      <TouchableOpacity
        className="w-11 h-11 items-center justify-center"
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] items-center justify-center">
          <CircleHelp size={16} color={iconColor} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View className="absolute inset-0">
          <Pressable className="absolute inset-0 bg-black/25" onPress={() => setVisible(false)} />
          <View
            className="absolute left-4 right-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#121212] p-4"
            style={{ bottom: sheetBottom }}
          >
            <AppText className="text-slate-900 dark:text-slate-100 text-base font-bold">{title}</AppText>
            <View className="mt-3 gap-2">
              {bullets.map((bullet) => (
                <View key={bullet} className="flex-row items-start">
                  <AppText className="text-primary mr-2 text-sm font-bold">•</AppText>
                  <AppText className="text-slate-600 dark:text-slate-200 text-sm flex-1 leading-5">
                    {bullet}
                  </AppText>
                </View>
              ))}
            </View>
            <Button
              title="Entendi"
              onPress={() => setVisible(false)}
              className="h-11 mt-4"
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ScreenHelpButton;
