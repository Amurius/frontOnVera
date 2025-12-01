/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    screens: {
      'lg': { max: '1024px' },
      'md': { max: '768px' },
      'sm': { max: '480px' },
    },
    extend: {
      colors: {
        'vera-green': '#DBF9BE',
        'vera-sugar': '#FEF2E4',
        'vera-dark': '#1A1A1A',
        'vera-text': '#414651',
        'vera-text-light': '#717680',
        'vera-text-tertiary': '#535862',
        'vera-bg-dark': '#2E2E2E',
        'vera-cream': '#F5ECDE',
        'vera-banner': '#FECDCA',
        'vera-highlight': '#C5F19E',
        'vera-heading': '#181D27',
        'vera-body': '#535862',
        'vera-gray': '#A0A0A0',
        'vera-footer': '#2E2E2E',
        'vera-label': '#2E3626',
      },
      fontFamily: {
        'sans': ['Fustat', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'heading': ['Lastik', 'Georgia', 'serif'],
        'body': ['Fustat', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: {
        'container': '1280px',
      },
      borderRadius: {
        '4xl': '24px',
        '5xl': '32px',
        'full-btn': '64px',
      },
      boxShadow: {
        'xl-custom': '0 20px 24px -4px rgba(10, 13, 18, 0.08), 0 8px 8px -4px rgba(10, 13, 18, 0.03), 0 3px 3px -1.5px rgba(10, 13, 18, 0.04)',
        'notification': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'image-green': '10px 4px 0 0 #DBF9BE, 10px 12px 0 0 #DBF9BE',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      fontSize: {
        '5xl-custom': ['48px', { lineHeight: '1.1' }],
        '6xl-custom': ['64px', { lineHeight: '1.15' }],
      },
      backgroundImage: {
        'newspaper': "url('/assets/images/fondBeigePapierJournal.png')",
        'cta-gradient': 'linear-gradient(92deg, #DBF9BE 1.85%, #FFD5D8 103.13%)',
      },
    },
  },
  plugins: [],
}
