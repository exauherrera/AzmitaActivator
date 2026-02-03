import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    withSequence,
    interpolate,
    Easing
} from 'react-native-reanimated';
import { GlassCard } from './GlassCard';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface RadarScannerProps {
    loading: boolean;
    statusText?: string;
    icon?: React.ReactNode;
}

export const RadarScanner: React.FC<RadarScannerProps> = ({ loading, statusText, icon }) => {
    const ring1 = useSharedValue(0);
    const ring2 = useSharedValue(0);
    const iconScale = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        ring1.value = withRepeat(withDelay(0, withTiming(1, { duration: 3000 })), -1);
        ring2.value = withRepeat(withDelay(1500, withTiming(1, { duration: 3000 })), -1);
        iconScale.value = withRepeat(
            withSequence(withTiming(1.1, { duration: 1000 }), withTiming(1, { duration: 1000 })),
            -1
        );
        rotation.value = withRepeat(
            withTiming(360, { duration: 4000, easing: Easing.linear }),
            -1
        );
    }, []);

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring1.value, [0, 1], [0.5, 2.2]) }],
        opacity: interpolate(ring1.value, [0, 0.5, 1], [0, 0.4, 0]),
        borderColor: loading ? '#FFFFFF' : COLORS.azmitaRed,
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring2.value, [0, 1], [0.5, 2.2]) }],
        opacity: interpolate(ring2.value, [0, 0.5, 1], [0, 0.4, 0]),
        borderColor: loading ? '#FFFFFF' : COLORS.azmitaRed,
    }));

    const radarSweepStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
        opacity: loading ? 1 : 0.3,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    return (
        <View style={styles.container}>
            <View style={styles.animationWrapper}>
                <Animated.View style={[styles.pulseRing, ring1Style]} />
                <Animated.View style={[styles.pulseRing, ring2Style]} />

                {/* Radar Sweep Arc */}
                <Animated.View style={[styles.sweep, radarSweepStyle]} />

                <GlassCard style={styles.scanCard}>
                    {loading ? (
                        <View style={styles.loadingWrapper}>
                            <ActivityIndicator size="large" color={COLORS.azmitaRed} />
                            {statusText && <Text style={styles.statusLabel}>{statusText}</Text>}
                        </View>
                    ) : (
                        <View style={styles.idleWrapper}>
                            <Animated.View style={iconStyle}>
                                {icon}
                            </Animated.View>
                            {statusText && <Text style={styles.readyText}>{statusText}</Text>}
                        </View>
                    )}
                </GlassCard>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 280,
    },
    animationWrapper: {
        width: 220,
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
    },
    sweep: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        borderWidth: 3,
        borderColor: 'transparent',
        borderTopColor: 'rgba(230, 57, 70, 0.8)',
        borderRightColor: 'rgba(230, 57, 70, 0.2)',
    },
    scanCard: {
        width: 150,
        height: 150,
        borderRadius: 75,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    loadingWrapper: {
        alignItems: 'center',
    },
    statusLabel: {
        color: COLORS.textPrimary,
        marginTop: 15,
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
        textAlign: 'center',
    },
    idleWrapper: {
        alignItems: 'center',
    },
    readyText: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        marginTop: 10,
        letterSpacing: 1,
        textAlign: 'center',
    }
});
