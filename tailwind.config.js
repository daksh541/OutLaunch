/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#f7f5f0',
        foreground: '#0d1c15',
        paper: {
          DEFAULT: '#f7f5f0',
          sheet: '#ffffff',
          subtle: '#f2efe9',
          muted: '#ebe7de',
        },
        forest: {
          DEFAULT: '#0d1c15',
          soft: '#162b21',
          surface: '#11221a',
          dark: '#08120e',
        },
        sage: {
          DEFAULT: '#edf2ec',
          light: '#f4f7f3',
          border: '#dbe5da',
          muted: '#cad8c9',
        },
        ink: {
          DEFAULT: '#0d1c15',
          2: '#4a5851',
          3: '#73827a',
          light: '#9bb0a5',
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0d1c15',
        },
        chip: 'rgba(13, 28, 21, 0.05)',
        border: 'rgba(13, 28, 21, 0.1)',
        muted: {
          DEFAULT: 'rgba(13, 28, 21, 0.04)',
          foreground: '#5a6962',
        },
        brand: {
          50: '#f2fbf7',
          100: '#daf5eb',
          200: '#b2ead7',
          300: '#7ddac0',
          500: '#10b981',
          600: '#0d9467',
          700: '#0a7854',
          800: '#096647',
          900: '#074e37',
        },
        signal: {
          mint: '#00e599',
          emerald: '#0d9467',
          dark: '#0a7854',
        },
        primary: {
          DEFAULT: '#0d1c15',
          foreground: '#ffffff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        editorial: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'GeistMono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        plaque: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        glass: '0 8px 30px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}
