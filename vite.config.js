import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Keep env override, but default to local backend dev port.
  // Use 127.0.0.1 to avoid some Windows localhost/IPv6 proxy issues.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5181';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: false
        },
        includeAssets: ['newlogo.png'],
        manifest: {
          name: '拓途浙享',
          short_name: '拓途浙享',
          description: 'A futuristic portfolio website with immersive interactions.',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: /^\/api\/.*$/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /^\/uploads\/.*$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'uploads-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] }
              }
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'image-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ],
          skipWaiting: true,
          clientsClaim: true
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            'ui-vendor': ['lucide-react', 'react-hot-toast', 'clsx', 'tailwind-merge'],
            'utils': ['axios', 'swr', 'i18next', 'react-i18next']
          }
        }
      }
    },
    server: {
      host: true, // Allow external access
      watch: {
        ignored: ['**/wechat_crawler/**', '**/wechat-batch-crawler/**'],
      },
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('[Proxy] API 代理错误:', err.message);
            });
            proxy.on('proxyReq', (_proxyReq, _req, _res) => {
              // console.log('[Proxy] 代理请求');
            });
          }
        },
        '/uploads': {
          target: apiProxyTarget,
          changeOrigin: true,
        }
      }
    }
  };
})
