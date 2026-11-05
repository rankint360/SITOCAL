import {publicRoutes} from '../public/marketing.js';
import{test}from'node:test';import assert from'node:assert/strict';import{pageHref,entryRedirect,safeEntryDestination}from'../public/page-routes.js';import{uiHarness}from'../scripts/ui-preview.mjs';import{spawn}from'node:child_process';import{mkdtempSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{once}from'node:events';import{request as httpRequest}from'node:http';
test('canonical destinations distinguish signup/workspace and unify SERP without unsafe returns',()=>{
 const context={baseDomain:'sitocal.com',hostname:'sitocal.com',signedIn:true};
 assert.equal(pageHref('app',context),'https://app.sitocal.com/');assert.equal(pageHref('register',context),'https://app.sitocal.com/register');assert.equal(pageHref('serp',context),'https://serp.sitocal.com/');assert.equal(pageHref('admin',context),'https://admin.sitocal.com/');
 assert.equal(pageHref('serp',{...context,signedIn:false}),'https://app.sitocal.com/login?returnTo=%2Fserp');assert.equal(pageHref('login',context,'?signup=1&returnTo=%2Fserp'),'https://app.sitocal.com/register?returnTo=%2Fserp');
 for(const value of ['https://evil.example','//evil.example','/serp?redirect=https://evil.example','/admin','javascript:alert(1)'])assert.equal(safeEntryDestination(value),'app');
 assert.equal(entryRedirect({baseDomain:'sitocal.com',hostname:'serp.sitocal.com',path:'/',signedIn:true}),null);
});
test('admin dashboard is discoverable in public resources, auth and signed-in navigation',async()=>{
 const h=await uiHarness();h.setState({session:{user:{email:'fixture@example.invalid'}},sites:[]});const app=await h.render('overview');assert.equal((app.match(/href="\/admin"/g)||[]).length,2);
 const publicPage=await h.render('public:about');assert(publicPage.includes('Admin Dashboard'));assert(publicPage.includes('Separate administrator sign-in'));assert(publicPage.includes('href="/admin"'));
 const auth=await h.render('login');assert(auth.includes('href="/admin"'));assert(auth.includes('Admin Dashboard'));
});
test('production-host redirects preserve sessions and show one session-aware SERP entry',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-entry-')),origin='http://localhost:4344';
 const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'4344',DATA_DIR:dir,HOST:'127.0.0.1',BASE_DOMAIN:'fixture.example',PUBLIC_ORIGIN:origin,ALLOW_SIGNUPS:'true',REGISTRATION_CODE:'fixture'},stdio:['ignore','pipe','pipe']});
 try{
 await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),8000))]);
 const hostCall=(path,host,cookie='',method='GET')=>new Promise((resolve,reject)=>{const req=httpRequest(origin+path,{method,headers:{Host:host,Cookie:cookie}},r=>{const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>resolve({status:r.statusCode,location:r.headers.location,body:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end();});
 let r=await hostCall('/app','fixture.example');assert.equal(r.status,302);assert.equal(r.location,'https://app.fixture.example/login?returnTo=%2Fapp');
 r=await hostCall('/register','fixture.example');assert.equal(r.status,301);assert.equal(r.location,'https://app.fixture.example/register');
 r=await hostCall('/login?signup=1&returnTo=%2Fserp','app.fixture.example');assert.equal(r.location,'https://app.fixture.example/register?returnTo=%2Fserp');
 const reg=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'entry@example.invalid',password:'fixture-entry-password',invite:'fixture'})});assert.equal(reg.status,200);const cookie=reg.headers.get('set-cookie').split(';')[0];
 r=await hostCall('/register','app.fixture.example',cookie);assert.equal(r.status,302);assert.equal(r.location,'https://app.fixture.example/');
 r=await hostCall('/app?ref=bookmark','fixture.example',cookie);assert.equal(r.status,301);assert.equal(r.location,'https://app.fixture.example/?ref=bookmark');
 r=await hostCall('/','app.fixture.example',cookie);assert.equal(r.status,200);assert(!r.body.includes('data-register="true"'));
 for(const host of ['fixture.example','serp.fixture.example']){r=await hostCall('/serp?ref=bookmark',host,cookie);assert.equal(r.status,301);assert.equal(r.location,'https://serp.fixture.example/?ref=bookmark');}
 r=await hostCall('/','serp.fixture.example');assert.equal(r.status,200);assert(r.body.includes('Before you build.'));assert(r.body.includes('https://app.fixture.example/login?returnTo=%2Fserp'));
 r=await hostCall('/','serp.fixture.example',cookie);assert.equal(r.status,200);assert(r.body.includes('noindex,nofollow'));assert(!r.body.includes('aria-label="Main navigation"'));
 r=await hostCall('/login?returnTo=https%3A%2F%2Fevil.example','app.fixture.example',cookie);assert.equal(r.location,'https://app.fixture.example/');

 const editorHost='editor.fixture.example',adminHost='admin.fixture.example';
 const project='9b882aba-c560-4f04-9314-8349520bb514';
 const returnTo='/editor?site='+project+'&open=add-page';
 const unauthenticated=await hostCall('/?site='+project+'&open=add-page',editorHost);
 assert.equal(unauthenticated.status,302);
 assert.equal(unauthenticated.location,'https://app.fixture.example/login?returnTo='+encodeURIComponent(returnTo));
 r=await hostCall('/login?returnTo='+encodeURIComponent(returnTo+'&redirect=https://evil.example'),'app.fixture.example',cookie);
 assert.equal(r.location,'https://'+editorHost+'/?site='+project+'&open=add-page');
 for(const host of ['fixture.example','www.fixture.example','app.fixture.example',editorHost,'wp.fixture.example','serp.fixture.example',adminHost]){
  assert.equal((await hostCall('/api/health',host)).status,200,host);
  const page=await hostCall('/',host,cookie);
  assert.equal(page.status,200,host);
  assert(page.body.includes(host===adminHost?'/assets/admin.js':'/assets/app.js'),host);
  assert.equal((await hostCall('/',host,cookie,'HEAD')).status,200,host);
  const script=await hostCall('/assets/appearance.js',host,'','HEAD');
  assert.equal(script.status,200,host);
  assert.equal(script.body,'');
 }
 for(const path of publicRoutes){
  const host=path==='serpum'||path.startsWith('serpum/')?'serp.fixture.example':'fixture.example';
  const page=await hostCall('/'+path,host);
  assert.equal(page.status,200,path);
  assert(page.body.includes('<main'),path);
 }
 assert.equal((await hostCall('/api/sites',adminHost,cookie)).status,403);
 assert.equal((await hostCall('/api/admin/view?section=users',adminHost,cookie)).status,401);
 assert((await hostCall('/',editorHost,cookie)).body.includes('noindex,nofollow'));
 assert((await hostCall('/account','app.fixture.example',cookie)).body.includes('noindex,nofollow'));
 }finally{proc.kill();await once(proc,'exit');rmSync(dir,{recursive:true,force:true});}
});
