// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // T1 (D1): pure static output, no Nitro runtime, no server/ directory.
  ssr: false,

  modules: ['@nuxt/eslint'],

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'md-reader'
    }
  }
})
