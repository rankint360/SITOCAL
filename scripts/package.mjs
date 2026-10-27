import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zip,unzip } from '../lib/archive.mjs';
import { sourceFiles } from './source-files.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=await sourceFiles(root),archive=zip(files),check=unzip(archive);
if(Object.keys(check).some(n=>n.startsWith('data/')||n==='.env'||n.endsWith('secret.key')))throw Error('Refusing to package runtime secrets');
const target=path.join(root,'..','rankleem-source.zip');await writeFile(target,archive);console.log(`Packaged ${Object.keys(check).length} source files to ${target}. Runtime data and secrets excluded.`);
