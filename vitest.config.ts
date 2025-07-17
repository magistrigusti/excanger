import { defineConfig } from 'vitest/config';

const isCI = process.env.CI === "true";
const isWindows = process.platform === "win32";

export default defineConfig({
  esbuild: {
    target: 'es2024', // можно заменить на нужный стандарт
  },
  test: {
    silent: isCI,
    reporters: isCI ? ["default"] : ["verbose"],
    sequence: {
      shuffle: true,
    },
    coverage: {
      enabled: isWindows, // если надо, можешь поставить true для всех
      provider: "istanbul",
      reporter: isCI ? ["lcov", "text-summary"] : ["html", "text"],
      include: ["lib/**"], // путь до твоего кода
    },
  },
  typecheck: {
    enabled: true,
  }
});
