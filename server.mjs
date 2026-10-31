import {serpumLegacyRoutes} from './public/serpum-data.js';
import {createSerpumGeocoder} from './lib/serpum-geocode.mjs';
import {marketingHome,publicPage,publicRoutes} from './public/marketing.js';
import {navigationRoutes} from './public/navigation.js';
import { serpLanding,indexerLanding } from './public/product-landings.js';
import { socialMethods,authOrigin,startSocial,finishSocial,flowCookie } from './lib/social-auth.mjs';
import { queueInspection,inspectionBatch,startInspectionWorker,batchCsv } from './lib/indexing-jobs.mjs';
import { billingStatus,checkout,billingPortal,stripeWebhook,checkSiteCapacity } from './lib/billing.mjs';
import { handlePublicAccess,createApiKey,listApiKeys,revokeApiKey } from './lib/access.mjs';
import { indexingAction } from './lib/indexing.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { openStore,id,hash,passwordHash,checkPassword } from './lib/store.mjs';
import { draftSite,validateSite,renderPage,staticFiles,converterFiles,slug } from './lib/sites.mjs';
import { zip,unzip } from './lib/archive.mjs';
import { ProviderError,request,pushRepository,deploy,checkSerp,demand } from './lib/providers.mjs';
import { googleReady,googleStart,googleCallback,googleProperties,googleReport } from './lib/google.mjs';
import { generateSite } from './lib/ai.mjs';
import { hostConfig } from './lib/config.mjs';
import { sessionCandidates,findManifest } from './lib/migration.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));const store=openStore(process.env.DATA_DIR||path.join(root,'data'));const {db}=store;
const port=Number(process.env.PORT||4317),publicOrigin=process.env.PUBLIC_ORIGIN||(process.env.RENDER_EXTERNAL_HOSTNAME?`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`:`http://localhost:${port}`);
const {baseDomain,allowedHosts}=hostConfig(process.env);
const providers=['github','gitlab','bitbucket','netlify','vercel','cloudflare','render','dataforseo','registrar','openai'];
const geocodeSerpum=createSerpumGeocoder();
const limits=new Map();
const draftPreviews=new Map();
function rate(key,max=60){const t=Date.now(),r=limits.get(key);if(limits.size>10000)for(const[k,v]of limits)if(v.until<t)limits.delete(k);if(!r||r.until<t){limits.set(key,{count:1,until:t+60000});return;}if(++r.count>max)throw new ProviderError('Too many requests; try again in a minute',429);}
function connection(user,provider){const row=db.prepare('SELECT secret FROM connections WHERE user_id=? AND provider=?').get(user,provider);if(!row)throw new ProviderError(`Connect ${provider} in Integrations first`,409);return store.unseal(row.secret);}
function ownedSite(user,siteId){const row=db.prepare('SELECT * FROM sites WHERE id=? AND user_id=?').get(siteId,user);if(!row)throw new ProviderError('Project not found',404);return {...row,data:JSON.parse(row.data)};}
function saveSite(user,data,siteId){const now=new Date().toISOString();const v=validateSite(data);if(siteId){ownedSite(user,siteId);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);db.prepare('UPDATE sites SET data=?,updated=? WHERE id=? AND user_id=?').run(JSON.stringify(v),now,siteId,user);}else{checkSiteCapacity(db,user);siteId=id();db.prepare('INSERT INTO sites VALUES(?,?,?,?,?)').run(siteId,user,JSON.stringify(v),now,now);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);}return ownedSite(user,siteId);}
async function body(req,maxBytes=17*1024*1024){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>maxBytes)throw new ProviderError('Request too large',413);chunks.push(c);}const b=Buffer.concat(chunks);if(req.headers['content-type']?.startsWith('application/zip'))return b;try{return JSON.parse(b.toString()||'{}');}catch{throw new ProviderError('Invalid JSON',400);}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function safeResult(value){return JSON.stringify(value);}
async function job(user,siteId,kind,fn){
  const daily=db.prepare('SELECT count(*) n FROM jobs WHERE user_id=? AND created>=?').get(user,new Date().toISOString().slice(0,10)).n;if(daily>=Number(process.env.DAILY_PROVIDER_ACTION_LIMIT||50))throw new ProviderError('Daily provider action limit reached',429);
  const active=db.prepare("SELECT id FROM jobs WHERE user_id=? AND status='running'").get(user);if(active)throw new ProviderError('Another provider action is running. Wait before retrying.',409);
  const jobId=id();db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?)').run(jobId,user,siteId||null,kind,'running','{}',new Date().toISOString());
  try{const result=await fn();db.prepare('UPDATE jobs SET status=?,result=? WHERE id=?').run('completed',safeResult(result),jobId);return {jobId,...result};}catch(e){db.prepare('UPDATE jobs SET status=?,result=? WHERE id=?').run('failed',JSON.stringify({message:e instanceof ProviderError?e.message:'Request outcome may be unknown; inspect provider before retrying.'}),jobId);throw e;}
}
const cookieDomain=process.env.COOKIE_DOMAIN;
function cookie(token,clear=false,name='sitocal_session'){return `${name}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${clear?0:604800}${publicOrigin.startsWith('https:')?'; Secure':''}${cookieDomain?`; Domain=${cookieDomain}`:''}`;}
async function handler(req,res){
  const hostname=(req.headers.host||'').split(':')[0].toLowerCase();
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!allowedHosts.has(hostname))return json(res,400,{error:'Unknown host'});
  const origin=`${process.env.TRUST_PROXY==='true'&&req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
  const url=new URL(req.url,origin),p=url.pathname;
  try{
    rate(req.socket.remoteAddress||'unknown',180);
    if(Object.hasOwn(serpumLegacyRoutes,p)){res.writeHead(301,{Location:serpumLegacyRoutes[p]+url.search});return res.end();}
    if(p==='/api/billing/webhook'&&req.method==='POST'){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)throw new ProviderError('Webhook too large',413);chunks.push(chunk);}return json(res,200,await stripeWebhook(db,Buffer.concat(chunks),req.headers['stripe-signature']));}
    if(await handlePublicAccess(req,res,{p,origin,db,json,body,rate,saveSite,ownedSite}))return;
    let token='',session,cookieName='sitocal_session';
    for(const [name,value] of sessionCandidates(req.headers.cookie)){
      const candidate=db.prepare('SELECT sessions.*,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(value),Date.now());
      if(candidate){session=candidate;token=value;cookieName=name;break;}
    }
    if(session&&cookieName!=='sitocal_session'&&!p.startsWith('/api/auth/'))res.setHeader('Set-Cookie',[cookie(token),cookie('',true,cookieName)]);
    const user=session?.user_id;
    if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
      const requestOrigin=req.headers.origin;if(!requestOrigin||requestOrigin!==origin)throw new ProviderError('Origin check failed',403);
      if(user && p!=='/api/serpum/geocode' && p!=='/api/contact' && !p.startsWith('/api/auth/') && req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Session verification failed. Reload this page.',403);
    }
    if(p==='/api/serpum/geocode'&&req.method==='POST'){rate('serpum-geocode:'+req.socket.remoteAddress,8);const input=await body(req,2048);return json(res,200,await geocodeSerpum(input));}
    if(p==='/api/health')return json(res,200,{status:'ok',version:'0.2.0',mode:'development-alpha'});
    if(p==='/api/contact'&&req.method==='POST'){
      rate('contact:'+req.socket.remoteAddress,4);const b=await body(req);
      if(b.website)throw new ProviderError('Message could not be accepted',400);
      const name=String(b.name||'').trim(),email=String(b.email||'').trim(),message=String(b.message||'').trim(),company=String(b.company||'').trim(),topic=String(b.topic||'General enquiry').trim();
      if(!name||name.length>120||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10||message.length>5000||company.length>150||topic.length>100||!['on',true].includes(b.consent))throw new ProviderError('Enter a name, valid email, message (10–5000 characters) and privacy consent',400);
      const ref=id();db.prepare('INSERT INTO enquiries VALUES(?,?,?,?,?,?,?)').run(ref,name,email,company,topic,message,new Date().toISOString());return json(res,201,{reference:ref,message:'Your message has been saved for team review. Reference: '+ref+'. You can also email contact@sitocal.com directly.'});
    }
    if(p==='/api/session')return json(res,200,{user:user?{id:user,email:session.email}:null,csrf:session?.csrf||null,googleConfigured:googleReady()});
    if(p==='/api/auth/methods'&&req.method==='GET')return json(res,200,{providers:socialMethods(),origin:authOrigin(publicOrigin),signupOpen:process.env.ALLOW_SIGNUPS!=='false',inviteRequired:Boolean(process.env.REGISTRATION_CODE)});
    const social=p.match(/^\/api\/auth\/oauth\/(google|github|linkedin)\/(start|callback)$/);
    if(social){
      const provider=social[1],canonical=authOrigin(publicOrigin);rate('social:'+req.socket.remoteAddress,15);
      if(social[2]==='start'&&req.method==='POST'){const input=await body(req);if(input.mode==='link'&&(!user||req.headers['x-csrf-token']!==session.csrf))throw new ProviderError('Sign in and reload before linking a provider',403);const flow=startSocial(db,provider,input,canonical,user);res.setHeader('Set-Cookie',flowCookie(provider,flow.binding,canonical));return json(res,200,{url:flow.url});}
      if(social[2]==='callback'&&req.method==='GET'){
        const binding=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sitocal_oauth_'+provider+'='))?.split('=')[1];
        res.setHeader('Referrer-Policy','no-referrer');
        try{const result=await finishSocial(db,provider,url.searchParams,binding,user),next=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(next),result.account.id,csrf,Date.now()+604800000);db.prepare('INSERT INTO session_assurance VALUES(?,?,?)').run(hash(next),provider,Date.now());res.setHeader('Set-Cookie',[cookie(next),flowCookie(provider,'',canonical,true)]);res.writeHead(303,{Location:canonical+result.returnTo});return res.end();}
        catch(error){res.setHeader('Set-Cookie',flowCookie(provider,'',canonical,true));const message=error instanceof ProviderError?error.message:'Sign-in could not be completed. Please start again.';res.writeHead(303,{Location:canonical+'/login?auth_error='+encodeURIComponent(message)});return res.end();}
      }
      throw new ProviderError('Method not allowed',405);
    }
    if(p==='/api/auth/register'||p==='/api/auth/login'){
      if(req.method!=='POST')throw new ProviderError('Method not allowed',405);rate('auth:'+req.socket.remoteAddress,10);const b=await body(req);const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<12||password.length>200)throw new ProviderError('Use a valid email and a password of 12–200 characters',400);
      let account=db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if(p.endsWith('register')){if(process.env.ALLOW_SIGNUPS==='false')throw new ProviderError('Registration is closed',403);if(process.env.REGISTRATION_CODE&&hash(String(b.invite||''))!==hash(process.env.REGISTRATION_CODE))throw new ProviderError('A valid registration invite code is required',403);if(account)throw new ProviderError('Account cannot be created with these details. Try signing in.',409);account={id:id(),email};db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(account.id,email,passwordHash(password),new Date().toISOString());}else if(!account||!checkPassword(password,account.password))throw new ProviderError('Email or password is incorrect',401);
      const next=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(next),account.id,csrf,Date.now()+604800000);res.setHeader('Set-Cookie',cookie(next));return json(res,200,{user:{id:account.id,email},csrf});
    }
    if(p==='/api/auth/logout'&&req.method==='POST'){if(user&&req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Session verification failed',403);db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));res.setHeader('Set-Cookie',cookieName==='sitocal_session'?cookie('',true):[cookie('',true),cookie('',true,cookieName)]);return json(res,200,{ok:true});}
    if(p.startsWith('/api/')&&!user)throw new ProviderError('Sign in to continue',401);
    if(p==='/api/google/start'&&req.method==='POST')return json(res,200,{url:googleStart(db,user,await body(req))});
    if(p==='/api/google/callback'&&req.method==='GET'){await googleCallback(store,url.searchParams,user);res.writeHead(303,{Location:'/serp?google=connected'});return res.end();}
    if(p==='/api/google/properties'&&req.method==='GET')return json(res,200,await googleProperties(store,user));
    if(p==='/api/google/report'&&req.method==='POST')return json(res,200,await googleReport(store,user,await body(req)));
    if(p==='/api/account/methods'&&req.method==='GET'){const password=db.prepare('SELECT password FROM users WHERE id=?').get(user).password;return json(res,200,{identities:db.prepare('SELECT provider,email,name,created FROM login_identities WHERE user_id=?').all(user),hasPassword:password!=='oauth-only',providers:socialMethods()});}
    if(p==='/api/account/password'&&req.method==='POST'){const input=await body(req),stored=db.prepare('SELECT password FROM users WHERE id=?').get(user).password,next=String(input.password||'');if(next.length<12||next.length>200)throw new ProviderError('Use a password of 12–200 characters',400);if(stored==='oauth-only'){const assurance=db.prepare('SELECT * FROM session_assurance WHERE token=?').get(hash(token));if(!assurance||assurance.authenticated_at<Date.now()-600000)throw new ProviderError('Sign out and sign in with your provider again before adding a password',403);}else if(!checkPassword(String(input.currentPassword||''),stored))throw new ProviderError('Current password is incorrect',403);db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(next),user);db.prepare('DELETE FROM sessions WHERE user_id=? AND token<>?').run(user,hash(token));return json(res,200,{saved:true});}
    if(p==='/api/billing'&&req.method==='GET')return json(res,200,billingStatus(db,user));
    if(p==='/api/billing/checkout'&&req.method==='POST')return json(res,200,await checkout(db,user,session.email,await body(req),publicOrigin));
    if(p==='/api/billing/portal'&&req.method==='POST')return json(res,200,await billingPortal(db,user,publicOrigin));
    if(p==='/api/developer/keys'&&req.method==='GET')return json(res,200,{keys:listApiKeys(db,user)});
    if(p==='/api/developer/keys'&&req.method==='POST')return json(res,201,createApiKey(db,user,await body(req)));
    const revoke=p.match(/^\/api\/developer\/keys\/([a-f0-9-]{36})$/);if(revoke&&req.method==='DELETE')return json(res,200,revokeApiKey(db,user,revoke[1]));
    if(p==='/api/indexing/batches'&&req.method==='POST')return json(res,202,await queueInspection(store,user,await body(req)));
    if(p==='/api/indexing/batches'&&req.method==='GET')return json(res,200,{batches:db.prepare('SELECT * FROM indexing_batches WHERE user_id=? ORDER BY created DESC LIMIT 50').all(user)});
    const batch=p.match(/^\/api\/indexing\/batches\/([a-f0-9-]{36})(\/csv)?$/);if(batch&&req.method==='GET'){const result=inspectionBatch(db,user,batch[1]);if(!batch[2])return json(res,200,result);res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="sitocal-index-inspections.csv"'});return res.end(batchCsv(result));}
    if(p==='/api/indexing/history'&&req.method==='GET')return json(res,200,{events:db.prepare('SELECT * FROM indexing_events WHERE user_id=? ORDER BY created DESC LIMIT 50').all(user).map(e=>({...e,config:JSON.parse(e.config),result:JSON.parse(e.result)}))});
    const indexAction=p.match(/^\/api\/indexing\/(properties|sitemaps|inspect|submit)$/);
    if(indexAction&&req.method==='POST'){rate('indexing:'+user,30);const input=await body(req);const result=await indexingAction(store,user,indexAction[1],input);if(['inspect','submit'].includes(indexAction[1]))db.prepare('INSERT INTO indexing_events VALUES(?,?,?,?,?,?)').run(id(),user,indexAction[1],JSON.stringify(input),JSON.stringify(result),new Date().toISOString());return json(res,200,result);}
    if(p==='/api/sites'&&req.method==='GET')return json(res,200,{sites:db.prepare('SELECT * FROM sites WHERE user_id=? ORDER BY updated DESC').all(user).map(s=>({...s,data:JSON.parse(s.data)}))});
    if(p==='/api/sites'&&req.method==='POST'){checkSiteCapacity(db,user);const b=await body(req);if(b.generation==='ai'){const c=connection(user,'openai');const generated=await job(user,null,'ai-generation',async()=>{const r=await generateSite(c,b);return {...saveSite(user,r.site),usage:r.usage,model:r.model,promptVersion:r.promptVersion};});return json(res,201,generated);}return json(res,201,saveSite(user,b.pages?b:draftSite(b)));}
    if(p==='/api/import'&&req.method==='POST'){
      const files=unzip(await body(req)),manifest=findManifest(files,validateSite);
      if(manifest)return json(res,201,saveSite(user,manifest));
      const html=Object.entries(files).filter(([n])=>/\.html?$/i.test(n));if(!html.length)throw new ProviderError('ZIP has no Sitocal manifest or HTML pages',400);
      // Return source text only; client parses in an inert DOM and extracts editable text.
      return json(res,200,{needsMapping:true,pages:html.slice(0,30).map(([name,data])=>({name,html:data.toString('utf8')})),warning:'Arbitrary HTML import extracts headings and paragraphs. Original layout, scripts, media and styling are not preserved.'});
    }
    const siteRoute=p.match(/^\/api\/sites\/([a-f0-9-]+)(?:\/(.*))?$/);
    if(siteRoute){
      const [,siteId,action]=siteRoute,site=ownedSite(user,siteId);
      if(!action&&req.method==='GET')return json(res,200,site);
      if(!action&&req.method==='PUT')return json(res,200,saveSite(user,await body(req),siteId));
      if(!action&&req.method==='DELETE'){db.prepare('DELETE FROM sites WHERE id=? AND user_id=?').run(siteId,user);return json(res,200,{ok:true});}
      if(action==='revisions'&&req.method==='GET')return json(res,200,{revisions:db.prepare('SELECT id,created FROM revisions WHERE site_id=? AND user_id=? ORDER BY rowid DESC LIMIT 50').all(siteId,user)});
      if(action==='restore'&&req.method==='POST'){const b=await body(req),r=db.prepare('SELECT data FROM revisions WHERE id=? AND site_id=? AND user_id=?').get(b.revision,siteId,user);if(!r)throw new ProviderError('Revision not found',404);return json(res,200,saveSite(user,JSON.parse(r.data),siteId));}
      if(action==='draft-preview'&&req.method==='POST'){const data=validateSite(await body(req)),key=randomBytes(24).toString('hex');for(const[k,v]of draftPreviews)if(v.expires<Date.now())draftPreviews.delete(k);if(draftPreviews.size>500)draftPreviews.delete(draftPreviews.keys().next().value);draftPreviews.set(key,{user,siteId,data,expires:Date.now()+600000});return json(res,200,{key});}
      if(action==='preview'&&req.method==='GET'){const draft=url.searchParams.get('draft'),cached=draft?draftPreviews.get(draft):null;if(draft&&(!cached||cached.user!==user||cached.siteId!==siteId||cached.expires<Date.now()))throw new ProviderError('Preview expired. Apply changes again.',404);const data=cached?.data||site.data;const page=data.pages.find(x=>x.slug===url.searchParams.get('page'))||data.pages[0];res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'",'X-Robots-Tag':'noindex, nofollow'});return res.end(renderPage(data,page,url.searchParams.get('edit')==='1'));}
      if((action==='export'||action==='convert')&&req.method==='GET'){const files=action==='export'?staticFiles(site.data):converterFiles(site.data,url.searchParams.get('format'));res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${slug(site.data.business)}-${action}.zip"`});return res.end(zip(files));}
      if(action==='publish'&&req.method==='POST'){
        const b=await body(req);if(!b.reviewed)throw new ProviderError('Review business facts before publishing',400);if(!['github','gitlab','bitbucket'].includes(b.source)&&!['netlify','vercel'].includes(b.host))throw new ProviderError('Select a source provider or direct deployment host',400);
        return json(res,200,await job(user,siteId,'publish',async()=>{const files=staticFiles(site.data),out={};if(b.source)out.source=await pushRepository(b.source,connection(user,b.source),files);if(b.host){try{out.deployment=await deploy(b.host,connection(user,b.host),files,site.data.business);}catch(e){if(out.source)return {...out,partial:true,deploymentError:e instanceof ProviderError?e.message:'Deployment request failed; reconcile in provider dashboard.'};throw e;}}return out;}));
      }
    }
    if(p==='/api/connections'&&req.method==='GET'){const rows=db.prepare('SELECT provider FROM connections WHERE user_id=?').all(user);return json(res,200,{connections:rows.map(x=>x.provider),googleConfigured:googleReady()});}
    const conn=p.match(/^\/api\/connections\/([a-z0-9]+)$/);
    if(conn){const provider=conn[1];if(![...providers,'google'].includes(provider))throw new ProviderError('Unknown provider',400);if(req.method==='DELETE'){db.prepare('DELETE FROM connections WHERE user_id=? AND provider=?').run(user,provider);return json(res,200,{ok:true});}if(req.method==='PUT'&&provider!=='google'){const b=await body(req);if(JSON.stringify(b).length>10000)throw new ProviderError('Connection too large',400);db.prepare('INSERT OR REPLACE INTO connections VALUES(?,?,?)').run(user,provider,store.seal(b));return json(res,200,{saved:true,verified:false});}}
    if(p==='/api/jobs'&&req.method==='GET')return json(res,200,{jobs:db.prepare('SELECT * FROM jobs WHERE user_id=? ORDER BY rowid DESC LIMIT 50').all(user).map(j=>({...j,result:JSON.parse(j.result)}))});
    if(p==='/api/serp/history'&&req.method==='GET')return json(res,200,{observations:db.prepare('SELECT * FROM observations WHERE user_id=? ORDER BY rowid DESC LIMIT 100').all(user).map(o=>({...o,config:JSON.parse(o.config),data:JSON.parse(o.data)}))});
    if(['/api/serp/check','/api/serp/demand','/api/serp/traffic','/api/serp/backlinks'].includes(p)&&req.method==='POST'){
      const b=await body(req);b.keyword=String(b.keyword||'').slice(0,200);b.domain=String(b.domain||'').trim().toLowerCase();b.locationCode=Number(b.locationCode);b.language=/^[a-z]{2}$/.test(b.language)?b.language:'en';b.device=b.device==='mobile'?'mobile':'desktop';b.competitors=String(b.competitors||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);
      if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(b.domain)||!Number.isInteger(b.locationCode)||b.locationCode<1||b.competitors.some(x=>! /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x)))throw new ProviderError('Use a hostname and a provider location code',400);
      if((p.endsWith('check')||p.endsWith('demand'))&&!b.keyword)throw new ProviderError('Keyword is required',400);
      const c=connection(user,'dataforseo');return json(res,200,await job(user,null,p.split('/').pop(),async()=>{
        if(p.endsWith('demand'))return demand(c,b);
        if(p.endsWith('traffic')||p.endsWith('backlinks')){const backlinks=p.endsWith('backlinks'),r=await request(`https://api.dataforseo.com/v3/${backlinks?'backlinks/summary/live':'dataforseo_labs/google/domain_rank_overview/live'}`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${c.login}:${c.password}`).toString('base64')}`,'Content-Type':'application/json'},body:[backlinks?{target:b.domain,include_subdomains:true}:{target:b.domain,location_code:b.locationCode,language_code:b.language}]});if(r.status_code!==20000||r.tasks?.[0]?.status_code!==20000)throw new ProviderError('Research task did not complete. Check provider access and billing.');return {source:backlinks?'DataForSEO backlink index':'DataForSEO modeled search traffic; not measured GA4 sessions',data:r.tasks[0].result,cost:r.cost};}
        const result=await checkSerp(c,b);db.prepare('INSERT INTO observations VALUES(?,?,?,?,?)').run(id(),user,JSON.stringify(b),JSON.stringify(result),new Date().toISOString());return result;
      }));
    }
    if(p==='/api/domains/search'&&req.method==='POST'){
      const b=await body(req),domain=String(b.domain||'').trim().toLowerCase();if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))throw new ProviderError('Enter a domain such as yourbusiness.com',400);
      const c=connection(user,'registrar');if(!/^[a-z0-9]{32}$/i.test(c.account||''))throw new ProviderError('Configure the registrar Cloudflare account ID',400);
      return json(res,200,await job(user,null,'domain-search',async()=>{const r=await request(`https://api.cloudflare.com/client/v4/accounts/${c.account}/registrar/domain-check`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:{domains:[domain]}});if(r.success===false)throw new ProviderError('Registrar search was rejected. Check API access.');return {provider:'Cloudflare Registrar',checkedAt:new Date().toISOString(),data:r.result,note:'Availability and prices are provisional; no domain purchased.'};}));
    }
    if(p.startsWith('/api/'))throw new ProviderError('Endpoint not found',404);
    if(req.method!=='GET')throw new ProviderError('Method not allowed',405);
    const files={'/assets/serpum.js':['serpum.js','text/javascript'],'/assets/serpum-data.js':['serpum-data.js','text/javascript'],'/assets/serpum.css':['serpum.css','text/css'],'/assets/navigation.js':['navigation.js','text/javascript'],'/assets/style.css':['style.css','text/css'],'/assets/fieldwork.css':['fieldwork.css','text/css'],'/assets/landing.css':['landing.css','text/css'],'/assets/marketing.css':['marketing.css','text/css'],'/assets/marketing.js':['marketing.js','text/javascript'],'/assets/tools.js':['tools.js','text/javascript'],'/assets/auth.js':['auth.js','text/javascript'],'/assets/product-landings.js':['product-landings.js','text/javascript'],'/assets/auth.css':['auth.css','text/css'],'/assets/products.css':['products.css','text/css'],'/assets/policies.js':['policies.js','text/javascript'],'/assets/app.js':['app.js','text/javascript'],...Object.fromEntries(['logo','logo-dark','icon','icon-dark'].map(name=>['/assets/brand/'+name+'.svg',['brand/'+name+'.svg','image/svg+xml']]))};
    const visual=p.match(/^\/assets\/(vendors|previews)\/([a-z0-9-]+)\.svg$/);if(visual){const file=path.join(root,'public',visual[1],visual[2]+'.svg');try{const data=await readFile(file);res.setHeader('Content-Security-Policy',"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");res.writeHead(200,{'Content-Type':'image/svg+xml'});return res.end(data);}catch{throw new ProviderError('Asset not found',404);}}
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'");
    if(files[p]){res.writeHead(200,{'Content-Type':files[p][1]+'; charset=utf-8'});return res.end(await readFile(path.join(root,'public',files[p][0])));}
    if(!publicRoutes.includes(p.slice(1))&&!navigationRoutes.includes(p.slice(1))&&!['/','/app','/editor','/wp','/serp','/domains','/integrations','/login','/publish','/jobs','/sign-in','/create-account','/dashboard','/about','/contact','/blog','/products-services','/privacy-policy','/terms-and-conditions','/refund-policy','/service-policy','/shipping-policy','/api-mcp','/google-indexer','/developer','/indexing','/billing','/account','/serp-home'].includes(p))throw new ProviderError('Page not found',404);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});const html=await readFile(path.join(root,'public','index.html'),'utf8');let entry=html.replace('name="sitocal-domain" content=""',`name="sitocal-domain" content="${baseDomain}"`);
    const serpHome=(baseDomain&&hostname==='serp.'+baseDomain&&p==='/')||p==='/serp-home',indexerHome=p==='/google-indexer';
    const publicHome=p==='/'&&(!baseDomain||hostname===baseDomain||hostname==='www.'+baseDomain),publicRoute=publicRoutes.includes(p.slice(1));
    if(serpHome||indexerHome||publicHome||publicRoute){
      const production=Boolean(baseDomain&&(hostname===baseDomain||hostname.endsWith('.'+baseDomain)));
      const href=(name,query='')=>{if(name==='serpum'||name.startsWith('serpum/'))return production?'https://serp.'+baseDomain+'/'+name+query:'/'+name+query;if(name==='serp-landing')return production?'https://serp.'+baseDomain+'/'+query:'/serp-home'+query;const sub=['editor','wp','serp'].includes(name)?name:['app','publish','integrations','domains','jobs','login','developer','indexing','billing','account'].includes(name)?'app':'';return production?`https://${sub?sub+'.':''}${baseDomain}${['app','editor','wp','landing'].includes(name)?'/':'/'+name}${query}`:(name==='landing'?'/':'/'+name)+query;};
      const darkLogo='<span class="logo"><img class="brand-lockup" src="/assets/brand/logo-dark.svg" alt="Sitocal" width="155" height="47"></span>';
      const rendered=serpHome?{html:serpLanding({href,darkLogo}),title:'Sitocal SERP — Research your next local opportunity'}:indexerHome?{html:indexerLanding({href,darkLogo}),title:'Google Indexer — Sitocal'}:publicHome?{html:marketingHome({href,darkLogo}),title:'Sitocal — Your local growth workspace'}:publicPage(p.slice(1),{href,darkLogo});
      const title=serpHome||indexerHome||publicHome?rendered.title:rendered.title+' — Sitocal';
      if(serpHome||indexerHome)entry=entry.replace('Sitocal brings local website creation, editing, WordPress exports and search research into one workspace.',serpHome?'Research local rankings, competitors and demand with connected provider data in Sitocal.':'Inspect verified URLs, queue bulk GSC checks, submit sitemaps and export per-URL CSV reports with Sitocal.');
      entry=entry.replace('<title>Sitocal — Your local growth workspace</title>','<title>'+title+'</title>').replace('<div id="root"><div class="loading">Sitocal is opening your workspace…</div></div>','<div id="root">'+rendered.html+'</div>');
      if(rendered.description)entry=entry.replace('Sitocal brings local website creation, editing, WordPress exports and search research into one workspace.',rendered.description.replaceAll('&','&amp;').replaceAll('"','&quot;'));
      const canonical=p==='/serpum'||p.startsWith('/serpum/')?(production?'https://serp.'+baseDomain+p:origin+p):serpHome?(production?'https://serp.'+baseDomain+'/':origin+'/serp-home'):(production?'https://'+baseDomain+p:origin+p);entry=entry.replace('</head>','<link rel="canonical" href="'+canonical+'"></head>');
    }
    res.end(entry);
  }catch(e){if(e instanceof ProviderError)return json(res,e.status,{error:e.message});if(/Unsafe|ZIP|Archive|archive|site|Business|Page slugs|Choose|Invalid|page with/.test(e.message))return json(res,400,{error:e.message});console.error('Request failed:',p,e.name);json(res,500,{error:'The request could not be completed. Inspect server/provider logs before retrying external actions.'});}
}
const stopInspectionWorker=startInspectionWorker(store);
const server=http.createServer(handler);server.requestTimeout=120000;server.headersTimeout=15000;server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Sitocal local alpha: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopInspectionWorker();server.close(()=>{db.close();process.exit(0);});});
