
export const pageAliases={'/developer':'/api-mcp','/indexing':'/google-indexer','/sign-in':'/login','/create-account':'/register','/dashboard':'/app'};
export const toolWorkspaces={'api-mcp':'developer','google-indexer':'indexing'};
export function canonicalPagePath(name){return ({developer:'api-mcp',indexing:'google-indexer','sign-in':'login','create-account':'register',dashboard:'app'})[name]||name;}
export function workspaceRoute(name){return toolWorkspaces[name]||name;}
export const workspaceDestinations=['app','create-website','serp','indexing','developer','api-mcp','google-indexer','integrations','billing','account','editor','wp','publish','domains','jobs'];
export function safeEntryDestination(value){const name=String(value||'').replace(/^\//,'');return workspaceDestinations.includes(name)?workspaceRoute(name):'app';}
export function pageHref(name,{baseDomain='',hostname='',signedIn=false}={},query=''){
 const production=Boolean(baseDomain&&(hostname===baseDomain||hostname.endsWith('.'+baseDomain)));
 if(name==='admin')return production?'https://admin.'+baseDomain+'/'+query:'/admin'+query;
 if(name==='login'&&new URLSearchParams(query).get('signup')==='1'){const params=new URLSearchParams(query);params.delete('signup');return pageHref('register',{baseDomain,hostname,signedIn},params.size?'?'+params:'');}
 if(!signedIn&&['developer','indexing','serp'].includes(name))return pageHref('login',{baseDomain,hostname,signedIn},'?returnTo='+encodeURIComponent('/'+canonicalPagePath(name)));
 if(name==='serpum'||name.startsWith('serpum/'))return production?'https://serp.'+baseDomain+'/'+name+query:'/'+name+query;
 if(['serp','serp-landing'].includes(name))return production?'https://serp.'+baseDomain+'/'+query:'/serp'+query;
 const canonical=canonicalPagePath(name);
 const sub=['editor','wp'].includes(canonical)?canonical:['app','create-website','publish','integrations','domains','jobs','login','register','developer','indexing','billing','account'].includes(canonical)||['developer','indexing'].includes(name)||canonical==='app'||signedIn&&Object.hasOwn(toolWorkspaces,canonical)?'app':'';
 const path=['app','editor','wp','landing'].includes(canonical)?'/':'/'+canonical;
 return production?'https://'+(sub?sub+'.':'')+baseDomain+path+query:(canonical==='landing'?'/':'/'+canonical)+query;
}
export function entryRedirect({baseDomain='',hostname='',path,search='',signedIn=false}){
 const context={baseDomain,hostname,signedIn},production=Boolean(baseDomain&&(hostname===baseDomain||hostname.endsWith('.'+baseDomain)));
 const params=new URLSearchParams(search);
 if(path==='/login'&&params.get('signup')==='1'){params.delete('signup');return {status:302,location:pageHref('register',context,params.size?'?'+params:'')};}
 if(path==='/register'||path==='/login'){
  if(signedIn)return {status:302,location:pageHref(safeEntryDestination(params.get('returnTo')),context)};
  const target=pageHref(path.slice(1),context,search);if(production&&target!=='https://'+hostname+path+search)return {status:301,location:target};
 }
 const isApp=path==='/app'||production&&hostname==='app.'+baseDomain&&path==='/';
 if(path==='/create-website'){
  if(!signedIn)return {status:302,location:pageHref('login',context,'?returnTo=%2Fcreate-website')};
  const target=pageHref('create-website',context,search);if(production&&target!=='https://'+hostname+path+search)return {status:301,location:target};
 }
 if(isApp){
  if(!signedIn)return {status:302,location:pageHref('login',context,'?returnTo=%2Fapp')};
  const target=pageHref('app',context,search);if(production&&target!=='https://'+hostname+path+search)return{status:301,location:target};
 }
 if(path==='/serp-home'||path==='/serp'){
  const target=pageHref('serp-landing',context,search);if(path==='/serp-home'||production&&target!=='https://'+hostname+path+search)return{status:301,location:target};
 }
 if(production){const name=path.slice(1);if(['editor','wp','publish','integrations','domains','jobs','billing','account'].includes(name)||signedIn&&Object.hasOwn(toolWorkspaces,name)){const target=pageHref(name,context,search);if(target!=='https://'+hostname+path+search)return {status:301,location:target};}}
 return null;
}
