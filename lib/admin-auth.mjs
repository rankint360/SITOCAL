import {randomBytes}from'node:crypto';
import {hash,passwordHash,checkPassword,id}from'./store.mjs';
import {ProviderError}from'./providers.mjs';
import {atomic,audit}from'./admin-data.mjs';
export const roles=['owner','support','billing','operations'];
export function adminCookieName(origin){return origin.startsWith('https:')?'__Host-sitocal_admin':'sitocal_admin';}
function cookie(origin,token,clear=false){return adminCookieName(origin)+'='+token+'; HttpOnly; Path=/; SameSite=Strict; Max-Age='+(clear?0:14400)+(origin.startsWith('https:')?'; Secure':'');}
export function adminSession(db,req,origin){const raw=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(adminCookieName(origin)+'='))?.split('=')[1];if(!/^[a-f0-9]{64}$/.test(raw||''))return null;return db.prepare('SELECT s.*,a.email,a.role FROM admin_sessions s JOIN administrators a ON a.id=s.admin_id WHERE s.token=? AND s.expires>? AND a.active=1').get(hash(raw),Date.now())||null;}
function loginAttempt(db,ip,email){const key=hash(ip+'|'+email),prior=db.prepare('SELECT * FROM admin_attempts WHERE key=?').get(key);if(prior?.until>Date.now()&&prior.count>=8)throw new ProviderError('Too many admin sign-in attempts. Try again in 15 minutes.',429);db.prepare('INSERT OR REPLACE INTO admin_attempts VALUES(?,?,?)').run(key,prior?.until>Date.now()?prior.count+1:1,Date.now()+900000);return key;}
export async function adminAuth(req,res,ctx){
 const {p,db,body,json,origin,rate}=ctx;if(!p.startsWith('/api/admin/auth/')&&p!=='/api/admin/session')return false;
 const session=adminSession(db,req,origin);
 if(p==='/api/admin/session'&&req.method==='GET'){const count=db.prepare('SELECT count(*) n FROM administrators').get().n;json(res,200,{admin:session?{id:session.admin_id,email:session.email,role:session.role}:null,csrf:session?.csrf||null,firstOwner:!count,setupConfigured:String(process.env.ADMIN_BOOTSTRAP_CODE||'').length>=32});return true;}
 if(req.method!=='POST')throw new ProviderError('Method not allowed',405);
 if(req.headers.origin!==origin)throw new ProviderError('Admin origin check failed',403);
 rate('admin-auth:'+req.socket.remoteAddress,12);const b=await body(req,12000);
 if(!b||typeof b!=='object'||Array.isArray(b))throw new ProviderError('Use an object request',400);
 if(p.endsWith('/login')||p.endsWith('/signup')){
  const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');if(email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<12||password.length>200)throw new ProviderError('Use a valid email and 12–200 character password',400);
  const attempt=loginAttempt(db,req.socket.remoteAddress,email);let admin;
  if(p.endsWith('/signup'))admin=atomic(db,()=>{
   const count=db.prepare('SELECT count(*) n FROM administrators').get().n;let role,invite;
   if(!count){const setup=String(process.env.ADMIN_BOOTSTRAP_CODE||'');if(setup.length<32||hash(String(b.code||''))!==hash(setup))throw new ProviderError('Owner setup is not authorized. Use the deployment setup code.',403);role='owner';}
   else{invite=db.prepare('SELECT * FROM admin_invites WHERE email=? AND code_hash=? AND used=0 AND expires>?').get(email,hash(String(b.code||'')),Date.now());if(!invite)throw new ProviderError('A valid email-bound administrator invitation is required',403);role=invite.role;}
   if(db.prepare('SELECT id FROM administrators WHERE email=?').get(email))throw new ProviderError('Administrator account already exists',409);
   const created={id:id(),email,role};db.prepare('INSERT INTO administrators VALUES(?,?,?,?,?,?)').run(created.id,email,passwordHash(password),role,1,new Date().toISOString());if(invite)db.prepare('UPDATE admin_invites SET used=1 WHERE id=?').run(invite.id);
   audit(db,created.id,'admin.signup',created.id,'Administrator signup',{role});return created;
  });
  else{admin=db.prepare('SELECT * FROM administrators WHERE email=? AND active=1').get(email);if(!admin||!checkPassword(password,admin.password))throw new ProviderError('Admin email or password is incorrect',401);}
  db.prepare('DELETE FROM admin_attempts WHERE key=?').run(attempt);const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('INSERT INTO admin_sessions VALUES(?,?,?,?,?)').run(hash(token),admin.id,csrf,Date.now()+14400000,Date.now());res.setHeader('Set-Cookie',cookie(origin,token));json(res,200,{admin:{id:admin.id,email:admin.email,role:admin.role},csrf});return true;
 }
 if(!session)throw new ProviderError('Sign in as an administrator',401);
 if(req.headers['x-csrf-token']!==session.csrf)throw new ProviderError('Admin session verification failed',403);
 if(p.endsWith('/logout')){db.prepare('DELETE FROM admin_sessions WHERE token=?').run(session.token);res.setHeader('Set-Cookie',cookie(origin,'',true));json(res,200,{ok:true});return true;}
 const row=db.prepare('SELECT password FROM administrators WHERE id=?').get(session.admin_id);if(!checkPassword(String(b.password||''),row.password))throw new ProviderError('Current admin password is incorrect',401);
 if(p.endsWith('/reauth')){db.prepare('UPDATE admin_sessions SET authenticated=? WHERE token=?').run(Date.now(),session.token);json(res,200,{ok:true});return true;}
 if(p.endsWith('/password')){const password=String(b.newPassword||'');if(password.length<12||password.length>200)throw new ProviderError('New password must be 12–200 characters',400);atomic(db,()=>{db.prepare('UPDATE administrators SET password=? WHERE id=?').run(passwordHash(password),session.admin_id);db.prepare('DELETE FROM admin_sessions WHERE admin_id=?').run(session.admin_id);audit(db,session.admin_id,'admin.password',session.admin_id,'Changed own password');});res.setHeader('Set-Cookie',cookie(origin,'',true));json(res,200,{ok:true,signedOut:true});return true;}
 throw new ProviderError('Admin auth endpoint not found',404);
}
export function requireAdmin(db,req,origin,{write=false}={}){
 const s=adminSession(db,req,origin);if(!s)throw new ProviderError('Sign in as an administrator',401);
 if(write){if(req.headers.origin!==origin||req.headers['x-csrf-token']!==s.csrf)throw new ProviderError('Admin session verification failed',403);if(Date.now()-s.authenticated>900000)throw new ProviderError('Confirm your admin password in Security before making more changes',409);}
 return s;
}
