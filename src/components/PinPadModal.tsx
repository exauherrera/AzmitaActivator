import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withSpring,
    runOnJS
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

interface PinPadModalProps {
    visible: boolean;
    mode: 'verify' | 'set' | 'confirm'; // verify: check pin, set: create new, confirm: re-enter new
    onSuccess: (pin?: string) => void;
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

export const PinPadModal: React.FC<PinPadModalProps> = ({
    visible,
    mode = 'verify',
    onSuccess,
    onClose,
    title,
    subtitle
    subtitle
}) => {
    const { t } = useTranslation();
    const [pin, setPin] = useState('');
    const [step, setStep] = useState<'enter' | 'confirm'>('enter');
    const [tempPin, setTempPin] = useState(''); // For 'set' mode confirmation
    const [error, setError] = useState(false);

    // Animation values
    const shake = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            setPin('');
            setError(false);
            if (mode === 'set') {
                setStep('enter');
                setTempPin('');
            }
        }
    }, [visible, mode]);

    // Handle Input
    const handlePress = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);

            // Auto-submit when length is 4
            if (newPin.length === 4) {
                setTimeout(() => submitPin(newPin), 200);
            }
        }
    };

    const handleDelete = () => {
        if (pin.length > 0) {
            setPin(pin.slice(0, -1));
            setError(false);
        }
    };

    const submitPin = (finalPin: string) => {
        if (mode === 'verify') {
            // Verification logic is handled by parent usually, but here we pass the entered PIN
            // For simple verify where parent checks logic:
            onSuccess(finalPin);
            // If parent says it's wrong, it should trigger error animation via ref/prop interaction
            // Ideally parent handles verify logic. 
            // BUT to make this component self-contained for "set", we need logic.
            // For "verify", let's assume parent verifies. 
            // Wait, standard pattern: parent receives PIN, verifies async, if fail -> triggers shake.
            // For this version, let's keep it simple: onSuccess(pin) calls parent.
        } else if (mode === 'set') {
            if (step === 'enter') {
                setTempPin(finalPin);
                setPin('');
                setStep('confirm');
                // Could verify simple sequences here (1234) if desired
            } else {
                if (finalPin === tempPin) {
                    onSuccess(finalPin);
                } else {
                    triggerError();
                    setPin('');
                    // Stay on confirm or reset to enter? Usually reset to confirm retry
                }
            }
        }
    };

    const triggerError = () => {
        setError(true);
        shake.value = withSequence(
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
        setTimeout(() => {
            setPin('');
            setError(false);
        }, 500);
    };

    // Expose error trigger? 
    // For now, if mode is verify, parent should handle closing or erroring.
    // We'll pass the entered pin to onSuccess. If parent verifies it's wrong, parent logic needs to recall modal?
    // Better: Allow parent to return false? 
    // Let's assume onSuccess is "Action Completed". 
    // Actually, for 'verify', the COMPONENT should verify if possible to avoid complex parent logic?
    // No, securityService is global. Let's import it here for 'verify' mode? 
    // YES, cleaner.

    const processPinInternal = async (input: string) => {
        if (mode === 'verify') {
            const SecurityService = require('../services/securityService').default;
            const isValid = await SecurityService.verifyPin(input);
            if (isValid) {
                onSuccess(input);
            } else {
                triggerError();
            }
        } else {
            // Set mode logic already handled in submitPin for step flow
            // But we need to call onSuccess only at end
            submitPin(input);
        }
    };

    // Override handlePress final call
    const handlePressInternal = (num: string) => {
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                setTimeout(() => processPinInternal(newPin), 200);
            }
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: shake.value }]
        };
    });

    const getTitle = () => {
        if (title) return title;
        if (mode === 'set') return step === 'enter' ? t('set_pin') : t('confirm_pin');
        return t('enter_pin');
    };

    const getSubtitle = () => {
        if (error) return t('pin_incorrect');
        if (subtitle) return subtitle;
        if (mode === 'set' && step === 'confirm') return t('re_enter_code');
        return t('protect_assets');
    };

    return (
        <Modal visible={visible} transparent={true} animationType="fade">
            <View style={styles.container}>
                <View style={styles.content}>
                    <Animated.View style={[styles.header, animatedStyle]}>
                        <Ionicons name="lock-closed" size={32} color={error ? COLORS.azmitaRed : '#00FFA3'} />
                        <Text style={styles.title}>{getTitle()}</Text>
                        <Text style={[styles.subtitle, error && styles.errorText]}>{getSubtitle()}</Text>
                    </Animated.View>

                    <View style={styles.dotsContainer}>
                        {[1, 2, 3, 4].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    pin.length >= i && (error ? styles.dotError : styles.dotActive)
                                ]}
                            />
                        ))}
                    </View>

                    <View style={styles.keyboard}>
                        {[
                            ['1', '2', '3'],
                            ['4', '5', '6'],
                            ['7', '8', '9'],
                            ['cancel', '0', 'delete']
                        ].map((row, rIdx) => (
                            <View key={rIdx} style={styles.row}>
                                {row.map((key) => {
                                    if (key === 'delete') {
                                        return (
                                            <TouchableOpacity key="del" style={styles.key} onPress={handleDelete}>
                                                <Ionicons name="backspace-outline" size={24} color={COLORS.textSecondary} />
                                            </TouchableOpacity>
                                        );
                                    }
                                    if (key === 'cancel') {
                                        return (
                                            <TouchableOpacity key="cancel" style={styles.key} onPress={onClose}>
                                                <Text style={styles.cancelText}>X</Text>
                                            </TouchableOpacity>
                                        );
                                    }
                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            style={styles.key}
                                            onPress={() => handlePressInternal(key)}
                                        >
                                            <Text style={styles.keyText}>{key}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: 'Orbitron_700Bold',
        marginTop: 15,
        letterSpacing: 2,
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        marginTop: 5,
    },
    errorText: {
        color: COLORS.azmitaRed,
        fontWeight: 'bold',
    },
    dotsContainer: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 50,
    },
    dot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    dotActive: {
        backgroundColor: '#00FFA3',
        borderColor: '#00FFA3',
        shadowColor: '#00FFA3',
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    dotError: {
        backgroundColor: COLORS.azmitaRed,
        borderColor: COLORS.azmitaRed,
    },
    keyboard: {
        width: '100%',
        paddingHorizontal: 40,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    key: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    keyText: {
        color: '#FFFFFF',
        fontSize: 28,
        fontFamily: 'Orbitron_400Regular',
    },
    cancelText: {
        color: COLORS.textSecondary,
        fontSize: 18,
        fontFamily: 'Orbitron_700Bold',
    }
});
