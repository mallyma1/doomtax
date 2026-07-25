import { FlatCompat } from '@eslint/eslintrc';
import react from 'eslint-plugin-react';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  { ignores: ['.next/**', 'next-env.d.ts', 'node_modules/**'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
    },
  },
];

export default eslintConfig;
