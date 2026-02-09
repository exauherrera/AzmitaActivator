import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

interface NeonButtonProps {
    onPress: () => void;
    title: string;
    subtitle?: string;
    style?: ViewStyle;
    titleStyle?: TextStyle;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'default' | 'small' | 'outline';
}

export const NeonButton: React.FC<NeonButtonProps> = ({ onPress, title, subtitle, style, titleStyle, disabled, loading, variant = 'default' }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                styles.wrapper,
                variant === 'small' && styles.smallWrapper,
                variant === 'outline' && styles.outlineWrapper,
                style,
                (disabled || loading) && styles.disabled
            ]}
            disabled={disabled || loading}
        >
            <LinearGradient
                colors={variant === 'outline' ? ['transparent', 'transparent'] : (disabled || loading ? ['#2A2A2A', '#1A1A1A'] : [COLORS.azmitaRed, '#8B0000'])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradient, variant === 'small' && styles.smallGradient]}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <>
                        <Text
                            style={[
                                styles.title,
                                variant === 'small' && styles.smallTitle,
                                variant === 'outline' && { color: COLORS.azmitaRed },
                                titleStyle,
                                disabled && styles.disabledText
                            ]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                        >
                            {title}
                        </Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: COLORS.azmitaRed,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    smallWrapper: {
        borderRadius: 12,
    },
    outlineWrapper: {
        borderWidth: 1,
        borderColor: COLORS.azmitaRed,
        shadowOpacity: 0.1,
    },
    gradient: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallGradient: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    smallTitle: {
        fontSize: 12,
        letterSpacing: 1,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        marginTop: 4,
        fontWeight: '500',
        letterSpacing: 1,
    },
    disabled: {
        shadowOpacity: 0,
        elevation: 0,
        opacity: 0.5,
    },
    disabledText: {
        color: 'rgba(255, 255, 255, 0.3)',
    },
});
