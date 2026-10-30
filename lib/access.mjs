import { randomBytes } from 'node:crypto';
import { id,hash } from './store.mjs';
import { draftSite,staticFiles,slug } from './sites.mjs';
import { zip } from './archive.mjs';
import { ProviderError } from './providers.mjs';
export const apiScopes=['sites:read','sites:write','sites:export'];
export function createApiKey(db,user,input){
 if(!Array.isArray(input.scopes))throw new ProviderError('Select explicit API scopes',400);
 const name=String(input.name||'').trim(),scopes=[...new Set(input.scopes||[])],days=Number(input.days||30);
 if(!name||name.length>80||!scopes.length||scopes.some(s=>!apiScopes.includes(s))||!Number.isInteger(days)||days<1||days>90)throw new ProviderError('Use a name, explicit supported scopes and an expiry of 1–90 days',400);
 if(db.prepare('SELECT count(*) n FROM api_keys WHERE user_id=? AND revoked=0 AND expires>?').get(user,Date.now()).n>=20)throw new ProviderError('Revoke an unused key before creating another',409);
 const token='sitocal_sk_'+randomBytes(32).toString('hex'),key=id(),now=new Date().toISOString();
 db.prepare('INSERT INTO api_keys VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(key,user,name,token.slice(0,18),hash(token),JSON.stringify(scopes),Date.now()+days*86400000,0,now,null,0);
 return {id:key,token,scopes,expires:Date.now()+days*86400000,note:'Copy now. The full key is not stored and will not be shown again.'};
}
export const listApiKeys=(db,user)=>db.prepare('SELECT id,name,prefix,scopes,expires,revoked,created,last_used,requests FROM api_keys WHERE user_id=? ORDER BY created DESC').all(user).map(k=>({...k,scopes:JSON.parse(k.scopes)}));
export function revokeApiKey(db,user,key){const r=db.prepare('UPDATE api_keys SET revoked=1 WHERE id=? AND user_id=?').run(key,user);if(!r.changes)throw new ProviderError('Key not found',404);return {revoked:true};}
export function authenticateKey(db,header){
 const match=String(header||'').match(/^Bearer (sitocal_sk_[a-f0-9]{64})$/);
 if(!match)throw new ProviderError('A Sitocal API bearer key is required',401);
 const key=db.prepare('SELECT * FROM api_keys WHERE token_hash=? AND revoked=0 AND expires>?').get(hash(match[1]),Date.now());
 if(!key)throw new ProviderError('API key is invalid, expired or revoked',401);
 return {...key,scopes:JSON.parse(key.scopes)};
}
const requireScope=(key,scope)=>{if(!key.scopes.includes(scope))throw new ProviderError('API key requires '+scope,403);};
export function apiOperation({db,key,saveSite,ownedSite},operation,input={}){
 if(operation==='list'){requireScope(key,'sites:read');return {sites:db.prepare('SELECT id,data,created,updated FROM sites WHERE user_id=? ORDER BY updated DESC LIMIT 100').all(key.user_id).map(s=>({...s,data:JSON.parse(s.data)}))};}
 if(operation==='get'){requireScope(key,'sites:read');return ownedSite(key.user_id,input.siteId);}
 if(operation==='export'){requireScope(key,'sites:export');const s=ownedSite(key.user_id,input.siteId);return {site:s,files:staticFiles(s.data)};}
 if(operation==='create'){
  requireScope(key,'sites:write');const idem=String(input.idempotencyKey||'');if(!/^[a-zA-Z0-9_-]{8,100}$/.test(idem))throw new ProviderError('Provide an idempotency key of 8–100 letters, digits, underscores or hyphens',400);
  const body={...input};delete body.idempotencyKey;const digest=hash(JSON.stringify(body));
  const prior=db.prepare('SELECT digest,result FROM api_writes WHERE key_id=? AND request_key=?').get(key.id,idem);
  if(prior){if(prior.digest!==digest)throw new ProviderError('Idempotency key was used with different input',409);return JSON.parse(prior.result);}
  const total=db.prepare('SELECT count(*) n FROM api_writes WHERE key_id=? AND created>=?').get(key.id,new Date().toISOString().slice(0,10)).n;
  if(total>=100)throw new ProviderError('Daily API draft limit reached',429);
  const draft=draftSite(body);db.exec('BEGIN IMMEDIATE');try{const result=saveSite(key.user_id,draft);db.prepare('INSERT INTO api_writes VALUES(?,?,?,?,?)').run(key.id,idem,digest,JSON.stringify(result),new Date().toISOString());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}
 }
 throw new ProviderError('Operation not found',404);
}
const tools=[
 {name:'sitocal_list_sites',description:'List up to 100 saved website drafts owned by this API key account.',scope:'sites:read',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'sitocal_get_site',description:'Read an owned website draft.',scope:'sites:read',inputSchema:{type:'object',properties:{siteId:{type:'string'}},required:['siteId'],additionalProperties:false}},
 {name:'sitocal_create_site',description:'Create a saved template draft and revision. Does not call a paid AI provider or publish externally. Requires a unique idempotencyKey; reuse the same key for an identical retry.',scope:'sites:write',inputSchema:{type:'object',properties:{business:{type:'string',maxLength:120},city:{type:'string',maxLength:120},services:{type:'string',maxLength:1000},businessBrief:{type:'string',maxLength:2000},idempotencyKey:{type:'string',minLength:8,maxLength:100}},required:['business','city','services','idempotencyKey'],additionalProperties:false}},
 {name:'sitocal_export_site',description:'Return static HTML files and editable manifest for an owned website; does not publish.',scope:'sites:export',inputSchema:{type:'object',properties:{siteId:{type:'string'}},required:['siteId'],additionalProperties:false}}
].map(t=>({...t,annotations:{readOnlyHint:t.scope!=='sites:write',destructiveHint:false,idempotentHint:true,openWorldHint:false}}));
export async function handlePublicAccess(req,res,ctx){
 const {p,origin,db,json,body,rate}=ctx;if(p!=='/mcp'&&!p.startsWith('/api/v1/'))return false;
 try{
  if(req.headers.origin&&req.headers.origin!==origin)throw new ProviderError('Origin check failed',403);
  const key=authenticateKey(db,req.headers.authorization);rate('key:'+key.id,60);db.prepare('UPDATE api_keys SET last_used=?,requests=requests+1 WHERE id=?').run(new Date().toISOString(),key.id);
  const call=(op,input)=>apiOperation({...ctx,key},op,input);
  if(p==='/mcp'){
   if(req.method!=='POST'){res.setHeader('Allow','POST');throw new ProviderError('This stateless MCP endpoint uses POST; no SSE listener is offered',405);}
   if(!String(req.headers.accept||'').includes('application/json')||!String(req.headers.accept||'').includes('text/event-stream'))throw new ProviderError('Accept application/json and text/event-stream',406);
   if(!req.headers['content-type']?.startsWith('application/json'))throw new ProviderError('Content-Type must be application/json',415);
   const version=req.headers['mcp-protocol-version'];if(version&&!['2025-06-18','2025-03-26'].includes(version))throw new ProviderError('Unsupported MCP protocol version',400);
   const m=await body(req);if(!m||typeof m!=='object'||Array.isArray(m)||m.jsonrpc!=='2.0'||typeof m.method!=='string'||(m.id!==undefined&&typeof m.id!=='string'&&!Number.isInteger(m.id)))return json(res,400,{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid JSON-RPC request'}}),true;
   if(m.id===undefined){if(m.method!=='notifications/initialized'&&m.method!=='notifications/cancelled')throw new ProviderError('Unsupported notification',400);res.writeHead(202);res.end();return true;}
   const reply=result=>json(res,200,{jsonrpc:'2.0',id:m.id,result});
   if(m.method==='initialize'){reply({protocolVersion:['2025-06-18','2025-03-26'].includes(m.params?.protocolVersion)?m.params.protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'sitocal',version:'0.1.7'},instructions:'Tools operate only on this account. Generated sites are drafts. Publishing and payments are not performed by these tools.'});return true;}
   if(m.method==='ping'){reply({});return true;}
   if(m.method==='tools/list'){reply({tools:tools.filter(t=>key.scopes.includes(t.scope)).map(({scope,...t})=>t)});return true;}
   if(m.method==='tools/call'){
    const tool=tools.find(t=>t.name===m.params?.name);if(!tool){json(res,200,{jsonrpc:'2.0',id:m.id,error:{code:-32602,message:'Unknown tool'}});return true;}
    try{const args=m.params.arguments||{};if(typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(tool.inputSchema.properties,k))||tool.inputSchema.required?.some(k=>typeof args[k]!=='string'))throw new ProviderError('Invalid tool arguments',400);
     const op={sitocal_list_sites:'list',sitocal_get_site:'get',sitocal_create_site:'create',sitocal_export_site:'export'}[tool.name];let result=call(op,args);if(op==='export')result={siteId:result.site.id,files:Object.fromEntries(Object.entries(result.files).map(([name,b])=>[name,String(b)]))};reply({content:[{type:'text',text:JSON.stringify(result)}],isError:false});
    }catch(e){reply({content:[{type:'text',text:e instanceof ProviderError?e.message:'The draft could not be processed; inspect the request and retry only with the same idempotency key.'}],isError:true});}return true;
   }
   json(res,200,{jsonrpc:'2.0',id:m.id,error:{code:-32601,message:'Method not found'}});return true;
  }
  const one=p.match(/^\/api\/v1\/sites\/([a-f0-9-]{36})(\/export)?$/);
  if(p==='/api/v1/sites'&&req.method==='GET'){json(res,200,call('list'));return true;}
  if(p==='/api/v1/sites'&&req.method==='POST'){if(!req.headers['content-type']?.startsWith('application/json'))throw new ProviderError('Content-Type must be application/json',415);json(res,201,call('create',{...await body(req),idempotencyKey:req.headers['idempotency-key']}));return true;}
  if(one&&req.method==='GET'){if(!one[2])json(res,200,call('get',{siteId:one[1]}));else{const r=call('export',{siteId:one[1]});res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${slug(r.site.data.business)}.zip"`});res.end(zip(r.files));}return true;}
  throw new ProviderError('Public API route or method not found',404);
 }catch(e){if(e instanceof ProviderError){if(e.status===401)res.setHeader('WWW-Authenticate','Bearer realm="Sitocal"');json(res,e.status,{error:e.message});return true;}throw e;}
}
