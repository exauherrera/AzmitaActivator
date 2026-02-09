import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    Linking,
    Platform,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import { QRScannerModal } from '../components/QRScannerModal';
import { COLORS } from '../theme/colors';
import blockchainService, { NETWORKS } from '../services/blockchainService';
import { useFocusEffect } from '@react-navigation/native';
import { PinPadModal } from '../components/PinPadModal';
import securityService from '../services/securityService';

interface Transaction {
    hash: string;
    type: 'sent' | 'received';
    amount: string;
    timestamp: number;
    from?: string;
    to?: string;
}

const WalletScreen = () => {
    const { t } = useTranslation();
    const [walletAddress, setWalletAddress] = useState('');
    const [balance, setBalance] = useState('0.00');
    const [tokenSymbol, setTokenSymbol] = useState('AZM');
    const [selectedRpc, setSelectedRpc] = useState(NETWORKS.mainnet.rpc);
    const [loadingBalance, setLoadingBalance] = useState(false);

    // Modals
    const [receiveVisible, setReceiveVisible] = useState(false);
    const [sendVisible, setSendVisible] = useState(false);
    const [qrScannerVisible, setQrScannerVisible] = useState(false);

    // Send Form
    const [recipientAddress, setRecipientAddress] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [estimatedFee, setEstimatedFee] = useState('0.00');
    const [feeFloat, setFeeFloat] = useState(0);
    const [isCalculatingFee, setIsCalculatingFee] = useState(false);
    const [sending, setSending] = useState(false);

    // Security State
    const [pinModalVisible, setPinModalVisible] = useState(false);

    // Confirmation State
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [countdown, setCountdown] = useState(20);
    const [timerActive, setTimerActive] = useState(false);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (confirmVisible && timerActive) {
            setCountdown(20);
            interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        setConfirmVisible(false); // Auto-cancel
                        setTimerActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [confirmVisible, timerActive]);

    // Transactions
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useFocusEffect(
        useCallback(() => {
            loadWalletData();
        }, [])
    );

    const loadWalletData = async () => {
        try {
            const savedAddress = await AsyncStorage.getItem('user-wallet-address');
            const savedRpc = await AsyncStorage.getItem('user-selected-network');
            const rpcToUse = savedRpc || NETWORKS.mainnet.rpc;

            // PERFORMANCE: Only switch and show loading if network actually changed or not connected
            const needsSwitch = selectedRpc !== rpcToUse || !blockchainService.getNetworkConfig().symbol;

            if (needsSwitch) {
                setLoadingBalance(true);
                setSelectedRpc(rpcToUse);
                await blockchainService.switchNetwork(rpcToUse);
                setTokenSymbol(blockchainService.getNetworkConfig().symbol);
            }

            if (savedAddress) {
                setWalletAddress(savedAddress);
                // PERFORMANCE: Parallelize balance and tx fetching
                await Promise.all([
                    fetchBalance(savedAddress),
                    fetchTransactions(savedAddress)
                ]);
            } else {
                setWalletAddress('');
                setBalance('0.00');
                setTransactions([]);
            }
        } catch (error) {
            console.error('Error loading wallet data:', error);
        } finally {
            setLoadingBalance(false);
        }
    };

    const fetchBalance = async (addressOverride?: string) => {
        const addressToQuery = addressOverride || walletAddress;
        if (!addressToQuery) return;

        try {
            const { formatted, symbol } = await blockchainService.getBalance(addressToQuery);
            setBalance(formatted as string);
            setTokenSymbol(symbol as string);
        } catch (error) {
            console.error('Error fetching balance:', error);
        }
    };

    const fetchTransactions = async (addressOverride?: string) => {
        const addressToQuery = addressOverride || walletAddress;
        if (!addressToQuery) return;

        try {
            const txs = await blockchainService.getTransactions(addressToQuery);
            setTransactions(txs as any);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        }
    };

    const handleCopy = async (text: string, message: string) => {
        await Clipboard.setStringAsync(text);
        Alert.alert('✅', message);
    };

    // Fee Estimation Effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (recipientAddress.length > 5 && sendAmount) {
                setIsCalculatingFee(true);
                try {
                    if (walletAddress) {
                        const feeData = await blockchainService.getTransferFee(walletAddress, recipientAddress, sendAmount);
                        setEstimatedFee(feeData.formatted);
                        setFeeFloat(feeData.float);
                    }
                } catch (e) {
                    console.warn('Fee calc error', e);
                } finally {
                    setIsCalculatingFee(false);
                }
            } else {
                setEstimatedFee('0.00');
                setFeeFloat(0);
            }
        }, 800); // 800ms debounce

        return () => clearTimeout(timer);
    }, [recipientAddress, sendAmount, walletAddress]);

    const handleSendMax = () => {
        const maxAmount = parseFloat(balance) - feeFloat;
        if (maxAmount > 0) {
            setSendAmount(maxAmount.toFixed(4));
        } else {
            setSendAmount('0.00');
        }
    };

    const executeSendTransaction = async () => {
        setSending(true);
        try {
            const mnemonic = await AsyncStorage.getItem('user-wallet-mnemonic');
            if (!mnemonic) {
                Alert.alert(t('error'), t('seed_not_found'));
                return;
            }

            const result = await blockchainService.sendTransfer(
                mnemonic,
                recipientAddress,
                sendAmount,
                walletAddress // Security Check
            );

            if (result.success) {
                // Clear form fields for next transaction
                setRecipientAddress('');
                setSendAmount('');
                setEstimatedFee('0.00');
                setFeeFloat(0);

                Alert.alert(
                    '✅ ' + t('transaction_sent'),
                    `Hash: ${result.txHash.substring(0, 10)}...`,
                    [
                        {
                            text: t('view_on_subscan'),
                            onPress: () => openSubscan(result.txHash),
                        },
                        { text: t('ok') },
                    ]
                );

                // Update balance and transactions
                fetchBalance(walletAddress);
                fetchTransactions(walletAddress);
            } else {
                Alert.alert(t('error'), result.error || t('transaction_failed'));
            }
        } catch (error: any) {
            Alert.alert(t('error'), error.message || t('transaction_failed'));
        } finally {
            setSending(false);
        }
    };

    const handleSendTransaction = async () => {
        if (!recipientAddress || !sendAmount) {
            Alert.alert(t('error'), t('fill_all_fields'));
            return;
        }

        const amount = parseFloat(sendAmount);
        const totalCost = amount + feeFloat;

        if (totalCost > parseFloat(balance)) {
            Alert.alert(t('error'), `${t('insufficient_balance')} (Req: ${totalCost.toFixed(4)} ${tokenSymbol})`);
            return;
        }

        // 1. Check PIN first if security enabled
        const shouldAskPin = await securityService.shouldAskPin('send_funds');
        if (shouldAskPin) {
            setPinModalVisible(true);
        } else {
            // 2. No PIN needed, go valid confirm
            setConfirmVisible(true);
            setTimerActive(true);
        }
    };

    const openSubscan = (txHash: string) => {
        const config = blockchainService.getNetworkConfig();
        const baseUrl = config.explorer.startsWith('http') ? config.explorer : `https://${config.explorer}`;
        Linking.openURL(`${baseUrl}/extrinsic/${txHash}`);
    };

    const getNetworkInfo = () => {
        const config = blockchainService.getNetworkConfig();
        const allNets = Object.values(NETWORKS);

        let relayName = config.name;
        let pName = null;

        // Find if this RPC belongs to a parachain
        for (const relay of allNets) {
            const para = relay.parachains?.find(p => p.rpc === selectedRpc);
            if (para) {
                relayName = relay.name;
                pName = para.name;
                break;
            }
        }

        return {
            name: relayName,
            parachain: pName,
            symbol: config.symbol
        };
    };

    return (
        <ScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('wallet')}</Text>
                    <TouchableOpacity onPress={() => {
                        fetchBalance(walletAddress);
                        fetchTransactions(walletAddress);
                    }}>
                        <Ionicons name="refresh-circle-outline" size={28} color={COLORS.azmitaRed} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* Balance Card */}
                    <Animated.View entering={FadeIn}>
                        <GlassCard style={styles.balanceCard}>
                            <View style={styles.balanceHeaderSmall}>
                                <Text style={styles.balanceLabel}>{t('total_balance')}</Text>
                                <View style={styles.currencyBadge}>
                                    <Text style={styles.currencyBadgeText}>{tokenSymbol}</Text>
                                </View>
                            </View>
                            <Text style={styles.balanceValue} adjustsFontSizeToFit numberOfLines={1}>
                                {loadingBalance ? '...' : balance}
                            </Text>
                            <View style={styles.networkBadge}>
                                <View style={styles.statusDot} />
                                <Text style={styles.networkText}>{getNetworkInfo().parachain || getNetworkInfo().name}</Text>
                            </View>
                        </GlassCard>
                    </Animated.View>

                    {/* Action Buttons */}
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionButton} onPress={() => setReceiveVisible(true)}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 255, 163, 0.1)' }]}>
                                <Ionicons name="arrow-down" size={24} color="#00FFA3" />
                            </View>
                            <Text style={styles.actionText}>{t('receive')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionButton} onPress={() => setSendVisible(true)}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(230, 57, 70, 0.1)' }]}>
                                <Ionicons name="arrow-up" size={24} color={COLORS.azmitaRed} />
                            </View>
                            <Text style={styles.actionText}>{t('send')}</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Recent Transactions */}
                    <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('recent_transactions')}</Text>
                        {transactions.length === 0 ? (
                            <GlassCard style={styles.emptyCard}>
                                <Ionicons name="receipt-outline" size={48} color={COLORS.textSecondary} />
                                <Text style={styles.emptyText}>No hay transacciones recientes</Text>
                            </GlassCard>
                        ) : (
                            transactions.map((tx, index) => (
                                <GlassCard key={index} style={styles.txCard}>
                                    <View style={styles.txHeader}>
                                        <View style={styles.txIcon}>
                                            <Ionicons
                                                name={tx.type === 'sent' ? 'arrow-up' : 'arrow-down'}
                                                size={20}
                                                color={tx.type === 'sent' ? COLORS.azmitaRed : '#00FFA3'}
                                            />
                                        </View>
                                        <View style={styles.txInfo}>
                                            <Text style={styles.txType}>
                                                {tx.type === 'sent' ? 'Enviado' : 'Recibido'}
                                            </Text>
                                            <Text style={styles.txHash} numberOfLines={1}>
                                                {tx.hash.substring(0, 16)}...
                                            </Text>
                                        </View>
                                        <Text style={styles.txAmount}>
                                            {tx.type === 'sent' ? '-' : '+'}
                                            {tx.amount} {tokenSymbol}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.subscanBtn}
                                        onPress={() => openSubscan(tx.hash)}
                                    >
                                        <Text style={styles.subscanText}>{t('view_on_subscan')}</Text>
                                        <Ionicons name="open-outline" size={14} color={COLORS.azmitaRed} />
                                    </TouchableOpacity>
                                </GlassCard>
                            ))
                        )}
                    </Animated.View>
                </ScrollView>

                {/* Receive Modal */}
                <Modal visible={receiveVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('receive')}</Text>
                                <TouchableOpacity onPress={() => setReceiveVisible(false)}>
                                    <Ionicons name="close" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                <View style={styles.qrContainer}>
                                    {walletAddress ? (
                                        <QRCode value={walletAddress} size={200} backgroundColor="transparent" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.emptyText}>No hay dirección disponible</Text>
                                    )}
                                </View>

                                <Text style={styles.addressLabel}>{t('your_address')}</Text>
                                <TouchableOpacity
                                    style={styles.addressBox}
                                    onPress={() => handleCopy(walletAddress, t('copy_address'))}
                                >
                                    <Text style={styles.addressText} numberOfLines={1}>
                                        {walletAddress}
                                    </Text>
                                    <Ionicons name="copy-outline" size={20} color={COLORS.azmitaRed} />
                                </TouchableOpacity>

                                <NeonButton
                                    title={t('copy_address')}
                                    onPress={() => handleCopy(walletAddress, t('copy_address'))}
                                    style={styles.copyBtn}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                {/* Send Modal */}
                <Modal visible={sendVisible} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <View>
                                    <Text style={styles.modalTitle}>{t('send_tokens')}</Text>
                                    <View style={styles.networkInfoBox}>
                                        <View style={styles.networkDot} />
                                        <Text style={styles.networkNameText}>
                                            {getNetworkInfo().name}
                                            {getNetworkInfo().parachain && (
                                                <Text style={styles.parachainText}> • {getNetworkInfo().parachain}</Text>
                                            )}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => setSendVisible(false)}>
                                    <Ionicons name="close" size={24} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <GlassCard style={styles.recipientCard}>
                                    <View style={styles.inputHeader}>
                                        <Text style={styles.inputLabel}>{t('recipient_address')}</Text>
                                        <View style={styles.fieldToolbar}>
                                            {recipientAddress.length > 0 && (
                                                <TouchableOpacity onPress={() => setRecipientAddress('')} style={styles.toolbarBtn}>
                                                    <MaterialCommunityIcons name="broom" size={16} color={COLORS.azmitaRed} />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity onPress={async () => {
                                                const content = await Clipboard.getStringAsync();
                                                if (content) setRecipientAddress(content);
                                            }} style={styles.toolbarBtn}>
                                                <Ionicons name="clipboard-outline" size={16} color={COLORS.textSecondary} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => setQrScannerVisible(true)} style={[styles.toolbarBtn, styles.accentToolbarBtn]}>
                                                <Ionicons name="qr-code-outline" size={16} color={COLORS.azmitaRed} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        value={recipientAddress}
                                        onChangeText={setRecipientAddress}
                                        placeholder={t('enter_address')}
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        autoCapitalize="none"
                                        multiline={true}
                                        numberOfLines={2}
                                        textAlignVertical="top"
                                    />
                                </GlassCard>

                                <GlassCard style={styles.amountCard}>
                                    <View style={styles.amountHeader}>
                                        <Text style={styles.inputLabel}>{t('amount')}</Text>
                                        <View style={styles.fieldToolbar}>
                                            {sendAmount.length > 0 && (
                                                <TouchableOpacity style={styles.toolbarBtn} onPress={() => setSendAmount('')}>
                                                    <MaterialCommunityIcons name="broom" size={14} color={COLORS.azmitaRed} />
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity style={[styles.toolbarBtn, styles.accentToolbarBtn]} onPress={handleSendMax}>
                                                <Text style={styles.maxTextSmall}>MAX</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.amountInputRow}>
                                        <TextInput
                                            style={styles.amountInput}
                                            value={sendAmount}
                                            onChangeText={setSendAmount}
                                            placeholder="0.00"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            keyboardType="decimal-pad"
                                        />
                                        <View style={styles.currencyBadgeSmall}>
                                            <Text style={styles.currencyTextSmall}>{tokenSymbol}</Text>
                                        </View>
                                    </View>
                                </GlassCard>

                                <View style={styles.feeRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.feeLabel}>{t('available_balance')}:</Text>
                                        <View style={[styles.currencyBadge, { marginLeft: 8, paddingVertical: 2 }]}>
                                            <Text style={[styles.currencyBadgeText, { fontSize: 8 }]}>{tokenSymbol}</Text>
                                        </View>
                                    </View>
                                    <View>
                                        <Text style={styles.feeValue} adjustsFontSizeToFit numberOfLines={1}>
                                            {balance}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.feeRow}>
                                    <Text style={styles.feeLabel}>{t('estimated_fee') || 'Comisión Estimada'}:</Text>
                                    <Text style={styles.feeValue}>
                                        {isCalculatingFee ? '...' : `~${estimatedFee} ${tokenSymbol}`}
                                    </Text>
                                </View>

                                {sendAmount ? (
                                    <View style={[styles.feeRow, { borderBottomWidth: 0, marginTop: 5 }]}>
                                        <Text style={[styles.feeLabel, { fontWeight: 'bold', color: COLORS.azmitaRed }]}>TOTAL:</Text>
                                        <Text style={[styles.feeValue, { fontSize: 16, color: COLORS.azmitaRed }]}>
                                            {(parseFloat(sendAmount || '0') + feeFloat).toFixed(4)} {tokenSymbol}
                                        </Text>
                                    </View>
                                ) : null}

                                <NeonButton
                                    title={sending ? 'Enviando...' : t('confirm_send')}
                                    onPress={handleSendTransaction}
                                    style={styles.sendBtn}
                                    titleStyle={{ fontSize: 14 }}
                                    disabled={sending}
                                />
                            </ScrollView>
                        </View>
                    </View>
                </Modal>

                <QRScannerModal
                    visible={qrScannerVisible}
                    onClose={() => setQrScannerVisible(false)}
                    onScan={(data) => {
                        setRecipientAddress(data);
                        setQrScannerVisible(false);
                    }}
                />

                <PinPadModal
                    visible={pinModalVisible}
                    mode="verify"
                    onSuccess={async (pin) => {
                        // VERIFY PIN HERE
                        if (pin) {
                            const isValid = await securityService.verifyPin(pin);
                            if (isValid) {
                                setPinModalVisible(false);
                                setConfirmVisible(true);
                                setTimerActive(true);
                            } else {
                                Alert.alert(t('error'), t('pin_incorrect'));
                            }
                        }
                    }}
                    onClose={() => {
                        setPinModalVisible(false);
                    }}
                />

                {/* Confirmation Modal */}
                <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { alignItems: 'center' }]}>
                            <Ionicons name="finger-print-outline" size={50} color={COLORS.azmitaRed} style={{ marginBottom: 20 }} />
                            <Text style={styles.modalTitle}>{t('confirm_transaction')}</Text>

                            <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginBottom: 5 }}>Enviando a:</Text>
                            <Text style={{ color: '#FFFFFF', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12, marginBottom: 20 }}>
                                {recipientAddress}
                            </Text>

                            <Text style={{ color: '#FFFFFF', fontSize: 32, fontFamily: 'Orbitron_700Bold', marginBottom: 5 }}>
                                {sendAmount} {tokenSymbol}
                            </Text>
                            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 30 }}>
                                + {estimatedFee} {tokenSymbol} (Fee)
                            </Text>

                            <View style={{ marginBottom: 30 }}>
                                <Text style={{ color: COLORS.azmitaRed, fontSize: 40, fontFamily: 'Orbitron_700Bold', textAlign: 'center' }}>
                                    {countdown}s
                                </Text>
                            </View>

                            <NeonButton
                                title={sending ? "Procesando..." : "ENVIAR AHORA"}
                                onPress={executeSendTransaction}
                                style={{ width: '100%', marginBottom: 15 }}
                                disabled={sending}
                            />

                            <TouchableOpacity onPress={() => { setConfirmVisible(false); setTimerActive(false); }}>
                                <Text style={{ color: COLORS.textSecondary, fontFamily: 'Orbitron_700Bold' }}>CANCELAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        marginTop: 60,
        paddingHorizontal: 20,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        letterSpacing: 2,
    },
    scroll: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    balanceCard: {
        padding: 30,
        alignItems: 'center',
        marginBottom: 25,
    },
    balanceLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 2,
        marginBottom: 10,
    },
    balanceValue: {
        fontSize: 42,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        marginBottom: 15,
    },
    currency: {
        fontSize: 24,
        color: COLORS.azmitaRed,
    },
    balanceHeaderSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    currencyBadge: {
        backgroundColor: COLORS.azmitaRed,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginLeft: 10,
    },
    currencyBadgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    networkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 163, 0.2)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00FFA3',
        marginRight: 8,
    },
    networkText: {
        color: '#00FFA3',
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 30,
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        gap: 10,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 15,
    },
    emptyCard: {
        padding: 40,
        alignItems: 'center',
        gap: 15,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
    },
    txCard: {
        padding: 16,
        marginBottom: 12,
    },
    txHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    txIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    txInfo: {
        flex: 1,
    },
    txType: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    txHash: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    txAmount: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Orbitron_700Bold',
    },
    subscanBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    subscanText: {
        color: COLORS.azmitaRed,
        fontSize: 11,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderRadius: 25,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
        maxHeight: '90%',
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
        fontSize: 20,
        letterSpacing: 1,
    },
    qrContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        marginBottom: 20,
    },
    addressLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 15,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    addressText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginRight: 10,
    },
    copyBtn: {
        marginTop: 10,
    },
    inputLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 15,
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    maxBtn: {
        backgroundColor: COLORS.azmitaRed,
        paddingHorizontal: 15,
        paddingVertical: 15,
        borderRadius: 12,
        minWidth: 70,
        alignItems: 'center',
    },
    maxText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
    },
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    feeLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    feeValue: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
    },
    sendBtn: {
        marginTop: 25,
    },
    networkInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    networkNameText: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        letterSpacing: 0.5,
    },
    networkDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00FFA3',
        marginRight: 6,
    },
    parachainText: {
        color: COLORS.azmitaRed,
    },
    recipientCard: {
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    amountCard: {
        padding: 15,
        marginBottom: 15,
        backgroundColor: 'rgba(230, 57, 70, 0.05)',
        borderColor: 'rgba(230, 57, 70, 0.2)',
        borderWidth: 1,
    },
    amountHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    inputHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    fieldToolbar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        padding: 4,
        gap: 4,
    },
    toolbarBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    accentToolbarBtn: {
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        borderColor: 'rgba(230, 57, 70, 0.2)',
        borderWidth: 1,
    },
    qrButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    maxTextSmall: {
        color: COLORS.azmitaRed,
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
    },
    amountInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Orbitron_700Bold',
    },
    currencyBadgeSmall: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    currencyTextSmall: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
    },
});

export default WalletScreen;
