export default {
  port: 80,
  open: true,
  watch: true,
  appIndex: 'index.html',
  nodeResolve: {
    exportConditions: ['development'],
    dedupe: true,
  }
};