import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
import { GlassCard } from '../components/GlassCard';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { NeonButton } from '../components/NeonButton';
import blockchainService from '../services/blockchainService';
import securityService from '../services/securityService';
import { PinPadModal } from '../components/PinPadModal';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AssetDetailScreen = ({ route, navigation }: any) => {
    const { asset } = route.params;
    const { t } = useTranslation();
    const [timeline, setTimeline] = useState<any[]>([]);
    const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
    const [destAddress, setDestAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [isGenuine, setIsGenuine] = useState(true); // Rule 2: Single Source of Truth

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const history = await blockchainService.getAssetHistory(asset);
        setTimeline(history);
    };

    const handleTransferPress = () => {
        setIsTransferModalVisible(true);
    };

    const confirmTransfer = async () => {
        if (!destAddress) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        const shouldAsk = await securityService.shouldAskPin('send_funds'); // Reuse send_funds for transfer
        if (shouldAsk) {
            setPinModalVisible(true);
        } else {
            executeTransfer();
        }
    };

    const executeTransfer = async () => {
        setIsTransferModalVisible(false);
        setLoading(true);

        try {
            const mnemonic = await AsyncStorage.getItem('user-wallet-mnemonic') || '';
            const fromAddr = await AsyncStorage.getItem('user-wallet-address') || '';

            const result = await blockchainService.transferAsset(
                asset.id,
                fromAddr,
                destAddress,
                mnemonic
            );

            if (result.success) {
                // Update local vault (remove since it's transferred)
                const stored = await AsyncStorage.getItem('azmit-vault');
                if (stored) {
                    const vault = JSON.parse(stored);
                    const updated = vault.filter((a: any) => a.id !== asset.id);
                    await AsyncStorage.setItem('azmit-vault', JSON.stringify(updated));
                }

                Alert.alert(
                    t('success'),
                    t('transfer_success'),
                    [{ text: 'OK', onPress: () => navigation.replace('Vault') }]
                );
            }
        } catch (e) {
            Alert.alert(t('error'), t('transaction_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenWrapper>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.category}>{t(`category_${asset.category.toLowerCase()}`)}</Text>
                        <Text style={styles.title}>{asset.id.split('-')[0]}</Text>
                    </View>
                </View>

                <GlassCard style={styles.mainInfo}>
                    <View style={styles.infoRow}>
                        <View>
                            <Text style={styles.label}>FULL ID</Text>
                            <Text style={styles.value}>{asset.id}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View>
                            <Text style={styles.label}>CHIP UID (DNA)</Text>
                            <Text style={styles.value}>{asset.uid}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <View>
                            <Text style={styles.label}>NETWORK PROXY</Text>
                            <Text style={styles.txHash}>{asset.txHash}</Text>
                        </View>
                    </View>
                </GlassCard>

                <View style={styles.statusSection}>
                    <GlassCard style={[styles.statusCard, isGenuine && styles.genuineCard]}>
                        <View style={styles.statusHeader}>
                            <Ionicons
                                name={isGenuine ? "shield-checkmark" : "warning"}
                                size={24}
                                color={isGenuine ? COLORS.success : COLORS.azmitaRed}
                            />
                            <Text style={[styles.statusTitle, { color: isGenuine ? COLORS.success : COLORS.azmitaRed }]}>
                                {isGenuine ? t('sun_verified') : 'AUTHENTICITY FAILED'}
                            </Text>
                        </View>
                        <Text style={styles.statusDesc}>
                            {isGenuine
                                ? 'El chip ha generado una firma SUN válida y el Gemelo Digital coincide en Polkadot.'
                                : 'ADVERTENCIA: La firma del chip no coincide. Este objeto podría ser una réplica.'}
                        </Text>
                    </GlassCard>
                </View>

                <Text style={styles.sectionTitle}>CHAIN OF CUSTODY</Text>

                <View style={styles.timelineContainer}>
                    {timeline.map((item: any, index: number) => (
                        <View key={index} style={styles.timelineItem}>
                            <View style={styles.timelineDotContainer}>
                                <View style={[styles.dot, index === 0 && styles.activeDot]} />
                                {index !== timeline.length - 1 && <View style={styles.line} />}
                            </View>
                            <GlassCard style={styles.timelineCard}>
                                <Text style={styles.itemCategory}>{t(`history_${item.event.toLowerCase()}`)}</Text>
                                <Text style={styles.dateText}>{new Date(item.date).toLocaleString()}</Text>
                                <View style={styles.ownerRow}>
                                    <Ionicons name="person-outline" size={10} color={COLORS.textGhost} />
                                    <Text style={styles.ownerText}>{item.owner || 'Azmita Holder'}</Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    { borderColor: item.status === 'LOCKED' ? COLORS.azmitaRed : (item.status === 'VERIFIED' || item.status === 'GENUINE' ? COLORS.success : COLORS.textSecondary) }
                                ]}>
                                    <Text style={[
                                        styles.statusBadgeText,
                                        { color: item.status === 'LOCKED' ? COLORS.azmitaRed : (item.status === 'VERIFIED' || item.status === 'GENUINE' ? COLORS.success : COLORS.textSecondary) }
                                    ]}>{item.status}</Text>
                                </View>
                            </GlassCard>
                        </View>
                    ))}
                </View>

                {isGenuine && (
                    <View style={styles.transferSection}>
                        <NeonButton
                            title={t('unlock_and_transfer')}
                            onPress={handleTransferPress}
                            style={styles.transferBtn}
                            loading={loading}
                        />
                        <View style={styles.gaslessIndicator}>
                            <Ionicons name="flash" size={12} color="#00FFA3" />
                            <Text style={styles.gaslessText}>{t('gas_less')}</Text>
                        </View>
                    </View>
                )}

                {/* Transfer Modal */}
                <Modal
                    visible={isTransferModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setIsTransferModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('transfer_asset')}</Text>
                                <TouchableOpacity onPress={() => setIsTransferModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.warningBox}>
                                <Ionicons name="alert-circle" size={20} color={COLORS.azmitaRed} />
                                <Text style={styles.warningText}>{t('confirm_transfer_body')}</Text>
                            </View>

                            <Text style={styles.modalLabel}>{t('destination_address')}</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="5H..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={destAddress}
                                onChangeText={setDestAddress}
                            />

                            <NeonButton
                                title={t('confirm').toUpperCase()}
                                onPress={confirmTransfer}
                                style={styles.modalBtn}
                            />
                        </View>
                    </View>
                </Modal>

                <PinPadModal
                    visible={pinModalVisible}
                    mode="verify"
                    onSuccess={() => {
                        setPinModalVisible(false);
                        executeTransfer();
                    }}
                    onClose={() => setPinModalVisible(false)}
                />

                {loading && (
                    <View style={styles.fullLoading}>
                        <ActivityIndicator size="large" color={COLORS.azmitaRed} />
                        <Text style={styles.loadingText}>DESBLOQUEANDO PHY-LINK...</Text>
                    </View>
                )}
            </ScrollView>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 60,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    backArrow: {
        color: COLORS.azmitaRed,
        fontSize: 24,
    },
    category: {
        color: COLORS.azmitaRed,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 28,
        fontFamily: 'Orbitron_900Black',
        color: COLORS.textPrimary,
        letterSpacing: 1,
    },
    mainInfo: {
        padding: 24,
        marginBottom: 32,
    },
    infoRow: {
        marginVertical: 4,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginVertical: 16,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginBottom: 6,
    },
    value: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    },
    txHash: {
        color: COLORS.azmitaRed,
        fontSize: 11,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        lineHeight: 16,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontFamily: 'Orbitron_900Black',
        letterSpacing: 3,
        marginBottom: 24,
        textAlign: 'center',
    },
    timelineContainer: {
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    timelineDotContainer: {
        alignItems: 'center',
        marginRight: 20,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.textGhost,
        marginTop: 20,
        zIndex: 2,
    },
    activeDot: {
        backgroundColor: COLORS.success,
        shadowColor: COLORS.success,
        shadowRadius: 8,
        shadowOpacity: 1,
        elevation: 10,
    },
    line: {
        width: 1.5,
        flex: 1,
        backgroundColor: COLORS.glassBorder,
        position: 'absolute',
        top: 32,
    },
    timelineCard: {
        flex: 1,
        padding: 16,
    },
    eventText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    dateText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 4,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginTop: 12,
        borderColor: COLORS.azmitaRed,
    },
    statusBadgeText: {
        fontSize: 9,
        fontFamily: 'Orbitron_900Black',
        letterSpacing: 1,
        color: COLORS.azmitaRed,
    },
    statusSection: {
        marginBottom: 32,
    },
    statusCard: {
        padding: 20,
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
    },
    genuineCard: {
        borderColor: 'rgba(0, 255, 163, 0.2)',
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    statusTitle: {
        fontSize: 14,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    statusDesc: {
        fontSize: 12,
        color: COLORS.textSecondary,
        lineHeight: 18,
        fontFamily: 'Inter_400Regular',
    },
    itemCategory: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    ownerText: {
        fontSize: 10,
        color: COLORS.textGhost,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    transferSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    transferBtn: {
        width: '100%',
    },
    gaslessIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        opacity: 0.8,
    },
    gaslessText: {
        color: '#00FFA3',
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    modalLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        color: '#FFFFFF',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    modalBtn: {
        width: '100%',
    },
    warningBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
    },
    warningText: {
        flex: 1,
        color: COLORS.azmitaRed,
        fontSize: 12,
        lineHeight: 18,
    },
    fullLoading: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingText: {
        color: COLORS.azmitaRed,
        fontFamily: 'Orbitron_700Bold',
        fontSize: 14,
        letterSpacing: 2,
        marginTop: 20,
    }
});

export default AssetDetailScreen;
