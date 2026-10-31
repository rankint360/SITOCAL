import { createHash } from 'node:crypto';
import { ProviderError } from './providers.mjs';
import { countryCodes,searchLanguages } from '../public/serpum-data.js';

export function createSerpumGeocoder({fetchImpl=globalThis.fetch,now=Date.now,env=process.env}={}){
 const cache=new Map();let busy=false,lastStart=-Infinity,day='',used=0;
 return async input=>{
  if(env.SERPUM_GEOCODING_ENABLED==='false')throw new ProviderError('Address lookup is disabled. Enter known coordinates manually.',503);
  const address=String(input?.address||'').trim().replace(/\s+/g,' '),country=String(input?.country||'').toUpperCase(),language=String(input?.language||'en');
  if(address.length<3||address.length>250||/[\x00-\x1f<>]/.test(address))throw new ProviderError('Enter a public address of 3–250 characters.',400);
  if(!countryCodes.includes(country)||!searchLanguages.some(([code])=>code===language))throw new ProviderError('Choose a supported country and language.',400);
  const time=now(),key=createHash('sha256').update(JSON.stringify([address.toLocaleLowerCase('en'),country,language])).digest('hex');
  for(const [k,v] of cache)if(v.expires<=time)cache.delete(k);
  const stored=cache.get(key);if(stored)return {...stored.value,cached:true};
  if(busy||time-lastStart<1100)throw new ProviderError('Address lookup is busy. Wait a moment before trying again, or enter coordinates.',429);
  const currentDay=new Date(time).toISOString().slice(0,10);if(day!==currentDay){day=currentDay;used=0;}
  const allowance=Number(env.SERPUM_GEOCODE_DAILY_LIMIT||500);if(!Number.isInteger(allowance)||allowance<1||allowance>10000)throw new ProviderError('Geocoder daily allowance is not configured correctly.',503);
  if(used>=allowance)throw new ProviderError('The shared daily address-lookup allowance is reached. Enter known coordinates manually.',429);
  const provider=env.SERPUM_GEOCODER_PROVIDER||'photon';if(!['photon','nominatim'].includes(provider))throw new ProviderError('Geocoder provider is not configured correctly.',503);
  let endpoint;try{endpoint=new URL(env.SERPUM_GEOCODER_URL||(provider==='photon'?'https://photon.komoot.io/api/':'https://nominatim.openstreetmap.org/search'));}catch{throw new ProviderError('Geocoder endpoint is not configured correctly.',503);}
  if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.hash||endpoint.port)throw new ProviderError('Geocoder requires an HTTPS endpoint without credentials or a custom port.',503);
  if(endpoint.hostname==='nominatim.openstreetmap.org'&&env.SERPUM_NOMINATIM_PUBLIC_ACK!=='true')throw new ProviderError('Public Nominatim requires an informed operator policy review and explicit configuration. Use Photon or a self-hosted provider.',503);
  const addressProvider=provider==='photon'?'Photon (OpenStreetMap data)':'Configured Nominatim-compatible geocoder';
  endpoint.search='';endpoint.searchParams.set('q',address);endpoint.searchParams.set('limit','5');if(provider==='photon'){endpoint.searchParams.set('countrycode',country);endpoint.searchParams.set('lang',['en','de','fr'].includes(language)?language:'en');}else{endpoint.searchParams.set('format','jsonv2');endpoint.searchParams.set('countrycodes',country.toLowerCase());endpoint.searchParams.set('addressdetails','1');endpoint.searchParams.set('accept-language',language);}
  busy=true;lastStart=time;used++;
  try{
   const response=await fetchImpl(endpoint.href,{headers:{'User-Agent':'SITOCAL-SERPUM/0.2.0 (+https://serp.sitocal.com/serpum; contact@sitocal.com)','Accept':'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
   if(!response.ok)throw new ProviderError(response.status===429?'The address provider is rate limited. Wait before retrying or use manual coordinates.':'Address provider unavailable. Try later or enter known coordinates.',response.status===429?429:502);
   const declared=Number(response.headers?.get('content-length')||0);if(declared>256000)throw new ProviderError('Address provider returned too much data.',502);
   const reader=response.body?.getReader();let text='';
   if(reader){const decoder=new TextDecoder();let size=0;try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>256000){await reader.cancel();throw new ProviderError('Address provider returned too much data.',502);}text+=decoder.decode(item.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}
   else{text=await response.text();if(Buffer.byteLength(text)>256000)throw new ProviderError('Address provider returned too much data.',502);}
   let raw;try{raw=JSON.parse(text);}catch{throw new ProviderError('Address provider returned an invalid response.',502);}
   if(provider==='photon'){if(!Array.isArray(raw?.features))throw new ProviderError('Address provider returned an invalid response.',502);raw=raw.features.map(feature=>{const p=feature?.properties||{},point=feature?.geometry?.type==='Point'?feature.geometry.coordinates:[];const street=[p.housenumber,p.street].filter(Boolean).join(' ');return {lat:point?.[1],lon:point?.[0],display_name:[...new Set([p.name,street,p.district,p.city,p.county,p.state,p.postcode,p.country].filter(Boolean))].join(', '),address:{country_code:p.countrycode},type:p.osm_value||p.type};});}
   if(!Array.isArray(raw))throw new ProviderError('Address provider returned an invalid response.',502);
   const candidates=raw.slice(0,5).flatMap(row=>{
    if(row?.lat===null||row?.lon===null||String(row?.lat??'').trim()===''||String(row?.lon??'').trim()==='')return [];
    const latitude=Number(row.lat),longitude=Number(row.lon),label=String(row.display_name||'').trim();
    if(!Number.isFinite(latitude)||latitude<-90||latitude>90||!Number.isFinite(longitude)||longitude<-180||longitude>180||!label)return [];
    if(row.address?.country_code&&String(row.address.country_code).toUpperCase()!==country)return [];
    return [{label:label.slice(0,450),latitude,longitude,kind:String(row.addresstype||row.type||'place').slice(0,60)}];
   });
   if(raw.length&&!candidates.length)throw new ProviderError('No valid address coordinates were returned. Enter coordinates manually.',502);
   const value={candidates,provider:addressProvider,attribution:'© OpenStreetMap contributors',attributionUrl:'https://www.openstreetmap.org/copyright',cached:false};
   if(cache.size>=256)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:time+86400000});
   return value;
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('Address lookup did not complete. Try later or enter known coordinates.',502);}
  finally{busy=false;}
 };
}
