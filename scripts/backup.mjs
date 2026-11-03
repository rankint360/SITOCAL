import { DatabaseSync, backup } from 'node:sqlite';
import { stat, open } from 'node:fs/promises';
import { resolve } from 'node:path';

async function verify(file){
 if(!(await stat(file)).isFile())throw Error('Choose a database file.');
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Database integrity check failed.');
  for(const table of ['users','sites','revisions','connections']){
   if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))throw Error('This is not a SITOCAL snapshot.');
  }
 }finally{db.close();}
}

const [action,input,output]=process.argv.slice(2);
try{
 if(!input||!['create','verify'].includes(action)||action==='create'&&!output)throw Error('Usage: node scripts/backup.mjs create <database> <new-snapshot> | verify <snapshot>');
 const source=resolve(input);
 if(action==='create'){
  const target=resolve(output);
  await verify(source);
  const file=await open(target,'wx',0o600);await file.close();
  const db=new DatabaseSync(source,{readOnly:true});
  try{await backup(db,target);}finally{db.close();}
  await verify(target);
  console.log('Created and verified a consistent SQLite snapshot.');
 }else{
  await verify(source);
  console.log('SQLite snapshot passed integrity and schema checks.');
 }
}catch(error){console.error(error.message);process.exitCode=1;}
