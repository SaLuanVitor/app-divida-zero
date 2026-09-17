import { useMemo } from 'react';
import { useAppPreferences } from './useAppPreferences';
import {
  hapticPay,
  hapticReceive,
  hapticDelete,
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticLight,
  hapticPullToRefresh,
  shouldHapticsRun,
} from '../utils/haptics';

export const useHaptics = () => {
  const { preferences } = useAppPreferences();

  const hapticsEnabled = useMemo(
    () => shouldHapticsRun(preferences),
    [preferences.notifications_enabled, preferences.reduce_motion]
  );

  const pay = () => hapticsEnabled && hapticPay();
  const receive = () => hapticsEnabled && hapticReceive();
  const deleteRecord = () => hapticsEnabled && hapticDelete();
  const success = () => hapticsEnabled && hapticSuccess();
  const error = () => hapticsEnabled && hapticError();
  const warning = () => hapticsEnabled && hapticWarning();
  const light = () => hapticsEnabled && hapticLight();
  const pullToRefresh = () => hapticsEnabled && hapticPullToRefresh();

  return {
    pay,
    receive,
    deleteRecord,
    success,
    error,
    warning,
    light,
    pullToRefresh,
    isEnabled: hapticsEnabled,
  };
};