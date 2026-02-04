import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    Modal,
    TextInput,
    ScrollView
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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RadarScanner } from '../components/RadarScanner';

const { width } = Dimensions.get('window');

const MainScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [scannedTag, setScannedTag] = useState<any>(null);
    const [customText, setCustomText] = useState('');
    const [currentTime, setCurrentTime] = useState({ date: '', time: '' });

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

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                nfcService.abort();
                setLoading(false);
                setStatus('');
            };
        }, [])
    );

    const handleAzmitar = async () => {
        setLoading(true);
        setStatus(t('scan_chip'));

        try {
            const tag = await nfcService.scanAndAuthenticate();
            if (!tag) {
                setLoading(false);
                return;
            }

            const now = new Date();
            setCurrentTime({
                date: now.toLocaleDateString(),
                time: now.toLocaleTimeString()
            });

            setScannedTag(tag);
            setConfigModalVisible(true);
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), t('scan_failed'));
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const confirmAzmitar = async () => {
        if (!scannedTag) return;

        setLoading(true);
        setConfigModalVisible(false);
        setStatus(t('processing_blockchain'));

        try {
            const savedWallet = await AsyncStorage.getItem('user-wallet');
            const walletToUse = savedWallet || '//Alice';

            // 1. Write metadata to chip
            await nfcService.writeSUNMetadata(scannedTag.id, walletToUse, customText);

            // 2. Perform blockchain transaction
            const translatedCategory = await translationService.translate('Luxury Item', i18n.language);
            const result = await blockchainService.azmitarAsset(walletToUse, {
                uid: scannedTag.id,
                category: translatedCategory,
                timestamp: Date.now(),
                metadata: customText // Guardamos también el texto el la cadena
            });

            if (result.success) {
                const newAzmit = {
                    id: result.azmitId,
                    uid: scannedTag.id,
                    category: 'LUXURY',
                    translatedCategory,
                    customText,
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
                setScannedTag(null);
                setCustomText('');
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

            {/* Modal de Configuración de Escritura */}
            <Modal
                visible={configModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setConfigModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('write_config') || 'NFC CONFIG'}</Text>
                            <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.configItem}>
                                <Text style={styles.configLabel}>UID (TAG ID)</Text>
                                <View style={styles.readonlyField}>
                                    <Text style={styles.readonlyText}>{scannedTag?.id}</Text>
                                </View>
                            </View>

                            <View style={styles.configRow}>
                                <View style={[styles.configItem, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.configLabel}>{t('date') || 'FECHA'}</Text>
                                    <View style={styles.readonlyField}>
                                        <Text style={styles.readonlyText}>{currentTime.date}</Text>
                                    </View>
                                </View>
                                <View style={[styles.configItem, { flex: 1 }]}>
                                    <Text style={styles.configLabel}>{t('time') || 'HORA'}</Text>
                                    <View style={styles.readonlyField}>
                                        <Text style={styles.readonlyText}>{currentTime.time}</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.configItem}>
                                <Text style={styles.configLabel}>{t('custom_text') || 'TEXTO PERSONALIZADO'}</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder={t('placeholder_metadata') || 'Escribe aquí información adicional...'}
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={customText}
                                    onChangeText={setCustomText}
                                    multiline
                                />
                            </View>

                            <View style={styles.goldenRulesRow}>
                                <View style={styles.ruleBadge}>
                                    <Ionicons name="flash-outline" size={14} color="#00FFA3" />
                                    <Text style={styles.ruleText}>{t('gas_less')}</Text>
                                </View>
                                <View style={styles.ruleBadge}>
                                    <Ionicons name="shield-checkmark-outline" size={14} color="#00FFA3" />
                                    <Text style={styles.ruleText}>{t('sun_verified')}</Text>
                                </View>
                            </View>
                        </ScrollView>

                        <NeonButton
                            title={t('confirm_write') || 'AZMITAR AHORA'}
                            onPress={confirmAzmitar}
                            style={styles.confirmBtn}
                        />
                    </View>
                </View>
            </Modal>

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
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
        height: '80%',
        borderTopWidth: 1,
        borderTopColor: COLORS.azmitaRed,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    modalBody: {
        flex: 1,
    },
    configItem: {
        marginBottom: 20,
    },
    configRow: {
        flexDirection: 'row',
    },
    configLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        marginBottom: 8,
    },
    readonlyField: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    readonlyText: {
        color: COLORS.textSecondary,
        fontFamily: 'monospace',
        fontSize: 14,
    },
    textInput: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 12,
        padding: 15,
        color: '#FFFFFF',
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        minHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
    },
    confirmBtn: {
        marginTop: 20,
        marginBottom: 20,
    },
    goldenRulesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 10,
        marginBottom: 20,
    },
    ruleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.3)',
        gap: 6,
    },
    ruleText: {
        color: '#00FFA3',
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 0.5,
    }
});

export default MainScreen;
