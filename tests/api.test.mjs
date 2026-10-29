import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve,sep } from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { unzip } from '../lib/archive.mjs';

test('account isolation, CSRF, builder-editor-revision-ZIP-converter flow and missing-provider honesty',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'rankleem-api-')),origin='http://localhost:4318';
  const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATA_DIR:dir,PORT:'4318',PUBLIC_ORIGIN:origin,HOST:'127.0.0.1',BASE_DOMAIN:'ppc.pm',ALLOWED_HOSTS:'localhost,127.0.0.1',ALLOW_SIGNUPS:'true',REGISTRATION_CODE:'qa-invite-fixture',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''},stdio:['ignore','pipe','pipe']});
  try{
    await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server startup timed out')),8000))]);
    const call=async(endpoint,{method='GET',body,cookie='',csrf='',headers={}}={})=>{const r=await fetch(origin+endpoint,{method,headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,...headers},body:body===undefined?undefined:JSON.stringify(body)});return r;};
    assert.equal((await call('/api/sites')).status,401);
    const entry=await (await call('/')).text();assert(entry.includes('/assets/fieldwork.css'));assert(entry.includes('/assets/landing.css'));assert(entry.includes('/assets/brand/icon.svg'));
    const landingCss=await call('/assets/landing.css');assert.equal(landingCss.status,200);assert(landingCss.headers.get('content-type').startsWith('text/css'));
    for(const name of ['logo','logo-dark','icon','icon-dark']){const r=await call('/assets/brand/'+name+'.svg');assert.equal(r.status,200);assert(r.headers.get('content-type').startsWith('image/svg+xml'));assert((await r.text()).includes('<svg'));}
    assert.equal((await call('/assets/brand/unknown.svg')).status,404);
    const badInvite=await call('/api/auth/register',{method:'POST',body:{email:'test@example.com',password:'unique passphrase 12345',invite:'wrong'}});assert.equal(badInvite.status,403);
    const hostRequest=host=>new Promise((resolve,reject)=>{const req=httpRequest(origin+'/',{headers:{Host:host}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
    const dummy=await hostRequest('ppc.pm');assert.equal(dummy.status,200);assert(dummy.text.includes('name="rankleem-domain" content="ppc.pm"'));assert.equal((await hostRequest('evilppc.pm')).status,400);
    const register=await call('/api/auth/register',{method:'POST',body:{email:'test@example.com',password:'unique passphrase 12345',invite:'qa-invite-fixture'}});assert.equal(register.status,200);const cookie=register.headers.get('set-cookie').split(';')[0],auth=await register.json(),csrf=auth.csrf;
    const second=await call('/api/auth/register',{method:'POST',body:{email:'other@example.com',password:'another passphrase 12345',invite:'qa-invite-fixture'}});const other=second.headers.get('set-cookie').split(';')[0];
    assert.equal((await call('/api/sites',{method:'POST',cookie,body:{business:'Test',city:'Austin'}})).status,403);
    const create=await call('/api/sites',{method:'POST',cookie,csrf,body:{business:'Austin Flow',city:'Austin',services:'Drain cleaning'}});assert.equal(create.status,201);let site=await create.json();assert.equal(site.data.pages.length,5);
    assert.equal((await call('/api/sites/'+site.id,{cookie:other})).status,404);
    site.data.pages[0].sections[0].heading='A carefully edited heading';const saved=await call('/api/sites/'+site.id,{method:'PUT',cookie,csrf,body:site.data});assert.equal(saved.status,200);
    const preview=await call(`/api/sites/${site.id}/preview?edit=1`,{cookie});assert.equal(preview.status,200);assert((await preview.text()).includes('A carefully edited heading'));assert(preview.headers.get('content-security-policy').includes("default-src 'none'"));
    const draft=await call('/api/sites/'+site.id+'/draft-preview',{method:'POST',cookie,csrf,body:site.data});const key=(await draft.json()).key;assert.equal((await call(`/api/sites/${site.id}/preview?draft=${key}`,{cookie:other})).status,404);
    const archive=await call(`/api/sites/${site.id}/export`,{cookie});assert.equal(archive.status,200);const bytes=Buffer.from(await archive.arrayBuffer()),files=unzip(bytes);assert(files['index.html']);assert(JSON.parse(files['rankleem.json']).pages[0].sections[0].heading==='A carefully edited heading');
    const converted=await call(`/api/sites/${site.id}/convert?format=elementor`,{cookie});assert.equal(converted.status,200);assert.equal(JSON.parse(unzip(Buffer.from(await converted.arrayBuffer()))['home.json']).version,'0.4');
    const block=await call(`/api/sites/${site.id}/convert?format=gutenberg`,{cookie});assert(unzip(Buffer.from(await block.arrayBuffer()))['home.html'].includes('wp:heading'));
    const revisions=await (await call(`/api/sites/${site.id}/revisions`,{cookie})).json();assert.equal(revisions.revisions.length,2);assert.equal((await call(`/api/sites/${site.id}/restore`,{method:'POST',cookie,csrf,body:{revision:revisions.revisions[1].id}})).status,200);
    const imported=await fetch(origin+'/api/import',{method:'POST',headers:{Origin:origin,Cookie:cookie,'X-CSRF-Token':csrf,'Content-Type':'application/zip'},body:bytes});assert.equal(imported.status,201);
    const disabled=await call('/api/serp/check',{method:'POST',cookie,csrf,body:{domain:'example.com',keyword:'plumber',locationCode:2840}});assert.equal(disabled.status,409);assert((await disabled.json()).error.includes('Connect dataforseo'));
    const conn=await call('/api/connections/github',{method:'PUT',cookie,csrf,body:{token:'never-return-this-secret',repository:'a/b'}});assert.equal(conn.status,200);const safe=await(await call('/api/connections',{cookie})).text();assert(!safe.includes('never-return'));
    assert.equal((await call('/api/google/start',{method:'POST',cookie,csrf,body:{}})).status,409);
    const crossOrigin=await call('/api/sites',{method:'POST',cookie,csrf,headers:{Origin:'https://evil.example'},body:{}});assert.equal(crossOrigin.status,403);
    for(const page of ['/','/app','/editor','/wp','/serp','/domains','/publish','/integrations'])assert.equal((await call(page)).status,200);
    const logout=await call('/api/auth/logout',{method:'POST',cookie,csrf,body:{}});assert.equal(logout.status,200);assert.equal((await call('/api/sites',{cookie})).status,401);
  }finally{proc.kill();await once(proc,'exit');const target=resolve(dir),base=resolve(tmpdir())+sep;if(!target.startsWith(base)||!target.split(sep).pop().startsWith('rankleem-api-'))throw Error('Unsafe test cleanup');rmSync(target,{recursive:true,force:true});}
});
