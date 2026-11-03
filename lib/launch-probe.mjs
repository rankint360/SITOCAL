import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIPv4 } from 'node:net';
import { ProviderError } from './providers.mjs';

export function publicIPv4(address){
 if(!isIPv4(address))return false;
 const [a,b,c]=address.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||
 a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0&&(c===0||c===2)||b===88&&c===99)||
 a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
async function pinnedAddress(host,resolve=lookup){
 let timer;
 try{
  const records=await Promise.race([resolve(host,{family:4,all:true}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS timed out')),4000);})]);
  if(!records.length||records.some(record=>!publicIPv4(record.address)))throw Error('Non-public address');
  return records[0].address;
 }catch{throw new ProviderError('The website must resolve to a public IPv4 address',409);}
 finally{clearTimeout(timer);}
}
function readPage(url,address){
 return new Promise((resolve,reject)=>{
  const req=request(url,{method:'GET',agent:false,family:4,
   lookup:(_host,options,done)=>options.all?done(null,[{address,family:4}]):done(null,address,4),
   headers:{Accept:'text/html, application/xml, text/xml','User-Agent':'SITOCAL launch check'}
  },res=>{
   const chunks=[];let size=0;
   res.on('data',part=>{
    size+=part.length;
    if(size>256*1024){req.destroy(Error('Response exceeds 256 KB'));return;}
    chunks.push(part);
   });
   res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
   res.on('error',reject);
  });
  const deadline=setTimeout(()=>req.destroy(Error('HTTPS request timed out')),8000);
  req.on('close',()=>clearTimeout(deadline));
  req.on('error',reject);
  req.end();
 });
}
export async function probeSite(origin,{hasContactPage,contactUrl,resolve,read=readPage}){
 const base=new URL(origin);
 const address=await pinnedAddress(base.hostname,resolve);
 const paths=[['homepage','/'],['sitemap','/sitemap.xml'],['contact',hasContactPage?'/contact.html':'/']];
 const responses=new Map();
 const checks=[];
 for(const [key,path] of paths){
  try{
   if(!responses.has(path))responses.set(path,read(new URL(path,base),address));
   const response=await responses.get(path);
   const ok=response.status>=200&&response.status<300;
   const content=key==='sitemap'?/<urlset(?:\s|>)/i.test(response.body)&&response.body.includes('<loc>'+base.origin+'/'):key==='contact'?response.body.includes(contactUrl):Boolean(response.body.trim());
   checks.push({key,status:response.status,passed:ok&&content});
  }catch{checks.push({key,status:null,passed:false});}
 }
 return {checkedAt:new Date().toISOString(),checks};
}
