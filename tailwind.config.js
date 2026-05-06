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
        'canvas': '#E8EDF3',
        'deep-charcoal': '#1A202C',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'wide': '0.1em',
      },
      borderRadius: {
        '2xl': '1rem',
      },
      transitionDuration: {
        'theme': '150ms',
      },
    },
  },
  plugins: [],
}