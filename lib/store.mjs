import { DatabaseSync } from 'node:sqlite';
import { mkdirSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash,createCipheriv,createDecipheriv } from 'node:crypto';
export const id=()=>randomUUID();
export const hash=s=>createHash('sha256').update(s).digest('hex');
export function openStore(dir){
  mkdirSync(dir,{recursive:true});const db=new DatabaseSync(join(dir,'rankleem.sqlite'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sites(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),data TEXT NOT NULL,created TEXT NOT NULL,updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY,site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,user_id TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS connections(user_id TEXT NOT NULL REFERENCES users(id),provider TEXT NOT NULL,secret TEXT NOT NULL,PRIMARY KEY(user_id,provider));
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,site_id TEXT,kind TEXT NOT NULL,status TEXT NOT NULL,result TEXT NOT NULL,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,config TEXT NOT NULL,data TEXT NOT NULL,created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY,user_id TEXT NOT NULL,verifier TEXT NOT NULL,expires INTEGER NOT NULL);
  `);
  // In-flight network writes cannot safely be retried automatically after a crash.
  db.prepare("UPDATE jobs SET status='unknown',result=? WHERE status='running'").run(JSON.stringify({message:'Server restarted before provider outcome was confirmed. Reconcile with provider before retrying.'}));
  let key=process.env.ENCRYPTION_KEY;
  if(!key){const f=join(dir,'secret.key');if(existsSync(f))key=readFileSync(f,'utf8').trim();else{key=randomBytes(32).toString('hex');writeFileSync(f,key,{mode:0o600,flag:'wx'});}}
  if(!/^[a-f0-9]{64}$/i.test(key))throw Error('ENCRYPTION_KEY must be 64 hex characters');const secretKey=Buffer.from(key,'hex');
  function seal(value){const iv=randomBytes(12),c=createCipheriv('aes-256-gcm',secretKey,iv),out=Buffer.concat([c.update(JSON.stringify(value)),c.final()]);return Buffer.concat([iv,c.getAuthTag(),out]).toString('base64');}
  function unseal(value){const b=Buffer.from(value,'base64'),d=createDecipheriv('aes-256-gcm',secretKey,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([d.update(b.subarray(28)),d.final()]).toString());}
  return {db,seal,unseal};
}
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function checkPassword(password,stored){const [salt,digest]=stored.split(':');const input=scryptSync(password,salt,64),expected=Buffer.from(digest,'hex');return input.length===expected.length&&timingSafeEqual(input,expected);}
