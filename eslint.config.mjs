import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['.output/**', 'coverage/**']
  },
  {
    rules: {
      'vue/no-v-html': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }]
    }
  },
  {
    files: ['e2e/**/*.ts', 'test/**/*.ts', '*.config.ts'],
    rules: {
      'no-console': 'off'
    }
  }
)
