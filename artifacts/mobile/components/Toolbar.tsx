import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, useColorScheme } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBrowser } from '@/context/BrowserContext';
import * as Haptics from 'expo-haptics';

export const TOOLBAR_CONTENT_HEIGHT = 44;
export const TOOLBAR_TOP_PAD = 8;

interface Props {
  onOpenBookmarks: () => void;
  onOpenHistory: () => void;
}

export default function Toolbar({ onOpenBookmarks, onOpenHistory }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const {
    canGoBack,
    canGoForward,
    isLoading,
    goBack,
    goForward,
    reload,
    currentUrl,
    pageTitle,
    toggleBookmark,
    isBookmarked,
  } = useBrowser();

  const bookmarked = isBookmarked(currentUrl);
  const webBottomPad = Platform.OS === 'web' ? 34 : 0;

  const handle = (fn: () => void, style: 'light' | 'medium' = 'light') => () => {
    Haptics.impactAsync(
      style === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    fn();
  };

  const handleBookmark = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toggleBookmark(currentUrl, pageTitle);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + webBottomPad,
          paddingTop: TOOLBAR_TOP_PAD,
          borderTopColor: colors.border,
        },
      ]}
    >
      <BlurView
        intensity={90}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <Btn
          icon="chevron-left"
          onPress={handle(goBack)}
          disabled={!canGoBack}
          colors={colors}
        />
        <Btn
          icon="chevron-right"
          onPress={handle(goForward)}
          disabled={!canGoForward}
          colors={colors}
        />
        <Btn
          icon={isLoading ? 'x' : 'rotate-cw'}
          onPress={handle(reload)}
          colors={colors}
        />
        <Btn
          icon="bookmark"
          onPress={handleBookmark}
          active={bookmarked}
          colors={colors}
        />
        <Btn
          icon="clock"
          onPress={handle(onOpenHistory)}
          colors={colors}
        />
        <Btn
          icon="star"
          onPress={handle(onOpenBookmarks)}
          colors={colors}
        />
      </View>
    </View>
  );
}

function Btn({
  icon,
  onPress,
  disabled,
  active,
  colors,
}: {
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={styles.btn}
      activeOpacity={0.55}
    >
      <Feather
        name={icon as any}
        size={22}
        color={
          disabled
            ? colors.border
            : active
            ? colors.primary
            : colors.foreground
        }
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: TOOLBAR_CONTENT_HEIGHT,
    paddingHorizontal: 4,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: TOOLBAR_CONTENT_HEIGHT,
  },
});
