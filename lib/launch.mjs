import {ProviderError,request} from './providers.mjs';

const sources=['','github','gitlab','bitbucket'];
const hosts=['','netlify','vercel','cloudflare','render'];
export const launchChecks=['homepage','contact','sitemap'];
export function publicSiteOrigin(input){
 if(!input)return '';
 let url;try{url=new URL(input);}catch{}
 if(!url||url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname))throw new ProviderError('Enter an HTTPS website origin, such as https://example.com',400);
 return url.origin;
}
export function launchPlan(db,site){
 const saved=db.prepare('SELECT settings FROM website_launch WHERE site_id=?').get(site.id);
 const plan=saved?JSON.parse(saved.settings):{source:'',host:'',origin:'',checked:[],checkedRevision:''};
 return {...plan,checked:plan.checkedRevision===site.updated?plan.checked:[]};
}
function launchDestination(input,prior,source,host){
 const field=(name,previous)=>String(input[name]??previous??'').trim();
 const repository=source?field('repository',source===prior.source?prior.repository:''):'';
 const branch=source?field('branch',source===prior.source?prior.branch:''):'';
 const project=['netlify','vercel','render'].includes(host)?field('project',host===prior.host?prior.project:''):'';
 if(repository&&(repository.length>200||!(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/).test(repository)||repository.split('/').some(segment=>segment==='.'||segment==='..')))throw new ProviderError('Use a repository in owner/name format',400);
 if(branch&&(branch.length>100||!/^[a-zA-Z0-9_./-]+$/.test(branch)||branch.includes('..')))throw new ProviderError('Enter a valid existing Git branch',400);
 if(project&&(project.length>100||!/^[a-z0-9-]+$/i.test(project)||host==='render'&&!/^srv-[a-z0-9]+$/i.test(project)))throw new ProviderError('Enter an existing hosting project or service ID',400);
 return {repository,branch,project};
}
export function configuredDestination(plan,type,provider,accountConfig){
 if(type==='source'&&plan.source===provider)return {...accountConfig,...(plan.repository?{repository:plan.repository}:{}),...(plan.branch?{branch:plan.branch}:{})};
 if(type==='host'&&plan.host===provider&&plan.project)return {...accountConfig,project:plan.project};
 return accountConfig;
}
export function saveLaunchPlan(db,site,input){
 if(!input||!sources.includes(input.source)||!hosts.includes(input.host)||!Array.isArray(input.checked)||input.checked.some(key=>!launchChecks.includes(key)))throw new ProviderError('Choose supported launch settings',400);
 const origin=publicSiteOrigin(input.origin);
 const prior=launchPlan(db,site);
 const checked=origin&&origin===prior.origin&&input.revision===site.updated?[...new Set(input.checked)]:[];
 const plan={source:input.source,host:input.host,origin,checked,checkedRevision:site.updated,...launchDestination(input,prior,input.source,input.host)};
 db.prepare('INSERT INTO website_launch VALUES(?,?) ON CONFLICT(site_id) DO UPDATE SET settings=excluded.settings').run(site.id,JSON.stringify(plan));
 return plan;
}
export async function deploymentStatus(provider,config,id){
 if(!/^[a-zA-Z0-9_-]{1,128}$/.test(id||''))throw new ProviderError('Deployment reference unavailable',409);
 let endpoint;
 if(provider==='netlify')endpoint='https://api.netlify.com/api/v1/deploys/'+encodeURIComponent(id);
 else if(provider==='vercel')endpoint='https://api.vercel.com/v13/deployments/'+encodeURIComponent(id)+(config.team?'?teamId='+encodeURIComponent(config.team):'');
 else throw new ProviderError('Check this deployment in your hosting dashboard',409);
 const result=await request(endpoint,{headers:{Authorization:'Bearer '+config.token}});
 if(result.id!==id)throw new ProviderError('Provider did not confirm this deployment',502);
 const raw=String(result.state||result.readyState||'unknown').toLowerCase();
 const state=raw==='ready'?'ready':['error','failed','canceled','cancelled'].includes(raw)?'failed':['building','queued','pending','uploaded','processing','deploying','enqueued','initializing','new','prepared','preparing','uploading'].includes(raw)?'pending':'unknown';
 return {state,providerStatus:raw.slice(0,40),checkedAt:new Date().toISOString()};
}
