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
import blockchainService, { NETWORKS } from '../services/blockchainService';
import translationService from '../services/translationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RadarScanner } from '../components/RadarScanner';
import { PinPadModal } from '../components/PinPadModal';
import securityService from '../services/securityService';

// ...

const MainScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [scannedTag, setScannedTag] = useState<any>(null);
    const [customText, setCustomText] = useState('');
    const [currentTime, setCurrentTime] = useState({ date: '', time: '' });
    const [selectedRpc, setSelectedRpc] = useState(NETWORKS.mainnet.rpc);
    const [tokenSymbol, setTokenSymbol] = useState('AZM');

    // Security
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<() => Promise<void> | void>();

    // Logo Animation
    const logoScale = useSharedValue(1);

    useEffect(() => {
        logoScale.value = withRepeat(
            withSequence(withTiming(1.05, { duration: 1000 }), withTiming(1, { duration: 1000 })),
            -1
        );
        loadNetworkSettings();
    }, []);

    const loadNetworkSettings = async () => {
        try {
            const savedRpc = await AsyncStorage.getItem('user-selected-network');
            if (savedRpc) {
                setSelectedRpc(savedRpc);
                updateTokenSymbol(savedRpc);
            }
        } catch (error) {
            console.error('Error loading network settings:', error);
        }
    };

    const updateTokenSymbol = (rpc: string) => {
        setTokenSymbol(blockchainService.getNetworkConfig().symbol);
    };

    const getNetworkName = () => {
        return blockchainService.getNetworkConfig().name;
    };

    const logoStyle = useAnimatedStyle(() => ({
        transform: [{ scale: logoScale.value }],
    }));

    const handleCancelScan = () => {
        nfcService.abort();
        setLoading(false);
        setStatus('');
    };

    useFocusEffect(
        React.useCallback(() => {
            return () => {
                handleCancelScan();
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

    const executeAzmitar = async () => {
        if (!scannedTag) return;

        setLoading(true);
        setConfigModalVisible(false);

        // Rule 2 & 1: Phygital Locking & SUN Verification
        setStatus(t('authenticating'));

        try {
            const savedWallet = await AsyncStorage.getItem('user-wallet-address');
            const savedSeed = await AsyncStorage.getItem('user-wallet-mnemonic');
            const walletToUse = savedSeed || '//Alice';

            // 1. Phygital Locking (Rule 1)
            setStatus(t('locked_status')); // "Bloqueo Phygital Activo"
            await nfcService.writeSUNMetadata(scannedTag.id, savedWallet || 'Azmita_Protocol', customText);

            // 2. Blockchain Transaction (Rule 4 & 5)
            setStatus(t('processing_blockchain'));
            const translatedCategory = await translationService.translate('Luxury Item', i18n.language);
            const result = await blockchainService.azmitarAsset(walletToUse, {
                uid: scannedTag.id,
                category: translatedCategory,
                timestamp: Date.now(),
                metadata: customText
            });

            if (result.success) {
                const newAzmit = {
                    id: result.azmitId,
                    uid: scannedTag.id,
                    category: 'LUXURY',
                    translatedCategory,
                    customText,
                    timestamp: Date.now(),
                    txHash: result.txHash,
                    chainOfCustody: result.chainOfCustody
                };

                const existingVault = await AsyncStorage.getItem('azmit-vault');
                const vault = existingVault ? JSON.parse(existingVault) : [];
                vault.unshift(newAzmit);
                await AsyncStorage.setItem('azmit-vault', JSON.stringify(vault));

                Alert.alert(t('success'), `${t('azmitado')}!\nID: ${result.azmitId}`);
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

    const confirmAzmitar = async () => {
        const shouldAskPin = await securityService.shouldAskPin('azmit_asset');
        if (shouldAskPin) {
            setPendingAction(() => executeAzmitar);
            setPinModalVisible(true);
        } else {
            await executeAzmitar();
        }
    };

    return (
        <ScreenWrapper>
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.header}>
                    <View>
                        <Animated.Text style={[styles.logo, logoStyle]}>AZMITA</Animated.Text>
                        <Text style={styles.tagline}>THE PHYSICAL-DIGITAL LINK</Text>
                    </View>
                    <View style={styles.networkBadge}>
                        <View style={styles.networkDot} />
                        <Text style={styles.networkText}>{getNetworkName()}</Text>
                    </View>
                </View>

                <View style={styles.mainAction}>
                    <RadarScanner
                        loading={loading}
                        statusText={loading ? status : t('ready_to_scan')}
                        icon={<Text style={styles.scannerIcon}>◈</Text>}
                    />
                    {loading && (
                        <TouchableOpacity
                            style={styles.cancelScanBtn}
                            onPress={handleCancelScan}
                        >
                            <Ionicons name="close-circle-outline" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.cancelScanText}>{t('cancel') || 'CANCELAR'}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Modal de Configuración de Escritura / Preview */}
                <Modal
                    visible={configModalVisible}
                    animationType="fade"
                    transparent={true}
                    onRequestClose={() => setConfigModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>{t('digital_twin_preview') || 'DIGITAL TWIN PREVIEW'}</Text>
                                    <Text style={styles.modalSubTitle}>{t('verify_data_before_locking') || 'Verifica los datos antes del bloqueo'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setConfigModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <GlassCard style={styles.previewCard}>
                                    <View style={styles.configItem}>
                                        <Text style={styles.configLabel}>IDENTIFICADOR ÚNICO (UID)</Text>
                                        <Text style={styles.previewValue}>{scannedTag?.id}</Text>
                                    </View>

                                    <View style={styles.separator} />

                                    <View style={styles.configRow}>
                                        <View style={[styles.configItem, { flex: 1 }]}>
                                            <Text style={styles.configLabel}>{t('date') || 'FECHA'}</Text>
                                            <Text style={styles.previewValueSmall}>{currentTime.date}</Text>
                                        </View>
                                        <View style={[styles.configItem, { flex: 1 }]}>
                                            <Text style={styles.configLabel}>{t('time') || 'HORA'}</Text>
                                            <Text style={styles.previewValueSmall}>{currentTime.time}</Text>
                                        </View>
                                    </View>
                                </GlassCard>

                                <View style={styles.inputSection}>
                                    <Text style={styles.configLabel}>{t('custom_metadata') || 'METADATA ADICIONAL'}</Text>
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
                                        <Ionicons name="flash-outline" size={12} color="#00FFA3" />
                                        <Text style={styles.ruleText}>{t('gas_less')}</Text>
                                    </View>
                                    <View style={styles.ruleBadge}>
                                        <Ionicons name="shield-checkmark-outline" size={12} color="#00FFA3" />
                                        <Text style={styles.ruleText}>{t('sun_verified')}</Text>
                                    </View>
                                    <View style={styles.ruleBadge}>
                                        <Ionicons name="lock-closed-outline" size={12} color="#00FFA3" />
                                        <Text style={styles.ruleText}>{t('phygital_lock') || 'LOCKED'}</Text>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooterActions}>
                                <TouchableOpacity
                                    onPress={async () => {
                                        Alert.alert(
                                            t('warning') || 'ADVERTENCIA',
                                            t('confirm_wipe') || '¿Estás seguro? Esto borrará TODOS los datos del chip.',
                                            [
                                                { text: t('cancel'), style: 'cancel' },
                                                {
                                                    text: t('confirm_wipe_action') || 'BORRAR',
                                                    style: 'destructive',
                                                    onPress: async () => {
                                                        try {
                                                            const success = await nfcService.eraseTag();
                                                            if (success) Alert.alert(t('success'), 'Chip borrado/formateado correctamente.');
                                                        } catch (e) {
                                                            Alert.alert(t('error'), 'Error al borrar chip.');
                                                        }
                                                    }
                                                }
                                            ]
                                        );
                                    }}
                                    style={styles.wipeBtn}
                                >
                                    <Ionicons name="trash-outline" size={18} color={COLORS.azmitaRed} />
                                    <Text style={styles.wipeBtnText}>FORMATEAR</Text>
                                </TouchableOpacity>

                                <NeonButton
                                    title={t('confirm_write') || 'AZMITAR'}
                                    onPress={confirmAzmitar}
                                    style={styles.confirmBtn}
                                    titleStyle={{ fontSize: 13 }}
                                />
                            </View>
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
            </ScrollView>

            <PinPadModal
                visible={pinModalVisible}
                mode="verify"
                onSuccess={() => {
                    setPinModalVisible(false);
                    if (pendingAction) pendingAction();
                    setPendingAction(undefined);
                }}
                onClose={() => {
                    setPinModalVisible(false);
                    setPendingAction(undefined);
                }}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        marginTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
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
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderRadius: 30,
        padding: 25,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
        shadowColor: COLORS.azmitaRed,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
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
    modalSubTitle: {
        fontSize: 10,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textSecondary,
        marginTop: 4,
        letterSpacing: 1,
    },
    modalBody: {
        flex: 1,
    },
    previewCard: {
        padding: 20,
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
    },
    configItem: {
        marginBottom: 20,
    },
    configLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        marginBottom: 8,
    },
    previewValue: {
        color: '#FFFFFF',
        fontFamily: 'monospace',
        fontSize: 16,
        letterSpacing: 1,
    },
    previewValueSmall: {
        color: '#FFFFFF',
        fontFamily: 'monospace',
        fontSize: 14,
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginVertical: 15,
    },
    configRow: {
        flexDirection: 'row',
    },
    inputSection: {
        marginBottom: 20,
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
    cancelScanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cancelScanText: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 2,
    },
    goldenRulesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 5,
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
    },
    modalFooterActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 10,
    },
    wipeBtn: {
        backgroundColor: 'rgba(230, 57, 70, 0.05)',
        borderColor: 'rgba(230, 57, 70, 0.3)',
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    wipeBtnText: {
        color: COLORS.azmitaRed,
        fontFamily: 'Orbitron_700Bold',
        fontSize: 10,
        letterSpacing: 1,
    },
    confirmBtn: {
        flex: 1,
    },
    networkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.2)',
    },
    networkDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00FFA3',
        marginRight: 6,
    },
    networkText: {
        color: '#00FFA3',
        fontSize: 9,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 0.5,
    },
});

export default MainScreen;
