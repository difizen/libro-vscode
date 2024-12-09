import { defineConfig } from 'father';

export default defineConfig({
  umd: {
    entry: 'src/index', // 默认构建入口文件
  },
  extraBabelPlugins: [
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-transform-flow-strip-types',{}],
    ['@babel/plugin-transform-class-properties', { loose: true }],
    ['@babel/plugin-transform-private-methods', { loose: true }],
    ['@babel/plugin-transform-private-property-in-object', { loose: true }],
    ['babel-plugin-parameter-decorator',{}],
  ],
  extraBabelPresets: [['@babel/preset-typescript', { onlyRemoveTypeImports: true }]],
});
