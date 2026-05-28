/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1A56DB',
          dark: '#1E429F',
          light: '#EBF5FF',
        },
        status: {
          open: '#D97706',
          'open-bg': '#FFFBEB',
          solved: '#059669',
          'solved-bg': '#ECFDF5',
          cancelled: '#DC2626',
          'cancelled-bg': '#FEF2F2',
        },
        selisih: {
          minus: '#DC2626',
          plus: '#059669',
          zero: '#6B7280',
        },
        surface: '#FFFFFF',
        border: '#E5E7EB',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.12), 0 2px 4px -1px rgb(0 0 0 / 0.08)',
        nav: '0 1px 0 0 rgb(0 0 0 / 0.08)',
        modal: '0 20px 60px -10px rgb(0 0 0 / 0.3)',
      },
    },
  },
  plugins: [],
};
