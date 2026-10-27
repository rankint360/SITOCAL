import { readdir,readFile } from 'node:fs/promises';
import path from 'node:path';

const allowedRoot=new Set(['package.json','server.mjs','README.md','STATUS.md','AGENTS.md','.env.example','.gitignore','.dockerignore','Dockerfile','render.yaml']);
const allowedDirs=new Set(['public','lib','tests','deploy','docs','scripts']);
export async function sourceFiles(root){
  const files={};
  async function walk(dir,prefix=''){
    for(const entry of await readdir(dir,{withFileTypes:true})){
      const rel=prefix?prefix+'/'+entry.name:entry.name;
      if(entry.isSymbolicLink())continue;
      if(entry.isDirectory()){if(prefix||allowedDirs.has(entry.name))await walk(path.join(dir,entry.name),rel);}
      else if(prefix||allowedRoot.has(entry.name))files[rel]=await readFile(path.join(dir,entry.name));
    }
  }
  await walk(root);assertBuildContext(files);return files;
}
export function assertBuildContext(files){
  for(const required of ['Dockerfile','package.json','server.mjs','public/index.html','public/app.js','lib/store.mjs'])if(!files[required])throw Error(`Source package is missing required runtime file: ${required}`);
  const docker=files.Dockerfile.toString();
  for(const line of docker.split(/\r?\n/)){
    if(!/^COPY\s/i.test(line))continue;
    const parts=line.trim().split(/\s+/).slice(1).filter(x=>!x.startsWith('--'));
    for(const source of parts.slice(0,-1))if(!files[source]&&!Object.keys(files).some(p=>p.startsWith(source.replace(/\/$/,'')+'/')))throw Error(`Docker COPY input missing from source package: ${source}`);
  }
}
