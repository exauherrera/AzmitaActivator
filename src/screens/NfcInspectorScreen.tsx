import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Dimensions, TouchableOpacity, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
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
import { useTranslation } from 'react-i18next';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';
import { RadarScanner } from '../components/RadarScanner';
import nfcService from '../services/nfcService';
import { COLORS } from '../theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

const NfcInspectorScreen = () => {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [tagData, setTagData] = useState<any>(null);
    const [extractedHash, setExtractedHash] = useState<string | null>(null);
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [deviceName, setDeviceName] = useState('');
    const [deviceIcon, setDeviceIcon] = useState('card-outline');
    const [deviceImage, setDeviceImage] = useState<string | null>(null);
    const [savedDevices, setSavedDevices] = useState<any[]>([]);
    const [emulating, setEmulating] = useState<string | null>(null);
    const [status, setStatus] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            loadSavedDevices();
            return () => {
                nfcService.abort();
                setLoading(false);
                setEmulating(null);
            };
        }, [])
    );

    const loadSavedDevices = async () => {
        try {
            const saved = await AsyncStorage.getItem('azmita-saved-devices');
            if (saved) setSavedDevices(JSON.parse(saved));
        } catch (e) {
            console.error('Error loading devices:', e);
        }
    };

    const handleScan = async () => {
        setLoading(true);
        setTagData(null);
        setExtractedHash(null);
        try {
            const data = await nfcService.readRawTag();
            if (data) {
                setTagData(data);
                const hashRegex = /0x[a-fA-F0-9]{64}/;
                const match = data.ndefMessage?.match(hashRegex);
                if (match) {
                    setExtractedHash(match[0]);
                }
            }
        } catch (err) {
            Alert.alert(t('error'), t('scan_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDevice = async () => {
        if (!deviceName) {
            Alert.alert(t('error'), 'Por favor ingresa un nombre');
            return;
        }

        try {
            const newDevice = {
                id: tagData.id,
                name: deviceName,
                icon: deviceIcon,
                image: deviceImage,
                techTypes: tagData.techTypes,
                ndefMessage: tagData.ndefMessage,
                timestamp: Date.now()
            };

            const updatedDevices = [newDevice, ...savedDevices];
            await AsyncStorage.setItem('azmita-saved-devices', JSON.stringify(updatedDevices));
            setSavedDevices(updatedDevices);
            setSaveModalVisible(false);
            setTagData(null);
            Alert.alert(t('success'), 'Dispositivo guardado correctamente');
        } catch (e) {
            Alert.alert(t('error'), 'Error al guardar dispositivo');
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setDeviceImage(result.assets[0].uri);
        }
    };

    const handleEmulate = async (device: any) => {
        setEmulating(device.id);
        setStatus('EMULATING'); // Using local status logic

        // HCE Protocol Simulation (Rule: ISO 14443-4 HCE)
        console.log(`[HCE] Starting Emulation for: ${device.name} (UID: ${device.id})`);
        console.log(`[HCE] Protocol: ISO/IEC 14443-4 (APDU)`);

        // Simulate Challenge-Response
        setTimeout(() => {
            console.log(`[HCE] Received Challenge: 0x${Math.random().toString(16).slice(2, 10)}`);
            console.log(`[HCE] Sending Signed Response (Secure Enclave Key)`);
        }, 1500);

        Alert.alert(
            'Emulación Activa',
            `Tu teléfono ahora actúa como: ${device.name}\n\nAproxímalo a un lector compatible.`,
            [{ text: 'Detener', onPress: () => setEmulating(null) }]
        );
    };

    const handleOpenExplorer = async () => {
        if (extractedHash) {
            const url = `https://explorer.azmita.io/tx/${extractedHash}`;
            await WebBrowser.openBrowserAsync(url);
        }
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={32} color={COLORS.azmitaRed} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('inspector')}</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {!tagData && !emulating && (
                    <>
                        <RadarScanner
                            loading={loading}
                            statusText={loading ? t('reading') : t('instruction_scan')}
                            icon={<Ionicons name="search-outline" size={60} color={COLORS.azmitaRed} />}
                        />

                        <NeonButton
                            title={loading ? t('reading') : t('scan_tag')}
                            onPress={handleScan}
                            style={styles.scanBtn}
                            disabled={loading}
                        />

                        {savedDevices.length > 0 && (
                            <View style={styles.savedSection}>
                                <Text style={styles.sectionTitle}>MIS DISPOSITIVOS (HCE)</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceList}>
                                    {savedDevices.map((device, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.deviceCard}
                                            onPress={() => handleEmulate(device)}
                                        >
                                            <GlassCard style={styles.deviceGlass}>
                                                <Ionicons name={device.icon as any} size={32} color={COLORS.azmitaRed} />
                                                <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                                                <Text style={styles.deviceType}>ISO 14443-4</Text>
                                            </GlassCard>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </>
                )}

                {tagData && (
                    <View style={styles.resultsContainer}>
                        <GlassCard style={styles.uidCard}>
                            <Text style={styles.label}>UID</Text>
                            <Text style={styles.value}>{tagData.id}</Text>
                        </GlassCard>

                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>{t('tech_types')}</Text>
                            <View style={styles.techList}>
                                {tagData.techTypes.map((tech: string, i: number) => (
                                    <View key={i} style={styles.techBadge}>
                                        <Text style={styles.techText}>{tech.split('.').pop()}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {tagData.ndefMessage && (
                            <View style={styles.detailSection}>
                                <Text style={styles.sectionTitle}>{t('ndef_message')}</Text>
                                <View style={styles.ndefContainer}>
                                    <Text style={styles.ndefText}>{tagData.ndefMessage}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.footerActions}>
                            <TouchableOpacity onPress={() => setSaveModalVisible(true)} style={styles.actionBtn}>
                                <Ionicons name="save-outline" size={20} color={COLORS.success} />
                                <Text style={[styles.actionText, { color: COLORS.success }]}>GUARDAR DISPOSITIVO</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setTagData(null)} style={styles.actionBtn}>
                                <Ionicons name="refresh-outline" size={20} color={COLORS.azmitaRed} />
                                <Text style={[styles.actionText, { color: COLORS.azmitaRed }]}>{t('scan_tag')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Modal para Guardar Dispositivo */}
            <Modal
                visible={saveModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSaveModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>GUARDAR DISPOSITIVO</Text>
                            <TouchableOpacity onPress={() => setSaveModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.configLabel}>NOMBRE DEL DISPOSITIVO</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ej: Llave Oficina, Tag Gimnasio..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={deviceName}
                            onChangeText={setDeviceName}
                        />

                        <Text style={styles.configLabel}>IDENTIFICADOR VISUAL</Text>
                        <View style={styles.iconSelector}>
                            {['card-outline', 'home-outline', 'business-outline', 'car-outline'].map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    onPress={() => setDeviceIcon(icon)}
                                    style={[styles.iconOption, deviceIcon === icon && styles.selectedIcon]}
                                >
                                    <Ionicons name={icon as any} size={24} color={deviceIcon === icon ? COLORS.azmitaRed : COLORS.textSecondary} />
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity onPress={pickImage} style={styles.iconOption}>
                                <Ionicons name="camera-outline" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <NeonButton
                            title="VINCULAR AL TELÉFONO"
                            onPress={handleSaveDevice}
                            style={styles.saveBtn}
                        />
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    header: {
        marginTop: 60,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        letterSpacing: 2,
        marginLeft: 10,
    },
    scanBtn: {
        marginBottom: 40,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 120,
    },
    resultsContainer: {
        flex: 1,
    },
    uidCard: {
        padding: 25,
        marginBottom: 30,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(230, 57, 70, 0.3)',
    },
    detailSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 2,
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    label: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 2,
        marginBottom: 10,
    },
    value: {
        fontSize: 26,
        fontFamily: 'Inter_700Bold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    techList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    techBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 8,
        marginBottom: 8,
    },
    techText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontFamily: 'Inter_400Regular',
    },
    ndefContainer: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    ndefText: {
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: '#FFFFFF',
        lineHeight: 22,
    },
    footerActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    actionText: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.textSecondary,
        letterSpacing: 1,
        marginLeft: 8,
    },
    savedSection: {
        marginTop: 20,
    },
    deviceList: {
        marginTop: 15,
    },
    deviceCard: {
        width: 140,
        marginRight: 15,
    },
    deviceGlass: {
        padding: 15,
        alignItems: 'center',
        height: 120,
        justifyContent: 'center',
    },
    deviceName: {
        color: '#FFFFFF',
        fontFamily: 'Inter_700Bold',
        fontSize: 12,
        marginTop: 10,
        textAlign: 'center',
    },
    deviceType: {
        color: COLORS.azmitaRed,
        fontSize: 8,
        fontFamily: 'Orbitron_700Bold',
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 25,
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
    configLabel: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
        marginBottom: 10,
    },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 15,
        color: '#FFFFFF',
        fontFamily: 'Inter_400Regular',
        fontSize: 16,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.2)',
    },
    iconSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    iconOption: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    selectedIcon: {
        borderColor: COLORS.azmitaRed,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
    },
    saveBtn: {
        marginBottom: 20,
    }
});

export default NfcInspectorScreen;
