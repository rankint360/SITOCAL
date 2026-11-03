import {serpumFeatureRoutes} from '../public/serpum-features.js';
import {serpumArticles} from '../public/serpum-data.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve,sep } from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { unzip } from '../lib/archive.mjs';

test('website leads and payout records stay isolated and generation history links the saved site',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'sitocal-api-')),origin='http://localhost:4328';
  const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATA_DIR:dir,PORT:'4328',PUBLIC_ORIGIN:origin,HOST:'127.0.0.1',BASE_DOMAIN:'ppc.pm',ALLOWED_HOSTS:'localhost,127.0.0.1',ALLOW_SIGNUPS:'true',SERPUM_GEOCODING_ENABLED:'false',REGISTRATION_CODE:'qa-invite-fixture',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',AUTH_GOOGLE_CLIENT_ID:'',AUTH_GOOGLE_CLIENT_SECRET:'',AUTH_GITHUB_CLIENT_ID:'',AUTH_GITHUB_CLIENT_SECRET:'',AUTH_LINKEDIN_CLIENT_ID:'',AUTH_LINKEDIN_CLIENT_SECRET:''},stdio:['ignore','pipe','pipe']});
  try{
    await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timed out')),8000))]);
    const call=async(endpoint,{method='GET',body,cookie='',csrf='',headers={}}={})=>{const r=await fetch(origin+endpoint,{method,headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)});return r;};
    const register=await call('/api/auth/register',{method:'POST',body:{email:'test@example.com',password:'unique passphrase 12345',invite:'qa-invite-fixture'}});assert.equal(register.status,200);const cookie=register.headers.get('set-cookie').split(';')[0],auth=await register.json(),csrf=auth.csrf;
    const second=await call('/api/auth/register',{method:'POST',body:{email:'other@example.com',password:'another passphrase 12345',invite:'qa-invite-fixture'}});const other=second.headers.get('set-cookie').split(';')[0],otherAuth=await second.json();
    assert.equal((await call('/api/sites',{method:'POST',cookie,body:{business:'Test',city:'Austin'}})).status,403);
    const create=await call('/api/sites',{method:'POST',cookie,csrf,body:{business:'Austin Flow',city:'Austin',services:'Drain cleaning'}});assert.equal(create.status,201);let site=await create.json();assert.equal(site.data.pages.length,5);
    const publicContact='/website-contact/'+site.id;
    assert.equal((await call(publicContact)).status,200);
    assert.equal((await call('/api/workspace/leads')).status,401);
    const contactHeaders={'Content-Type':'application/x-www-form-urlencoded',Origin:origin};
    const submission=new URLSearchParams({name:'Fixture lead',email:'lead@example.invalid',message:'Please send a quote.'});
    assert.equal((await fetch(origin+publicContact,{method:'POST',headers:{...contactHeaders,Origin:'https://foreign.example'},body:submission,redirect:'manual'})).status,403);
    assert.equal((await fetch(origin+publicContact,{method:'POST',headers:contactHeaders,body:submission,redirect:'manual'})).status,303);
    const inbox=await(await call('/api/workspace/leads',{cookie})).json();
    assert.equal(inbox.leads.length,1);
    assert.equal((await(await call('/api/workspace/leads',{cookie:other})).json()).leads.length,0);
    const leadUpdate={id:inbox.leads[0].id,status:'contacted'};
    assert.equal((await call('/api/workspace/leads',{method:'PATCH',cookie:other,csrf:otherAuth.csrf,body:leadUpdate})).status,404);
    assert.equal((await call('/api/workspace/leads',{method:'PATCH',cookie,csrf,body:leadUpdate})).status,200);
    assert.equal((await(await call('/api/workspace/leads?status=new',{cookie})).json()).leads.length,0);
    const payout={siteId:site.id,day:'2026-11-03',calls:8,paid:3,payout:'24.50',currency:'USD'};
    assert.equal((await call('/api/workspace/calls',{method:'POST',cookie:other,csrf:otherAuth.csrf,body:payout})).status,404);
    assert.equal((await call('/api/workspace/calls',{method:'POST',cookie,csrf,body:payout})).status,200);
    assert.equal((await call('/api/workspace/calls',{method:'POST',cookie,csrf,body:{...payout,payout:'30.00'}})).status,200);
    const callRecords=(await(await call('/api/workspace/calls',{cookie})).json()).records;
    assert.equal(callRecords.length,1);
    assert.equal(callRecords[0].cents,3000);
    assert.equal((await(await call('/api/workspace/calls',{cookie:other})).json()).records.length,0);
    const history=await(await call('/api/jobs',{cookie})).json();
    assert(history.jobs.some(job=>job.kind==='template-generation'&&job.site_id===site.id));
    for(const path of ['/my-websites','/generations','/deployments','/form-leads','/call-earnings','/upgrade'])assert.equal((await call(path,{cookie})).status,200,path);
  }finally{proc.kill();await once(proc,'exit');const target=resolve(dir),base=resolve(tmpdir())+sep;if(!target.startsWith(base)||!target.split(sep).pop().startsWith('sitocal-api-'))throw Error('Unsafe test cleanup');rmSync(target,{recursive:true,force:true});}
});
