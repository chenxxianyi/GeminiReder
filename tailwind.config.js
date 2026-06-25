/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'gem-bg': 'var(--gem-bg)',
        'gem-sidebar': 'var(--gem-sidebar)',
        'gem-surface': 'var(--gem-surface)',
        'gem-text-primary': 'var(--gem-text-primary)',
        'gem-text-secondary': 'var(--gem-text-secondary)',
        'gem-text-muted': 'var(--gem-text-muted)',
        'gem-blue': '#1b6ef3',
        'gem-blue-dark': '#a8c7fa',
        'gem-blue-bg': 'var(--gem-blue-bg)',
        'gem-badge': 'var(--gem-badge)',
        'gem-border': 'var(--gem-border)',
        'gem-hover': 'var(--gem-hover)',
        'gem-card-bg': 'var(--gem-card-bg)',
        'code-bg': 'var(--code-bg)',
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Noto Sans"', 'Roboto', 'sans-serif'], // UI font
        mono: ['"Fira Code"', 'Consolas', 'monospace'], // Code font
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },
  plugins: [],
}
