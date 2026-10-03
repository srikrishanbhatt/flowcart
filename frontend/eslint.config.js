import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      // Keeps hot reload working: component files should only export components.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Last, so formatting is left entirely to Prettier.
  prettier,
)
