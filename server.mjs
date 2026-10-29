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

const root=path.dirname(fileURLToPath(import.meta.url));const store=openStore(process.env.DATA_DIR||path.join(root,'data'));const {db}=store;
const port=Number(process.env.PORT||4317),publicOrigin=process.env.PUBLIC_ORIGIN||(process.env.RENDER_EXTERNAL_HOSTNAME?`https://${process.env.RENDER_EXTERNAL_HOSTNAME}`:`http://localhost:${port}`);
const {baseDomain,allowedHosts}=hostConfig(process.env);
const providers=['github','gitlab','bitbucket','netlify','vercel','cloudflare','render','dataforseo','registrar','openai'];
const limits=new Map();
const draftPreviews=new Map();
function rate(key,max=60){const t=Date.now(),r=limits.get(key);if(limits.size>10000)for(const[k,v]of limits)if(v.until<t)limits.delete(k);if(!r||r.until<t){limits.set(key,{count:1,until:t+60000});return;}if(++r.count>max)throw new ProviderError('Too many requests; try again in a minute',429);}
function connection(user,provider){const row=db.prepare('SELECT secret FROM connections WHERE user_id=? AND provider=?').get(user,provider);if(!row)throw new ProviderError(`Connect ${provider} in Integrations first`,409);return store.unseal(row.secret);}
function ownedSite(user,siteId){const row=db.prepare('SELECT * FROM sites WHERE id=? AND user_id=?').get(siteId,user);if(!row)throw new ProviderError('Project not found',404);return {...row,data:JSON.parse(row.data)};}
function saveSite(user,data,siteId){const now=new Date().toISOString();const v=validateSite(data);if(siteId){ownedSite(user,siteId);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);db.prepare('UPDATE sites SET data=?,updated=? WHERE id=? AND user_id=?').run(JSON.stringify(v),now,siteId,user);}else{siteId=id();db.prepare('INSERT INTO sites VALUES(?,?,?,?,?)').run(siteId,user,JSON.stringify(v),now,now);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);}return ownedSite(user,siteId);}
async function body(req){const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>17*1024*1024)throw new ProviderError('Request too large',413);chunks.push(c);}const b=Buffer.concat(chunks);if(req.headers['content-type']?.startsWith('application/zip'))return b;try{return JSON.parse(b.toString()||'{}');}catch{throw new ProviderError('Invalid JSON',400);}}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));}
function safeResult(value){return JSON.stringify(value);}
async function job(user,siteId,kind,fn){
  const daily=db.prepare('SELECT count(*) n FROM jobs WHERE user_id=? AND created>=?').get(user,new Date().toISOString().slice(0,10)).n;if(daily>=Number(process.env.DAILY_PROVIDER_ACTION_LIMIT||50))throw new ProviderError('Daily provider action limit reached',429);
  const active=db.prepare("SELECT id FROM jobs WHERE user_id=? AND status='running'").get(user);if(active)throw new ProviderError('Another provider action is running. Wait before retrying.',409);
  const jobId=id();db.prepare('INSERT INTO jobs VALUES(?,?,?,?,?,?,?)').run(jobId,user,siteId||null,kind,'running','{}',new Date().toISOString());
  try{const result=await fn();db.prepare('UPDATE jobs SET status=?,result=? WHERE id=?').run('completed',safeResult(result),jobId);return {jobId,...result};}catch(e){db.prepare('UPDATE jobs SET status=?,result=? WHERE id=?').run('failed',JSON.stringify({message:e instanceof ProviderError?e.message:'Request outcome may be unknown; inspect provider before retrying.'}),jobId);throw e;}
}
const cookieDomain=process.env.COOKIE_DOMAIN;
function cookie(token,clear=false){return `rankleem_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${clear?0:604800}${publicOrigin.startsWith('https:')?'; Secure':''}${cookieDomain?`; Domain=${cookieDomain}`:''}`;}
async function handler(req,res){
  const hostname=(req.headers.host||'').split(':')[0].toLowerCase();
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(!allowedHosts.has(hostname))return json(res,400,{error:'Unknown host'});
  const origin=`${process.env.TRUST_PROXY==='true'&&req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
  const url=new URL(req.url,origin),p=url.pathname;
  try{
    rate(req.socket.remoteAddress||'unknown',180);
    const token=req.headers.cookie?.match(/(?:^|;\s*)rankleem_session=([^;]+)/)?.[1]||'';
    const session=db.prepare('SELECT sessions.*,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE token=? AND expires>?').get(hash(token),Date.now());
    const user=session?.user_id;
    if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
      const requestOrigin=req.headers.origin;if(!requestOrigin||requestOrigin!==origin)throw new ProviderError('Origin check failed',403);
      if(user && !p.startsWith('/api/auth/') && req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Session verification failed. Reload this page.',403);
    }
    if(p==='/api/health')return json(res,200,{status:'ok',version:'0.1.4',mode:'development-alpha'});
    if(p==='/api/session')return json(res,200,{user:user?{id:user,email:session.email}:null,csrf:session?.csrf||null,googleConfigured:googleReady()});
    if(p==='/api/auth/register'||p==='/api/auth/login'){
      if(req.method!=='POST')throw new ProviderError('Method not allowed',405);rate('auth:'+req.socket.remoteAddress,10);const b=await body(req);const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<12||password.length>200)throw new ProviderError('Use a valid email and a password of 12–200 characters',400);
      let account=db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if(p.endsWith('register')){if(process.env.ALLOW_SIGNUPS==='false')throw new ProviderError('Registration is closed',403);if(process.env.REGISTRATION_CODE&&hash(String(b.invite||''))!==hash(process.env.REGISTRATION_CODE))throw new ProviderError('A valid registration invite code is required',403);if(account)throw new ProviderError('Account cannot be created with these details. Try signing in.',409);account={id:id(),email};db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(account.id,email,passwordHash(password),new Date().toISOString());}else if(!account||!checkPassword(password,account.password))throw new ProviderError('Email or password is incorrect',401);
      const next=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(next),account.id,csrf,Date.now()+604800000);res.setHeader('Set-Cookie',cookie(next));return json(res,200,{user:{id:account.id,email},csrf});
    }
    if(p==='/api/auth/logout'&&req.method==='POST'){if(user&&req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Session verification failed',403);db.prepare('DELETE FROM sessions WHERE token=?').run(hash(token));res.setHeader('Set-Cookie',cookie('',true));return json(res,200,{ok:true});}
    if(p.startsWith('/api/')&&!user)throw new ProviderError('Sign in to continue',401);
    if(p==='/api/google/start'&&req.method==='POST')return json(res,200,{url:googleStart(db,user)});
    if(p==='/api/google/callback'&&req.method==='GET'){await googleCallback(store,url.searchParams,user);res.writeHead(303,{Location:'/serp?google=connected'});return res.end();}
    if(p==='/api/google/properties'&&req.method==='GET')return json(res,200,await googleProperties(store,user));
    if(p==='/api/google/report'&&req.method==='POST')return json(res,200,await googleReport(store,user,await body(req)));
    if(p==='/api/sites'&&req.method==='GET')return json(res,200,{sites:db.prepare('SELECT * FROM sites WHERE user_id=? ORDER BY updated DESC').all(user).map(s=>({...s,data:JSON.parse(s.data)}))});
    if(p==='/api/sites'&&req.method==='POST'){const b=await body(req);if(b.generation==='ai'){const c=connection(user,'openai');const generated=await job(user,null,'ai-generation',async()=>{const r=await generateSite(c,b);return {...saveSite(user,r.site),usage:r.usage,model:r.model,promptVersion:r.promptVersion};});return json(res,201,generated);}return json(res,201,saveSite(user,b.pages?b:draftSite(b)));}
    if(p==='/api/import'&&req.method==='POST'){
      const files=unzip(await body(req)),manifest=Object.entries(files).find(([n])=>n==='rankleem.json'||n.endsWith('/rankleem.json'));
      if(manifest)return json(res,201,saveSite(user,JSON.parse(manifest[1].toString())));
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
    const files={'/assets/style.css':['style.css','text/css'],'/assets/fieldwork.css':['fieldwork.css','text/css'],'/assets/landing.css':['landing.css','text/css'],'/assets/app.js':['app.js','text/javascript'],...Object.fromEntries(['logo','logo-dark','icon','icon-dark'].map(name=>['/assets/brand/'+name+'.svg',['brand/'+name+'.svg','image/svg+xml']]))};
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'self'");
    if(files[p]){res.writeHead(200,{'Content-Type':files[p][1]+'; charset=utf-8'});return res.end(await readFile(path.join(root,'public',files[p][0])));}
    if(!['/','/app','/editor','/wp','/serp','/domains','/integrations','/login','/publish','/jobs'].includes(p))throw new ProviderError('Page not found',404);
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});const html=await readFile(path.join(root,'public','index.html'),'utf8');res.end(html.replace('name="rankleem-domain" content=""',`name="rankleem-domain" content="${baseDomain}"`));
  }catch(e){if(e instanceof ProviderError)return json(res,e.status,{error:e.message});if(/Unsafe|ZIP|Archive|archive|site|Business|Page slugs|Choose|Invalid|page with/.test(e.message))return json(res,400,{error:e.message});console.error('Request failed:',p,e.name);json(res,500,{error:'The request could not be completed. Inspect server/provider logs before retrying external actions.'});}
}
const server=http.createServer(handler);server.requestTimeout=120000;server.headersTimeout=15000;server.listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Sitocal local alpha: http://localhost:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{db.close();process.exit(0);}));
