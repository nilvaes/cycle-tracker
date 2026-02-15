import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/lib/language';

function TabLabel({
  labelKey,
  color,
}: {
  labelKey: 'tabs.home' | 'tabs.calendar' | 'tabs.insights' | 'tabs.settings';
  color: string;
}) {
  const { language } = useLanguage();
  return (
    <Text
      key={`${labelKey}-${language}`}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      allowFontScaling={false}
      style={{ color, fontSize: 12, textAlign: 'center', maxWidth: 84 }}>
      {t(labelKey)}
    </Text>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { language } = useLanguage();

  return (
    <Tabs
      key={`tabs-${language}`}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        key={`tab-index-${language}`}
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarLabel: ({ color }) => <TabLabel labelKey="tabs.home" color={color} />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        key={`tab-calendar-${language}`}
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarLabel: ({ color }) => <TabLabel labelKey="tabs.calendar" color={color} />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        key={`tab-insights-${language}`}
        name="insights"
        options={{
          title: t('tabs.insights'),
          tabBarLabel: ({ color }) => <TabLabel labelKey="tabs.insights" color={color} />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        key={`tab-settings-${language}`}
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarLabel: ({ color }) => <TabLabel labelKey="tabs.settings" color={color} />,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
