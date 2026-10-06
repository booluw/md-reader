import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['.output/**', 'coverage/**']
  },
  {
    files: ['e2e/**/*.ts', 'test/**/*.ts', '*.config.ts'],
    rules: {
      'no-console': 'off'
    }
  }
)
