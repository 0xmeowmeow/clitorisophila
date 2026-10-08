import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.mkdir('dist',{recursive:true});
await build({entryPoints:['app.js','worker.js'],bundle:true,outdir:'dist',format:'esm',target:'es2022',minify:true,external:['./engine.mjs']});
for(const file of ['index.html','app.css','engine.mjs','engine.wasm'])await fs.copyFile(file,'dist/'+file);
await fs.cp('public','dist',{recursive:true});
console.log('Built static live demo in web/dist');
