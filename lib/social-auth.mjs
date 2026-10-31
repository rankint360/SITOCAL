import { randomBytes,createHash,createPublicKey,verify } from 'node:crypto';
import { id,hash } from './store.mjs';
import { request,ProviderError } from './providers.mjs';
const config={
 google:{label:'Google',authorize:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',profile:'https://openidconnect.googleapis.com/v1/userinfo',jwks:'https://www.googleapis.com/oauth2/v3/certs',issuer:'https://accounts.google.com',scope:'openid email profile',pkce:true},
 github:{label:'GitHub',authorize:'https://github.com/login/oauth/authorize',token:'https://github.com/login/oauth/access_token',profile:'https://api.github.com/user',scope:'read:user user:email',pkce:true},
 linkedin:{label:'LinkedIn',authorize:'https://www.linkedin.com/oauth/v2/authorization',token:'https://www.linkedin.com/oauth/v2/accessToken',profile:'https://api.linkedin.com/v2/userinfo',jwks:'https://www.linkedin.com/oauth/openid/jwks',issuer:'https://www.linkedin.com',scope:'openid profile email',pkce:false}
};
const env=(provider,suffix)=>process.env['AUTH_'+provider.toUpperCase()+'_'+suffix]||'';
export function authOrigin(fallback){let u;try{u=new URL(process.env.AUTH_ORIGIN||fallback);}catch{throw new ProviderError('Configure AUTH_ORIGIN as the canonical app origin',409);}if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname))))throw new ProviderError('AUTH_ORIGIN must be an HTTPS origin (localhost HTTP is allowed)',409);return u.origin;}
export const socialMethods=()=>Object.entries(config).map(([provider,c])=>({provider,label:c.label,configured:Boolean(env(provider,'CLIENT_ID')&&env(provider,'CLIENT_SECRET'))}));
export function safeReturn(value){return ['/app','/serp','/indexing','/developer','/api-mcp','/google-indexer','/integrations','/billing','/editor','/wp','/account'].includes(value)?value:'/app';}
export function flowCookie(provider,binding,origin,clear=false){return `sitocal_oauth_${provider}=${binding}; HttpOnly; Path=/api/auth/oauth; SameSite=Lax; Max-Age=${clear?0:600}${origin.startsWith('https:')?'; Secure':''}${process.env.COOKIE_DOMAIN?'; Domain='+process.env.COOKIE_DOMAIN:''}`;}
export function startSocial(db,provider,input,origin,user){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new ProviderError('Invalid sign-in request',400);
 const c=config[provider];if(!c)throw new ProviderError('Unsupported sign-in provider',400);if(!env(provider,'CLIENT_ID')||!env(provider,'CLIENT_SECRET'))throw new ProviderError(c.label+' sign-in needs its OAuth app credentials configured in Render',409);
 const mode=input.mode==='link'?'link':input.mode==='signup'?'signup':'login';if(mode==='link'&&!user)throw new ProviderError('Sign in before linking a provider',401);
 const inviteOk=!process.env.REGISTRATION_CODE||hash(String(input.invite||''))===hash(process.env.REGISTRATION_CODE);
 if(mode==='signup'&&(process.env.ALLOW_SIGNUPS==='false'||!inviteOk))throw new ProviderError('New accounts require an available registration window and a valid invitation',403);
 const state=randomBytes(32).toString('hex'),binding=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url'),nonce=randomBytes(32).toString('hex'),redirect=origin+'/api/auth/oauth/'+provider+'/callback';
 db.prepare('DELETE FROM login_flows WHERE expires<?').run(Date.now());db.prepare('INSERT INTO login_flows VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(hash(state),provider,hash(binding),verifier,nonce,mode,safeReturn(input.returnTo),mode==='link'?user:null,inviteOk?1:0,redirect,Date.now()+600000);
 const params=new URLSearchParams({client_id:env(provider,'CLIENT_ID'),redirect_uri:redirect,response_type:'code',scope:c.scope,state});if(c.jwks)params.set('nonce',nonce);if(c.pkce){params.set('code_challenge',createHash('sha256').update(verifier).digest('base64url'));params.set('code_challenge_method','S256');}
 return {url:c.authorize+'?'+params,binding,provider};
}
const keyCache=new Map();
export async function verifyIdentityToken(provider,token,nonce){
 const c=config[provider];if(!c?.jwks||typeof token!=='string'||token.length>32000)throw new ProviderError('Identity token is missing or invalid',401);
 let header,claims,parts;try{parts=token.split('.');if(parts.length!==3)throw Error();header=JSON.parse(Buffer.from(parts[0],'base64url'));claims=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{throw new ProviderError('Invalid identity token',401);}
 if(!header||!claims||typeof header!=='object'||typeof claims!=='object')throw new ProviderError('Invalid identity token',401);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)throw new ProviderError('Unsupported identity token signature',401);
 let cached=keyCache.get(c.jwks);if(!cached||cached.until<Date.now()||!cached.keys.some(k=>k.kid===header.kid)){const r=await request(c.jwks);if(!Array.isArray(r.keys)||r.keys.length>50)throw new ProviderError('Invalid identity signing keys',502);cached={keys:r.keys,until:Date.now()+3600000};keyCache.set(c.jwks,cached);}
 const jwk=cached.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig')&&(!k.alg||k.alg==='RS256'));
 let valid=false;try{valid=Boolean(jwk)&&verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key:jwk,format:'jwk'}),Buffer.from(parts[2],'base64url'));}catch{}
 const audience=env(provider,'CLIENT_ID'),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud],now=Math.floor(Date.now()/1000);
 if(!valid||claims.iss!==c.issuer||!aud.includes(audience)||(claims.azp&&claims.azp!==audience)||(aud.length>1&&claims.azp!==audience)||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>300||!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now+60||claims.nonce!==nonce)throw new ProviderError('Identity token verification failed',401);
 return claims;
}
async function profile(provider,code,flow){
 const c=config[provider],form=new URLSearchParams({grant_type:'authorization_code',code,redirect_uri:flow.redirect_uri,client_id:env(provider,'CLIENT_ID'),client_secret:env(provider,'CLIENT_SECRET')});if(c.pkce)form.set('code_verifier',flow.verifier);
 const token=await request(c.token,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});if(token.error||typeof token.access_token!=='string')throw new ProviderError('Provider did not authorize this sign-in',401);
 const headers={Authorization:'Bearer '+token.access_token,Accept:'application/json',...(provider==='github'?{'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Sitocal-Sign-In'}:{})};
 if(provider==='github'){
  const [user,emails]=await Promise.all([request(c.profile,{headers}),request('https://api.github.com/user/emails',{headers})]);
  if(!Number.isSafeInteger(user.id)||user.id<=0||!Array.isArray(emails))throw new ProviderError('GitHub identity response is invalid',401);
  const email=emails.find(e=>e.primary&&e.verified)||emails.find(e=>e.verified);return {subject:String(user.id),email:email?.email,verified:Boolean(email),name:String(user.name||user.login||'').slice(0,120)};
 }
 const claims=await verifyIdentityToken(provider,token.id_token,flow.nonce),user=await request(c.profile,{headers});if(user.sub!==claims.sub||(user.email&&claims.email&&user.email.toLowerCase()!==claims.email.toLowerCase()))throw new ProviderError('Provider profile does not match the signed identity',401);
 return {subject:claims.sub,email:claims.email||user.email,verified:claims.email_verified===true||(!claims.email&&user.email_verified===true),name:String(user.name||claims.name||'').slice(0,120)};
}
export function resolveIdentity(db,provider,identity,flow,currentUser){
 const found=db.prepare('SELECT user_id FROM login_identities WHERE provider=? AND subject=?').get(provider,identity.subject);
 if(flow.mode==='link'){
  if(!currentUser||currentUser!==flow.link_user)throw new ProviderError('Sign into the same account again before linking this provider',401);
  if(found&&found.user_id!==currentUser)throw new ProviderError('That provider identity is already linked to another Sitocal account',409);
  const other=db.prepare('SELECT subject FROM login_identities WHERE provider=? AND user_id=?').get(provider,currentUser);if(other&&other.subject!==identity.subject)throw new ProviderError('This account already has a different identity for that provider',409);
  if(!found)db.prepare('INSERT INTO login_identities VALUES(?,?,?,?,?,?)').run(provider,identity.subject,currentUser,String(identity.email||'').slice(0,200),identity.name,new Date().toISOString());
  return db.prepare('SELECT id,email FROM users WHERE id=?').get(currentUser);
 }
 if(found)return db.prepare('SELECT id,email FROM users WHERE id=?').get(found.user_id);
 const email=String(identity.email||'').trim().toLowerCase();if(!identity.verified||email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new ProviderError('A verified provider email is required to create an account; use email signup or link from an existing account',403);
 if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw new ProviderError('An account already uses that email. Sign in using its existing method, then link this provider in Account & sign-in.',409);
 if(process.env.ALLOW_SIGNUPS==='false'||!flow.invite_ok)throw new ProviderError('Registration is closed or an invitation is required. Existing linked accounts can still sign in.',403);
 const account={id:id(),email},now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO users VALUES(?,?,?,?)').run(account.id,email,'oauth-only',now);db.prepare('INSERT INTO login_identities VALUES(?,?,?,?,?,?)').run(provider,identity.subject,account.id,email,identity.name,now);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return account;
}
export async function finishSocial(db,provider,query,browserCookie,currentUser){
 const state=String(query.get('state')||'');if(!/^[a-f0-9]{64}$/.test(state))throw new ProviderError('Sign-in state is invalid or expired',400);
 const flow=db.prepare('SELECT * FROM login_flows WHERE state_hash=? AND provider=? AND expires>?').get(hash(state),provider,Date.now());if(!flow)throw new ProviderError('Sign-in state is invalid, expired or already used',400);
 if(!/^[a-f0-9]{64}$/.test(browserCookie||'')||flow.browser_hash!==hash(browserCookie))throw new ProviderError('Sign-in must finish in the browser that started it',400);
 db.prepare('DELETE FROM login_flows WHERE state_hash=?').run(hash(state));
 if(query.get('error')||!query.get('code')||query.get('code').length>4000)throw new ProviderError('Provider sign-in was cancelled or not authorized',400);
 const identity=await profile(provider,query.get('code'),flow);return {account:resolveIdentity(db,provider,identity,flow,currentUser),returnTo:flow.mode==='link'?'/account':flow.return_to};
}
