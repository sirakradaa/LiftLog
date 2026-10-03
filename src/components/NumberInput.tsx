import React, { useEffect, useState } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';
import { colors } from '@/theme';

/**
 * Text field bound to a numeric value. Keeps the raw text locally so partial input
 * like "62." or "1:" survives re-renders, and only resyncs when the value changes externally.
 */
export function NumberInput({
  value,
  onChange,
  parse,
  format,
  placeholder,
  style,
  keyboardType = 'decimal-pad',
  selectTextOnFocus = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  parse: (text: string) => number | null;
  format: (v: number) => string;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'numbers-and-punctuation';
  selectTextOnFocus?: boolean;
}) {
  const [text, setText] = useState(value == null ? '' : format(value));

  useEffect(() => {
    const parsed = parse(text);
    const same = parsed == null ? value == null : value != null && Math.abs(parsed - value) < 1e-6;
    if (!same) setText(value == null ? '' : format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        setText(t);
        onChange(parse(t));
      }}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      keyboardType={keyboardType}
      selectTextOnFocus={selectTextOnFocus}
      style={style}
    />
  );
}
