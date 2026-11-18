const {buildSync}=require('esbuild');
buildSync({entryPoints:['lib/monitoring-browser.ts'],outfile:'public/error-monitor.js',bundle:true,minify:true,platform:'browser',target:'es2020',define:{'process.env.NEXT_PUBLIC_SENTRY_DSN':JSON.stringify(process.env.NEXT_PUBLIC_SENTRY_DSN||''),'process.env.NODE_ENV':JSON.stringify('production')}});
