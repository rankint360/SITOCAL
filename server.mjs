import {summarizeRingba} from './lib/ringba-report.mjs';
import {providerBudget,updateProviderBudget,enforceProviderBudget} from './lib/provider-budgets.mjs';
import { probeSite } from './lib/launch-probe.mjs';
import { searchLocations } from './lib/serp-locations.mjs';
import {initAccountMail,mailReady,mailStatus,queueAccountLink,requestRecovery,verifyAccountMail,recoverPassword,setLeadAlerts,queueLeadAlert,startAccountMailWorker} from './lib/account-mail.mjs';
import {launchPlan,saveLaunchPlan,deploymentStatus,configuredDestination} from './lib/launch.mjs';
import { initProfiles, accountProfile, saveProfile, publishedProfile, publishedAvatar } from './lib/account-profile.mjs';
import { conversionFormats, inspectConversionArchive, wordpressPackage } from './lib/wp-converter.mjs';
import {handleAdmin}from'./lib/admin.mjs';
import{assertAccess,initializeAccess,routeFeature,planCatalog,setting,atomic}from'./lib/admin-data.mjs';
import{resolveConnection,managedProviders}from'./lib/shared-connectors.mjs';
import{redeemBonus,attachReferral,customerRewards}from'./lib/rewards.mjs';
import {pageAliases,canonicalPagePath,pageHref,entryRedirect} from './public/page-routes.js';
import {extraProviders,aiProviders,validateExtraConfig,verifyConnector,executeConnector} from './lib/connectors.mjs';
import {serpumLegacyRoutes} from './public/serpum-data.js';
import {createSerpumGeocoder} from './lib/serpum-geocode.mjs';
import {marketingHome,publicPage,publicRoutes} from './public/marketing.js';
import {navigationRoutes} from './public/navigation.js';
import { serpLanding,indexerLanding } from './public/product-landings.js';
import { socialMethods,authOrigin,startSocial,finishSocial,flowCookie } from './lib/social-auth.mjs';
import { queueInspection,inspectionBatch,startInspectionWorker,batchCsv,inspectionUsage } from './lib/indexing-jobs.mjs';
import { billingStatus,checkout,billingPortal,stripeWebhook,checkSiteCapacity } from './lib/billing.mjs';
import { handlePublicAccess,createApiKey,listApiKeys,revokeApiKey } from './lib/access.mjs';
import { indexingAction,propertyUrl } from './lib/indexing.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { openStore,id,hash,passwordHash,checkPassword } from './lib/store.mjs';
import { esc,draftSite,validateSite,renderPage,staticFiles,converterFiles,slug } from './lib/sites.mjs';
import { zip,unzip } from './lib/archive.mjs';
import { ProviderError,request,pushRepository,deploy,checkSerp,demand } from './lib/providers.mjs';
import { googleReady,googleStart,googleCallback,googleProperties,googleReport } from './lib/google.mjs';
import { generateSite,rewriteWebsiteSection } from './lib/ai.mjs';
import { hostConfig } from './lib/config.mjs';
import { sessionCandidates,findManifest } from './lib/migration.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));const store=openStore(process.env.DATA_DIR||path.join(root,'data'));const {db}=store;
const port=Number(process.env.PORT||4317),publicOrigin=process.env.PUBLIC_ORIGIN||(process.env.RENDER_EXTERNAL_HOSTNAME?`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`:`http://localhost:${port}`);
const {baseDomain,allowedHosts}=hostConfig(process.env);
const providers=[...Object.keys(extraProviders),'github','gitlab','bitbucket','netlify','vercel','cloudflare','render','dataforseo','registrar','openai'];
const geocodeSerpum=createSerpumGeocoder();
const limits=new Map();
let activeProbes=0;
const draftPreviews=new Map();
function rate(key,max=60){const t=Date.now(),r=limits.get(key);if(limits.size>10000)for(const[k,v]of limits)if(v.until<t)limits.delete(k);if(!r||r.until<t){limits.set(key,{count:1,until:t+60000});return;}if(++r.count>max)throw new ProviderError('Too many requests; try again in a minute',429);}
function legacyConnection(user,provider){const row=db.prepare('SELECT secret FROM connections WHERE user_id=? AND provider=?').get(user,provider);if(!row)throw new ProviderError(`Connect ${provider} in Integrations first`,409);return store.unseal(row.secret);}
function connection(user,provider){return resolveConnection(store,user,provider);}
const leadStatuses=['new','contacted','forwarded','archived','spam'];
db.exec(`
CREATE TABLE IF NOT EXISTS provider_budgets(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,ai INTEGER NOT NULL,search INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS website_lead_alerts(site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,enabled INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS website_media(id TEXT PRIMARY KEY,site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,name TEXT NOT NULL,media TEXT NOT NULL,bytes BLOB NOT NULL,created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS website_media_site ON website_media(site_id);
CREATE TABLE IF NOT EXISTS website_search_property(site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE, property TEXT NOT NULL, origin TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS website_rank_tracking(id TEXT PRIMARY KEY,site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,keyword TEXT NOT NULL,location INTEGER NOT NULL,device TEXT NOT NULL,daily INTEGER NOT NULL,next_run INTEGER NOT NULL,last_status TEXT NOT NULL,UNIQUE(site_id,keyword,location,device));
CREATE INDEX IF NOT EXISTS rank_due ON website_rank_tracking(daily,next_run);
CREATE TABLE IF NOT EXISTS website_launch_probe(site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE,origin TEXT NOT NULL,revision TEXT NOT NULL,result TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS website_launch(site_id TEXT PRIMARY KEY REFERENCES sites(id) ON DELETE CASCADE, settings TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS editor_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id), settings TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS support_tickets(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,area TEXT NOT NULL,kind TEXT NOT NULL,severity TEXT NOT NULL,site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,status TEXT NOT NULL,updated TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS support_tickets_owner ON support_tickets(user_id,updated);
CREATE TABLE IF NOT EXISTS support_messages(id TEXT PRIMARY KEY,ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,author TEXT NOT NULL,message TEXT NOT NULL,created TEXT NOT NULL,attachment BLOB,media TEXT);
CREATE INDEX IF NOT EXISTS support_messages_thread ON support_messages(ticket_id,created);
CREATE TABLE IF NOT EXISTS call_phrases(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),niche TEXT NOT NULL,service TEXT NOT NULL,phrase TEXT NOT NULL,outcome TEXT NOT NULL,created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS call_phrases_owner ON call_phrases(user_id,created);
CREATE TABLE IF NOT EXISTS website_leads(id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL, created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lead_followup(lead_id TEXT PRIMARY KEY REFERENCES website_leads(id) ON DELETE CASCADE, assigned TEXT NOT NULL, note TEXT NOT NULL, updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lead_status_events(id TEXT PRIMARY KEY,lead_id TEXT NOT NULL REFERENCES website_leads(id) ON DELETE CASCADE,status TEXT NOT NULL,created TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS lead_status_thread ON lead_status_events(lead_id,created);
CREATE INDEX IF NOT EXISTS website_leads_site ON website_leads(site_id,created);
CREATE TABLE IF NOT EXISTS website_ringba_totals(site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,day TEXT NOT NULL,currency TEXT NOT NULL,calls INTEGER NOT NULL,paid INTEGER NOT NULL,cents INTEGER NOT NULL,imported TEXT NOT NULL,PRIMARY KEY(site_id,day,currency));
CREATE TABLE IF NOT EXISTS website_call_records(id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE, day TEXT NOT NULL, calls INTEGER NOT NULL, paid INTEGER NOT NULL, cents INTEGER NOT NULL, currency TEXT NOT NULL, UNIQUE(site_id,day,currency));
`);
initProfiles(db);
initAccountMail(db);
function editorPreferences(user){
 const row=db.prepare('SELECT settings FROM editor_preferences WHERE user_id=?').get(user);
 return row?JSON.parse(row.settings):{showGuide:true,saveOnPreview:false,confirmRemove:true,showInsert:true,aiProvider:'',host:'',source:''};
}
function websiteIndexingOverview(user,site,origin,property){
 if(!origin||!property)return [];
 const expected=new Set(site.data.pages.map(page=>origin+(page.slug==='home'?'/':'/'+page.slug+'.html')));
 const recent=db.prepare(`SELECT i.url,i.status,i.result,b.updated FROM indexing_items i JOIN indexing_batches b ON i.batch_id=b.id
  WHERE b.user_id=? AND b.property=? AND substr(i.url,1,?)=? AND i.status IN ('completed','failed') ORDER BY b.updated DESC,i.rowid DESC LIMIT 300`).all(user,property,origin.length+1,origin+'/');
 const snapshots=new Map();
 for(const row of recent){
  if(!expected.has(row.url)||snapshots.has(row.url))continue;
  const result=JSON.parse(row.result);
  snapshots.set(row.url,{url:row.url,status:row.status,verdict:result.verdict||'',detail:result.error||result.data?.inspectionResult?.indexStatusResult?.coverageState||'',observedAt:row.updated});
 }
 const order={failed:0,review:1,uninspected:2,pass:3};
 return [...expected].map(url=>{
  const row=snapshots.get(url);
  if(!row)return {url,category:'uninspected'};
  return {...row,category:row.status==='failed'?'failed':row.verdict==='PASS'?'pass':'review'};
 }).sort((a,b)=>order[a.category]-order[b.category]);
}
function contactFormUrl(siteId){return publicOrigin+'/website-contact/'+encodeURIComponent(siteId);}
function validWebsiteImage(media,bytes){
 return bytes.length<=262144&&(media==='image/png'?bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):media==='image/jpeg'?bytes.subarray(0,3).equals(Buffer.from('ffd8ff','hex')):media==='image/webp'&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP');
}
function importWebsiteBundle(user,manifest,files){
 const remapped=new Map();
 for(const page of manifest.pages)for(const section of page.sections){
  if(!section.image)continue;
  const old=section.image;
  if(!remapped.has(old)&&remapped.size<8){
   for(const [extension,media] of [['png','image/png'],['jpg','image/jpeg'],['webp','image/webp']]){
    const bytes=files['media/'+old+'.'+extension];
    if(bytes&&validWebsiteImage(media,bytes)){remapped.set(old,{id:id(),media,bytes,extension});break;}
   }
  }
  const asset=remapped.get(old);
  if(asset)section.image=asset.id;
  else{delete section.image;delete section.alt;}
 }
 return atomic(db,()=>{
  const site=saveSite(user,manifest);
  const insert=db.prepare('INSERT INTO website_media VALUES(?,?,?,?,?,?)');
  for(const asset of remapped.values())insert.run(asset.id,site.id,'Imported image.'+asset.extension,asset.media,asset.bytes,site.created);
  return site;
 });
}
function websiteMedia(siteId){
 return db.prepare('SELECT id,media,bytes FROM website_media WHERE site_id=?').all(siteId).map(row=>({...row,bytes:Buffer.from(row.bytes)}));
}
function ownedSite(user,siteId){const row=db.prepare('SELECT * FROM sites WHERE id=? AND user_id=?').get(siteId,user);if(!row)throw new ProviderError('Project not found',404);return {...row,data:JSON.parse(row.data)};}
function saveSite(user,data,siteId){assertAccess(db,user,siteId?'editor':'builder');const now=new Date().toISOString();const v=validateSite(data);if(siteId){ownedSite(user,siteId);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);db.prepare('UPDATE sites SET data=?,updated=? WHERE id=? AND user_id=?').run(JSON.stringify(v),now,siteId,user);}else{checkSiteCapacity(db,user);siteId=id();db.prepare('INSERT INTO sites VALUES(?,?,?,?,?)').run(siteId,user,JSON.stringify(v),now,now);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);}return ownedSite(user,siteId);}
async function body(req,maxBytes=17*1024*1024){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>maxBytes)throw new ProviderError('Request too large',413);chunks.push(c);}const b=Buffer.concat(chunks);if(req.headers['content-type']?.startsWith('application/zip'))return b;try{return JSON.parse(b.toString()||'{}');}catch{throw new ProviderError('Invalid JSON',400);}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function safeResult(value){return JSON.stringify(value);}
async function job(user,siteId,kind,fn){
  enforceProviderBudget(db,user,kind);
  const daily=db.prepare("SELECT count(*) n FROM jobs WHERE user_id=? AND created>=? AND kind!='template-generation'").get(user,new Date().toISOString().slice(0,10)).n;if(daily>=Number(process.env.DAILY_PROVIDER_ACTION_LIMIT||50))throw new ProviderError('Daily provider action limit reached',429);
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
    const adminHost=Boolean(baseDomain&&hostname==='admin.'+baseDomain);
    const adminSurface=adminHost||['localhost','127.0.0.1'].includes(hostname)||process.env.ADMIN_ALLOW_PREVIEW==='true'&&hostname===process.env.RENDER_EXTERNAL_HOSTNAME;
    if(p.startsWith('/api/admin/')){if(!adminSurface)throw new ProviderError('Use the administrator hostname',403);if(await handleAdmin(req,res,{p,db,store,body,json,origin,url,rate}))return;}
    if(p==='/api/coverage/snapshot'&&req.method==='GET'){
      const snapshot=db.prepare('SELECT csv,published FROM coverage_snapshot WHERE id=1').get();
      if(!snapshot){res.writeHead(204,{'Cache-Control':'no-store'});return res.end();}
      res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-cache','Last-Modified':new Date(snapshot.published).toUTCString()});
      return res.end(snapshot.csv);
    }
    if(p==='/api/plans/public'&&req.method==='GET')return json(res,200,{plans:planCatalog(db).map(({code,amount,sites,features})=>({code,amount,sites,features}))});
    if((p==='/admin'||p.startsWith('/admin/'))||(adminHost&&['/','/login','/signup','/settings'].includes(p))){if(!adminSurface){if(!baseDomain)throw new ProviderError('Admin hostname is not configured',404);res.writeHead(302,{Location:'https://admin.'+baseDomain+'/'});return res.end();}if(req.method!=='GET')throw new ProviderError('Method not allowed',405);res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'");res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(await readFile(path.join(root,'public/admin.html')));}
    if(adminHost&&!p.startsWith('/assets/')&&p!=='/api/health')throw new ProviderError('Use the customer application hostname for this endpoint',403);
    if(['GET','HEAD'].includes(req.method)&&Object.hasOwn(pageAliases,p)){res.writeHead(301,{Location:pageAliases[p]+url.search});return res.end();}
    if(p==='/serpum/features'){res.writeHead(301,{Location:'/serpum/features/'+url.search});return res.end();}
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
    if(['GET','HEAD'].includes(req.method)){const redirect=entryRedirect({baseDomain,hostname,path:p,search:url.search,signedIn:Boolean(user)});if(redirect){res.writeHead(redirect.status,{Location:redirect.location});return res.end();}}
    if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
      const requestOrigin=req.headers.origin;if(!requestOrigin||requestOrigin!==origin)throw new ProviderError('Origin check failed',403);
      if(user && p!=='/api/serpum/geocode' && p!=='/api/contact' && !p.startsWith('/website-contact/') && !p.startsWith('/api/auth/') && req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Session verification failed. Reload this page.',403);
    }
    if((p==='/serpum'||p==='/api/serpum/geocode')&&setting(db,'toolEnabled:serpum',true)===false)throw new ProviderError('SERPUM is temporarily unavailable for maintenance',503);
    if(p==='/api/serpum/geocode'&&req.method==='POST'){rate('serpum-geocode:'+req.socket.remoteAddress,8);const input=await body(req,2048);return json(res,200,await geocodeSerpum(input));}
    const contactMatch=p.match(/^\/website-contact\/([a-zA-Z0-9-]+)$/);
    if(contactMatch&&['GET','POST'].includes(req.method)){
      const site=db.prepare('SELECT id,user_id,data FROM sites WHERE id=?').get(contactMatch[1]);
      if(!site)throw new ProviderError('Contact form unavailable',404);
      assertAccess(db,site.user_id);
      const business=esc(JSON.parse(site.data).business);
      if(req.method==='POST'){
        rate('website-lead:'+site.id+':'+req.socket.remoteAddress,6);
        if(!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded'))throw new ProviderError('Use the website contact form',415);
        const parts=[];let size=0;
        for await(const part of req){size+=part.length;if(size>8192)throw new ProviderError('Contact form is too large',413);parts.push(part);}
        const form=new URLSearchParams(Buffer.concat(parts).toString());
        const name=form.get('name')?.trim()||'',email=form.get('email')?.trim()||'',message=form.get('message')?.trim()||'';
        if(!name||name.length>120||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!message||message.length>2000)throw new ProviderError('Enter a name, valid email and message',400);
        if(!form.get('company_url')){
          const recent=db.prepare('SELECT count(*) AS count FROM website_leads WHERE site_id=? AND created>=?').get(site.id,new Date(Date.now()-86400000).toISOString()).count;
          if(recent>=100)throw new ProviderError('This contact form has reached its daily limit',429);
          atomic(db,()=>{db.prepare('INSERT INTO website_leads VALUES(?,?,?,?,?,?,?)').run(id(),site.id,name,email,message,'new',new Date().toISOString());if(mailReady()&&db.prepare('SELECT enabled FROM website_lead_alerts WHERE site_id=?').get(site.id)?.enabled!==0)queueLeadAlert(store,site.user_id,authOrigin(publicOrigin));});
        }
        res.writeHead(303,{Location:p+'?sent=1'});return res.end();
      }
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'});
      return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Contact ${business}</title><link rel="stylesheet" href="/assets/style.css"><main class="content"><section class="panel"><h1>Contact ${business}</h1>${url.searchParams.get('sent')==='1'?'<p role="status">Your message was submitted.</p>':''}<form method="post" action="${p}"><label class="field">Name<input name="name" maxlength="120" autocomplete="name" required></label><label class="field">Email<input name="email" type="email" maxlength="200" autocomplete="email" required></label><label class="field">How can we help?<textarea name="message" maxlength="2000" required></textarea></label><div hidden><label>Company URL<input name="company_url" tabindex="-1" autocomplete="off"></label></div><p>Your details will be shared with ${business} so they can reply.</p><button class="btn primary">Send message</button></form></section></main></html>`);
    }
    if(p==='/api/health')return json(res,200,{status:'ok',version:'0.5.1',mode:'development-alpha'});
    if(p==='/api/contact'&&req.method==='POST'){
      rate('contact:'+req.socket.remoteAddress,4);const b=await body(req);
      if(b.website)throw new ProviderError('Message could not be accepted',400);
      const name=String(b.name||'').trim(),email=String(b.email||'').trim(),message=String(b.message||'').trim(),company=String(b.company||'').trim(),topic=String(b.topic||'General enquiry').trim();
      if(!name||name.length>120||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10||message.length>5000||company.length>150||topic.length>100||!['on',true].includes(b.consent))throw new ProviderError('Enter a name, valid email, message (10–5000 characters) and privacy consent',400);
      const ref=id();db.prepare('INSERT INTO enquiries VALUES(?,?,?,?,?,?,?)').run(ref,name,email,company,topic,message,new Date().toISOString());return json(res,201,{reference:ref,message:'Your message has been saved for team review. Reference: '+ref+'. You can also email contact@sitocal.com directly.'});
    }
    const profileMatch=p.match(/^\/people\/([a-z0-9][a-z0-9-]{2,39})(\/photo)?$/);
    if(profileMatch&&req.method==='GET'){
      const handle=profileMatch[1];
      if(profileMatch[2]){
        const row=publishedAvatar(db,handle);
        if(!row)throw new ProviderError('Profile photo not found',404);
        res.writeHead(200,{'Content-Type':row.media,'Cache-Control':'no-store'});return res.end(row.avatar);
      }
      const profile=publishedProfile(db,handle);
      if(!profile)throw new ProviderError('Public profile not found',404);
      const links=[[profile.website,'Website'],[profile.x&&'https://x.com/'+profile.x,'X'],[profile.github&&'https://github.com/'+profile.github,'GitHub'],[profile.linkedin&&'https://www.linkedin.com/in/'+profile.linkedin,'LinkedIn']];
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'});
      return res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(profile.name)} · Sitocal</title><link rel="stylesheet" href="/assets/style.css"><main class="content"><section class="panel">${profile.hasAvatar?`<img src="/people/${handle}/photo" width="96" height="96" alt="">`:''}<h1>${esc(profile.name)}</h1><p>@${handle}</p><ul>${links.filter(([href])=>href).map(([href,label])=>`<li><a href="${esc(href)}" rel="nofollow ugc noreferrer">${label}</a></li>`).join('')}</ul></section></main></html>`);
    }
    if(p==='/api/session')return json(res,200,{user:user?{id:user,email:session.email,displayName:accountProfile(db,user).name}:null,theme:user?accountProfile(db,user).theme:null,csrf:session?.csrf||null,googleConfigured:googleReady()});
    if(p==='/api/auth/methods'&&req.method==='GET')return json(res,200,{providers:socialMethods(),origin:authOrigin(publicOrigin),signupOpen:process.env.ALLOW_SIGNUPS!=='false',inviteRequired:Boolean(process.env.REGISTRATION_CODE)});
    const social=p.match(/^\/api\/auth\/oauth\/(google|github|linkedin)\/(start|callback)$/);
    if(social){
      const provider=social[1],canonical=authOrigin(publicOrigin);rate('social:'+req.socket.remoteAddress,15);
      if(social[2]==='start'&&req.method==='POST'){const input=await body(req);if(input.mode==='link'&&(!user||req.headers['x-csrf-token']!==session.csrf))throw new ProviderError('Sign in and reload before linking a provider',403);const flow=startSocial(db,provider,input,canonical,user);res.setHeader('Set-Cookie',flowCookie(provider,flow.binding,canonical));return json(res,200,{url:flow.url});}
      if(social[2]==='callback'&&req.method==='GET'){
        const binding=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('sitocal_oauth_'+provider+'='))?.split('=')[1];
        res.setHeader('Referrer-Policy','no-referrer');
        try{const result=await finishSocial(db,provider,url.searchParams,binding,user),next=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');initializeAccess(db,result.account.id);assertAccess(db,result.account.id);db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(next),result.account.id,csrf,Date.now()+604800000);db.prepare('INSERT INTO session_assurance VALUES(?,?,?)').run(hash(next),provider,Date.now());res.setHeader('Set-Cookie',[cookie(next),flowCookie(provider,'',canonical,true)]);res.writeHead(303,{Location:canonical+result.returnTo});return res.end();}
        catch(error){res.setHeader('Set-Cookie',flowCookie(provider,'',canonical,true));const message=error instanceof ProviderError?error.message:'Sign-in could not be completed. Please start again.';res.writeHead(303,{Location:canonical+'/login?auth_error='+encodeURIComponent(message)});return res.end();}
      }
      throw new ProviderError('Method not allowed',405);
    }
    if(p==='/api/auth/register'||p==='/api/auth/login'){
      if(req.method!=='POST')throw new ProviderError('Method not allowed',405);rate('auth:'+req.socket.remoteAddress,10);const b=await body(req);const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<12||password.length>200)throw new ProviderError('Use a valid email and a password of 12–200 characters',400);
      let account=db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if(p.endsWith('register')){if(process.env.ALLOW_SIGNUPS==='false')throw new ProviderError('Registration is closed',403);if(process.env.REGISTRATION_CODE&&hash(String(b.invite||''))!==hash(process.env.REGISTRATION_CODE))throw new ProviderError('A valid registration invite code is required',403);if(account)throw new ProviderError('Account cannot be created with these details. Try signing in.',409);account={id:id(),email};atomic(db,()=>{db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(account.id,email,passwordHash(password),new Date().toISOString());initializeAccess(db,account.id,{newAccount:true});});}else if(!account||!checkPassword(password,account.password))throw new ProviderError('Email or password is incorrect',401);
      initializeAccess(db,account.id);if(!p.endsWith('register'))assertAccess(db,account.id);
      const next=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(next),account.id,csrf,Date.now()+604800000);res.setHeader('Set-Cookie',cookie(next));return json(res,200,{user:{id:account.id,email},csrf});
    }
    if(p==='/api/auth/logout'&&req.method==='POST'){if(user&&req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Session verification failed',403);db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));res.setHeader('Set-Cookie',cookieName==='sitocal_session'?cookie('',true):[cookie('',true),cookie('',true,cookieName)]);return json(res,200,{ok:true});}
    if(['/api/wp/inspect','/api/wp/build'].includes(p)&&req.method==='POST'){
      rate('wp-convert:'+req.socket.remoteAddress,8);
      if(p.endsWith('/inspect')){
        if(req.headers['content-type']!=='application/zip')throw new ProviderError('Upload a ZIP archive',415);
        return json(res,200,inspectConversionArchive(await body(req,12*1024*1024)));
      }
      const input=await body(req,8*1024*1024);
      if(!input||typeof input!=='object'||!conversionFormats.includes(input.format))throw new ProviderError('Choose a supported WordPress format',400);
      if(input.siteId&&!user)throw new ProviderError('Sign in to use a saved website',401);
      const site=input.siteId?ownedSite(user,String(input.siteId)).data:validateSite(input.site);
      const archive=wordpressPackage(site,input.format);
      res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${slug(site.business)}-${input.format}.zip"`,'Cache-Control':'no-store'});
      return res.end(archive);
    }
    if(p==='/api/auth/recovery/request'&&req.method==='POST'){
      rate('recover-request:'+req.socket.remoteAddress,5);
      const input=await body(req,1024);requestRecovery(store,input.email,authOrigin(publicOrigin));
      return json(res,202,{accepted:true});
    }
    if(p==='/api/auth/recovery/confirm'&&req.method==='POST'){
      rate('recover-confirm:'+req.socket.remoteAddress,8);
      const input=await body(req,2048);
      return json(res,200,recoverPassword(db,input.token,input.password));
    }
    if(p.startsWith('/api/')&&!user)throw new ProviderError('Sign in to continue',401);
    if(user&&p.startsWith('/api/'))assertAccess(db,user,routeFeature(p,req.method));
    if(p==='/api/account/provider-budget'&&req.method==='GET')return json(res,200,providerBudget(db,user));
    if(p==='/api/account/provider-budget'&&req.method==='PUT')return json(res,200,updateProviderBudget(db,user,await body(req,2048)));
    if(p==='/api/account/email'&&req.method==='GET')return json(res,200,mailStatus(db,user));
    if(p==='/api/account/email/verify'&&req.method==='POST'){
      rate('verify-mail:'+user,5);
      if(!mailReady())throw new ProviderError('Email delivery is not configured yet',409);
      queueAccountLink(store,user,session.email,'verify',authOrigin(publicOrigin));
      return json(res,202,{accepted:true});
    }
    if(p==='/api/account/email/confirm'&&req.method==='POST'){
      rate('verify-token:'+user,8);
      return json(res,200,verifyAccountMail(db,user,(await body(req,1024)).token));
    }
    if(p==='/api/account/email/alerts'&&req.method==='PUT')return json(res,200,setLeadAlerts(db,user,(await body(req,1024)).enabled));
    if(p==='/api/account/settings'&&req.method==='GET')return json(res,200,accountProfile(db,user));
    if(p==='/api/account/settings'&&req.method==='PUT'){
      rate('account-settings:'+user,12);
      return json(res,200,saveProfile(db,user,await body(req,360000)));
    }
    if(p==='/api/rewards'&&req.method==='GET')return json(res,200,customerRewards(db,user));
    if(p==='/api/rewards/redeem'&&req.method==='POST'){rate('reward:'+user,10);return json(res,200,redeemBonus(db,user,(await body(req)).code));}
    if(p==='/api/rewards/referral'&&req.method==='POST'){rate('reward:'+user,10);return json(res,200,attachReferral(db,user,(await body(req)).code));}
    if(p==='/api/google/start'&&req.method==='POST')return json(res,200,{url:googleStart(db,user,await body(req))});
    if(p==='/api/google/callback'&&req.method==='GET'){const destination=await googleCallback(store,url.searchParams,user);res.writeHead(303,{Location:destination});return res.end();}
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
    if(p==='/api/indexing/batches'&&req.method==='GET')return json(res,200,{usage:inspectionUsage(db,user),batches:db.prepare(`SELECT b.*, count(i.id) AS total, count(CASE WHEN i.status IN ('completed','failed') THEN 1 END) AS finished FROM indexing_batches b LEFT JOIN indexing_items i ON i.batch_id=b.id WHERE b.user_id=? GROUP BY b.id ORDER BY b.created DESC LIMIT 50`).all(user)});
    const batch=p.match(/^\/api\/indexing\/batches\/([a-f0-9-]{36})(\/csv)?$/);if(batch&&req.method==='GET'){const result=inspectionBatch(db,user,batch[1]);if(!batch[2])return json(res,200,result);res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="sitocal-index-inspections.csv"'});return res.end(batchCsv(result));}
    if(p==='/api/indexing/history'&&req.method==='GET')return json(res,200,{events:db.prepare('SELECT * FROM indexing_events WHERE user_id=? ORDER BY created DESC LIMIT 50').all(user).map(e=>({...e,config:JSON.parse(e.config),result:JSON.parse(e.result)}))});
    const indexAction=p.match(/^\/api\/indexing\/(properties|sitemaps|inspect|submit)$/);
    if(indexAction&&req.method==='POST'){rate('indexing:'+user,30);const input=await body(req);const result=await indexingAction(store,user,indexAction[1],input);if(['inspect','submit'].includes(indexAction[1]))db.prepare('INSERT INTO indexing_events VALUES(?,?,?,?,?,?)').run(id(),user,indexAction[1],JSON.stringify(input),JSON.stringify(result),new Date().toISOString());return json(res,200,result);}
    const ticketAttachment=p.match(/^\/api\/workspace\/support\/attachment\/([a-zA-Z0-9-]+)$/);
    if(ticketAttachment&&req.method==='GET'){
      const row=db.prepare('SELECT m.media,m.attachment FROM support_messages m JOIN support_tickets t ON t.id=m.ticket_id WHERE m.id=? AND t.user_id=?').get(ticketAttachment[1],user);
      if(!row?.attachment)throw new ProviderError('Attachment not found',404);
      res.writeHead(200,{'Content-Type':row.media,'Content-Disposition':'attachment; filename="support-screenshot.'+(row.media==='image/png'?'png':'jpg')+'"','Cache-Control':'no-store'});return res.end(row.attachment);
    }
    if(p==='/api/workspace/support'&&req.method==='GET'){
      const tickets=db.prepare('SELECT * FROM support_tickets WHERE user_id=? ORDER BY updated DESC LIMIT 50').all(user);
      return json(res,200,{tickets:tickets.map(ticket=>({...ticket,messages:db.prepare('SELECT id,author,message,created,media FROM support_messages WHERE ticket_id=? ORDER BY rowid DESC LIMIT 50').all(ticket.id).reverse()}))});
    }
    if(p==='/api/workspace/support'&&req.method==='POST'){
      rate('support-write:'+user,5);
      const input=await body(req,1410000),message=String(input.message||'').trim(),title=String(input.title||'').trim();
      if(!message||message.length>4000)throw new ProviderError('Enter a message of 1–4,000 characters',400);
      let image=null,media=null;
      if(input.screenshot){
        const match=String(input.screenshot).match(/^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/);
        if(!match)throw new ProviderError('Attach a PNG or JPEG screenshot',400);
        image=Buffer.from(match[2],'base64');media=match[1];
        if(image.length>1048576||!(media==='image/png'?image.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')):image.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))))throw new ProviderError('Attach a valid PNG or JPEG under 1 MB',400);
      }
      const now=new Date().toISOString();
      const ticket=atomic(db,()=>{
        let ticket=input.ticket;
        if(ticket){
          const row=db.prepare('SELECT status FROM support_tickets WHERE id=? AND user_id=?').get(String(ticket),user);
          if(!row)throw new ProviderError('Ticket not found',404);
          if(row.status==='closed')throw new ProviderError('This ticket is closed',409);
          if(db.prepare('SELECT count(*) n FROM support_messages WHERE ticket_id=?').get(ticket).n>=50)throw new ProviderError('This thread is full. Open a follow-up ticket.',409);
          db.prepare("UPDATE support_tickets SET status='open',updated=? WHERE id=?").run(now,ticket);
        }else{
          if(!title||title.length>120||!['Builder','Editor','Publishing','Search','Billing','Other'].includes(input.area)||!['Bug','Question','Feature request'].includes(input.kind)||!['Minor','Major','Blocking'].includes(input.severity))throw new ProviderError('Enter a title and choose a report category',400);
          if(db.prepare("SELECT count(*) n FROM support_tickets WHERE user_id=?").get(user).n>=50)throw new ProviderError('Ticket limit reached',429);
          if(input.site)ownedSite(user,String(input.site));
          ticket=id();
          db.prepare('INSERT INTO support_tickets VALUES(?,?,?,?,?,?,?,?,?)').run(ticket,user,title,input.area,input.kind,input.severity,input.site||null,'open',now);
        }
        db.prepare('INSERT INTO support_messages VALUES(?,?,?,?,?,?,?)').run(id(),ticket,'customer',message,now,image,media);
        return ticket;
      });
      return json(res,201,{id:ticket});
    }
    if(p==='/api/workspace/call-phrases'&&req.method==='GET')return json(res,200,{phrases:db.prepare('SELECT * FROM call_phrases WHERE user_id=? ORDER BY created DESC LIMIT 500').all(user)});
    if(p==='/api/workspace/call-phrases'&&req.method==='POST'){
      rate('call-phrases:'+user,20);
      const input=await body(req,4096);
      const niche=String(input.niche||'').trim(),service=String(input.service||'').trim(),phrase=String(input.phrase||'').trim();
      if(!niche||niche.length>80||!service||service.length>100||!phrase||phrase.length>400||!['Unclassified','Booked','Paid'].includes(input.outcome))throw new ProviderError('Enter a niche, service, short phrase and outcome',400);
      if(db.prepare('SELECT count(*) n FROM call_phrases WHERE user_id=?').get(user).n>=500)throw new ProviderError('Your phrase library holds up to 500 entries',409);
      db.prepare('INSERT INTO call_phrases VALUES(?,?,?,?,?,?,?)').run(id(),user,niche,service,phrase,input.outcome,new Date().toISOString());
      return json(res,201,{ok:true});
    }
    if(p==='/api/workspace/call-phrases'&&req.method==='DELETE'){
      const input=await body(req,1024);
      if(!db.prepare('DELETE FROM call_phrases WHERE id=? AND user_id=?').run(String(input.id||''),user).changes)throw new ProviderError('Phrase not found',404);
      return json(res,200,{ok:true});
    }
    if(p==='/api/editor/preferences'&&req.method==='GET')return json(res,200,editorPreferences(user));
    if(p==='/api/editor/preferences'&&req.method==='PUT'){
      const input=await body(req,4096);
      if(!input||typeof input!=='object'||!['showGuide','saveOnPreview','confirmRemove','showInsert'].every(key=>typeof input[key]==='boolean')||!['',...aiProviders].includes(input.aiProvider)||!['','netlify','vercel','cloudflare','render'].includes(input.host)||!['','github','gitlab','bitbucket'].includes(input.source))throw new ProviderError('Choose supported editor defaults',400);
      const {showGuide,saveOnPreview,confirmRemove,showInsert,aiProvider,host,source}=input;
      const value={showGuide,saveOnPreview,confirmRemove,showInsert,aiProvider,host,source};
      db.prepare('INSERT INTO editor_preferences VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings').run(user,JSON.stringify(value));
      return json(res,200,value);
    }
    if(p==='/api/workspace/leads/count'&&req.method==='GET')return json(res,200,{newLeads:db.prepare("SELECT count(*) n FROM website_leads l JOIN sites s ON s.id=l.site_id WHERE s.user_id=? AND l.status='new'").get(user).n});
    if(p==='/api/workspace/leads'&&req.method==='GET'){
      const status=url.searchParams.get('status')||'all';
      if(status!=='all'&&!leadStatuses.includes(status))throw new ProviderError('Invalid lead status',400);
      const counts=db.prepare('SELECT l.status,count(*) count FROM website_leads l JOIN sites s ON s.id=l.site_id WHERE s.user_id=? GROUP BY l.status').all(user);
      const leads=db.prepare("SELECT l.* FROM website_leads l JOIN sites s ON s.id=l.site_id WHERE s.user_id=? AND (?='all' OR l.status=?) ORDER BY l.created DESC LIMIT 100").all(user,status,status);
      return json(res,200,{leads:leads.map(lead=>({...lead,followup:db.prepare('SELECT assigned,note,updated FROM lead_followup WHERE lead_id=?').get(lead.id),history:db.prepare('SELECT status,created FROM lead_status_events WHERE lead_id=? ORDER BY rowid DESC LIMIT 8').all(lead.id)})),counts,forms:db.prepare('SELECT id,json_extract(data,?) business FROM sites WHERE user_id=? ORDER BY updated DESC').all('$.business',user).map(site=>({...site,url:contactFormUrl(site.id),alerts:db.prepare('SELECT enabled FROM website_lead_alerts WHERE site_id=?').get(site.id)?.enabled!==0}))});
    }
    if(p==='/api/workspace/leads'&&req.method==='PATCH'){
      const input=await body(req,8192);
      if(!leadStatuses.includes(input.status))throw new ProviderError('Invalid lead status',400);
      const assigned=String(input.assigned||'').trim(),note=String(input.note||'').trim(),leadId=String(input.id||'');
      if(assigned.length>120||note.length>1200)throw new ProviderError('Shorten the assignee or follow-up note',400);
      atomic(db,()=>{
        const lead=db.prepare('SELECT l.status FROM website_leads l JOIN sites s ON s.id=l.site_id WHERE l.id=? AND s.user_id=?').get(leadId,user);
        if(!lead)throw new ProviderError('Lead not found',404);
        const now=new Date().toISOString();
        if(lead.status!==input.status){
          db.prepare('UPDATE website_leads SET status=? WHERE id=?').run(input.status,leadId);
          db.prepare('INSERT INTO lead_status_events VALUES(?,?,?,?)').run(id(),leadId,input.status,now);
        }
        if(input.assigned!==undefined||input.note!==undefined)db.prepare('INSERT INTO lead_followup VALUES(?,?,?,?) ON CONFLICT(lead_id) DO UPDATE SET assigned=excluded.assigned,note=excluded.note,updated=excluded.updated').run(leadId,assigned,note,now);
      });
      return json(res,200,{ok:true});
    }
    if(p==='/api/workspace/calls/ringba'&&req.method==='POST'){
      rate('ringba-import:'+user,8);
      const input=await body(req,1024*1024),site=ownedSite(user,String(input.siteId||''));
      const currency=input.currency;
      if(!['USD','PKR','GBP','EUR','CAD','AUD'].includes(currency))throw new ProviderError('Choose the report currency',400);
      const rows=summarizeRingba(input.csv,{number:input.number,format:input.format});
      if(input.commit===true){
        atomic(db,()=>{
          const replace=db.prepare('INSERT INTO website_ringba_totals VALUES(?,?,?,?,?,?,?) ON CONFLICT(site_id,day,currency) DO UPDATE SET calls=excluded.calls,paid=excluded.paid,cents=excluded.cents,imported=excluded.imported');
          const now=new Date().toISOString();
          for(const row of rows)replace.run(site.id,row.day,currency,row.calls,row.paid,row.cents,now);
        });
      }
      return json(res,200,{rows,committed:input.commit===true});
    }
    if(p==='/api/workspace/calls'&&req.method==='GET'){
      const records=db.prepare('SELECT r.* FROM website_call_records r JOIN sites s ON s.id=r.site_id WHERE s.user_id=? ORDER BY day DESC LIMIT 100').all(user);
      const imported=db.prepare('SELECT r.* FROM website_ringba_totals r JOIN sites s ON s.id=r.site_id WHERE s.user_id=? ORDER BY day DESC LIMIT 100').all(user);
      return json(res,200,{records,imported});
    }
    if(p==='/api/workspace/calls'&&req.method==='POST'){
      const input=await body(req,2048);
      ownedSite(user,String(input.siteId||''));
      const {day,currency}=input,calls=Number(input.calls),paid=Number(input.paid),cents=Math.round(Number(input.payout)*100);
      if(input.calls==null||input.paid==null||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day||!['USD','PKR','GBP','EUR','CAD','AUD'].includes(currency)||![calls,paid,cents].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000)||paid>calls||!/^\d+(\.\d{1,2})?$/.test(input.payout))throw new ProviderError('Enter a valid date, call counts and payout',400);
      db.prepare('INSERT INTO website_call_records VALUES(?,?,?,?,?,?,?) ON CONFLICT(site_id,day,currency) DO UPDATE SET calls=excluded.calls,paid=excluded.paid,cents=excluded.cents').run(id(),input.siteId,day,calls,paid,cents,currency);
      return json(res,200,{ok:true});
    }
    if(p==='/api/sites'&&req.method==='GET')return json(res,200,{sites:db.prepare('SELECT * FROM sites WHERE user_id=? ORDER BY updated DESC').all(user).map(s=>({...s,data:JSON.parse(s.data)}))});
    if(p==='/api/sites'&&req.method==='POST'){checkSiteCapacity(db,user);const b=await body(req);if(b.generation==='ai'){const provider=b.aiProvider||'openai';if(!aiProviders.includes(provider))throw new ProviderError('Unknown AI provider',400);const c=connection(user,provider);const generated=await job(user,null,'ai-generation',async()=>{const r=await generateSite(c,b,provider);return {...saveSite(user,r.site),usage:r.usage,model:r.model,provider,promptVersion:r.promptVersion};});return json(res,201,generated);}if(b.pages)return json(res,201,saveSite(user,b));return json(res,201,atomic(db,()=>{const site=saveSite(user,draftSite(b));db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?)').run(id(),user,site.id,'template-generation','completed','{}',site.created);return site;}));}
    if(p==='/api/import'&&req.method==='POST'){
      const files=unzip(await body(req)),manifest=findManifest(files,validateSite);
      if(manifest)return json(res,201,importWebsiteBundle(user,manifest,files));
      const html=Object.entries(files).filter(([n])=>/\.html?$/i.test(n));if(!html.length)throw new ProviderError('ZIP has no Sitocal manifest or HTML pages',400);
      // Return source text only; client parses in an inert DOM and extracts editable text.
      return json(res,200,{needsMapping:true,pages:html.slice(0,30).map(([name,data])=>({name,html:data.toString('utf8')})),warning:'Arbitrary HTML import extracts headings and paragraphs. Original layout, scripts, media and styling are not preserved.'});
    }
    const siteRoute=p.match(/^\/api\/sites\/([a-f0-9-]+)(?:\/(.*))?$/);
    if(siteRoute){
      const [,siteId,action]=siteRoute,site=ownedSite(user,siteId);
      if(action==='rewrite-section'&&req.method==='POST'){
        assertAccess(db,user,'editor');
        const input=await body(req,12000),section=input.section;
        if(input.reviewed!==true||!['openai','openrouter'].includes(input.provider)||!['concise','friendly','clear'].includes(input.style)||!section||!['heading','body','cta'].every(key=>typeof section[key]==='string')||section.heading.length>200||section.body.length>4000||section.cta.length>80)throw new ProviderError('Choose a provider, style and section, and authorize provider usage',400);
        const credentials=connection(user,input.provider);
        return json(res,200,await job(user,siteId,'section-rewrite',async()=>({section:await rewriteWebsiteSection(credentials,input.provider,{business:site.data.business,city:site.data.city,brief:site.data.businessBrief,style:input.style,section:{heading:section.heading,body:section.body,cta:section.cta}})})));
      }
      if(action==='media'&&req.method==='GET'){
        assertAccess(db,user,'editor');
        return json(res,200,{images:db.prepare('SELECT id,name,media,length(bytes) AS size,created FROM website_media WHERE site_id=? ORDER BY rowid DESC').all(siteId)});
      }
      if(action==='media'&&req.method==='POST'){
        assertAccess(db,user,'editor');rate('media:'+user,10);
        const input=await body(req,360000);
        const name=String(input.name||'').trim().slice(0,120);
        const match=typeof input.image==='string'&&input.image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
        if(!match||!name)throw new ProviderError('Choose a PNG, JPEG or WebP image',400);
        const media=match[1],bytes=Buffer.from(match[2],'base64');
        if(!validWebsiteImage(media,bytes))throw new ProviderError('Choose a valid image under 256 KB',400);
        const asset=id();
        atomic(db,()=>{
          if(db.prepare('SELECT count(*) n FROM website_media WHERE site_id=?').get(siteId).n>=8)throw new ProviderError('Each website can store eight images',409);
          db.prepare('INSERT INTO website_media VALUES(?,?,?,?,?,?)').run(asset,siteId,name,media,bytes,new Date().toISOString());
        });
        return json(res,201,{id:asset,name,media});
      }
      const mediaMatch=action?.match(/^media\/([a-f0-9-]+)$/);
      if(mediaMatch&&['GET','DELETE'].includes(req.method)){
        assertAccess(db,user,'editor');
        const asset=db.prepare('SELECT * FROM website_media WHERE id=? AND site_id=?').get(mediaMatch[1],siteId);
        if(!asset)throw new ProviderError('Image not found',404);
        if(req.method==='DELETE'){
          if(site.data.pages.some(page=>page.sections.some(section=>section.image===asset.id)))throw new ProviderError('Remove this image from the saved draft before deleting it',409);
          db.prepare('DELETE FROM website_media WHERE id=? AND site_id=?').run(asset.id,siteId);
          return json(res,200,{ok:true});
        }
        res.writeHead(200,{'Content-Type':asset.media,'Cache-Control':'no-store'});return res.end(asset.bytes);
      }
      if(!action&&req.method==='GET')return json(res,200,site);
      if(!action&&req.method==='PUT')return json(res,200,saveSite(user,await body(req),siteId));
      if(!action&&req.method==='DELETE'){db.prepare('DELETE FROM sites WHERE id=? AND user_id=?').run(siteId,user);return json(res,200,{ok:true});}
      if(action==='revisions'&&req.method==='GET')return json(res,200,{revisions:db.prepare('SELECT id,created FROM revisions WHERE site_id=? AND user_id=? ORDER BY rowid DESC LIMIT 50').all(siteId,user)});
      if(action==='restore'&&req.method==='POST'){const b=await body(req),r=db.prepare('SELECT data FROM revisions WHERE id=? AND site_id=? AND user_id=?').get(b.revision,siteId,user);if(!r)throw new ProviderError('Revision not found',404);return json(res,200,saveSite(user,JSON.parse(r.data),siteId));}
      if(action==='draft-preview'&&req.method==='POST'){const data=validateSite(await body(req)),key=randomBytes(24).toString('hex');for(const[k,v]of draftPreviews)if(v.expires<Date.now())draftPreviews.delete(k);if(draftPreviews.size>500)draftPreviews.delete(draftPreviews.keys().next().value);draftPreviews.set(key,{user,siteId,data,expires:Date.now()+600000});return json(res,200,{key});}
      if(action==='preview'&&req.method==='GET'){const draft=url.searchParams.get('draft'),cached=draft?draftPreviews.get(draft):null;if(draft&&(!cached||cached.user!==user||cached.siteId!==siteId||cached.expires<Date.now()))throw new ProviderError('Preview expired. Apply changes again.',404);const data=cached?.data||site.data;const page=data.pages.find(x=>x.slug===url.searchParams.get('page'))||data.pages[0];res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'",'X-Robots-Tag':'noindex, nofollow'});return res.end(renderPage(data,page,url.searchParams.get('edit')==='1',Object.fromEntries(websiteMedia(siteId).map(image=>[image.id,'data:'+image.media+';base64,'+image.bytes.toString('base64')]))));}
      if((action==='export'||action==='convert')&&req.method==='GET'){const files=action==='export'?staticFiles(site.data,contactFormUrl(site.id),launchPlan(db,site).origin,websiteMedia(site.id)):converterFiles(site.data,url.searchParams.get('format'));res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${slug(site.data.business)}-${action}.zip"`});return res.end(zip(files));}
      if(action==='search/inspect'&&req.method==='POST'){
        assertAccess(db,user,'indexing');rate('site-index-inspection:'+user,5);
        const origin=launchPlan(db,site).origin;
        const binding=db.prepare('SELECT property FROM website_search_property WHERE site_id=? AND origin=?').get(siteId,origin);
        if(!origin||!binding)throw new ProviderError('Link a verified Search Console property to this site first',409);
        const urls=site.data.pages.map(page=>origin+(page.slug==='home'?'/':'/'+page.slug+'.html')).join('\n');
        return json(res,202,await queueInspection(store,user,{property:binding.property,urls}));
      }
      if(action==='lead-alerts'&&req.method==='PUT'){
        const input=await body(req,1024);
        if(typeof input.enabled!=='boolean')throw new ProviderError('Choose whether to send alerts for this website',400);
        db.prepare('INSERT INTO website_lead_alerts VALUES(?,?) ON CONFLICT(site_id) DO UPDATE SET enabled=excluded.enabled').run(siteId,Number(input.enabled));
        return json(res,200,{enabled:input.enabled});
      }
      if(action==='search'&&req.method==='GET'){
        assertAccess(db,user,'serp');
        const binding=db.prepare('SELECT property,origin FROM website_search_property WHERE site_id=?').get(siteId);
        const trackers=db.prepare('SELECT * FROM website_rank_tracking WHERE site_id=? ORDER BY rowid').all(siteId);
        const history=db.prepare("SELECT config,data,created FROM observations WHERE user_id=? AND json_extract(config,'$.siteId')=? ORDER BY rowid DESC LIMIT 100").all(user,siteId).map(row=>({...row,config:JSON.parse(row.config),data:JSON.parse(row.data)}));
        const origin=launchPlan(db,site).origin;
        const property=binding?.origin===origin?binding.property:'';
        return json(res,200,{origin,property,trackers,history,indexing:websiteIndexingOverview(user,site,origin,property)});
      }
      if(action==='search/property'&&req.method==='PUT'){
        assertAccess(db,user,'indexing');rate('search-property:'+user,10);
        const input=await body(req,2048),property=String(input.property||'');
        if(!property){db.prepare('DELETE FROM website_search_property WHERE site_id=?').run(siteId);return json(res,200,{property:''});}
        const origin=launchPlan(db,site).origin;
        if(!origin)throw new ProviderError('Save the website address in the launch plan first',409);
        propertyUrl(property,origin+'/');
        const available=await indexingAction(store,user,'properties',{});
        if(!available.properties.some(row=>row.siteUrl===property&&row.permissionLevel!=='siteUnverifiedUser'))throw new ProviderError('Choose a verified Search Console property',403);
        db.prepare('INSERT INTO website_search_property VALUES(?,?,?) ON CONFLICT(site_id) DO UPDATE SET property=excluded.property,origin=excluded.origin').run(siteId,property,origin);
        return json(res,200,{property});
      }
      if(action==='search/keywords'&&req.method==='POST'){
        assertAccess(db,user,'serp');rate('track-settings:'+user,12);
        const input=await body(req,2048),keyword=String(input.keyword||'').trim(),location=Number(input.location),device=input.device;
        if(!keyword||keyword.length>200||!Number.isSafeInteger(location)||location<1||!['mobile','desktop'].includes(device))throw new ProviderError('Enter a keyword, location code and device',400);
        const daily=input.daily===true;
        if(daily&&input.reviewed!==true)throw new ProviderError('Authorize recurring provider usage to schedule this keyword',400);
        if(!launchPlan(db,site).origin)throw new ProviderError('Save the website address in the launch plan first',409);
        if(daily&&!db.prepare("SELECT 1 FROM connections WHERE user_id=? AND provider='dataforseo'").get(user))throw new ProviderError('Connect your own DataForSEO credentials to schedule checks',409);
        const tracker=id();
        atomic(db,()=>{
          if(db.prepare('SELECT count(*) n FROM website_rank_tracking WHERE site_id=?').get(siteId).n>=10)throw new ProviderError('Track up to 10 keywords per website',409);
          db.prepare('INSERT INTO website_rank_tracking VALUES(?,?,?,?,?,?,?,?)').run(tracker,siteId,keyword,location,device,daily?1:0,daily?Date.now()+86400000:0,'');
        });
        return json(res,201,{id:tracker});
      }
      const trackerAction=action?.match(/^search\/keywords\/([a-f0-9-]+)$/);
      if(trackerAction&&['DELETE','POST'].includes(req.method)){
        assertAccess(db,user,'serp');
        const tracker=db.prepare('SELECT * FROM website_rank_tracking WHERE id=? AND site_id=?').get(trackerAction[1],siteId);
        if(!tracker)throw new ProviderError('Tracked keyword not found',404);
        if(req.method==='DELETE'){
          db.prepare('DELETE FROM website_rank_tracking WHERE id=? AND site_id=?').run(tracker.id,siteId);
          return json(res,200,{ok:true});
        }
        if((await body(req,1024)).reviewed!==true)throw new ProviderError('Authorize this provider check first',400);
        return json(res,200,await runSiteRank(user,site,tracker));
      }
      if(action==='launch/probe'&&req.method==='POST'){
        rate('launch-probe:'+user,4);
        const plan=launchPlan(db,site);
        if(!plan.origin)throw new ProviderError('Save the public website address first',409);
        if(activeProbes>=4)throw new ProviderError('Launch checks are busy. Try again shortly.',429);
        activeProbes++;
        try{
          const result=await probeSite(plan.origin,{hasContactPage:site.data.pages.some(page=>page.slug==='contact'),contactUrl:contactFormUrl(siteId)});
          db.prepare('INSERT INTO website_launch_probe VALUES(?,?,?,?) ON CONFLICT(site_id) DO UPDATE SET origin=excluded.origin,revision=excluded.revision,result=excluded.result').run(siteId,plan.origin,site.updated,JSON.stringify(result));
          return json(res,200,result);
        }finally{activeProbes--;}
      }
      if(action==='launch'&&req.method==='GET'){const plan=launchPlan(db,site);const probe=db.prepare('SELECT result FROM website_launch_probe WHERE site_id=? AND origin=? AND revision=?').get(siteId,plan.origin,site.updated);return json(res,200,{...plan,probe:probe?JSON.parse(probe.result):null});}
      if(action==='launch'&&req.method==='PUT'){
        const input=await body(req,4096);
        return json(res,200,atomic(db,()=>{const before=launchPlan(db,site).origin;const plan=saveLaunchPlan(db,site,input);if(before!==plan.origin)db.prepare("UPDATE website_rank_tracking SET daily=0,next_run=0,last_status='Schedule paused after website address change' WHERE site_id=? AND daily=1").run(siteId);return plan;}));
      }
      if(action==='deployment-status'&&req.method==='POST'){
        rate('deployment-status:'+user,12);
        const input=await body(req,2048);
        const row=db.prepare("SELECT result FROM jobs WHERE id=? AND site_id=? AND user_id=? AND kind='publish' AND status='completed'").get(String(input.jobId||''),siteId,user);
        if(!row)throw new ProviderError('Deployment not found',404);
        const result=JSON.parse(row.result);
        const provider=result.deployment?.provider;
        if(!['vercel','netlify'].includes(provider))throw new ProviderError('Check this deployment in your hosting dashboard',409);
        const status=await deploymentStatus(provider,connection(user,provider),result.deployment.id);
        result.deploymentStatus=status;
        db.prepare('UPDATE jobs SET result=? WHERE id=? AND user_id=?').run(JSON.stringify(result),String(input.jobId),user);
        return json(res,200,status);
      }
      if(action==='publish'&&req.method==='POST'){
        const b=await body(req);if(b.reviewed!==true)throw new ProviderError('Review business facts before publishing',400);
        if(!['','github','gitlab','bitbucket'].includes(b.source||'')||!['','netlify','vercel','cloudflare','render'].includes(b.host||'')||!b.source&&!['netlify','vercel'].includes(b.host))throw new ProviderError('Select a source provider or direct deployment host',400);
        const plan=launchPlan(db,site);
        const sourceConfig=b.source?configuredDestination(plan,'source',b.source,connection(user,b.source)):null;
        const hostConfig=b.host?configuredDestination(plan,'host',b.host,connection(user,b.host)):null;
        return json(res,200,await job(user,siteId,'publish',async()=>{const files=staticFiles(site.data,contactFormUrl(site.id),launchPlan(db,site).origin,websiteMedia(site.id)),out={};if(b.source)out.source=await pushRepository(b.source,sourceConfig,files);if(b.host){try{out.deployment={...await deploy(b.host,hostConfig,files,site.data.business),provider:b.host};}catch(e){if(out.source)return {...out,partial:true,deploymentError:e instanceof ProviderError?e.message:'Deployment request failed; reconcile in provider dashboard.'};throw e;}}return out;}));
      }
    }
    if(p==='/api/connections'&&req.method==='GET'){const rows=db.prepare('SELECT provider FROM connections WHERE user_id=?').all(user);return json(res,200,{managed:managedProviders(db).filter(p=>!rows.some(r=>r.provider===p)),connections:[...new Set([...rows.map(x=>x.provider),...managedProviders(db)])],checks:db.prepare('SELECT provider,result FROM connector_checks WHERE user_id=?').all(user).map(x=>({provider:x.provider,...JSON.parse(x.result)})),googleConfigured:googleReady()});}
    const conn=p.match(/^\/api\/connections\/([a-z0-9]+)$/);
    if(conn){const provider=conn[1];if(![...providers,'google'].includes(provider))throw new ProviderError('Unknown provider',400);if(req.method==='DELETE'){db.prepare('DELETE FROM connector_checks WHERE user_id=? AND provider=?').run(user,provider);db.prepare('DELETE FROM connections WHERE user_id=? AND provider=?').run(user,provider);return json(res,200,{ok:true});}if(req.method==='PUT'&&provider!=='google'){let b=await body(req);if(extraProviders[provider])b=validateExtraConfig(provider,b);db.prepare('DELETE FROM connector_checks WHERE user_id=? AND provider=?').run(user,provider);if(JSON.stringify(b).length>10000)throw new ProviderError('Connection too large',400);db.prepare('INSERT OR REPLACE INTO connections VALUES(?,?,?)').run(user,provider,store.seal(b));return json(res,200,{saved:true,verified:false});}}
    const connectorRoute=p.match(/^\/api\/connectors\/([a-z0-9]+)\/(verify|execute)$/);
    if(connectorRoute&&req.method==='POST'){
      const [,provider,action]=connectorRoute;if(!providers.includes(provider))throw new ProviderError('Unknown connector',400);
      const b=await body(req);rate('connector:'+user,12);const c=connection(user,provider);
      if(action==='verify'){
        const original=db.prepare('SELECT secret FROM connections WHERE user_id=? AND provider=?').get(user,provider)?.secret;
        let result;try{result=await verifyConnector(provider,c);}catch(e){result={status:'failed',verified:false,checkedAt:new Date().toISOString(),note:e instanceof ProviderError?e.message:'Connection check failed.'};}
        // Replaced/deleted credentials must never inherit an in-flight check.
        if(original&&db.prepare('SELECT secret FROM connections WHERE user_id=? AND provider=?').get(user,provider)?.secret===original)db.prepare('INSERT OR REPLACE INTO connector_checks VALUES(?,?,?)').run(user,provider,JSON.stringify(result));
        return json(res,200,result);
      }
      return json(res,200,await job(user,null,'connector-'+provider,()=>executeConnector(provider,c,b)));
    }
    if(p==='/api/jobs'&&req.method==='GET')return json(res,200,{jobs:db.prepare('SELECT * FROM jobs WHERE user_id=? ORDER BY rowid DESC LIMIT 50').all(user).map(j=>({...j,result:JSON.parse(j.result)}))});
    if(p==='/api/serp/locations'&&req.method==='GET'){rate('serp-locations:'+user,12);return json(res,200,{locations:await searchLocations(url.searchParams.get('country'),url.searchParams.get('q'),connection(user,'dataforseo'))});}
    if(p==='/api/serp/history'&&req.method==='GET')return json(res,200,{observations:db.prepare('SELECT * FROM observations WHERE user_id=? ORDER BY rowid DESC LIMIT 100').all(user).map(o=>({...o,config:JSON.parse(o.config),data:JSON.parse(o.data)}))});
    if(['/api/serp/check','/api/serp/demand','/api/serp/traffic','/api/serp/backlinks'].includes(p)&&req.method==='POST'){
      const b=await body(req);b.keyword=String(b.keyword||'').slice(0,200);b.domain=String(b.domain||'').trim().toLowerCase();b.locationCode=Number(b.locationCode);b.language=/^[a-z]{2}$/.test(b.language)?b.language:'en';b.device=b.device==='mobile'?'mobile':'desktop';b.competitors=String(b.competitors||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3);
      if(!(p.endsWith('/check')&&!b.domain)&&!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(b.domain)||!Number.isInteger(b.locationCode)||b.locationCode<1||b.competitors.some(x=>! /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(x)))throw new ProviderError('Use a hostname and a provider location code',400);
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
    const files={'/assets/appearance.js':['appearance.js','text/javascript'],'/assets/coverage.js':['coverage.js','text/javascript'],'/assets/admin.js':['admin.js','text/javascript'],'/assets/admin.css':['admin.css','text/css'],'/assets/page-routes.js':['page-routes.js','text/javascript'],'/assets/emerald.css':['emerald.css','text/css'],'/assets/font-inter.css':['font-inter.css','text/css'],'/assets/font-manrope.css':['font-manrope.css','text/css'],'/assets/serpum-features.js':['serpum-features.js','text/javascript'],'/assets/serpum.js':['serpum.js','text/javascript'],'/assets/serpum-data.js':['serpum-data.js','text/javascript'],'/assets/serpum.css':['serpum.css','text/css'],'/assets/navigation.js':['navigation.js','text/javascript'],'/assets/style.css':['style.css','text/css'],'/assets/fieldwork.css':['fieldwork.css','text/css'],'/assets/landing.css':['landing.css','text/css'],'/assets/marketing.css':['marketing.css','text/css'],'/assets/marketing.js':['marketing.js','text/javascript'],'/assets/tools.js':['tools.js','text/javascript'],'/assets/auth.js':['auth.js','text/javascript'],'/assets/product-landings.js':['product-landings.js','text/javascript'],'/assets/auth.css':['auth.css','text/css'],'/assets/products.css':['products.css','text/css'],'/assets/policies.js':['policies.js','text/javascript'],'/assets/app.js':['app.js','text/javascript'],...Object.fromEntries(['logo','logo-dark','icon','icon-dark'].map(name=>['/assets/brand/'+name+'.svg',['brand/'+name+'.svg','image/svg+xml']]))};
    const visual=p.match(/^\/assets\/(vendors|previews)\/([a-z0-9-]+)\.svg$/);if(visual){const file=path.join(root,'public',visual[1],visual[2]+'.svg');try{const data=await readFile(file);res.setHeader('Content-Security-Policy',"default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox");res.writeHead(200,{'Content-Type':'image/svg+xml'});return res.end(data);}catch{throw new ProviderError('Asset not found',404);}}
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'");
    if(files[p]){res.writeHead(200,{'Content-Type':files[p][1]+'; charset=utf-8'});return res.end(await readFile(path.join(root,'public',files[p][0])));}
    if(!publicRoutes.includes(p.slice(1))&&!navigationRoutes.includes(p.slice(1))&&!['/','/app','/create-website','/settings','/editor-settings','/my-websites','/generations','/deployments','/form-leads','/call-earnings','/call-intelligence','/serp-checker','/site-search','/support-tickets','/whats-new','/editor','/wp','/serp','/domains','/integrations','/login','/register','/recover','/publish','/jobs','/sign-in','/create-account','/dashboard','/about','/contact','/blog','/products-services','/privacy-policy','/terms-and-conditions','/refund-policy','/service-policy','/shipping-policy','/api-mcp','/google-indexer','/developer','/indexing','/billing','/account','/serp-home'].includes(p))throw new ProviderError('Page not found',404);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});const html=await readFile(path.join(root,'public','index.html'),'utf8');let entry=html.replace('name="sitocal-domain" content=""',`name="sitocal-domain" content="${baseDomain}"`);
    const serpHome=(baseDomain&&hostname==='serp.'+baseDomain&&p==='/')||p==='/serp',indexerHome=p==='/google-indexer';
    const publicHome=p==='/'&&(!baseDomain||hostname===baseDomain||hostname==='www.'+baseDomain),publicRoute=publicRoutes.includes(p.slice(1));
    const privateTool=Boolean(user&&(['/api-mcp','/google-indexer'].includes(p)||serpHome));
    if(privateTool||['/login','/register'].includes(p))entry=entry.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
    if(!privateTool&&(serpHome||indexerHome||publicHome||publicRoute)){
      const production=Boolean(baseDomain&&(hostname===baseDomain||hostname.endsWith('.'+baseDomain)));
      const href=(name,query='')=>pageHref(name,{baseDomain,hostname,signedIn:Boolean(user)},query);
      const darkLogo='<span class="logo"><img class="brand-lockup" src="/assets/brand/logo-dark.svg" alt="Sitocal" width="155" height="47"></span>';
      const rendered=serpHome?{html:serpLanding({href,darkLogo}),title:'Sitocal SERP — Research your next local opportunity'}:indexerHome?{html:indexerLanding({href,darkLogo}),title:'Google Indexer — Sitocal'}:publicHome?{html:marketingHome({href,darkLogo,planCatalog:planCatalog(db)}),title:'Sitocal — Your local growth workspace'}:publicPage(p.slice(1),{href,darkLogo,planCatalog:planCatalog(db)});
      const title=serpHome||indexerHome||publicHome?rendered.title:rendered.title+' — Sitocal';
      if(serpHome||indexerHome)entry=entry.replace('Sitocal brings local website creation, editing, WordPress exports and search research into one workspace.',serpHome?'Research local rankings, competitors and demand with connected provider data in Sitocal.':'Inspect verified URLs, queue bulk GSC checks, submit sitemaps and export per-URL CSV reports with Sitocal.');
      entry=entry.replace('<title>Sitocal — Your local growth workspace</title>','<title>'+title+'</title>').replace('<div id="root"><div class="loading">Sitocal is opening your workspace…</div></div>','<div id="root">'+rendered.html+'</div>');
      if(rendered.description)entry=entry.replace('Sitocal brings local website creation, editing, WordPress exports and search research into one workspace.',rendered.description.replaceAll('&','&amp;').replaceAll('"','&quot;'));
      const canonical=p==='/serpum'||p.startsWith('/serpum/')?(production?'https://serp.'+baseDomain+p:origin+p):serpHome?(production?'https://serp.'+baseDomain+'/':origin+'/serp'):(production?'https://'+baseDomain+p:origin+p);entry=entry.replace('</head>','<link rel="canonical" href="'+canonical+'"></head>');
    }
    res.end(entry);
  }catch(e){if(e instanceof ProviderError)return json(res,e.status,{error:e.message});if(/Unsafe|ZIP|Archive|archive|site|Business|Page slugs|Choose|Invalid|page with/.test(e.message))return json(res,400,{error:e.message});console.error('Request failed:',p,e.name);json(res,500,{error:'The request could not be completed. Inspect server/provider logs before retrying external actions.'});}
}
async function runSiteRank(user,site,tracker){
 assertAccess(db,user,'serp');
 const origin=launchPlan(db,site).origin;
 if(!origin)throw new ProviderError('Save the website address in the launch plan first',409);
 const config={siteId:site.id,trackerId:tracker.id,keyword:tracker.keyword,domain:new URL(origin).hostname,locationCode:tracker.location,device:tracker.device,language:'en',competitors:[]};
 const credential=connection(user,'dataforseo');
 return job(user,site.id,'site-rank',async()=>{
  const result=await checkSerp(credential,config);
  db.prepare('INSERT INTO observations VALUES(?,?,?,?,?)').run(id(),user,JSON.stringify(config),JSON.stringify(result),new Date().toISOString());
  return result;
 });
}
function startRankWorker(){
 let active=false;
 const timer=setInterval(async()=>{
  if(active)return;
  active=true;
  try{
   const row=db.prepare('SELECT t.*,s.user_id FROM website_rank_tracking t JOIN sites s ON s.id=t.site_id WHERE t.daily=1 AND t.next_run<=? ORDER BY t.next_run LIMIT 1').get(Date.now());
   if(!row)return;
   const claim=db.prepare('UPDATE website_rank_tracking SET next_run=? WHERE id=? AND next_run=? AND daily=1').run(Date.now()+86400000,row.id,row.next_run);
   if(!claim.changes)return;
   let status='Completed';
   try{
    if(!db.prepare("SELECT 1 FROM connections WHERE user_id=? AND provider='dataforseo'").get(row.user_id))throw new ProviderError('Reconnect your DataForSEO account',409);
    await runSiteRank(row.user_id,ownedSite(row.user_id,row.site_id),row);
   }catch(error){status=error instanceof ProviderError?error.message:'Check failed';}
   db.prepare('UPDATE website_rank_tracking SET last_status=? WHERE id=?').run(status.slice(0,180),row.id);
  }catch(error){console.error('Rank worker failed:',error.name);}
  finally{active=false;}
 },30000);
 timer.unref();
 return ()=>clearInterval(timer);
}
const workersDisabled=process.env.SITOCAL_DISABLE_WORKERS==='true';
const stopMailWorker=workersDisabled?()=>{}:startAccountMailWorker(store);
const stopRankWorker=workersDisabled?()=>{}:startRankWorker();
const stopInspectionWorker=workersDisabled?()=>{}:startInspectionWorker(store);
const server=http.createServer(handler);server.requestTimeout=120000;server.headersTimeout=15000;server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Sitocal local alpha: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopInspectionWorker();stopRankWorker();stopMailWorker();server.close(()=>{db.close();process.exit(0);});});
