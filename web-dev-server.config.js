export default {
  port: 80,
  open: true,
  watch: true,
  appIndex: 'dist/index.html',
  nodeResolve: {
    exportConditions: ['development'],
    dedupe: true,
  },
};
