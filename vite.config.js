import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'path'
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const buildStartedAt = Date.now();
  const env = loadEnv(mode, process.cwd(), '');
  // Keep env override, but default to the local backend dev port.
  // Use 127.0.0.1 to avoid some Windows localhost/IPv6 proxy issues.
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5181';

  return {
    plugins: [
      react(),
      VitePWA({
        manifestFilename: 'manifest.json',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        devOptions: {
          enabled: false
        },
        includeAssets: ['newlogo.png'],
        manifest: {
          name: '拓途浙享',
          short_name: '拓途浙享',
          description: '拓途浙享校园 AI 信息共享平台，连接活动、AI 社区、影像记录与实践项目。',
          lang: 'zh-CN',
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
          // Keep install precache lean for Android TWA startup; chunks are cached on demand.
          globPatterns: ['index.html', 'manifest.json', 'offline.html', 'pwa-icon.svg', '.well-known/assetlinks.json'],
          manifestTransforms: [
            async (entries) => {
              const manifest = entries.filter((entry) => {
                if (entry.url.startsWith('assets/')) return false;
                if (entry.url.endsWith('.map')) return false;

                try {
                  const assetPath = path.resolve(__dirname, 'dist', entry.url);
                  const isFresh = fs.statSync(assetPath).mtimeMs >= buildStartedAt - 1000;
                  return isFresh || entry.url === 'index.html';
                } catch {
                  return true;
                }
              });

              return { manifest, warnings: [] };
            }
          ],
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
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                request.destination === 'script',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'js-chunk-cache',
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 14 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                request.destination === 'style',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'css-chunk-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 14 },
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
      }),
      {
        name: 'mirror-web-manifest',
        closeBundle() {
          const manifestJsonPath = path.resolve(__dirname, 'dist', 'manifest.json');
          const legacyManifestPath = path.resolve(__dirname, 'dist', 'manifest.webmanifest');
          if (fs.existsSync(manifestJsonPath)) {
            fs.copyFileSync(manifestJsonPath, legacyManifestPath);
          }
        }
      }
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      modulePreload: {
        resolveDependencies: (_url, deps) =>
          deps.filter((dep) => !/(^|\/)(three-vendor|pdf-|mammoth\.browser|AdminDashboard)-/.test(dep))
      },
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
