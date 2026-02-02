export const COLORS = {
  // Brand - Red Lion
  azmitaRed: '#E63946', // Intense Crimson from the logo ring
  azmitaRedGlow: 'rgba(230, 57, 70, 0.5)',
  azmitaGold: '#D4AF37', // For the coin accents

  // Backgrounds - Cinematic Darks
  deepMaroon: '#1A0505',
  cardBlack: '#0D0202',
  glassBorder: 'rgba(230, 57, 70, 0.2)',

  // Semantic
  success: '#00FFA3',
  error: '#FF3D71',
  warning: '#FFD600',

  // Text - High Contrast
  textPrimary: '#FFFFFF',
  textSecondary: '#B08E8E', // Desaturated reddish gray
  textGhost: '#3D1C1C',
};

export const THEME = {
  dark: {
    background: COLORS.deepMaroon,
    surface: COLORS.cardBlack,
    accent: COLORS.azmitaRed,
    text: COLORS.textPrimary,
    subtext: COLORS.textSecondary,
    glass: {
      backgroundColor: 'rgba(40, 0, 0, 0.3)',
      borderColor: COLORS.glassBorder,
    }
  }
};
