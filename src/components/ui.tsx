import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '@/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';

export function Button({
  title,
  onPress,
  variant = 'primary',
  small,
  icon,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  small?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? '#3f1d1d'
        : variant === 'success'
          ? colors.success
          : variant === 'secondary'
            ? colors.cardAlt
            : 'transparent';
  const fg = variant === 'danger' ? colors.danger : variant === 'ghost' ? colors.primary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 14 : 18} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  color = colors.text,
  size = 22,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable hitSlop={10} onPress={onPress} style={({ pressed }) => [{ padding: 4, opacity: pressed ? 0.5 : 1 }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { opacity: pressed ? 0.8 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function T({
  children,
  style,
  dim,
  faint,
  size,
  bold,
  numberOfLines,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  dim?: boolean;
  faint?: boolean;
  size?: number;
  bold?: boolean;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color: dim ? colors.textDim : faint ? colors.textFaint : colors.text, fontSize: size ?? 15 },
        bold && { fontWeight: '700' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: space.md }}>
      {label ? <T dim size={13} style={{ marginBottom: 4 }}>{label}</T> : null}
      <TextInput placeholderTextColor={colors.textFaint} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={{ color: selected ? '#fff' : colors.textDim, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md }}>{children}</View>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ padding: space.xl, alignItems: 'center' }}>
      <T faint style={{ textAlign: 'center' }}>{text}</T>
    </View>
  );
}

export function ListItem({
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.listItem, { backgroundColor: pressed ? colors.cardAlt : 'transparent' }]}
    >
      <View style={{ flex: 1 }}>
        <T>{title}</T>
        {subtitle ? <T faint size={13}>{subtitle}</T> : null}
      </View>
      {right}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  btnSmall: { paddingVertical: 6, paddingHorizontal: space.md, borderRadius: radius.sm },
  btnText: { fontSize: 15, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, marginBottom: space.md },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', marginBottom: space.md },
  h2: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: space.sm },
  input: {
    backgroundColor: colors.cardAlt,
    color: colors.text,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 16,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: space.md,
    paddingVertical: 6,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.lg, paddingBottom: 120 },
});
