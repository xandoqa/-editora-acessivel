/**
 * Identidade visual da Livrin: papel creme, traço de tinta e cor de cartaz.
 * As cores são variáveis CSS (ver src/styles/global.css) para que os três
 * temas — Papel, Noite e Alto Contraste — troquem a interface de uma vez.
 * @type {import('tailwindcss').Config}
 */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: {
          DEFAULT: token('surface'),
          low: token('surface-low'),
          high: token('surface-high'),
          highest: token('surface-highest'),
        },
        outline: { DEFAULT: token('outline'), strong: token('outline-strong') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), subtle: token('ink-subtle') },
        primary: { DEFAULT: token('primary'), on: token('on-primary'), container: token('primary-container'), onContainer: token('on-primary-container') },
        accent: { DEFAULT: token('accent'), container: token('accent-container'), on: token('on-accent') },
        warn: { DEFAULT: token('warn'), container: token('warn-container') },
        danger: { DEFAULT: token('danger'), container: token('danger-container') },
        admin: { DEFAULT: token('admin'), container: token('admin-container') },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', '"Inter Variable"', 'system-ui', 'sans-serif'],
        lexend: ['Lexend', 'system-ui', 'sans-serif'],
        opendyslexic: ['OpenDyslexic', 'Comic Sans MS', 'sans-serif'],
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      /*
       * Sombra dura deslocada — o recorte colado na página. Era aplicada em
       * todo card, o que achatava a hierarquia: com tudo saltando, nada salta.
       * Agora o card tem só um apoio quase imperceptível, e o traço forte fica
       * para o botão principal e para o Selo Livrin.
       */
      boxShadow: {
        card: '0 1px 2px rgb(23 22 26 / 0.05)',
        botao: '2px 2px 0 var(--sombra-tinta)',
        adesivo: '2px 2px 0 var(--sombra-tinta)',
      },
      rotate: { '1.5': '1.5deg', '-1.5': '-1.5deg' },
    },
  },
  plugins: [],
};
