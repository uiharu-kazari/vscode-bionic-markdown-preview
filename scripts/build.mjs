import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('out', { recursive: true, force: true });
await mkdir('out', { recursive: true });
const options = { entryPoints: ['src/extension.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node16', external: ['vscode'], outfile: 'out/extension.js', sourcemap: false, legalComments: 'eof' };
if (process.argv.includes('--watch')) {
  await (await context(options)).watch();
  console.log('Watching extension source for changes.');
} else {
  await build(options);
}
await mkdir('media/katex', { recursive: true });
await cp('node_modules/katex/dist/katex.min.css', 'media/katex/katex.min.css');
await cp('node_modules/katex/dist/fonts', 'media/katex/fonts', { recursive: true });
await cp('node_modules/katex/LICENSE', 'media/katex/LICENSE');

const licenseFiles = {
  'markdown-it': 'LICENSE', 'katex': 'LICENSE', 'argparse': 'LICENSE',
  'entities': 'LICENSE', 'linkify-it': 'LICENSE', 'mdurl': 'LICENSE',
  'punycode.js': 'LICENSE-MIT.txt', 'uc.micro': 'LICENSE.txt', 'commander': 'LICENSE',
};
await mkdir('media/licenses', { recursive: true });
for (const [name, license] of Object.entries(licenseFiles)) {
  await cp(`node_modules/${name}/${license}`, `media/licenses/${name}.txt`);
}
