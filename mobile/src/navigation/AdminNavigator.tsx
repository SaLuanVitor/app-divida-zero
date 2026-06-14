import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboard from '../screens/app/AdminDashboard';
import AdminUsers from '../screens/app/AdminUsers';
import AdminAppearanceSettings from '../screens/app/AdminAppearanceSettings';
import ForcePasswordChange from '../screens/auth/ForcePasswordChange';

const Stack = createStackNavigator();

export const AdminNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Admin Dashboard" component={AdminDashboard} />
      <Stack.Screen name="Admin Usuarios" component={AdminUsers} />
      <Stack.Screen name="Admin Aparencia" component={AdminAppearanceSettings} />
      <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChange} />
    </Stack.Navigator>
  );
};
