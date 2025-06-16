// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-05-15",
  devtools: { enabled: true },

  runtimeConfig: {
    // Private keys (only available on server-side)
    anthropicApiKey: "",
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/fonts",
    "@nuxt/icon",
    "@nuxt/test-utils",
    "@nuxtjs/tailwindcss",
  ],
});
