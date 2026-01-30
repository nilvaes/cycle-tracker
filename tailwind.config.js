/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAF7F2',
        'background-dark': '#141210',
        foreground: '#2C2A29',
        'foreground-dark': '#F4F1EC',
        primary: '#C8A96B',
        'primary-dark': '#C8A96B',
        secondary: '#E7DED0',
        'secondary-dark': '#2A241E',
        accent: '#F1E8DA',
        'accent-dark': '#3A322A',
        surface: '#FFFFFF',
        'surface-dark': '#1C1815',
        border: '#E6DED2',
        'border-dark': '#2F2923',
        muted: '#6B6561',
        'muted-dark': '#C3BEB7',
      },
    },
  },
  plugins: [],
};
