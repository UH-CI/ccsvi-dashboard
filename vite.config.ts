import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    base: "/ccsvi-dashboard/",
    worker: {
        format: "es",
    },
    server: {
        proxy: {
            "/api": "http://128.171.215.85:8000",
        },
    },
});