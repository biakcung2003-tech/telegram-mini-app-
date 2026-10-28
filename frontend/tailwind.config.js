/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Map Telegram theme variables so UI matches the user's client theme.
        tg: {
          bg: 'var(--tg-bg, #0f1115)',
          secondary: 'var(--tg-secondary-bg, #1a1d24)',
          text: 'var(--tg-text, #ffffff)',
          hint: 'var(--tg-hint, #8b95a5)',
          link: 'var(--tg-link, #5ea9ff)',
          button: 'var(--tg-button, #3b82f6)',
          buttonText: 'var(--tg-button-text, #ffffff)',
        },
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
