import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'チャンネルプランナー',
        short_name: 'チャンネル',
        description: 'YouTubeチャンネルのカレンダー・ToDo管理アプリ',
        theme_color: '#2563eb',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/channel-planner/',
        icons: [
          { src: '/channel-planner/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/channel-planner/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  base: '/channel-planner/',
})
