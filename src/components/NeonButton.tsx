import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

interface NeonButtonProps {
    onPress: () => void;
    title: string;
    subtitle?: string;
    style?: ViewStyle;
    disabled?: boolean;
}

export const NeonButton: React.FC<NeonButtonProps> = ({ onPress, title, subtitle, style, disabled }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.wrapper, style, disabled && styles.disabled]}
            disabled={disabled}
        >
            <LinearGradient
                colors={disabled ? ['#2A2A2A', '#1A1A1A'] : [COLORS.azmitaRed, '#8B0000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            >
                <Text style={[styles.title, disabled && styles.disabledText]}>{title}</Text>
                {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
    gradient: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
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
