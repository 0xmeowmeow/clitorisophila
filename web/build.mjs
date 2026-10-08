import {build} from 'esbuild';
import fs from 'node:fs/promises';
await fs.mkdir('dist',{recursive:true});
await build({entryPoints:['app.js','worker.js'],bundle:true,outdir:'dist',format:'esm',target:'es2022',minify:true,external:['./engine.mjs']});
for(const file of ['index.html','app.css','engine.mjs','engine.wasm'])await fs.copyFile(file,'dist/'+file);
await fs.cp('public','dist',{recursive:true});
await fs.mkdir('dist/share',{recursive:true});
for(const name of ['clitorisophila-facebook.gif','clitorisophila-facebook.mp4']){try{await fs.copyFile('../assets/social/'+name,'dist/share/'+name)}catch(error){if(error.code!=='ENOENT')throw error}}
console.log('Built static live demo in web/dist');
