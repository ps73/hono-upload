import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

import { defineConfig } from 'tsup';

const buildDts = () => {
  return new Promise<void>((res, rej) => {
    const command = 'tsc --emitDeclarationOnly --declaration --declarationMap --outDir dist/.temp/';
    exec(command, (error) => {
      if (error) {
        console.error(error);
        rej(error);
        return;
      }
      fs.cpSync(path.resolve('dist', '.temp', 'src'), 'dist', { recursive: true });
      fs.rmSync(path.resolve('dist', '.temp', 'src'), { recursive: true });
      res();
    });
  });
};

const copyLibToDist = () => {
  fs.cpSync(path.resolve('dist', '.temp'), 'dist', { recursive: true });
  fs.rmSync(path.resolve('dist', '.temp'), { recursive: true });
};

export default defineConfig({
  entry: ['src/'],
  target: 'node16',
  format: ['cjs', 'esm'],
  minifyIdentifiers: false,
  bundle: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  outDir: 'dist/.temp/',
  onSuccess: async () => {
    await buildDts();
    copyLibToDist();
  },
});
