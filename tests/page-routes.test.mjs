import {test} from 'node:test';import assert from 'node:assert/strict';
import {pageAliases,canonicalPagePath,workspaceRoute}from'../public/page-routes.js';import{safeReturn}from'../lib/social-auth.mjs';import{uiHarness}from'../scripts/ui-preview.mjs';
import{spawn}from'node:child_process';import{mkdtempSync,rmSync}from'node:fs';import{join}from'node:path';import{tmpdir}from'node:os';import{once}from'node:events';
test('canonical tool routes preserve workspace identity and safe sign-in returns',()=>{
 assert.equal(canonicalPagePath('developer'),'api-mcp');assert.equal(canonicalPagePath('indexing'),'google-indexer');
 for(const route of ['api-mcp','google-indexer','integrations'])assert.equal(safeReturn('/'+route),'/'+route);
 assert.equal(safeReturn('//evil.example'),'/app');assert.equal(safeReturn('https://evil.example/api-mcp'),'/app');
 assert.equal(workspaceRoute('api-mcp'),'developer');assert.equal(workspaceRoute('google-indexer'),'indexing');
 assert.equal(new Set(Object.values(pageAliases)).size,Object.keys(pageAliases).length);
});
test('signed-in navigation puts Integrations directly after Pricing and uses canonical tool links',async()=>{
 const h=await uiHarness();h.setState({session:{user:{email:'fixture@example.invalid'}},sites:[]});const html=await h.render('overview');
 const nav=html.match(/<nav class="fieldwork-nav"[\s\S]*?<\/nav>/)[0];
 assert(nav.indexOf('>Pricing</span>')<nav.indexOf('>Integrations</span>'));assert(/>Pricing<\/span><\/a><a[^>]+href="\/integrations"/.test(nav));
 assert(html.includes('href="/api-mcp"'));assert(html.includes('href="/google-indexer"'));assert(!html.includes('href="/developer"'));assert(!html.includes('href="/indexing"'));
 const publicHtml=await h.render('public:about');assert(publicHtml.indexOf('>Pricing</a>')<publicHtml.indexOf('data-member-integrations'));assert(publicHtml.includes('data-member-integrations hidden'));
});
test('legacy pages redirect with queries, public tool introductions remain readable and signed-in tools stay private',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-routes-')),origin='http://localhost:4336';
 const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,DATA_DIR:dir,PORT:'4336',HOST:'127.0.0.1',PUBLIC_ORIGIN:origin,BASE_DOMAIN:'',ALLOW_SIGNUPS:'true',REGISTRATION_CODE:'fixture'},stdio:['ignore','pipe','pipe']});
 try{
 await Promise.race([once(proc.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Startup timeout')),8000))]);
 for(const [old,target]of Object.entries(pageAliases)){const r=await fetch(origin+old+'?returnTo=%2Fintegrations&ref=bookmark',{redirect:'manual'});assert.equal(r.status,301);assert.equal(r.headers.get('location'),target+'?returnTo=%2Fintegrations&ref=bookmark');assert.equal((await fetch(origin+target)).status,200);}
 const module=await fetch(origin+'/assets/page-routes.js');assert.equal(module.status,200);assert(module.headers.get('content-type').includes('javascript'));
 for(const path of ['/api-mcp','/google-indexer']){const r=await fetch(origin+path);const html=await r.text();assert.equal((html.match(/<h1(?:\s[^>]*)?>/g)||[]).length,1);assert(!html.includes('noindex,nofollow'));assert(html.includes('returnTo=%2F'+path.slice(1))||html.includes('returnTo=/'));}
 const registered=await fetch(origin+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'route@example.invalid',password:'fixture-long-password',invite:'fixture'})});assert.equal(registered.status,200);
 const cookie=registered.headers.get('set-cookie').split(';')[0];
 for(const path of ['/api-mcp','/google-indexer']){const r=await fetch(origin+path,{headers:{Cookie:cookie}});assert.equal(r.status,200);const html=await r.text();assert(html.includes('noindex,nofollow'));assert(!html.includes('aria-label="Main navigation"'));assert.equal(r.headers.get('cache-control'),'no-store');}
 for(const endpoint of ['/api/developer/keys','/api/indexing/history','/api/indexing/batches'])assert.equal((await fetch(origin+endpoint,{headers:{Cookie:cookie}})).status,200);
 }finally{proc.kill();await once(proc,'exit');rmSync(dir,{recursive:true,force:true});}
});
