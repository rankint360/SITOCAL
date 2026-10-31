import {ProviderError} from './providers.mjs';
import {connectorRequest as request} from './connector-http.mjs';
export const extraProviders={claude:['token','model'],gemini:['token','model'],grok:['token','model'],semrush:['token'],ahrefs:['token'],seranking:['token'],cursor:['token']};
export const aiProviders=['openai','claude','gemini','grok'];
const bearer=c=>({Authorization:'Bearer '+c.token});
const basic=(a,b)=>({Authorization:'Basic '+Buffer.from(a+':'+b).toString('base64')});
const part=value=>encodeURIComponent(value);
export function validateExtraConfig(provider,input){
 const fields=extraProviders[provider];if(!fields)throw new ProviderError('Unknown connector',400);
 const config={};for(const key of fields){const value=input[key];if(typeof value!=='string'||!value.trim()||value.length>2000||/[\r\n\x00]/.test(value))throw new ProviderError('Supply a valid '+key,400);config[key]=value.trim();}
 if(config.model&&!/^[a-zA-Z0-9._:-]{1,150}$/.test(config.model))throw new ProviderError('Use a model ID, not a URL',400);
 return config;
}
function checked(data){if(!data||typeof data!=='object'||!Object.keys(data).length||Array.isArray(data)&&!data.length||data.success===false||data.error||data.errors)throw new ProviderError('Provider did not confirm access. Check API permissions and billing.');return data;}
function repoParts(c){if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(c.repository||''))throw new ProviderError('Use repository owner/name',400);return c.repository.split('/').map(part).join('/');}
export async function verifyConnector(provider,c){
 let data;const auth=bearer(c);
 switch(provider){
 case 'openai':data=await request('https://api.openai.com/v1/models/'+part(c.model),{headers:auth});if(data.id!==c.model)throw new ProviderError('Selected model was not confirmed.');break;
 case 'claude':data=await request('https://api.anthropic.com/v1/models/'+part(c.model),{headers:{'x-api-key':c.token,'anthropic-version':'2023-06-01'}});if(!data.id)throw new ProviderError('Selected model was not confirmed.');break;
 case 'gemini':data=await request('https://generativelanguage.googleapis.com/v1beta/models/'+part(c.model),{headers:{'x-goog-api-key':c.token}});if(!data.supportedGenerationMethods?.includes('generateContent'))throw new ProviderError('Selected model does not support text generation.');break;
 case 'grok':data=await request('https://api.x.ai/v1/models/'+part(c.model),{headers:auth});if(!data.id)throw new ProviderError('Selected model was not confirmed.');break;
 case 'github':data=await request('https://api.github.com/repos/'+repoParts(c),{headers:{...auth,Accept:'application/vnd.github+json'}});if(data.permissions?.push===false)throw new ProviderError('Repository is readable but push permission is missing.',422);break;
 case 'gitlab':data=await request('https://gitlab.com/api/v4/projects/'+part(c.repository),{headers:{'PRIVATE-TOKEN':c.token}});break;
 case 'bitbucket':data=await request('https://api.bitbucket.org/2.0/repositories/'+repoParts(c),{headers:basic(c.email,c.token)});break;
 case 'netlify':data=await request('https://api.netlify.com/api/v1/sites/'+part(c.project),{headers:auth});break;
 case 'vercel':data=await request('https://api.vercel.com/v9/projects/'+part(c.project)+(c.team?'?teamId='+part(c.team):''),{headers:auth});break;
 case 'render':data=await request('https://api.render.com/v1/services/'+part(c.project),{headers:auth});break;
 case 'registrar':data=await request('https://api.cloudflare.com/client/v4/accounts/'+part(c.account),{headers:auth});break;
 case 'dataforseo':data=await request('https://api.dataforseo.com/v3/appendix/user_data',{headers:basic(c.login,c.password)});if(data.status_code!==20000||data.tasks?.some(t=>t.status_code!==20000))throw new ProviderError('DataForSEO did not confirm account access.');break;
 case 'ahrefs':data=await request('https://api.ahrefs.com/v3/subscription-info/limits-and-usage',{headers:auth});break;
 case 'seranking':data=await request('https://api.seranking.com/v1/account/subscription',{headers:{Authorization:'Token '+c.token}});break;
 case 'semrush':{const text=(await request('https://www.semrush.com/users/countapiunits.html?key='+part(c.token),{format:'text'})).trim();if(!/^\d+$/.test(text))throw new ProviderError('Semrush did not confirm an API unit balance.');data={units:text};break;}
 case 'cursor':data=await request('https://api.cursor.com/v1/agents?limit=1',{headers:basic(c.token,'')});if(!Array.isArray(data.agents))throw new ProviderError('Cursor did not confirm agent API access.');break;
 case 'cloudflare':{let u;try{u=new URL(c.hook);}catch{}if(!u||u.protocol!=='https:'||u.hostname!=='api.cloudflare.com'||u.username||u.password||u.search||u.hash||!/^\/client\/v4\/pages\/webhooks\/deploy_hooks\/[a-zA-Z0-9_-]+$/.test(u.pathname))throw new ProviderError('Use an official Cloudflare Pages deployment hook URL',400);return {status:'format-valid',verified:false,note:'Hook format checked locally. Access can only be tested by triggering a deployment from Publish.'};}
 default:throw new ProviderError('Unknown connector',400);
 }
 checked(data);return {status:'verified',verified:true,checkedAt:new Date().toISOString(),note:'Read access confirmed. This does not guarantee write permissions, generation credits or deployment success.'};
}
export async function executeConnector(provider,c,input){
 if(input.reviewed!==true)throw new ProviderError('Confirm the provider request and possible credit usage',400);
 let data,source;
 if(provider==='cursor'){if(input.action!=='agents')throw new ProviderError('Unsupported action',400);data=await request('https://api.cursor.com/v1/agents?limit=20',{headers:basic(c.token,'')});checked(data);return {source:'Cursor cloud agents',data};}
 const domain=String(input.domain||'').toLowerCase().trim();
 if(input.action!=='domain-overview'||! /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)||domain.length>253)throw new ProviderError('Use a public hostname and domain-overview action',400);
 const database=String(input.database||'us').toLowerCase();if(!/^[a-z]{2}$/.test(database))throw new ProviderError('Use a two-letter country database code',400);
 if(provider==='semrush'){
 const q=new URLSearchParams({type:'domain_ranks',key:c.token,domain,database,export_columns:'Dn,Rk,Or,Ot,Oc,Ad,At,Ac',display_limit:'1'});
 const text=await request('https://api.semrush.com/?'+q,{format:'text'});if(/^ERROR/i.test(text.trim())||!text.includes(';'))throw new ProviderError('Semrush returned no usable report. Check database coverage, API units and permissions.');
 const lines=text.trim().split(/\r?\n/),columns=lines.shift().split(';');data=lines.slice(0,10).map(line=>Object.fromEntries(line.split(';').map((v,i)=>[columns[i],v])));source='Semrush modeled organic/paid search estimates';
 }else if(provider==='ahrefs'){data=await request('https://api.ahrefs.com/v3/site-explorer/domain-rating?'+new URLSearchParams({target:domain,date:new Date().toISOString().slice(0,10),output:'json'}),{headers:bearer(c)});source='Ahrefs domain rating; proprietary backlink metric';
 }else if(provider==='seranking'){data=await request('https://api.seranking.com/v1/domain/overview/db?'+new URLSearchParams({domain,source:database}),{headers:{Authorization:'Token '+c.token}});source='SE Ranking modeled domain research';
 }else throw new ProviderError('Use this connector from its dedicated workspace action',400);
 checked(data);return {source,domain,database,observedAt:new Date().toISOString(),data,note:'Provider research estimates are not measured GA4 traffic or guaranteed Google rankings.'};
}
