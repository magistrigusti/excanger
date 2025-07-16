"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tsup.config.ts
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: ['lib/index.ts'], // или твой путь
    outDir: 'dist',
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    shims: true,
    sourcemap: true,
    clean: true,
    minify: false,
});
//# sourceMappingURL=tsup.config.js.map