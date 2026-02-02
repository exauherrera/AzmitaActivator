import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../theme/colors';

const LanguageSelectionScreen = ({ onSelect }: { onSelect: (lang: string) => void }) => {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
        onSelect(lng);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>AZMITA</Text>
            <Text style={styles.subtitle}>{t('select_language')}</Text>

            <TouchableOpacity
                style={styles.button}
                onPress={() => changeLanguage('es')}
            >
                <Text style={styles.buttonText}>Español</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.button}
                onPress={() => changeLanguage('en')}
            >
                <Text style={styles.buttonText}>English</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.deepBlack,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: COLORS.azmitaBlue,
        marginBottom: 10,
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 18,
        color: COLORS.ghostWhite,
        marginBottom: 40,
    },
    button: {
        width: '100%',
        padding: 15,
        borderRadius: 12,
        backgroundColor: COLORS.spaceGray,
        marginBottom: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.azmitaBlue + '44',
    },
    buttonText: {
        color: COLORS.ghostWhite,
        fontSize: 18,
        fontWeight: '600',
    }
});

export default LanguageSelectionScreen;
