/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Abril Fatface"', 'serif'],
        body: ['"Work Sans"', 'system-ui', 'sans-serif']
      },
      colors: {
        felt: {
          50: '#f0f7f4',
          200: '#a9d6c5',
          400: '#4aa38b',
          600: '#1a6a57',
          800: '#0f3d31'
        },
        table: {
          900: '#0b1c18'
        }
      },
      boxShadow: {
        glow: '0 0 30px rgba(74, 163, 139, 0.35)'
      }
    }
  },
  plugins: []
};
