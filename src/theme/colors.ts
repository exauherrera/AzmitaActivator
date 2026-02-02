export const COLORS = {
  // Primary Brand - Azmita Blue
  azmitaBlue: '#00D1FF', // Brighter, more kinetic cyan-blue
  azmitaGlow: 'rgba(0, 209, 255, 0.4)',

  // Neutral Palette (Sophisticated Darks)
  deepDark: '#050505',
  cardBlack: '#121212',
  glassBorder: 'rgba(255, 255, 255, 0.1)',

  // Semantic
  success: '#00FFA3',
  error: '#FF3D71',
  warning: '#FFD600',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textGhost: '#4A4A4A',
};

export const THEME = {
  dark: {
    background: COLORS.deepDark,
    surface: COLORS.cardBlack,
    accent: COLORS.azmitaBlue,
    text: COLORS.textPrimary,
    subtext: COLORS.textSecondary,
    glass: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderColor: COLORS.glassBorder,
    }
  }
};
