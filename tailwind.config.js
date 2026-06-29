/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        card: '#1a1a1a',
        'card-2': '#222222',
        'card-border': '#2a2a2a',
        green: { DEFAULT: '#4CAF76', dark: '#3d9463', light: '#6dc990' },
        red: { DEFAULT: '#E05252', dark: '#c43a3a', light: '#ea7070' },
        orange: { DEFAULT: '#F97316' },
        blue: { DEFAULT: '#3B82F6' },
        purple: { DEFAULT: '#A855F7' },
        gray: { 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '20px' },
      screens: { xs: '375px' }
    },
  },
  plugins: [],
}

