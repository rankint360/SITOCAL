import {randomBytes} from 'node:crypto';
import {id,hash,passwordHash} from './store.mjs';
import {atomic,assertAccess} from './admin-data.mjs';
import {ProviderError,request} from './providers.mjs';

const emailPattern=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
export function mailReady(){return Boolean(process.env.RESEND_API_KEY&&emailPattern.test(process.env.SITOCAL_MAIL_FROM||''));}
export function initAccountMail(db){
 db.exec(`CREATE TABLE IF NOT EXISTS verified_account_mail(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,email TEXT NOT NULL,verified INTEGER NOT NULL,lead_alerts INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS account_mail_tokens(digest TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,email TEXT NOT NULL,kind TEXT NOT NULL,expires INTEGER NOT NULL,UNIQUE(user_id,kind));
 CREATE TABLE IF NOT EXISTS account_mail_queue(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS account_mail_pending ON account_mail_queue(state,created);
 CREATE INDEX IF NOT EXISTS account_mail_user ON account_mail_queue(user_id,kind,created);`);
}
function verified(db,user){
 return db.prepare('SELECT m.* FROM verified_account_mail m JOIN users u ON u.id=m.user_id AND u.email=m.email WHERE m.user_id=?').get(user);
}
export function mailStatus(db,user){
 const row=verified(db,user);
 return {available:mailReady(),verified:Boolean(row),leadAlerts:Boolean(row?.lead_alerts),history:db.prepare('SELECT kind,state,created,updated FROM account_mail_queue WHERE user_id=? ORDER BY created DESC LIMIT 12').all(user)};
}
function enqueue(store,user,kind,payload,now,expires){
 store.db.prepare('INSERT INTO account_mail_queue VALUES(?,?,?,?,?,?,?,?)').run(id(),user,kind,store.seal(payload),'queued',now,expires,now);
}
function recent(db,user,kind,since){
 return db.prepare('SELECT 1 FROM account_mail_queue WHERE user_id=? AND kind=? AND created>=?').get(user,kind,since);
}
export function queueAccountLink(store,user,email,kind,origin){
 if(!mailReady())return;
 const db=store.db,now=Date.now();
 atomic(db,()=>{
  if(recent(db,user,kind,now-300000))return;
  const token=randomBytes(32).toString('hex'),expires=now+30*60000;
  const path=kind==='verify'?'/settings#verify=':'/recover#token=';
  const subject=kind==='verify'?'Verify your SITOCAL email':'Reset your SITOCAL password';
  db.prepare('DELETE FROM account_mail_tokens WHERE user_id=? AND kind=?').run(user,kind);
  db.prepare('INSERT INTO account_mail_tokens VALUES(?,?,?,?,?)').run(hash(token),user,email,kind,expires);
  enqueue(store,user,kind,{to:email,subject,text:subject+' using this link, which expires in 30 minutes:\n'+origin+path+token+'\n\nIf you did not ask for this, ignore this email.'},now,expires);
 });
}
export function requestRecovery(store,email,origin){
 const normalized=String(email||'').trim().toLowerCase();
 if(normalized.length>200||!emailPattern.test(normalized))return;
 const account=store.db.prepare("SELECT u.id,u.email FROM users u JOIN verified_account_mail m ON m.user_id=u.id AND m.email=u.email LEFT JOIN user_access a ON a.user_id=u.id WHERE u.email=? AND COALESCE(a.status,'active')='active'").get(normalized);
 if(account)queueAccountLink(store,account.id,account.email,'recover',origin);
}
function tokenRow(db,token,kind){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new ProviderError('This link is invalid or expired',400);
 const row=db.prepare('SELECT t.* FROM account_mail_tokens t JOIN users u ON u.id=t.user_id AND u.email=t.email WHERE t.digest=? AND t.kind=? AND t.expires>?').get(hash(token),kind,Date.now());
 if(!row)throw new ProviderError('This link is invalid or expired',400);
 return row;
}
export function verifyAccountMail(db,user,token){
 return atomic(db,()=>{
  const row=tokenRow(db,token,'verify');
  if(row.user_id!==user)throw new ProviderError('Open this link in the account that requested it',403);
  db.prepare('INSERT INTO verified_account_mail VALUES(?,?,?,0) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,verified=excluded.verified,lead_alerts=CASE WHEN verified_account_mail.email=excluded.email THEN verified_account_mail.lead_alerts ELSE 0 END').run(user,row.email,Date.now());
  db.prepare('DELETE FROM account_mail_tokens WHERE digest=?').run(row.digest);
  return {verified:true};
 });
}
export function recoverPassword(db,token,password){
 if(typeof password!=='string'||password.length<12||password.length>200)throw new ProviderError('Use a password of 12–200 characters',400);
 return atomic(db,()=>{
  const row=tokenRow(db,token,'recover');
  assertAccess(db,row.user_id);
  if(!verified(db,row.user_id))throw new ProviderError('This link is invalid or expired',400);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(password),row.user_id);
  db.prepare('DELETE FROM account_mail_tokens WHERE user_id=?').run(row.user_id);
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);
  db.prepare('UPDATE api_keys SET revoked=1 WHERE user_id=?').run(row.user_id);
  return {saved:true};
 });
}
export function setLeadAlerts(db,user,enabled){
 if(typeof enabled!=='boolean')throw new ProviderError('Choose whether to receive lead alerts',400);
 if(!verified(db,user)||enabled&&!mailReady())throw new ProviderError('Verify your email and configure delivery before enabling alerts',409);
 db.prepare('UPDATE verified_account_mail SET lead_alerts=? WHERE user_id=?').run(Number(enabled),user);
 return {leadAlerts:enabled};
}
export function queueLeadAlert(store,user,origin){
 if(!mailReady())return;
 const db=store.db,row=verified(db,user),now=Date.now();
 if(!row?.lead_alerts||recent(db,user,'lead',now-900000))return;
 enqueue(store,user,'lead',{to:row.email,subject:'New website enquiry in SITOCAL',text:'A new enquiry is ready in your private inbox: '+origin+'/form-leads?status=new'},now,now+3600000);
}
export function startAccountMailWorker(store,send=request){
 const db=store.db;
 db.prepare("UPDATE account_mail_queue SET state='unknown',payload='',updated=? WHERE state='sending'").run(Date.now());
 let active=false;
 const timer=setInterval(async()=>{
  if(active||!mailReady())return;
  active=true;
  try{
   const now=Date.now();
   db.prepare("DELETE FROM account_mail_queue WHERE created<? AND state!='sending'").run(now-30*86400000);
   db.prepare("UPDATE account_mail_queue SET state='expired',payload='',updated=? WHERE state='queued' AND expires<=?").run(now,now);
   const row=db.prepare("SELECT * FROM account_mail_queue WHERE state='queued' ORDER BY created LIMIT 1").get();
   if(!row||!db.prepare("UPDATE account_mail_queue SET state='sending',updated=? WHERE id=? AND state='queued'").run(now,row.id).changes)return;
   let state='accepted';
   try{
    const payload=store.unseal(row.payload);
    const eligible=row.kind==='lead'?verified(db,row.user_id)?.lead_alerts:db.prepare('SELECT 1 FROM account_mail_tokens WHERE user_id=? AND email=? AND kind=? AND expires=?').get(row.user_id,payload.to,row.kind,row.expires);
    if(!eligible)state='canceled';
    else{
     const result=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'sitocal-'+row.id},body:{from:process.env.SITOCAL_MAIL_FROM,to:[payload.to],subject:payload.subject,text:payload.text}});
     if(!result.id)state='unknown';
    }
   }catch{state='unknown';}
   db.prepare("UPDATE account_mail_queue SET state=?,payload='',updated=? WHERE id=?").run(state,Date.now(),row.id);
  }catch(error){console.error('Mail worker failed:',error.name);}
  finally{active=false;}
 },5000);
 timer.unref();return ()=>clearInterval(timer);
}
