import { terser } from 'rollup-plugin-terser';

export default {
  input: 'black-sword-hack-mod.js',
  output: {
    file: 'black-sword-hack-mod.min.js',
    format: 'esm',
    plugins: [terser()]
  }
};
