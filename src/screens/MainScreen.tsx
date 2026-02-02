import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
import nfcService from '../services/nfcService';
import blockchainService from '../services/blockchainService';
import translationService from '../services/translationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const MainScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleAzmitar = async () => {
        setLoading(true);
        setStatus(t('scan_chip'));

        try {
            // 1. Scan NFC with Advanced Security (DNA 3-Pass Auth)
            const tag = await nfcService.scanAndAuthenticate();
            if (!tag) {
                setLoading(false);
                return;
            }

            setStatus(t('authenticating'));

            // 2. Translate category metadata automatically using the new service
            const translatedCategory = await translationService.translate('Luxury Item', i18n.language);

            setStatus(t('processing_blockchain'));

            // 3. Register on Polkadot
            const result = await blockchainService.azmitarAsset('//Alice', {
                uid: tag.id,
                category: translatedCategory,
                timestamp: Date.now()
            });

            if (result.success) {
                // 4. Save to Vault (Chain of Custody)
                const newAzmit = {
                    id: result.azmitId,
                    uid: tag.id,
                    category: 'LUXURY', // Original category for i18n mapping in Vault
                    translatedCategory,
                    timestamp: Date.now(),
                    txHash: result.txHash
                };

                const existingVault = await AsyncStorage.getItem('azmit-vault');
                const vault = existingVault ? JSON.parse(existingVault) : [];
                vault.unshift(newAzmit);
                await AsyncStorage.setItem('azmit-vault', JSON.stringify(vault));

                Alert.alert(
                    t('success'),
                    `Azmit Created!\nID: ${result.azmitId}`
                );
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
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.logo}>AZMITA</Text>
            </View>

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.azmitaBlue} />
                        <Text style={styles.statusText}>{status}</Text>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.actionCard}
                            onPress={handleAzmitar}
                        >
                            <View style={styles.glow} />
                            <Text style={styles.cardTitle}>{t('azmitar')}</Text>
                            <Text style={styles.cardSubtitle}>{t('scan_chip')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { marginTop: 20 }]}
                            onPress={() => navigation.navigate('Vault')}
                        >
                            <Text style={styles.cardTitle}>{t('vault')}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.deepBlack,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    logo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.azmitaBlue,
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
    },
    statusText: {
        color: COLORS.ghostWhite,
        marginTop: 20,
        fontSize: 18,
    },
    actionCard: {
        backgroundColor: COLORS.spaceGray,
        padding: 30,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.azmitaBlue + '22',
        overflow: 'hidden',
        position: 'relative'
    },
    glow: {
        position: 'absolute',
        top: -50,
        left: -50,
        width: 100,
        height: 100,
        backgroundColor: COLORS.azmitaBlue,
        opacity: 0.1,
        borderRadius: 50,
    },
    cardTitle: {
        color: COLORS.ghostWhite,
        fontSize: 24,
        fontWeight: 'bold',
    },
    cardSubtitle: {
        color: COLORS.steel,
        fontSize: 16,
        marginTop: 5,
    }
});

export default MainScreen;
