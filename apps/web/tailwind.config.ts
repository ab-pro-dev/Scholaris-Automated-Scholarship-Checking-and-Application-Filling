import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F9F7F4',
        surface: '#FFFFFF',
        pebble: '#F3EEE5',
        line: '#E5E0D5',
        ink: {
          DEFAULT: '#2B241F',
          muted: '#6F625A',
        },
        action: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: '#EFF6FF',
        },
        verified: {
          bg: '#ECFDF5',
          border: '#A7F3D0',
          text: '#065F46',
        },
        warning: {
          bg: '#FFFBEB',
          border: '#FDE68A',
          text: '#92400E',
        },
        danger: {
          bg: '#FEF2F2',
          border: '#FECACA',
          text: '#991B1B',
        },
      },
      fontFamily: {
        sans: ['var(--font-albert)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(43, 36, 31, 0.04)',
        elevated: '0 6px 16px -4px rgba(43, 36, 31, 0.08), 0 2px 6px -2px rgba(43, 36, 31, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
