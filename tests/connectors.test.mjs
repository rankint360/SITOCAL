import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyConnector,executeConnector,validateExtraConfig} from '../lib/connectors.mjs';
import {connectorRequest} from '../lib/connector-http.mjs';
import {generateSite} from '../lib/ai.mjs';
import {draftSite} from '../lib/sites.mjs';
const config={token:'fixture-secret',model:'fixture-model',repository:'owner/repo',project:'project',account:'account',email:'fixture@example.invalid',password:'fixture',login:'fixture'};
async function fixture(fn,handler){const old=globalThis.fetch;globalThis.fetch=handler;try{return await fn();}finally{globalThis.fetch=old;}}
test('all direct connectors check account/model access with fixed URLs and correct authorization',async()=>{
 const cases=[
 ['openai','api.openai.com',{id:'fixture-model'},'Bearer fixture-secret'],
 ['claude','api.anthropic.com',{id:'fixture-model'},null],
 ['gemini','generativelanguage.googleapis.com',{supportedGenerationMethods:['generateContent']},null],
 ['grok','api.x.ai',{id:'fixture-model'},'Bearer fixture-secret'],
 ['github','api.github.com',{id:1,permissions:{push:true}},'Bearer fixture-secret'],
 ['gitlab','gitlab.com',{id:1},null],['bitbucket','api.bitbucket.org',{uuid:'fixture'},'Basic '],
 ['netlify','api.netlify.com',{id:1},'Bearer fixture-secret'],['vercel','api.vercel.com',{id:1},'Bearer fixture-secret'],
 ['render','api.render.com',{id:1},'Bearer fixture-secret'],['registrar','api.cloudflare.com',{success:true,result:{id:1}},'Bearer fixture-secret'],
 ['dataforseo','api.dataforseo.com',{status_code:20000,tasks:[{status_code:20000}]},'Basic '],
 ['ahrefs','api.ahrefs.com',{limits_and_usage:{}},'Bearer fixture-secret'],
 ['seranking','api.seranking.com',{plan:'fixture'},'Token fixture-secret'],
 ['semrush','www.semrush.com','12345',null],['cursor','api.cursor.com',{agents:[]},'Basic ']
 ];
 for(const [provider,host,result,authorization]of cases)await fixture(async()=>assert.equal((await verifyConnector(provider,config)).verified,true),async(url,options)=>{assert.equal(new URL(url).hostname,host);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert(options.signal);if(authorization)assert(options.headers.Authorization.startsWith(authorization));if(provider==='claude')assert.equal(options.headers['x-api-key'],config.token);if(provider==='gemini')assert.equal(options.headers['x-goog-api-key'],config.token);return new Response(typeof result==='string'?result:JSON.stringify(result));});
});
test('Cloudflare hook verification is local only and never triggers a deployment',async()=>fixture(async()=>{const r=await verifyConnector('cloudflare',{hook:'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/fixture'});assert.equal(r.verified,false);assert.equal(r.status,'format-valid');for(const hook of ['http://127.0.0.1/secret','https://api.cloudflare.com.evil.example/client/v4/pages/webhooks/deploy_hooks/a','https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/a?secret=x'])await assert.rejects(()=>verifyConnector('cloudflare',{hook}));},()=>{throw Error('Must not call network');}));
test('connector failures never expose provider secrets or mark access verified',async()=>{await fixture(async()=>{await assert.rejects(()=>verifyConnector('ahrefs',config),e=>e.status===422&&!e.message.includes(config.token));},async()=>new Response(config.token,{status:403}));for(const result of [{success:false},{error:'fixture-secret'}])await fixture(()=>assert.rejects(()=>verifyConnector('registrar',config)),async()=>new Response(JSON.stringify(result)));});
test('reports require review, validate domain/database, and never accept arbitrary actions or URLs',async()=>fixture(async()=>{for(const input of [{action:'domain-overview',domain:'example.com'},{action:'anything',reviewed:true,domain:'example.com'},{action:'domain-overview',reviewed:true,domain:'http://127.0.0.1/'},{action:'domain-overview',reviewed:true,domain:'example.com',database:'us&key=stolen'}])await assert.rejects(()=>executeConnector('semrush',config,input));assert.throws(()=>validateExtraConfig('gemini',{token:'fixture',model:'https://evil.example'}));},()=>{throw Error('Invalid request reached network');}));
test('SEO reports preserve source and estimates while building bounded allowlisted requests',async()=>{
 for(const provider of ['semrush','ahrefs','seranking'])await fixture(async()=>{const r=await executeConnector(provider,config,{reviewed:true,action:'domain-overview',domain:'EXAMPLE.COM',database:'pk'});assert.equal(r.domain,'example.com');assert(r.note.includes('not measured GA4'));assert(!JSON.stringify(r).includes(config.token));},async(url,options)=>{const u=new URL(url);assert.equal(u.protocol,'https:');assert.equal(options.method,'GET');if(provider==='semrush'){assert.equal(u.searchParams.get('display_limit'),'1');return new Response('Domain;Rank;Organic Traffic\nexample.com;20;300');}if(provider==='seranking')assert.equal(u.searchParams.get('source'),'pk');return new Response(JSON.stringify(provider==='ahrefs'?{domain_rating:{domain_rating:12}}:{organic:{traffic_sum:300},adv:{}}));});
 await fixture(()=>assert.rejects(()=>executeConnector('semrush',config,{reviewed:true,action:'domain-overview',domain:'example.com'})),async()=>new Response('ERROR 50 :: NOT ENOUGH UNITS'));
});
test('Cursor connector lists existing agents without creating jobs in Cursor',async()=>fixture(async()=>{const r=await executeConnector('cursor',config,{reviewed:true,action:'agents'});assert.deepEqual(r.data.agents,[]);},async(url,options)=>{assert.equal(options.method,'GET');assert.equal(new URL(url).searchParams.get('limit'),'20');return new Response('{"agents":[]}');}));
test('connector transport bounds responses and does not retry or expose raw failures',async()=>{let calls=0;await fixture(async()=>{await assert.rejects(()=>connectorRequest('https://api.ahrefs.com/v3/fixture'),/size limit/);assert.equal(calls,1);},async()=>{calls++;return new Response('x'.repeat(2097153));});await fixture(()=>assert.rejects(()=>connectorRequest('https://api.ahrefs.com/v3/fixture'),/invalid response/),async()=>new Response('not json'));});
for(const provider of ['claude','gemini','grok'])test(provider+' drafts validate the full sitemap and reject incomplete generation',async()=>{
 const input={business:'Fixture Plumbing',city:'Lahore',services:'Drain cleaning'},base=draftSite(input);let complete=true;
 await fixture(async()=>{const r=await generateSite(config,input,provider);assert.equal(r.provider,provider);assert.equal(r.site.pages.length,base.pages.length);complete=false;await assert.rejects(()=>generateSite(config,input,provider),/did not complete/);},async(url,options)=>{
 const payload=JSON.parse(options.body);assert.equal(options.method,'POST');assert(JSON.stringify(payload).includes('Fixture Plumbing'));const text=JSON.stringify({pages:base.pages});
 return new Response(JSON.stringify(provider==='claude'?{model:config.model,stop_reason:complete?'end_turn':'max_tokens',content:[{type:'text',text}]}:provider==='gemini'?{candidates:[{finishReason:complete?'STOP':'MAX_TOKENS',content:{parts:[{text}]}}]}:{model:config.model,choices:[{finish_reason:complete?'stop':'length',message:{content:text}}]}));
 });
});
