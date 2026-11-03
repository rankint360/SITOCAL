import { ProviderError } from './providers.mjs';
import {connectorRequest} from './connector-http.mjs';

const cached=new Map();
const pending=new Map();
export async function searchLocations(country,input,credentials){
 const code=String(country||'').toUpperCase(),query=String(input||'').trim().toLowerCase();
 if(!/^[A-Z]{2}$/.test(code)||query.length<2||query.length>80)throw new ProviderError('Enter a two-letter country code and at least two city characters',400);
 let catalog=cached.get(code);
 if(!catalog||catalog.expires<Date.now()){
  if(!pending.has(code)){
   if(pending.size>=4)throw new ProviderError('Location lookup is busy. Try again shortly.',429);
   const auth=Buffer.from(credentials.login+':'+credentials.password).toString('base64');
   pending.set(code,connectorRequest('https://api.dataforseo.com/v3/serp/google/locations/'+code,{headers:{Authorization:'Basic '+auth},maxBytes:12*1024*1024}).then(data=>{
    if(data.status_code!==20000||data.tasks?.[0]?.status_code!==20000||!Array.isArray(data.tasks[0].result))throw new ProviderError('Provider location list unavailable');
    const rows=data.tasks[0].result.filter(row=>row.country_iso_code===code&&Number.isSafeInteger(row.location_code)&&typeof row.location_name==='string').map(row=>({code:row.location_code,name:row.location_name.slice(0,200)}));
    if(cached.size>=8)cached.delete(cached.keys().next().value);
    const result={rows,expires:Date.now()+86400000};cached.set(code,result);return result;
   }).finally(()=>pending.delete(code)));
  }
  catalog=await pending.get(code);
 }
 return catalog.rows.filter(row=>row.name.toLowerCase().startsWith(query)).slice(0,20);
}
