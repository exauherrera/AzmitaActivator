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
import { RadarScanner } from '../components/RadarScanner';

const { width } = Dimensions.get('window');

const MainScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    // Logo Animation
    const logoScale = useSharedValue(1);

    useEffect(() => {
        logoScale.value = withRepeat(
            withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
            -1
        );
    }, []);

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
    }));

    const handleAzmitar = async () => {
        setLoading(true);
        setStatus(t('scan_chip'));

        try {
            const savedWallet = await AsyncStorage.getItem('user-wallet');
            const walletToUse = savedWallet || '//Alice';

            const tag = await nfcService.scanAndAuthenticate();
            if (!tag) {
                setLoading(false);
                return;
            }

            setStatus(t('authenticating'));
            const translatedCategory = await translationService.translate('Luxury Item', i18n.language);

            setStatus(t('processing_blockchain'));
            const result = await blockchainService.azmitarAsset(walletToUse, {
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

                const successMsg = i18n.language === 'es'
                    ? `¡Azmit Creado!\nID: ${result.azmitId}`
                    : `Azmit Created!\nID: ${result.azmitId}`;

                Alert.alert(t('success'), successMsg);
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), t('azmit_failed'));
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
                <RadarScanner
                    loading={loading}
                    statusText={loading ? status : t('ready_to_scan')}
                    icon={<Text style={styles.scannerIcon}>◈</Text>}
                />
            </View>

            <View style={styles.footer}>
                <NeonButton
                    title={t('azmitar')}
                    subtitle={t('scan_chip')}
                    onPress={handleAzmitar}
                    style={styles.primaryButton}
                />
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
    scannerIcon: {
        fontSize: 60,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
    },
    footer: {
        padding: 30,
        paddingBottom: 50,
    },
    primaryButton: {
        // center in footer
    }
});

export default MainScreen;
