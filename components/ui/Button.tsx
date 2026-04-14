import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Radius, MIN_TAP_TARGET } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary:   { bg: Colors.primary,    text: '#0d1117' },
  secondary: { bg: Colors.surfaceRaised, text: Colors.textPrimary, border: Colors.border },
  danger:    { bg: Colors.danger,     text: '#fff' },
  ghost:     { bg: 'transparent',     text: Colors.primary, border: Colors.primary },
  success:   { bg: Colors.success,    text: '#0d1117' },
};

const sizeStyles: Record<Size, { height: number; px: number; fontSize: number }> = {
  sm: { height: MIN_TAP_TARGET,     px: 16, fontSize: Typography.sm },
  md: { height: MIN_TAP_TARGET + 4, px: 20, fontSize: Typography.base },
  lg: { height: MIN_TAP_TARGET + 8, px: 24, fontSize: Typography.md },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1 : 0,
          height: s.height,
          paddingHorizontal: s.px,
          borderRadius: Radius.md,
          opacity: disabled ? 0.4 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            { color: v.text, fontSize: s.fontSize },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: Typography.bold,
    letterSpacing: 0.3,
  },
});
