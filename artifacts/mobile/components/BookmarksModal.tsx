import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBrowser, Bookmark, getDisplayUrl } from '@/context/BrowserContext';
import * as Haptics from 'expo-haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BookmarksModal({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookmarks, navigate, removeBookmark } = useBrowser();

  const handleNavigate = (url: string) => {
    navigate(url);
    onClose();
  };

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeBookmark(id);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + 12 },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Bookmarks
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <View style={[styles.closeCircle, { backgroundColor: colors.muted }]}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </View>
            </TouchableOpacity>
          </View>

          {/* List */}
          {bookmarks.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="bookmark" size={44} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                No Bookmarks
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Tap the bookmark icon while browsing to save pages.
              </Text>
            </View>
          ) : (
            <FlatList
              data={bookmarks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <BookmarkRow
                  item={item}
                  colors={colors}
                  onPress={() => handleNavigate(item.url)}
                  onRemove={() => handleRemove(item.id)}
                />
              )}
              ItemSeparatorComponent={() => (
                <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: 60 }]} />
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function BookmarkRow({
  item,
  colors,
  onPress,
  onRemove,
}: {
  item: Bookmark;
  colors: any;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.favicon, { backgroundColor: colors.muted }]}>
        <Feather name="globe" size={15} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.itemTitle, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={[styles.itemUrl, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
          numberOfLines={1}
        >
          {getDisplayUrl(item.url)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.removeBtn}
      >
        <Feather name="trash-2" size={17} color={colors.mutedForeground} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    minHeight: 300,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
  },
  closeBtn: {
    padding: 2,
  },
  closeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  favicon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
  },
  itemUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
  },
});
