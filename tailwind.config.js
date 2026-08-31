/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-background)',
        surface: 'var(--bg-surface)',
        'surface-hover': 'var(--bg-surface-hover)',
        'surface-active': 'var(--bg-surface-active)',
        card: 'var(--bg-card)',
        'card-hover': 'var(--bg-card-hover)',
        border: 'var(--border-color)',
        'border-subtle': 'var(--border-subtle)',
        'border-highlight': 'var(--border-highlight)',
        primary: {
          DEFAULT: 'var(--primary-color)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: 'var(--accent-color)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
        },
        muted: {
          DEFAULT: 'var(--text-muted)',
          foreground: 'var(--text-secondary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.25s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'glow-primary': '0 0 20px -5px var(--primary-color)',
        'glow-accent': '0 0 15px -3px var(--accent-color)',
      }
    },
  },
  plugins: [],
}
