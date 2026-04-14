import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Radius } from '../../constants/theme';

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { height: 80 + insets.bottom, paddingBottom: insets.bottom },
        ],
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          height: 80, // match the visual bar height
        },
        tabBarIconStyle: {
          width: '100%',
          height: '100%',
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      
      {/* hidden tabs, only accessible via the home screen */}
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="plans" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />

      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🤖" label="Assistent" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    paddingTop: 0,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabIconFocused: {
    backgroundColor: Colors.surfaceRaised,
    borderColor: Colors.border,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 30, // tighter lineheight to ensure it fits
    textAlign: 'center',
    opacity: 0.5,
  },
  emojiFocused: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 12.5,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 1,
  },
  tabLabelFocused: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
});
