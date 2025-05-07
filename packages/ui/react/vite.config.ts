import react from '@vitejs/plugin-react'
import dts from "vite-plugin-dts";
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.app.json',
      exclude: ["**/*.stories.ts", "**/*.test.tsx"]
    }),
  ],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ui',
      fileName: (format) => `ui.${format}.js`,
      formats: ['es', 'cjs', 'umd'],
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "react/jsx-runtime"
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          "react/jsx-runtime": "react/jsx-runtime"
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ["sb-original/image-context"],
    include: ["react/jsx-runtime"]
  },
  resolve: {
    alias: {
      'react/jsx-runtime': 'react/jsx-runtime.js',
    },
  },
})
