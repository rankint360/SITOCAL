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
function saveSite(user,data,siteId){const now=new Date().toISOString();const v=validateSite(data);if(siteId){ownedSite(user,siteId);db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run(id(),siteId,user,JSON.stringify(v),now);db.prepare('UPDATE sites SET data=?,updated=? WHERE id=? AND user_id=?').run(JSON.stringify(v),now,siteId,user);}else{siteId=id();d…2871 tokens truncated…vider!=='google'){const b=await body(req);if(JSON.stringify(b).length>10000)throw new ProviderError('Connection too large',400);db.prepare('INSERT OR REPLACE INTO connections VALUES(?,?,?)').run(user,provider,store.seal(b));return json(res,200,{saved:true,verified:false});}}
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
