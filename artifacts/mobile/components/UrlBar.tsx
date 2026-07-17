import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Platform,
  useColorScheme,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBrowser, normalizeUrl, getDisplayUrl } from '@/context/BrowserContext';
import * as Haptics from 'expo-haptics';

export const URL_BAR_CONTENT_HEIGHT = 38;
export const URL_BAR_BOTTOM_PAD = 10;

export default function UrlBar() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { currentUrl, navigate, isLoading } = useBrowser();

  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const displayUrl = getDisplayUrl(currentUrl);
  const isHttps = currentUrl.startsWith('https://');

  const webTopPad = Platform.OS === 'web' ? 67 : 0;
  const containerPaddingTop = insets.top + webTopPad;

  const handleFocus = () => {
    setFocused(true);
    setInputValue(currentUrl);
  };

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    navigate(normalizeUrl(inputValue));
    inputRef.current?.blur();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCancel = () => {
    setFocused(false);
    setInputValue('');
    inputRef.current?.blur();
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: containerPaddingTop, paddingBottom: URL_BAR_BOTTOM_PAD },
      ]}
    >
      <BlurView
        intensity={90}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        {!focused ? (
          <TouchableOpacity
            style={[styles.urlPill, { backgroundColor: colors.urlBar as string }]}
            onPress={() => {
              setFocused(true);
              setInputValue(currentUrl);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            activeOpacity={0.75}
          >
            <Feather
              name={isHttps ? 'lock' : 'globe'}
              size={12}
              color={isHttps ? '#34C759' : colors.mutedForeground}
              style={styles.lockIcon}
            />
            <Text
              style={[styles.urlText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}
              numberOfLines={1}
            >
              {displayUrl}
            </Text>
            {isLoading && (
              <View style={styles.loadingDot}>
                <Feather name="loader" size={13} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View
              style={[styles.inputContainer, { backgroundColor: colors.urlBar as string }]}
            >
              <Feather name="search" size={14} color={colors.mutedForeground} style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
                value={inputValue}
                onChangeText={setInputValue}
                onFocus={handleFocus}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleSubmit}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                selectTextOnFocus
                placeholderTextColor={colors.mutedForeground}
                placeholder="Search or enter address"
                autoFocus
              />
              {inputValue.length > 0 && (
                <TouchableOpacity onPress={() => setInputValue('')} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={[styles.cancelText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: URL_BAR_CONTENT_HEIGHT,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  lockIcon: {
    marginRight: 5,
  },
  urlText: {
    flex: 1,
    fontSize: 15,
    textAlign: 'center',
  },
  loadingDot: {
    marginLeft: 5,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: URL_BAR_CONTENT_HEIGHT,
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: URL_BAR_CONTENT_HEIGHT,
  },
  clearBtn: {
    padding: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingLeft: 4,
  },
  cancelText: {
    fontSize: 15,
  },
});
