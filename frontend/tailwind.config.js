/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Matte Black Surfaces
        finBg: '#0D0D0F',          // Main application background
        finSidebar: '#09090B',     // Sidebar background
        finCard: '#171719',        // Card background
        finElevated: '#1E1E21',    // Elevated card background
        finInput: '#141416',       // Input background
        finHover: '#262629',       // Hover background
        finBorder: '#303035',      // Standard border color

        // Premium Burnt Orange Accents
        finOrange: {
          DEFAULT: '#FF7A1A',
          hover: '#FF8F3D',
          soft: '#332015',
          border: '#75401F',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF7A1A',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#75401F',
          950: '#332015',
        },

        // Text Colors
        finText: {
          primary: '#F5F5F5',
          secondary: '#A1A1AA',
          muted: '#71717A',
        },

        // Financial Status Colors
        finStatus: {
          success: '#22A477',  // Success / Low risk
          warning: '#E8A23A',  // Warning / Medium risk
          danger: '#EF5350',   // Critical / High risk
          info: '#60A5FA',     // Informational
        },

        // Semantic aliases
        riskLow: {
          DEFAULT: '#22A477',
          soft: '#132E25',
          border: '#1A533E',
        },
        riskMod: {
          DEFAULT: '#E8A23A',
          soft: '#332410',
          border: '#6B4A15',
        },
        riskHigh: {
          DEFAULT: '#EF5350',
          soft: '#331515',
          border: '#6B1F1F',
        },

        // Legacy compatibility mappings
        finNavy: {
          DEFAULT: '#171719',
          900: '#09090B',
          800: '#141416',
          700: '#1E1E21',
          600: '#262629',
        },
        finSlate: {
          DEFAULT: '#A1A1AA',
          600: '#A1A1AA',
          500: '#71717A',
          400: '#71717A',
          300: '#52525B',
          200: '#303035',
          100: '#1E1E21',
          50: '#141416',
        },
        finBlue: {
          DEFAULT: '#FF7A1A',
          600: '#FF7A1A',
          500: '#FF8F3D',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'fin-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.4)',
        'fin-md': '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)',
        'fin-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)',
        'orange-glow': '0 0 15px -3px rgba(255, 122, 26, 0.25)',
      }
    },
  },
  plugins: [],
}
