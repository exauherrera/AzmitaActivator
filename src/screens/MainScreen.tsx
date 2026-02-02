import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    withDelay,
    interpolate
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import { ScreenWrapper } from '../components/ScreenWrapper';
import nfcService from '../services/nfcService';
import blockchainService from '../services/blockchainService';
import translationService from '../services/translationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const MainScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    // Animations
    const ring1 = useSharedValue(0);
    const ring2 = useSharedValue(0);
    const logoScale = useSharedValue(1);

    useEffect(() => {
        ring1.value = withRepeat(withDelay(0, withTiming(1, { duration: 3000 })), -1);
        ring2.value = withRepeat(withDelay(1500, withTiming(1, { duration: 3000 })), -1);
        logoScale.value = withRepeat(withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1);
    }, []);

    const ring1Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring1.value, [0, 1], [0.5, 2]) }],
        opacity: interpolate(ring1.value, [0, 0.5, 1], [0, 0.5, 0]),
    }));

    const ring2Style = useAnimatedStyle(() => ({
        transform: [{ scale: interpolate(ring2.value, [0, 1], [0.5, 2]) }],
        opacity: interpolate(ring2.value, [0, 0.5, 1], [0, 0.5, 0]),
    }));

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
    }));

    const handleAzmitar = async () => {
        setLoading(true);
        setStatus(t('scan_chip'));

        try {
            const tag = await nfcService.scanAndAuthenticate();
            if (!tag) {
                setLoading(false);
                return;
            }

            setStatus(t('authenticating'));
            const translatedCategory = await translationService.translate('Luxury Item', i18n.language);

            setStatus(t('processing_blockchain'));
            const result = await blockchainService.azmitarAsset('//Alice', {
                uid: tag.id,
                category: translatedCategory,
                timestamp: Date.now()
            });

            if (result.success) {
                const newAzmit = {
                    id: result.azmitId,
                    uid: tag.id,
                    category: 'LUXURY',
                    translatedCategory,
                    timestamp: Date.now(),
                    txHash: result.txHash
                };

                const existingVault = await AsyncStorage.getItem('azmit-vault');
                const vault = existingVault ? JSON.parse(existingVault) : [];
                vault.unshift(newAzmit);
                await AsyncStorage.setItem('azmit-vault', JSON.stringify(vault));

                Alert.alert(t('success'), `Azmit Created!\nID: ${result.azmitId}`);
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), 'Azmitization failed');
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <ScreenWrapper>
            <View style={styles.header}>
                <Animated.Text style={[styles.logo, logoStyle]}>AZMITA</Animated.Text>
                <Text style={styles.tagline}>THE PHYSICAL-DIGITAL LINK</Text>
            </View>

            <View style={styles.mainAction}>
                <View style={styles.animationContainer}>
                    <Animated.View style={[styles.ring, ring1Style]} />
                    <Animated.View style={[styles.ring, ring2Style]} />
                    <GlassCard style={styles.scannerCard}>
                        {loading ? (
                            <View style={styles.loadingWrapper}>
                                <ActivityIndicator size="large" color={COLORS.azmitaRed} />
                                <Text style={styles.statusLabel}>{status}</Text>
                            </View>
                        ) : (
                            <View style={styles.idleWrapper}>
                                <Text style={styles.scannerIcon}>◈</Text>
                                <Text style={styles.readyText}>{t('ready_to_scan') || 'READY TO BIND'}</Text>
                            </View>
                        )}
                    </GlassCard>
                </View>
            </View>

            <View style={styles.footer}>
                <NeonButton
                    title={t('azmitar')}
                    subtitle={t('scan_chip')}
                    onPress={handleAzmitar}
                    style={styles.primaryButton}
                />

                <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() => navigation.navigate('Vault')}
                >
                    <GlassCard style={styles.vaultCard}>
                        <Text style={styles.vaultText}>{t('vault')}</Text>
                        <Text style={styles.vaultArrow}>→</Text>
                    </GlassCard>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        marginTop: 60,
        alignItems: 'center',
    },
    logo: {
        fontSize: 42,
        fontFamily: 'Orbitron_900Black',
        color: COLORS.azmitaRed,
        letterSpacing: 8,
        textShadowColor: COLORS.azmitaRedGlow,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    tagline: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 3,
        marginTop: 10,
    },
    mainAction: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animationContainer: {
        width: width * 0.7,
        height: width * 0.7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ring: {
        position: 'absolute',
        width: width * 0.6,
        height: width * 0.6,
        borderRadius: width * 0.3,
        borderWidth: 2,
        borderColor: COLORS.azmitaRed,
    },
    scannerCard: {
        width: width * 0.6,
        height: width * 0.6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingWrapper: {
        alignItems: 'center',
    },
    statusLabel: {
        color: COLORS.textPrimary,
        marginTop: 20,
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
    },
    idleWrapper: {
        alignItems: 'center',
    },
    scannerIcon: {
        fontSize: 60,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
    },
    readyText: {
        color: COLORS.textSecondary,
        fontSize: 11,
        fontFamily: 'Orbitron_700Bold',
        marginTop: 10,
        letterSpacing: 2,
    },
    footer: {
        padding: 30,
        paddingBottom: 50,
    },
    primaryButton: {
        marginBottom: 20,
    },
    secondaryAction: {
        borderRadius: 24,
    },
    vaultCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 24,
    },
    vaultText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        letterSpacing: 1,
    },
    vaultArrow: {
        color: COLORS.azmitaRed,
        fontSize: 20,
    }
});

export default MainScreen;
