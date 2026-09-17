import React from 'react';
import { Modal, View } from 'react-native';
import AppText from './AppText';

type ToastKind = 'success' | 'error';

interface AppToastProps {
    visible: boolean;
    kind?: ToastKind;
    title?: string;
    message?: string;
    position?: 'top' | 'bottom';
    bottomInset?: number;
    onRequestClose?: () => void;
    children?: React.ReactNode;
}

const kindContainerClass: Record<ToastKind, string> = {
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
};

const kindTitleClass: Record<ToastKind, string> = {
    success: 'text-emerald-800 dark:text-emerald-300',
    error: 'text-red-800 dark:text-red-300',
};

const kindMessageClass: Record<ToastKind, string> = {
    success: 'text-emerald-700 dark:text-emerald-300',
    error: 'text-red-700 dark:text-red-300',
};

/**
 * Non-blocking, positioned notification rendered in a root native layer.
 *
 * Like {@link AppOverlay}, it wraps content in a transparent `<Modal>` so the
 * toast paints above the custom tab bar instead of behind it. The modal is
 * `pointerEvents="box-none"`, so touches pass through empty areas and only the
 * toast content itself is interactive (used by the "undo" banner).
 *
 * Provide `children` for custom content, or `kind`/`title`/`message` for the
 * default success/error toast layout.
 */
const AppToast: React.FC<AppToastProps> = ({
    visible,
    kind = 'success',
    title,
    message,
    position = 'top',
    bottomInset,
    onRequestClose,
    children,
}) => (
    <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={onRequestClose}
    >
        <View pointerEvents="box-none" className="flex-1">
            <View
                pointerEvents="box-none"
                className={`absolute left-4 right-4 ${position === 'top' ? 'top-16' : ''}`}
                style={position === 'bottom' ? { bottom: bottomInset } : undefined}
            >
                {children ?? (
                    <View className={`rounded-xl border px-4 py-3 ${kindContainerClass[kind]}`}>
                        {title ? (
                            <AppText className={`font-bold text-sm ${kindTitleClass[kind]}`}>
                                {title}
                            </AppText>
                        ) : null}
                        {message ? (
                            <AppText className={`text-xs ${title ? 'mt-1' : ''} ${kindMessageClass[kind]}`}>
                                {message}
                            </AppText>
                        ) : null}
                    </View>
                )}
            </View>
        </View>
    </Modal>
);

export default AppToast;
