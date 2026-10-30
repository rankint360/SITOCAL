import { googleToken } from './google.mjs';
import { request,ProviderError } from './providers.mjs';
export function propertyUrl(property,value){
 let url;try{url=new URL(value);}catch{throw new ProviderError('Enter a fully qualified page or sitemap URL',400);}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||url.port||url.hash||! /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/i.test(url.hostname))throw new ProviderError('Use a public HTTP(S) URL without credentials, ports or fragments',400);
 if(property.startsWith('sc-domain:')){const domain=property.slice(10).toLowerCase();if(url.hostname!==domain&&!url.hostname.endsWith('.'+domain))throw new ProviderError('URL is outside the selected Search Console property',400);}
 else{let prefix;try{prefix=new URL(property);}catch{throw new ProviderError('Invalid Search Console property',400);}if(url.origin!==prefix.origin||!url.pathname.startsWith(prefix.pathname))throw new ProviderError('URL is outside the selected Search Console property',400);}
 return url.href;
}
export async function indexingAction(store,user,kind,input){
 const token=await googleToken(store,user),headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const properties=await request('https://www.googleapis.com/webmasters/v3/sites',{headers});
 if(kind==='properties')return {properties:(properties.siteEntry||[]).map(s=>({siteUrl:s.siteUrl,permissionLevel:s.permissionLevel}))};
 const property=String(input.property||'');const access=properties.siteEntry?.find(p=>p.siteUrl===property&&p.permissionLevel!=='siteUnverifiedUser');if(!access)throw new ProviderError('Choose a verified Search Console property accessible to your connected account',403);
 const base=`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps`;
 if(kind==='sitemaps')return {source:'Google Search Console',property,data:await request(base,{headers})};
 const url=propertyUrl(property,String(input.url||''));
 if(kind==='inspect'){const data=await request('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{method:'POST',headers,body:{inspectionUrl:url,siteUrl:property,languageCode:'en-US'}});return {source:'Google URL Inspection API; indexed version, not a live crawl',property,url,verdict:data.inspectionResult?.indexStatusResult?.verdict||'UNKNOWN',data};}
 if(kind==='submit'){
  if(input.confirmed!==true)throw new ProviderError('Confirm sitemap submission before continuing',400);
  if(!['siteOwner','siteFullUser'].includes(access.permissionLevel))throw new ProviderError('Sitemap submission requires owner or full-user property access',403);
  const row=store.db.prepare("SELECT secret FROM connections WHERE user_id=? AND provider='google'").get(user);const saved=store.unseal(row.secret);
  if(!String(saved.scope||'').split(' ').includes('https://www.googleapis.com/auth/webmasters'))throw new ProviderError('Reconnect Google with sitemap-write permission before submitting',409);
  await request(base+'/'+encodeURIComponent(url),{method:'PUT',headers});return {source:'Google Search Console',status:'submitted',property,url,note:'Sitemap submitted. This does not guarantee crawling, indexing or ranking.'};
 }
 throw new ProviderError('Indexing operation not found',404);
}
