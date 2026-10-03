import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '@/theme';

export interface MenuItem {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

export interface MenuSpec {
  title?: string;
  items: MenuItem[];
}

/** Bottom sheet menu; Android's Alert only supports three buttons. */
export function ActionMenu({ spec, onClose }: { spec: MenuSpec | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={!!spec} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingBottom: insets.bottom + space.md,
            maxHeight: '80%',
          }}
        >
          {spec?.title ? (
            <Text style={{ color: colors.textDim, padding: space.lg, paddingBottom: space.sm, fontSize: 13 }}>{spec.title}</Text>
          ) : null}
          <ScrollView>
            {spec?.items.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  onClose();
                  setTimeout(item.onPress, 0);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: space.lg,
                  backgroundColor: pressed ? colors.cardAlt : 'transparent',
                })}
              >
                {item.icon ? (
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.destructive ? colors.danger : colors.textDim}
                    style={{ marginRight: space.md }}
                  />
                ) : null}
                <Text style={{ color: item.destructive ? colors.danger : colors.text, fontSize: 16 }}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
