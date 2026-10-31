import {ProviderError} from './providers.mjs';
export async function connectorRequest(url,{headers={},method='GET',body,format='json'}={}){
 let response;try{response=await fetch(url,{method,headers,body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(45000)});}catch{throw new ProviderError('Provider did not respond. Check its dashboard before retrying an action.');}
 if(!response.ok){await response.body?.cancel();throw new ProviderError('Provider returned HTTP '+response.status+'. Check permissions, API access and billing.',[401,403].includes(response.status)?422:502);}
 const reader=response.body?.getReader(),chunks=[];let size=0;
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2097152){await reader.cancel();throw new ProviderError('Provider response exceeded the size limit.');}chunks.push(Buffer.from(value));}
 const text=Buffer.concat(chunks).toString('utf8');if(format==='text')return text;
 try{return JSON.parse(text);}catch{throw new ProviderError('Provider returned an invalid response.');}
}
