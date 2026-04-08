import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';

const useBackToProfile = () => {
  const navigation = useNavigation<any>();

  const goBackToProfile = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return true;
    }
    navigation.navigate('Perfil');
    return true;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', goBackToProfile);
      return () => subscription.remove();
    }, [goBackToProfile])
  );

  return goBackToProfile;
};

export default useBackToProfile;
