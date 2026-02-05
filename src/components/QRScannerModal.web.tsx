import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

interface QRScannerModalProps {
    visible: boolean;
    onClose: () => void;
    onScan: (data: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, onScan }) => {
    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.container}>
                <View style={styles.content}>
                    <Ionicons name="alert-circle-outline" size={48} color={COLORS.azmitaRed} />
                    <Text style={styles.title}>Scanner no disponible</Text>
                    <Text style={styles.text}>El escaneo de QR no está soportado en la versión Web actualmente.</Text>

                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Cerrar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: COLORS.cardBlack,
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        maxWidth: 400,
        width: '100%',
        borderWidth: 1,
        borderColor: COLORS.azmitaRed,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
        marginTop: 15,
        marginBottom: 10,
        textAlign: 'center',
    },
    text: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
        marginBottom: 20,
    },
    closeBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
    },
    closeText: {
        color: '#FFFFFF',
        fontFamily: 'Orbitron_700Bold',
    }
});
