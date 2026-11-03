import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore,checkPassword } from '../lib/store.mjs';
import { initAccountMail,mailStatus,queueAccountLink,verifyAccountMail,requestRecovery,recoverPassword,setLeadAlerts,queueLeadAlert,startAccountMailWorker } from '../lib/account-mail.mjs';

test('verified recovery is single-use and lead alerts are bounded and private',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-mail-test-')),store=openStore(dir),db=store.db;
 const previous={key:process.env.RESEND_API_KEY,from:process.env.SITOCAL_MAIL_FROM};
 process.env.RESEND_API_KEY='fixture';process.env.SITOCAL_MAIL_FROM='mail@example.invalid';
 let stop;
 try{
  for(const user of ['owner','other'])db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(user,user+'@example.invalid','oauth-only','now');
  initAccountMail(db);
  const origin='https://app.example.invalid';
  const payload=kind=>store.unseal(db.prepare('SELECT payload FROM account_mail_queue WHERE kind=?').get(kind).payload);
  const token=kind=>payload(kind).text.match(/=[a-f0-9]{64}/)[0].slice(1);
  requestRecovery(store,'owner@example.invalid',origin);
  assert.equal(db.prepare('SELECT count(*) n FROM account_mail_queue').get().n,0);
  queueAccountLink(store,'owner','owner@example.invalid','verify',origin);
  assert.throws(()=>verifyAccountMail(db,'other',token('verify')),/account that requested/);
  assert.equal(verifyAccountMail(db,'owner',token('verify')).verified,true);
  assert.throws(()=>verifyAccountMail(db,'owner',token('verify')),/invalid or expired/);
  assert.equal(mailStatus(db,'owner').verified,true);
  assert.throws(()=>setLeadAlerts(db,'other',true),/Verify your email/);
  setLeadAlerts(db,'owner',true);
  queueLeadAlert(store,'owner',origin);queueLeadAlert(store,'owner',origin);
  assert.equal(db.prepare("SELECT count(*) n FROM account_mail_queue WHERE kind='lead'").get().n,1);
  assert(payload('lead').text.includes('/form-leads?status=new'));
  assert(!payload('lead').text.includes('@'));
  requestRecovery(store,'owner@example.invalid',origin);
  const reset=token('recover');
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run('fixture','owner','csrf',Date.now()+60000);
  recoverPassword(db,reset,'new disposable password');
  assert.equal(db.prepare("SELECT count(*) n FROM sessions WHERE user_id='owner'").get().n,0);
  assert(checkPassword('new disposable password',db.prepare("SELECT password FROM users WHERE id='owner'").get().password));
  assert.throws(()=>recoverPassword(db,reset,'another fixture password'),/invalid or expired/);
  db.prepare("DELETE FROM account_mail_queue WHERE kind!='lead'").run();
  await new Promise((resolve,reject)=>{
   const deadline=setTimeout(()=>reject(Error('Mail fixture timeout')),7000);
   stop=startAccountMailWorker(store,async(url,options)=>{
    try{assert.equal(url,'https://api.resend.com/emails');assert.equal(options.body.to[0],'owner@example.invalid');assert(options.headers['Idempotency-Key']);}
    catch(error){clearTimeout(deadline);reject(error);throw error;}
    setImmediate(()=>{clearTimeout(deadline);resolve();});return {id:'fixture-message'};
   });
  });
  assert.equal(mailStatus(db,'owner').history[0].state,'accepted');
 }finally{
  stop?.();db.close();rmSync(dir,{recursive:true,force:true});
  for(const [key,value] of [['RESEND_API_KEY',previous.key],['SITOCAL_MAIL_FROM',previous.from]])if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
