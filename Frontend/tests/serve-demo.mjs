import { createServer } from 'vite';

// Deterministic public-demo setup. Tests intercept this fake backend.
const server = await createServer({
  define: {
    'import.meta.env.VITE_PUBLIC_DEMO': JSON.stringify('true'),
    'import.meta.env.VITE_DEMO_USER_ID': JSON.stringify('demo-test-user'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://demo-test.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('demo-test-public-key'),
  },
  server: {
    host: '127.0.0.1', port: 4191, strictPort: true, open: false,
    watch: { ignored: ['**/test-results/**', '**/benchmark-results/**'] },
  },
});
await server.listen();
