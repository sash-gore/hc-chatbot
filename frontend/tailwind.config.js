/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          300: '#D1B2EA',
          500: '#80109A',
        },
        action: {
          500: '#FE6E02',
          600: '#FF9D5A',
        },
        neutral: {
          white: '#FFFFFF',
          background: '#F6F5FB',
        },
        text: {
          primary: '#1F1F1F',
          secondary: '#6B6B6B',
        },
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 4px 12px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
