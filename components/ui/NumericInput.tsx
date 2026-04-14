import React, { useRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../../constants/theme';

interface NumericInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  unit?: string;
  min?: number;
  max?: number;
  style?: ViewStyle;
  large?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  placeholder = '—',
  unit,
  min,
  max,
  style,
  large = false,
}) => {
  const handleChange = (text: string) => {
    if (text === '' || text === '-') {
      onChange(undefined);
      return;
    }
    const num = parseInt(text, 10);
    if (isNaN(num)) return;
    const clamped =
      min !== undefined && max !== undefined
        ? Math.max(min, Math.min(max, num))
        : min !== undefined
        ? Math.max(min, num)
        : max !== undefined
        ? Math.min(max, num)
        : num;
    onChange(clamped);
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={[styles.input, large && styles.inputLarge]}
        value={value !== undefined ? String(value) : ''}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textDisabled}
        keyboardType="number-pad"
        selectTextOnFocus
        returnKeyType="done"
      />
      {unit ? (
        <Text style={[styles.unit, large && styles.unitLarge]}>{unit}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.md,
    fontWeight: Typography.semibold,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  inputLarge: {
    fontSize: Typography.xl,
    minHeight: 56,
  },
  unit: {
    color: Colors.textSecondary,
    fontSize: Typography.sm,
    marginLeft: 2,
  },
  unitLarge: {
    fontSize: Typography.base,
  },
});
