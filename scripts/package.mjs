import { readdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip,unzip } from '../lib/archive.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files={};
const allowedRoot=new Set(['package.json','README.md','STATUS.md','AGENTS.md','.env.example','.gitignore','.dockerignore','Dockerfile','render.yaml']);
const allowedDirs=new Set(['public','lib','tests','deploy','docs','scripts']);
async function walk(dir,prefix=''){
  for(const entry of await readdir(dir,{withFileTypes:true})){
    const rel=prefix?prefix+'/'+entry.name:entry.name;
    if(entry.isSymbolicLink())continue;
    if(entry.isDirectory()){if(prefix||allowedDirs.has(entry.name))await walk(path.join(dir,entry.name),rel);}
    else if(prefix||allowedRoot.has(entry.name))files[rel]=await readFile(path.join(dir,entry.name));
  }
}
await walk(root);const archive=zip(files),check=unzip(archive);
if(Object.keys(check).some(n=>n.startsWith('data/')||n==='.env'||n.endsWith('secret.key')))throw Error('Refusing to package runtime secrets');
const target=path.join(root,'..','rankleem-source.zip');await writeFile(target,archive);console.log(`Packaged ${Object.keys(check).length} source files to ${target}. Runtime data and secrets excluded.`);
