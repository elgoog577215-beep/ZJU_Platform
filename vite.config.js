import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5181';

// https://vitejs.dev/config/
export default defineConfig({
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
    // 智能代理配置：支持多个后端端口
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        // 如果连接失败，尝试备用端口
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            // 如果主端口失败，可以尝试其他端口
            console.log('[Proxy] API 代理错误:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // 记录代理请求
            // console.log('[Proxy] 代理请求:', req.method, req.url);
          });
        }
      },
      '/uploads': {
        target: apiProxyTarget,
        changeOrigin: true,
      }
    }
  }
})
