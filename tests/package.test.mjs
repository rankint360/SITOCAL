import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { sourceFiles,assertBuildContext } from '../scripts/source-files.mjs';
import { zip,unzip } from '../lib/archive.mjs';

test('real source archive includes server entry point, all Docker COPY sources and no runtime secrets',async()=>{
  const files=await sourceFiles(fileURLToPath(new URL('..',import.meta.url)));
  const archive=unzip(zip(files));assertBuildContext(archive);
  assert(archive['server.mjs'].includes("import http from 'node:http'"));
  assert(!Object.keys(archive).some(p=>p==='data'||p.startsWith('data/')||p==='.env'||p.endsWith('secret.key')));
});
test('packaging rejects missing server or required Docker directories',async()=>{
  const files=await sourceFiles(fileURLToPath(new URL('..',import.meta.url)));
  const noServer={...files};delete noServer['server.mjs'];assert.throws(()=>assertBuildContext(noServer),/server\.mjs/);
  const changed={...files,Dockerfile:Buffer.from(files.Dockerfile.toString()+'\nCOPY not-packaged ./not-packaged\n')};assert.throws(()=>assertBuildContext(changed),/Docker COPY input missing/);
});
