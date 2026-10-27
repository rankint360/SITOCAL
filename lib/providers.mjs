import { Buffer } from 'node:buffer';
import { zip } from './archive.mjs';
import { slug } from './sites.mjs';

export class ProviderError extends Error {constructor(message,status=502){super(message);this.status=status;}}
export async function request(url,{method='GET',headers={},body}={}){
  const res=await fetch(url,{method,headers,body:body===undefined?undefined:body instanceof FormData||Buffer.isBuffer(body)||typeof body==='string'?body:JSON.stringify(body),signal:AbortSignal.timeout(45000),redirect:'error'});
  const raw=await res.text();let data;try{data=JSON.parse(raw);}catch{data={};}
  if(!res.ok)throw new ProviderError(`Provider returned HTTP ${res.status}. Check token permissions, project settings and provider logs.`,res.status===401||res.status===403?422:502);
  return data;
}
const jsonHeaders=token=>({'Authorization':`Bearer ${token}`,'Content-Type':'application/json'});
const segment=s=>encodeURIComponent(String(s));
function repoParts(repo){const p=String(repo||'').split('/');if(p.length!==2 || p.some(x=>! /^[a-z0-9_.-]+$/i.test(x)))throw new ProviderError('Repository must be owner/name',400);return p;}
export async function pushRepository(provider,config,files){
  const branch=config.branch||'main',message='Publish website from Rankleem';
  if(!/^[a-z0-9_./-]+$/i.test(branch) || branch.includes('..'))throw new ProviderError('Invalid branch',400);
  if(provider==='github'){
    const [owner,repo]=repoParts(config.repository),base=`https://api.github.com/repos/${owner}/${repo}`,headers={...jsonHeaders(config.token),'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    // Existing initialized repositories only; new private repo creation is an explicit setup action.
    const ref=await request(`${base}/git/ref/heads/${segment(branch)}`,{headers});
    const commit=await request(`${base}/git/commits/${ref.object.sha}`,{headers});
    const tree=await request(`${base}/git/trees`,{method:'POST',headers,body:{base_tree:commit.tree.sha,tree:Object.entries(files).map(([path,content])=>({path,mode:'100644',type:'blob',content:String(content)}))}});
    const next=await request(`${base}/git/commits`,{method:'POST',headers,body:{message,tree:tree.sha,parents:[ref.object.sha]}});
    await request(`${base}/git/refs/heads/${segment(branch)}`,{method:'PATCH',headers,body:{sha:next.sha,force:false}});
    return {commit:next.sha,url:`https://github.com/${owner}/${repo}/commit/${next.sha}`,status:'committed'};
  }
  if(provider==='gitlab'){
    repoParts(config.repository);const base=`https://gitlab.com/api/v4/projects/${segment(config.repository)}`,headers={'PRIVATE-TOKEN':config.token,'Content-Type':'application/json'};
    const tree=await request(`${base}/repository/tree?ref=${segment(branch)}&per_page=100`,{headers});
    const current=new Set(tree.filter(x=>x.type==='blob').map(x=>x.path));
    const r=await request(`${base}/repository/commits`,{method:'POST',headers,body:{branch,commit_message:message,actions:Object.entries(files).map(([file_path,content])=>({action:current.has(file_path)?'update':'create',file_path,content:String(content)}))}});
    return {commit:r.id,url:r.web_url,status:'committed'};
  }
  if(provider==='bitbucket'){
    const [workspace,repo]=repoParts(config.repository);const form=new FormData();form.set('branch',branch);form.set('message',message);for(const [path,content] of Object.entries(files))form.set(path,new Blob([content]),path);
    // Bitbucket API token authentication uses account email + API token.
    await request(`https://api.bitbucket.org/2.0/repositories/${workspace}/${repo}/src`,{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`},body:form});
    return {url:`https://bitbucket.org/${workspace}/${repo}/src/${segment(branch)}`,status:'committed'};
  }
  throw new ProviderError('Unsupported source provider',400);
}
export async function deploy(provider,config,files,name){
  if(provider==='netlify'){
    if(!/^[a-z0-9-]+$/i.test(config.project||''))throw new ProviderError('Netlify site ID is required',400);
    const r=await request(`https://api.netlify.com/api/v1/sites/${segment(config.project)}/deploys`,{method:'POST',headers:{Authorization:`Bearer ${config.token}`,'Content-Type':'application/zip'},body:zip(files)});
    return {id:r.id,url:r.deploy_ssl_url||r.ssl_url,status:r.state||'submitted'};
  }
  if(provider==='vercel'){
    const r=await request('https://api.vercel.com/v13/deployments'+(config.team?`?teamId=${segment(config.team)}`:''),{method:'POST',headers:jsonHeaders(config.token),body:{name:slug(config.project||name),target:'production',projectSettings:{framework:null},files:Object.entries(files).map(([file,data])=>({file,data:Buffer.from(data).toString('base64'),encoding:'base64'}))}});
    return {id:r.id,url:r.url?`https://${r.url}`:null,status:r.readyState||'submitted'};
  }
  if(provider==='cloudflare'){
    const hook=new URL(config.hook||'https://invalid.invalid');
    if(hook.protocol!=='https:' || hook.hostname!=='api.cloudflare.com' || !/^\/client\/v4\/pages\/webhooks\/deploy_hooks\/[a-z0-9_-]+$/i.test(hook.pathname) || hook.search || hook.username || hook.password)throw new ProviderError('Use a Cloudflare Pages deployment hook URL',400);
    const r=await request(hook.href,{method:'POST'});if(r.success===false)throw new ProviderError('Cloudflare rejected deployment hook');
    return {status:'triggered',message:'Git-linked Pages build triggered. Configure repository connection first; verify deployment in Cloudflare.'};
  }
  if(provider==='render'){
    if(!/^srv-[a-z0-9]+$/i.test(config.project||''))throw new ProviderError('Render service ID is required',400);
    const r=await request(`https://api.render.com/v1/services/${segment(config.project)}/deploys`,{method:'POST',headers:jsonHeaders(config.token),body:{clearCache:'do_not_clear'}});
    return {id:r.id,status:r.status||'triggered',message:'Build triggered from the configured Render repository.'};
  }
  throw new ProviderError('Unsupported deployment provider',400);
}
export function normalizeSerp(response,target,competitors=[]){
  const task=response.tasks?.[0];if(response.status_code!==20000 || task?.status_code!==20000)throw new ProviderError('SERP provider did not complete this task. No rank recorded.');
  const result=task.result?.[0];if(!result)throw new ProviderError('No SERP result payload. No rank recorded.');
  const items=(result.items||[]).filter(i=>i.type==='organic').map(i=>({position:i.rank_group,url:i.url,title:i.title,domain:i.domain}));
  const hostname=v=>{try{return new URL(v.includes('://')?v:`https://${v}`).hostname.replace(/^www\./,'').toLowerCase();}catch{return '';}};
  const matches=domain=>{const item=items.find(i=>hostname(i.url||i.domain)===hostname(domain));return {domain,position:item?.position??null,url:item?.url??null,state:item?'ranked':'not_found_within_depth'};};
  return {items,targets:[target,...competitors].map(matches),cost:response.cost??task.cost??null,depth:100,provider:'dataforseo',observedAt:new Date().toISOString()};
}
export async function checkSerp(c,input){
  const auth=Buffer.from(`${c.login}:${c.password}`).toString('base64');
  const response=await request('https://api.dataforseo.com/v3/serp/google/organic/live/advanced',{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'},body:[{keyword:input.keyword,location_code:input.locationCode,language_code:input.language||'en',device:input.device||'desktop',depth:100}]});
  return normalizeSerp(response,input.domain,input.competitors);
}
export async function demand(c,input){
  const r=await request('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${c.login}:${c.password}`).toString('base64')}`,'Content-Type':'application/json'},body:[{keywords:[input.keyword],location_code:input.locationCode,language_code:input.language||'en'}]});
  if(r.status_code!==20000||r.tasks?.[0]?.status_code!==20000)throw new ProviderError('Demand task was not completed');return {data:r.tasks[0].result,cost:r.cost,source:'Google Ads estimates via DataForSEO'};
}
