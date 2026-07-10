import React from 'react';
import { Modal, Pressable, View } from 'react-native';

interface AppOverlayProps {
    visible: boolean;
    onRequestClose?: () => void;
    onBackdropPress?: () => void;
    backdropClassName?: string;
    animationType?: 'none' | 'fade' | 'slide';
    children: React.ReactNode;
}

/**
 * Root-level overlay wrapper for floating dialogs/sheets.
 *
 * Renders its children inside a transparent React Native `<Modal>`, which is
 * mounted in a native layer above the whole view hierarchy. This avoids the
 * z-index stacking bug where absolutely-positioned overlays declared inside a
 * `Tab.Screen` are painted behind the navigator's custom tab bar, regardless of
 * their internal `zIndex`.
 *
 * The caller provides the positioned content (e.g. an absolutely-positioned
 * `<View>`); this component supplies the modal container and the optional
 * dimming backdrop.
 */
const AppOverlay: React.FC<AppOverlayProps> = ({
    visible,
    onRequestClose,
    onBackdropPress,
    backdropClassName = 'bg-black/30',
    animationType = 'none',
    children,
}) => (
    <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType={animationType}
        onRequestClose={onRequestClose ?? onBackdropPress}
    >
        <View className="flex-1">
            {onBackdropPress ? (
                <Pressable
                    className={`absolute inset-0 ${backdropClassName}`}
                    onPress={onBackdropPress}
                />
            ) : (
                <View className={`absolute inset-0 ${backdropClassName}`} />
            )}
            {children}
        </View>
    </Modal>
);

export default AppOverlay;
