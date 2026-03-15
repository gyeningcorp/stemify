import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Stem } from '../api/client';
import HomeScreen from '../screens/HomeScreen';
import PlayerScreen from '../screens/PlayerScreen';
import NotationScreen from '../screens/NotationScreen';

export type RootStackParamList = {
  Home: undefined;
  Player: {
    stems: Stem[];
    jobId: string;
  };
  Notation: {
    stemName: string;
    midiUrl: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1a1a2e',
    card: '#16213e',
    text: '#eee',
    border: '#2a2a4a',
    primary: '#4ECDC4',
  },
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#16213e' },
          headerTintColor: '#eee',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Stemify', headerShown: false }}
        />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{ title: 'Stem Player' }}
        />
        <Stack.Screen
          name="Notation"
          component={NotationScreen}
          options={{ title: 'Sheet Music' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
