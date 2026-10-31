import {test} from 'node:test';import assert from 'node:assert/strict';
import {spawn}from'node:child_process';import{mkdtempSync,writeFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{pathToFileURL}from'node:url';import{once}from'node:events';
test('connector HTTP endpoints isolate accounts, enforce CSRF and reset checks',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-connectors-')),origin='http://localhost:4334',preload=join(dir,'fixture.mjs');
 writeFileSync(preload,"globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://api.ahrefs.com/'))return new Response(JSON.stringify(options.headers.Authorization==='Bearer good-fixture'?{limits_and_usage:{}}:{error:'invalid'}));throw Error('Unexpected provider URL');};");
 const proc=spawn(process.execPath,['--import',pathToFileURL(preload).href,'server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATA_DIR:dir,PORT:'4334',HOST:'127.0.0.1',PUBLIC_ORIGIN:origin,BASE_DOMAIN:'',ALLOWED_HOSTS:'localhost,127.0.0.1',ALLOW_SIGNUPS:'true',REGISTRATION_CODE:'fixture'},stdio:['ignore','pipe','pipe']});
 try{
 await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),8000))]);
 const request=async(path,auth={},method='GET',body)=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:auth.cookie||'','X-CSRF-Token':auth.csrf||''},body:body===undefined?undefined:JSON.stringify(body)});
 const register=async(email)=>{const r=await request('/api/auth/register',{},'POST',{email,password:'long-fixture-password',invite:'fixture'});assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).csrf};};
 const a=await register('a@example.invalid'),b=await register('b@example.invalid'),url='/api/connections/ahrefs',verify='/api/connectors/ahrefs/verify';
 assert.equal((await request(verify,{},'POST',{})).status,401);
 assert.equal((await request(url,{cookie:a.cookie},'PUT',{token:'good-fixture'})).status,403);
 assert.equal((await request('/api/connections/claude',a,'PUT',{token:'fixture'})).status,400);
 assert.equal((await request(url,a,'PUT',{token:'good-fixture'})).status,200);
 let list=await(await request('/api/connections',a)).json();assert.deepEqual(list.connections,['ahrefs']);assert.deepEqual(list.checks,[]);assert(!JSON.stringify(list).includes('good-fixture'));
 assert.equal((await(await request(verify,a,'POST',{})).json()).verified,true);
 list=await(await request('/api/connections',a)).json();assert.equal(list.checks[0].verified,true);
 assert.deepEqual((await(await request('/api/connections',b)).json()).connections,[]);
 assert.equal((await request(verify,b,'POST',{})).status,409);
 assert.equal((await request(url,a,'PUT',{token:'bad-fixture'})).status,200);
 assert.deepEqual((await(await request('/api/connections',a)).json()).checks,[]);
 const failed=await(await request(verify,a,'POST',{})).json();assert.equal(failed.verified,false);assert.equal(failed.status,'failed');assert(!JSON.stringify(failed).includes('bad-fixture'));
 assert.equal((await request('/api/connectors/ahrefs/execute',a,'POST',{action:'domain-overview',domain:'example.com'})).status,400);
 assert.equal((await request('/api/connectors/unknown/verify',a,'POST',{})).status,400);
 assert.equal((await request(url,a,'DELETE')).status,200);
 list=await(await request('/api/connections',a)).json();assert.deepEqual(list.connections,[]);assert.deepEqual(list.checks,[]);
 }finally{proc.kill();await once(proc,'exit');rmSync(dir,{recursive:true,force:true});}
});
