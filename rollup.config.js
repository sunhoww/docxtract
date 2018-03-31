import babel from 'rollup-plugin-babel';

import pkg from './package.json';

export default [
  {
    input: pkg.entry,
    output: [{ file: pkg.main, name: pkg.name, format: 'cjs' }],
    plugins: [babel({ exclude: 'node_modules/**' })],
    external: ['fs', 'path', 'os', ...Object.keys(pkg.dependencies)],
  },
];
