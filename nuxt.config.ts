// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2026-08-20",
    future: { compatibilityVersion: 4 },
    devtools: { enabled: true },

    // Pure client-side app: auth/session and offline data live in IndexedDB,
    // there is no Nuxt server, the existing Cloudflare Pages Functions in
    // functions/ remain the API and are called directly from the client.
    ssr: false,

    app: {
        head: {
            htmlAttrs: { lang: "fr" },
            title: "Capi Scoring",
            meta: [
                { name: "viewport", content: "width=device-width, initial-scale=1.0" },
                { name: "theme-color", content: "#2d6a4f" },
                { name: "apple-mobile-web-app-capable", content: "yes" },
                { name: "apple-mobile-web-app-status-bar-style", content: "default" },
                { name: "apple-mobile-web-app-title", content: "Capi Scoring" },
            ],
            link: [
                { rel: "icon", href: "/icons/icon.png", type: "image/png" },
                { rel: "apple-touch-icon", href: "/icons/icon-maskable-192.png" },
                { rel: "stylesheet", href: "/styles.css" },
            ],
        },
    },

    modules: ["@vite-pwa/nuxt"],

    pwa: {
        registerType: "autoUpdate",
        manifest: {
            name: "Capi Scoring Arc",
            short_name: "Team Arc",
            description:
                "Saisie des scores d'equipe pour parcours Nature et 3D en tir a l'arc.",
            lang: "fr",
            start_url: "/",
            scope: "/",
            display: "standalone",
            background_color: "#f4efe6",
            theme_color: "#2d6a4f",
            icons: [
                { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
                { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
        },
        workbox: {
            navigateFallback: "/",
            globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
            // API calls are never cached by the service worker: offline-first
            // behavior for app data goes through IndexedDB (see app/composables),
            // not through HTTP caching of API responses.
            navigateFallbackDenylist: [/^\/api\//],
        },
        devOptions: {
            enabled: true,
            type: "module",
        },
    },

    vite: {
        optimizeDeps: {
            include: ["dexie", "workbox-window"],
        },
        server: {
            // The vite-plugin-pwa dev service worker occasionally fails to
            // regenerate its dist file on rapid reloads (ENOENT on
            // .nuxt/dev-sw-dist/sw.js); don't let that block the page with a
            // full-screen overlay during dev.
            hmr: { overlay: false },
            proxy: {
                // Cloudflare Pages Functions (wrangler pages dev) served separately in dev.
                "/api": {
                    target: "http://localhost:8788",
                    changeOrigin: true,
                },
            },
        },
    },
});
