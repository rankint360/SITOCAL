import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {openStore,passwordHash} from '../lib/store.mjs';

test('draft to deployment, lead, Search Console and rank tracking with provider fixtures',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-launch-fixture-')),origin='http://localhost:4367';
 const email='owner@example.invalid',password='disposable fixture password',key='22'.repeat(32),prior=process.env.ENCRYPTION_KEY;
 process.env.ENCRYPTION_KEY=key;
 const store=openStore(dir);
 try{
  store.db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('owner',email,passwordHash(password),'now');
  const insert=store.db.prepare('INSERT INTO connections VALUES(?,?,?)');
  for(const [provider,config] of [['netlify',{token:'fixture',project:'fixture-site'}],['google',{access_token:'fixture',expires_at:Date.now()+600000}],['dataforseo',{login:'fixture',password:'fixture'}],['openai',{token:'fixture',model:'fixture'}]])insert.run('owner',provider,store.seal(config));
 }finally{
  store.db.close();
  if(prior===undefined)delete process.env.ENCRYPTION_KEY;else process.env.ENCRYPTION_KEY=prior;
 }
 const proc=spawn(process.execPath,['--import',new URL('./launch-fixture-provider.mjs',import.meta.url).href,'server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'4367',HOST:'127.0.0.1',DATA_DIR:dir,ENCRYPTION_KEY:key,PUBLIC_ORIGIN:origin,AUTH_ORIGIN:origin,BASE_DOMAIN:'example.invalid',ALLOW_SIGNUPS:'false',SITOCAL_DISABLE_WORKERS:'true',RESEND_API_KEY:''},stdio:['ignore','pipe','pipe']});
 let logs='';
 proc.stderr.on('data',data=>logs+=data);
 try{
  await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timed out: '+logs)),8000))]);
  let cookie='',csrf='';
  const call=async(path,method='GET',body)=>{
   const res=await fetch(origin+path,{method,headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
   const value=await res.json();
   assert(res.ok,method+' '+path+' '+JSON.stringify(value)+' '+logs);
   return [value,res];
  };
  const [session,response]=await call('/api/auth/login','POST',{email,password});
  cookie=response.headers.get('set-cookie').split(';')[0];csrf=session.csrf;
  const [site]=await call('/api/sites','POST',{business:'Fixture Plumbing',city:'Austin',services:'Drain cleaning'});
  const base='/api/sites/'+site.id;
  const original=site.data.pages[0].sections[0];
  const [rewrite]=await call(base+'/rewrite-section','POST',{provider:'openai',style:'concise',reviewed:true,section:original});
  assert.equal(rewrite.section.heading,'Clear the drain');
  assert.equal((await call(base))[0].data.pages[0].sections[0].heading,original.heading);
  await call(base+'/launch','PUT',{source:'',host:'netlify',origin:'https://launch.example.invalid',checked:[],revision:site.updated});
  const [published]=await call(base+'/publish','POST',{source:'',host:'netlify',reviewed:true});
  const [deployment]=await call(base+'/deployment-status','POST',{jobId:published.jobId});
  assert.equal(deployment.state,'ready');
  const enquiry=await fetch(origin+'/website-contact/'+site.id,{method:'POST',redirect:'manual',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({name:'Fixture lead',email:'lead@example.invalid',message:'Please quote drain cleaning.'})});
  assert.equal(enquiry.status,303);
  assert.equal((await call('/api/workspace/leads'))[0].leads[0].site_id,site.id);
  const property='https://launch.example.invalid/';
  await call(base+'/search/property','PUT',{property});
  assert.equal((await call(base+'/search'))[0].property,property);
  assert.equal((await call('/api/indexing/inspect','POST',{property,url:property}))[0].verdict,'PASS');
  const [tracker]=await call(base+'/search/keywords','POST',{keyword:'drain cleaning Austin',location:2840,device:'mobile'});
  await call(base+'/search/keywords/'+tracker.id,'POST',{reviewed:true});
  const [search]=await call(base+'/search');
  assert.equal(search.history[0].data.targets[0].position,2);
 }finally{
  proc.kill();await once(proc,'exit');rmSync(dir,{recursive:true,force:true});
 }
});
