import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Onboarding from './Onboarding';

const Tutorial = () => {
  const navigation = useNavigation<any>();

  return (
    <Onboarding
      onDone={() => {
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
          return;
        }
        navigation.navigate('Inicio');
      }}
    />
  );
};

export default Tutorial;
