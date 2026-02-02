import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const glowOpacity = useSharedValue(0.3);

    useEffect(() => {
        // Entrance animation
        opacity.value = withTiming(1, { duration: 1500 });
        scale.value = withTiming(1, {
            duration: 2000,
            easing: Easing.out(Easing.back(1.5))
        });

        // Breathing glow
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.8, { duration: 1500 }),
                withTiming(0.3, { duration: 1500 })
            ),
            -1,
            true
        );

        // Auto-finish after 3.5 seconds
        const timer = setTimeout(() => {
            onFinish();
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: scale.value * 1.2 }],
        backgroundColor: COLORS.azmitaRed,
    }));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.cardBlack, COLORS.deepMaroon, COLORS.cardBlack]}
                style={StyleSheet.absoluteFill}
            />

            {/* Background Glow */}
            <Animated.View style={[styles.mainGlow, glowStyle]} />

            <Animated.View style={[styles.content, logoStyle]}>
                <Text style={styles.lionIcon}>🦁</Text>
                <Text style={styles.title}>AZMITA</Text>
                <View style={styles.divider} />
                <Text style={styles.subtitle}>PROTOCOL</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
    },
    lionIcon: {
        fontSize: 100,
        textShadowColor: COLORS.azmitaRed,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 30,
    },
    title: {
        fontFamily: 'Orbitron_900Black',
        fontSize: 48,
        color: '#FFFFFF',
        letterSpacing: 10,
        marginTop: 20,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: COLORS.azmitaRed,
        marginVertical: 15,
    },
    subtitle: {
        fontFamily: 'Orbitron_700Bold',
        fontSize: 12,
        color: COLORS.azmitaRed,
        letterSpacing: 8,
    },
    mainGlow: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        filter: 'blur(100px)',
    }
});
