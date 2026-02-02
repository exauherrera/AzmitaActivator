import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { GlassCard } from '../components/GlassCard';
import { NeonButton } from '../components/NeonButton';

const { width } = Dimensions.get('window');

const LanguageSelectionScreen = ({ onSelect }: { onSelect: (lang: string) => void }) => {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        onSelect(lng);
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>AZMITA</Text>
                <View style={styles.divider} />
                <Text style={styles.tagline}>RED LION PROTOCOL</Text>
            </View>

            <GlassCard style={styles.card}>
                <Text style={styles.prompt}>{t('select_language')}</Text>

                <NeonButton
                    title="Español"
                    onPress={() => changeLanguage('es')}
                    style={styles.btn}
                />

                <NeonButton
                    title="English"
                    onPress={() => changeLanguage('en')}
                    style={styles.btn}
                />
            </GlassCard>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 60,
    },
    title: {
        fontSize: 48,
        fontFamily: 'Orbitron_900Black',
        color: '#FFFFFF',
        letterSpacing: 10,
    },
    divider: {
        width: 80,
        height: 2,
        backgroundColor: COLORS.azmitaRed,
        marginVertical: 15,
    },
    tagline: {
        fontSize: 10,
        fontFamily: 'Orbitron_700Bold',
        color: COLORS.azmitaRed,
        letterSpacing: 4,
    },
    card: {
        width: '100%',
        padding: 30,
        alignItems: 'center',
    },
    prompt: {
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
        color: COLORS.textSecondary,
        marginBottom: 30,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    btn: {
        width: '100%',
        marginBottom: 20,
    }
});

export default LanguageSelectionScreen;
