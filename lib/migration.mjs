import { DatabaseSync } from 'node:sqlite';
import { existsSync,mkdirSync,readFileSync,readdirSync,renameSync,writeFileSync } from 'node:fs';
import { join,basename } from 'node:path';
import { randomUUID } from 'node:crypto';

function check(file){
  const db=new DatabaseSync(file,{readOnly:true});
  try{
    if(Object.values(db.prepare('PRAGMA quick_check').get())[0]!=='ok')throw Error('Database integrity check failed');
    for(const table of ['users','sites'])if(!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table))throw Error('Unrecognized application database; migration stopped');
  }finally{db.close();}
}

// Snapshot old application storage before switching names. Source/WAL are never discarded.
export function prepareDatabase(dir){
  mkdirSync(dir,{recursive:true});const target=join(dir,'sitocal.sqlite'),marker=join(dir,'brand-migration.json');
  let state=existsSync(marker)?JSON.parse(readFileSync(marker,'utf8')):null;
  if(state?.state==='complete'){
    if(!existsSync(target))throw Error('Migrated database missing; restore the database before starting');
    return target;
  }
  if(!state){
    if(existsSync(target))return target;
    const candidates=readdirSync(dir).filter(name=>name.endsWith('.sqlite')&&!name.startsWith('sitocal-'));
    if(!candidates.length)return target;
    if(candidates.length!==1)throw Error('Multiple prior databases found; migration stopped to avoid selecting the wrong accounts');
    check(join(dir,candidates[0]));
    state={state:'started',source:candidates[0],staging:'sitocal-migration-'+randomUUID()+'.sqlite',backup:'before-sitocal-'+randomUUID()+'.sqlite'};
    writeFileSync(marker,JSON.stringify(state),{flag:'wx',mode:0o600});
  }
  for(const key of ['source','staging','backup'])if(typeof state[key]!=='string'||basename(state[key])!==state[key]||!state[key].endsWith('.sqlite'))throw Error('Invalid migration state');
  const source=join(dir,state.source),staging=join(dir,state.staging);
  if(!existsSync(target)){
    if(!existsSync(staging)){
      const prior=new DatabaseSync(source);
      try{prior.exec("VACUUM INTO '"+staging.replaceAll("'","''")+"'");}finally{prior.close();}
    }
    check(staging);renameSync(staging,target);
  }
  check(target);
  const backupDir=join(dir,'migration-backups');mkdirSync(backupDir,{recursive:true});
  for(const suffix of ['','-wal','-shm'])if(existsSync(source+suffix))renameSync(source+suffix,join(backupDir,state.backup+suffix));
  writeFileSync(marker,JSON.stringify({state:'complete',target:'sitocal.sqlite',backup:state.backup}),{mode:0o600});
  return target;
}

export function sessionCandidates(header=''){
  return String(header).split(';').map(part=>part.trim().split('=')).filter(([name,value])=>/^[a-z0-9_-]+_session$/i.test(name)&&/^[a-f0-9]{64}$/i.test(value||'')).sort((a,b)=>Number(b[0]==='sitocal_session')-Number(a[0]==='sitocal_session')).slice(0,4);
}

export function findManifest(files,validate){
  const entries=Object.entries(files),primary=entries.find(([name])=>name==='sitocal.json'||name.endsWith('/sitocal.json'));
  if(primary)return validate(JSON.parse(primary[1].toString()));
  // Earlier exports are accepted by validated structure rather than a retired brand filename.
  for(const [name,content]of entries.filter(([name])=>name.endsWith('.json'))){
    try{const data=JSON.parse(content.toString());if(data?.version===1&&Array.isArray(data.pages))return validate(data);}catch{}
  }
  return null;
}
