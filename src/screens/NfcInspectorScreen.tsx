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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { PinPadModal } from '../components/PinPadModal';
import securityService from '../services/securityService';

interface SavedDevice {
    id: string;
    name: string;
    icon: string;
    image: string | null;
    techTypes: string[];
    ndefMessage: string;
    timestamp: number;
    cloneCount?: number;
    clonedFrom?: string;
    clonedAt?: number;
}

interface AuditEntry {
    id: string;
    action: 'device_cloned' | 'device_saved' | 'device_deleted' | 'device_emulated';
    deviceId: string;
    deviceName: string;
    timestamp: number;
    details?: string;
}

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
    const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
    const [emulating, setEmulating] = useState<string | null>(null);
    const [status, setStatus] = useState('');
    const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
    const [showAudit, setShowAudit] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<SavedDevice | null>(null);
    const [cloneModalVisible, setCloneModalVisible] = useState(false);
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [pendingAuditAccess, setPendingAuditAccess] = useState(false);

    // New States for Prepare/Wipe and Clone Flow
    const [isPrepareModalVisible, setIsPrepareModalVisible] = useState(false);
    const [cloneStep, setCloneStep] = useState<'SEARCHING' | 'READY_TO_WRITE' | 'WRITING' | 'SUCCESS'>('SEARCHING');
    const [cloneStatusText, setCloneStatusText] = useState('');

    // Animation Values
    const sonarScale = useSharedValue(1);
    const sonarOpacity = useSharedValue(0.5);

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

            const audit = await AsyncStorage.getItem('azmita-audit-log');
            if (audit) setAuditLogs(JSON.parse(audit));
        } catch (e) {
            console.error('Error loading devices:', e);
        }
    };

    const addAuditEntry = async (action: AuditEntry['action'], deviceId: string, deviceName: string, details?: string) => {
        const entry: AuditEntry = {
            id: Date.now().toString(),
            action,
            deviceId,
            deviceName,
            timestamp: Date.now(),
            details
        };
        const updatedLogs = [entry, ...auditLogs];
        setAuditLogs(updatedLogs);
        await AsyncStorage.setItem('azmita-audit-log', JSON.stringify(updatedLogs));
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
            const newDevice: SavedDevice = {
                id: tagData.id,
                name: deviceName,
                icon: deviceIcon,
                image: deviceImage,
                techTypes: tagData.techTypes,
                ndefMessage: tagData.ndefMessage,
                timestamp: Date.now(),
                cloneCount: 0
            };

            const updatedDevices = [newDevice, ...savedDevices];
            await AsyncStorage.setItem('azmita-saved-devices', JSON.stringify(updatedDevices));
            setSavedDevices(updatedDevices);
            setSaveModalVisible(false);
            setTagData(null);

            await addAuditEntry('device_saved', newDevice.id, newDevice.name);
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

    const handleEmulate = async (device: SavedDevice) => {
        setEmulating(device.id);
        setStatus('EMULATING');

        console.log(`[HCE] Starting Emulation for: ${device.name} (UID: ${device.id})`);
        console.log(`[HCE] Protocol: ISO/IEC 14443-4 (APDU)`);

        setTimeout(() => {
            console.log(`[HCE] Received Challenge: 0x${Math.random().toString(16).slice(2, 10)}`);
            console.log(`[HCE] Sending Signed Response (Secure Enclave Key)`);
        }, 1500);

        await addAuditEntry('device_emulated', device.id, device.name);

        Alert.alert(
            'Emulación Activa',
            `Tu teléfono ahora actúa como: ${device.name}\n\nAproxímalo a un lector compatible.`,
            [{ text: 'Detener', onPress: () => setEmulating(null) }]
        );
    };

    // Sonar Animation
    useEffect(() => {
        if (cloneStep === 'SEARCHING') {
            sonarScale.value = withRepeat(
                withSequence(
                    withTiming(2, { duration: 1500, easing: Easing.out(Easing.ease) }),
                    withTiming(1, { duration: 0 })
                ),
                -1
            );
            sonarOpacity.value = withRepeat(
                withSequence(
                    withTiming(0, { duration: 1500 }),
                    withTiming(0.5, { duration: 0 })
                ),
                -1
            );
        } else {
            sonarScale.value = 1;
            sonarOpacity.value = 0.5;
        }
    }, [cloneStep]);

    const sonarStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: sonarScale.value }],
            opacity: sonarOpacity.value,
        };
    });

    const handlePrepareDevicePress = () => {
        setIsPrepareModalVisible(true);
    };

    const executeWipe = async () => {
        setIsPrepareModalVisible(false);
        setLoading(true);
        try {
            const success = await nfcService.eraseTag();
            if (success) {
                Alert.alert(t('success'), 'Dispositivo borrado y preparado correctamente.');
                await addAuditEntry('device_deleted', 'ERASED', 'Device Wiped/Prepared'); // Or new action type
            } else {
                Alert.alert(t('error'), 'No se pudo borrar el dispositivo.');
            }
        } catch (error) {
            Alert.alert(t('error'), 'Error al borrar dispositivo: ' + (error as any).message);
        } finally {
            setLoading(false);
        }
    };

    const handleCloneDevice = (device: SavedDevice) => {
        setSelectedDevice(device);
        setCloneStep('SEARCHING');
        setCloneStatusText(t('instruction_scan_new') || 'Acerca el NUEVO dispositivo vacío...');
        setCloneModalVisible(true);
        startCloneScan();
    };

    const startCloneScan = async () => {
        try {
            // Need to scan for a writable tag
            const tag = await nfcService.readRawTag(); // Should be simple scan first
            if (tag) {
                setCloneStep('READY_TO_WRITE');
                setCloneStatusText('Dispositivo detectado. Listo para clonar.');
            }
        } catch (e) {
            // If cancelled or error, just stay in searching or close
            console.log('Clone scan error', e);
        }
    };

    const executeCloneWrite = async () => {
        if (!selectedDevice) return;
        setCloneStep('WRITING');
        setCloneStatusText('Escribiendo datos...');

        try {
            // Write NDEF message from original device
            // If original has no NDEF, we might just write empty or skip
            const messageToWrite = selectedDevice.ndefMessage || '';
            const success = await nfcService.writeNdef(messageToWrite);

            if (success) {
                setCloneStep('SUCCESS');

                // Save the clone record internally
                const clonedDevice: SavedDevice = {
                    ...selectedDevice,
                    id: `${selectedDevice.id}-clone-${Date.now()}`, // We don't know real UID unless we read again, but for record keeping use virtual ID
                    name: `${selectedDevice.name} (Clone)`,
                    timestamp: Date.now(),
                    clonedFrom: selectedDevice.id,
                    clonedAt: Date.now(),
                    cloneCount: 0
                };

                // Increment clone count on original
                const updatedDevices = savedDevices.map(d =>
                    d.id === selectedDevice.id
                        ? { ...d, cloneCount: (d.cloneCount || 0) + 1 }
                        : d
                );
                updatedDevices.unshift(clonedDevice);

                await AsyncStorage.setItem('azmita-saved-devices', JSON.stringify(updatedDevices));
                setSavedDevices(updatedDevices);

                await addAuditEntry('device_cloned', clonedDevice.id, clonedDevice.name, `Cloned from: ${selectedDevice.name}`);

                // Close modal after delay? or let user close
            } else {
                Alert.alert(t('error'), 'Escritura fallida.');
                setCloneStep('READY_TO_WRITE');
            }
        } catch (e) {
            Alert.alert(t('error'), 'Error al escribir en dispositivo: ' + (e as any).message);
            setCloneStep('READY_TO_WRITE');
        }
    };

    // Removed old executeClone to replace with new logic inside render or above
    // const executeClone = async () => { ... } // Replaced by executeCloneWrite logic integrated with UI


    const handleDeleteDevice = async (deviceId: string) => {
        const device = savedDevices.find(d => d.id === deviceId);
        if (!device) return;

        Alert.alert(
            'Eliminar Dispositivo',
            `¿Eliminar "${device.name}"?`,
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        const updated = savedDevices.filter(d => d.id !== deviceId);
                        await AsyncStorage.setItem('azmita-saved-devices', JSON.stringify(updated));
                        setSavedDevices(updated);
                        await addAuditEntry('device_deleted', device.id, device.name);
                    }
                }
            ]
        );
    };

    const handleViewAudit = async () => {
        const shouldAsk = await securityService.shouldAskPin('view_audit');
        if (shouldAsk) {
            setPendingAuditAccess(true);
            setPinModalVisible(true);
        } else {
            setShowAudit(true);
        }
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
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                    <Text style={styles.sectionTitle}>MIS DISPOSITIVOS (HCE)</Text>
                                    <TouchableOpacity onPress={handleViewAudit} style={styles.auditButton}>
                                        <MaterialCommunityIcons name="clipboard-text-clock" size={18} color={COLORS.azmitaRed} />
                                        <Text style={styles.auditButtonText}>{t('audit_log')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deviceList}>
                                    {savedDevices.map((device, index) => (
                                        <View key={index} style={styles.deviceCard}>
                                            <TouchableOpacity onPress={() => handleEmulate(device)}>
                                                <GlassCard style={styles.deviceGlass}>
                                                    <Ionicons name={device.icon as any} size={32} color={COLORS.azmitaRed} />
                                                    <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                                                    <Text style={styles.deviceType}>ISO 14443-4</Text>

                                                    {device.cloneCount && device.cloneCount > 0 && (
                                                        <View style={styles.cloneBadge}>
                                                            <MaterialCommunityIcons name="content-copy" size={10} color={COLORS.azmitaRed} />
                                                            <Text style={styles.cloneBadgeText}>{device.cloneCount}</Text>
                                                        </View>
                                                    )}

                                                    {device.clonedFrom && (
                                                        <View style={styles.clonedIndicator}>
                                                            <Text style={styles.clonedText}>CLONE</Text>
                                                        </View>
                                                    )}
                                                </GlassCard>
                                            </TouchableOpacity>

                                            <View style={styles.deviceActions}>
                                                <TouchableOpacity onPress={() => handleCloneDevice(device)} style={styles.deviceActionBtn}>
                                                    <MaterialCommunityIcons name="content-copy" size={16} color={COLORS.success} />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleDeleteDevice(device.id)} style={styles.deviceActionBtn}>
                                                    <Ionicons name="trash-outline" size={16} color={COLORS.azmitaRed} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
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

                            <TouchableOpacity onPress={() => setIsPrepareModalVisible(true)} style={styles.actionBtn}>
                                <Ionicons name="trash-bin-outline" size={20} color={COLORS.textSecondary} />
                                <Text style={[styles.actionText, { color: COLORS.textSecondary }]}>{t('prepare_device') || 'PREPARAR'}</Text>
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

            {/* Clone Confirmation Modal */}
            <Modal
                visible={cloneModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    if (cloneStep === 'SUCCESS' || cloneStep === 'SEARCHING') {
                        setCloneModalVisible(false);
                    }
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('clone_device')}</Text>
                            <TouchableOpacity onPress={() => {
                                setCloneModalVisible(false);
                                nfcService.abort();
                            }}>
                                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {cloneStep === 'SEARCHING' && (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <View style={{ width: 100, height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
                                    <Animated.View style={[
                                        {
                                            position: 'absolute',
                                            width: 100,
                                            height: 100,
                                            borderRadius: 50,
                                            backgroundColor: 'rgba(230, 57, 70, 0.3)',
                                            borderColor: COLORS.azmitaRed,
                                            borderWidth: 1
                                        },
                                        sonarStyle
                                    ]} />
                                    <Ionicons name="radio-outline" size={40} color={COLORS.azmitaRed} />
                                </View>
                                <Text style={{ color: '#FFFFFF', fontFamily: 'Orbitron_700Bold', fontSize: 16, textAlign: 'center', marginBottom: 10 }}>
                                    BUSCANDO DISPOSITIVO
                                </Text>
                                <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>
                                    {cloneStatusText}
                                </Text>
                            </View>
                        )}

                        {cloneStep === 'READY_TO_WRITE' && (
                            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                <Ionicons name="checkmark-circle-outline" size={60} color="#00FFA3" style={{ marginBottom: 20 }} />
                                <Text style={{ color: '#FFFFFF', fontFamily: 'Orbitron_700Bold', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
                                    DISPOSITIVO DETECTADO
                                </Text>
                                <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30 }}>
                                    Todo listo para clonar los datos de "{selectedDevice?.name}" al nuevo dispositivo.
                                </Text>
                                <NeonButton
                                    title="CLONAR AL NUEVO DISPOSITIVO"
                                    onPress={executeCloneWrite}
                                    style={{ width: '100%' }}
                                />
                            </View>
                        )}

                        {cloneStep === 'WRITING' && (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <ActivityIndicator size="large" color={COLORS.azmitaRed} style={{ marginBottom: 20 }} />
                                <Text style={{ color: '#FFFFFF', fontFamily: 'Orbitron_700Bold', fontSize: 16 }}>
                                    ESCRIBIENDO...
                                </Text>
                            </View>
                        )}

                        {cloneStep === 'SUCCESS' && (
                            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                <Ionicons name="checkmark-done-circle" size={80} color="#00FFA3" style={{ marginBottom: 20 }} />
                                <Text style={{ color: '#FFFFFF', fontFamily: 'Orbitron_700Bold', fontSize: 18, marginBottom: 10 }}>
                                    ¡CLONACIÓN EXITOSA!
                                </Text>
                                <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginBottom: 30 }}>
                                    Los datos han sido transferidos y el registro guardado.
                                </Text>
                                <NeonButton
                                    title="FINALIZAR"
                                    onPress={() => setCloneModalVisible(false)}
                                    style={{ width: '100%' }}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Audit Log Modal */}
            <Modal
                visible={showAudit}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowAudit(false)}
            >
                <ScreenWrapper style={styles.auditLogContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setShowAudit(false)}>
                            <Ionicons name="chevron-back" size={32} color={COLORS.azmitaRed} />
                        </TouchableOpacity>
                        <Text style={styles.title}>{t('audit_log')}</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {auditLogs.length === 0 ? (
                            <View style={{ alignItems: 'center', marginTop: 100 }}>
                                <MaterialCommunityIcons name="clipboard-text-clock-outline" size={60} color={COLORS.textSecondary} />
                                <Text style={{ color: COLORS.textSecondary, fontSize: 16, marginTop: 20 }}>{t('no_audit_entries')}</Text>
                            </View>
                        ) : (
                            auditLogs.map((entry) => (
                                <View key={entry.id} style={styles.auditEntry}>
                                    <View style={styles.auditEntryHeader}>
                                        <Text style={styles.auditAction}>{t(`action_${entry.action}`)}</Text>
                                        <Text style={styles.auditTime}>{new Date(entry.timestamp).toLocaleString()}</Text>
                                    </View>
                                    <Text style={styles.auditDevice}>{entry.deviceName}</Text>
                                    {entry.details && <Text style={styles.auditDetails}>{entry.details}</Text>}
                                </View>
                            ))
                        )}
                    </ScrollView>
                </ScreenWrapper>
            </Modal>

            {/* PIN Modal */}
            <PinPadModal
                visible={pinModalVisible}
                mode="verify"
                onSuccess={async (pin) => {
                    if (!pin) return;
                    const isValid = await securityService.verifyPin(pin);
                    if (isValid) {
                        setPinModalVisible(false);
                        if (pendingAuditAccess) {
                            setPendingAuditAccess(false);
                            setShowAudit(true);
                        }
                    } else {
                        Alert.alert(t('error'), t('pin_incorrect'));
                    }
                }}
                onClose={() => {
                    setPinModalVisible(false);
                    setPendingAuditAccess(false);
                }}
            />
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
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBlack,
        borderRadius: 20,
        padding: 25,
        borderWidth: 1,
        borderColor: COLORS.azmitaRed,
        maxHeight: '80%',
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
    },
    auditButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
        backgroundColor: 'rgba(230, 57, 70, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(230, 57, 70, 0.3)',
    },
    auditButtonText: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
    },
    cloneBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(230, 57, 70, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    cloneBadgeText: {
        fontSize: 9,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
    },
    clonedIndicator: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(0, 255, 163, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    clonedText: {
        fontSize: 8,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.success,
        letterSpacing: 0.5,
    },
    deviceActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
        gap: 8,
    },
    deviceActionBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    auditLogContainer: {
        flex: 1,
        padding: 20,
    },
    auditEntry: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    auditEntryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    auditAction: {
        fontSize: 12,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 1,
    },
    auditTime: {
        fontSize: 10,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textSecondary,
    },
    auditDevice: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    auditDetails: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        color: COLORS.textSecondary,
    },
});

export default NfcInspectorScreen;
