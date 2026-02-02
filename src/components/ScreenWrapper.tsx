import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';

export const ScreenWrapper: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.deepDark, '#1A1A2E', COLORS.deepDark]}
                style={StyleSheet.absoluteFill}
            />
            <View style={[styles.content, style]}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.deepDark,
    },
    content: {
        flex: 1,
    },
});
