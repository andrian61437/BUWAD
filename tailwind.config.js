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
        'navy': '#00386D',          // Primary Brand: Deep Ocean Navy
        'steel-blue': '#6699CC',    // Secondary Accent: Solar Sky Steel Blue
        'canvas': '#E8EDF3',        // Background Light Canvas
        'canvas-dark': '#1A202C',   // Background Midnight Slate
        'surface-dark': '#2D3748',  // Dark Surface Tile / Border
        'border-light': '#BDBCBD',  // Neutral Border Light
        'text-muted': '#4A5568',    // Muted Subtitle Light
        'text-muted-dark': '#94A3B8', // Muted Subtitle Dark
        'status-emerald': '#10B981', // Status Nominal / Active / Passing Standard
        'status-amber': '#F59E0B',   // Status Warning / Off-Hours Hold
        'status-crimson': '#EF4444', // Status Hazard / Rain Alarm / Error
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