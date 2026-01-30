/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const IvoryChampagne = {
  background: '#FAF7F2',
  primary: '#C8A96B',
  secondary: '#E7DED0',
  accent: '#F1E8DA',
  text: '#2C2A29',
  mutedText: '#6B6561',
  surface: '#FFFFFF',
  border: '#E6DED2',
};

const IvoryChampagneDark = {
  background: '#141210',
  primary: '#C8A96B',
  secondary: '#2A241E',
  accent: '#3A322A',
  text: '#F4F1EC',
  mutedText: '#C3BEB7',
  surface: '#1C1815',
  border: '#2F2923',
};

export const Colors = {
  light: {
    text: IvoryChampagne.text,
    background: IvoryChampagne.background,
    tint: IvoryChampagne.primary,
    icon: IvoryChampagne.mutedText,
    tabIconDefault: IvoryChampagne.mutedText,
    tabIconSelected: IvoryChampagne.primary,
    primary: IvoryChampagne.primary,
    secondary: IvoryChampagne.secondary,
    accent: IvoryChampagne.accent,
    surface: IvoryChampagne.surface,
    border: IvoryChampagne.border,
    mutedText: IvoryChampagne.mutedText,
  },
  dark: {
    text: IvoryChampagneDark.text,
    background: IvoryChampagneDark.background,
    tint: IvoryChampagneDark.primary,
    icon: IvoryChampagneDark.mutedText,
    tabIconDefault: IvoryChampagneDark.mutedText,
    tabIconSelected: IvoryChampagneDark.primary,
    primary: IvoryChampagneDark.primary,
    secondary: IvoryChampagneDark.secondary,
    accent: IvoryChampagneDark.accent,
    surface: IvoryChampagneDark.surface,
    border: IvoryChampagneDark.border,
    mutedText: IvoryChampagneDark.mutedText,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
