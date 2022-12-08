import { playwrightLauncher } from '@web/test-runner-playwright';
import { esbuildPlugin } from "@web/dev-server-esbuild";


const browsers = {
  // Local browser testing via playwright
  // ===========
  chromium: playwrightLauncher({ product: 'chromium' }),
};

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
export default {
  rootDir: '.',
  files: ['src/**/*.spec.ts'],
  nodeResolve: true,
  preserveSymlinks: true,
  browsers: Object.values(browsers),
  testFramework: {
    // https://mochajs.org/api/mocha
    config: {
      ui: 'tdd',
      timeout: '60000',
    },
  },
  plugins: [esbuildPlugin({ ts: true })],
};