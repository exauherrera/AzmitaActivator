import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    interpolate,
    Extrapolate
} from 'react-native-reanimated';
import { COLORS } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { NeonButton } from '../components/NeonButton';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Phygital Locking',
        description: 'Vínculo indisoluble. El hardware y el software se fusionan tras la Azmitización.',
        icon: '🔒',
        rule: 'REGLA 01'
    },
    {
        id: '2',
        title: 'Single Source of Truth',
        description: 'El chip es el único que sabe si el objeto es real mediante firmas criptográficas SUN.',
        icon: '💎',
        rule: 'REGLA 02'
    },
    {
        id: '3',
        title: 'Object Agnostic',
        description: 'Un protocolo universal. Desde un Rolex hasta un Toyota, el activo es una variable.',
        icon: '⌬',
        rule: 'REGLA 03'
    },
    {
        id: '4',
        title: 'Gas-Less Experience',
        description: 'Abstracción Web3. Sin frases semilla ni comisiones visibles. Activación pura.',
        icon: '⚡',
        rule: 'REGLA 04'
    },
    {
        id: '5',
        title: 'Chain of Custody',
        description: 'Transparencia total. Una línea de tiempo inmutable desde la fábrica al dueño actual.',
        icon: '🛡️',
        rule: 'REGLA 05'
    }
];

export const OnboardingScreen = ({ onFinish }: { onFinish: () => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);

    const onScroll = (event: any) => {
        scrollX.value = event.nativeEvent.contentOffset.x;
    };

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item, index }: { item: typeof SLIDES[0], index: number }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>{item.icon}</Text>
                    <View style={styles.glow} />
                </View>

                <Text style={styles.ruleNumber}>{item.rule}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        );
    };

    return (
        <ScreenWrapper style={styles.container}>
            <TouchableOpacity style={styles.skipButton} onPress={onFinish}>
                <Text style={styles.skipText}>SALTAR</Text>
            </TouchableOpacity>

            <FlatList
                data={SLIDES}
                renderItem={renderItem}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                keyExtractor={(item) => item.id}
            />

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, i) => {
                        const dotStyle = useAnimatedStyle(() => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = interpolate(
                                scrollX.value,
                                inputRange,
                                [8, 24, 8],
                                Extrapolate.CLAMP
                            );
                            const opacity = interpolate(
                                scrollX.value,
                                inputRange,
                                [0.3, 1, 0.3],
                                Extrapolate.CLAMP
                            );
                            return {
                                width: dotWidth,
                                opacity,
                                backgroundColor: COLORS.azmitaRed,
                            };
                        });
                        return <Animated.View key={i} style={[styles.dot, dotStyle]} />;
                    })}
                </View>

                {currentIndex === SLIDES.length - 1 ? (
                    <NeonButton
                        title="INICIAR PROTOCOLO"
                        onPress={onFinish}
                        style={styles.button}
                    />
                ) : (
                    <View style={styles.placeholderButton} />
                )}
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
    },
    icon: {
        fontSize: 80,
    },
    glow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.azmitaRed,
        opacity: 0.1,
        shadowColor: COLORS.azmitaRed,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 10,
    },
    ruleNumber: {
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        fontSize: 12,
        letterSpacing: 4,
        marginBottom: 10,
    },
    title: {
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 1,
    },
    description: {
        fontFamily: 'Inter_400Regular',
        color: COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
    },
    pagination: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    button: {
        width: width * 0.8,
    },
    placeholderButton: {
        height: 60,
    },
    skipButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    skipText: {
        color: COLORS.textSecondary,
        fontFamily: 'Orbitron_700Bold',
        fontSize: 10,
        letterSpacing: 2,
    }
});
