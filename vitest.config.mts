import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      CHUPIM_EXAMPLES: '1',
      CHUPIM_ENV: 'development',
    },
  },
});
