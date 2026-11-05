import {randomUUID}from'node:crypto';
import {ProviderError}from'./providers.mjs';
export const features=['builder','editor','wordpress','serp','indexing','api','publish','domains'];
export const defaultPlans={free:{sites:1,amount:0},starter:{sites:5,amount:1000},growth:{sites:15,amount:5000},agency:{sites:100,amount:10000}};
export function adminSchema(db){
 db.exec([
 'CREATE TABLE IF NOT EXISTS coverage_snapshot(id INTEGER PRIMARY KEY CHECK(id=1), csv TEXT NOT NULL, published TEXT NOT NULL, records INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS administrators(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,active INTEGER NOT NULL,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS admin_sessions(token TEXT PRIMARY KEY,admin_id TEXT NOT NULL,csrf TEXT NOT NULL,expires INTEGER NOT NULL,authenticated INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS admin_invites(id TEXT PRIMARY KEY,email TEXT NOT NULL,role TEXT NOT NULL,code_hash TEXT UNIQUE NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS admin_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,reason TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS admin_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS user_access(user_id TEXT PRIMARY KEY,status TEXT NOT NULL,reason TEXT NOT NULL,updated TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS feature_access(user_id TEXT NOT NULL,feature TEXT NOT NULL,enabled INTEGER NOT NULL,PRIMARY KEY(user_id,feature))',
 'CREATE TABLE IF NOT EXISTS plan_versions(id TEXT PRIMARY KEY,code TEXT NOT NULL,amount INTEGER NOT NULL,sites INTEGER NOT NULL,features TEXT NOT NULL,stripe_price TEXT NOT NULL,active INTEGER NOT NULL,created TEXT NOT NULL)',
 'CREATE UNIQUE INDEX IF NOT EXISTS active_plan ON plan_versions(code) WHERE active=1',
 'CREATE TABLE IF NOT EXISTS subscription_versions(user_id TEXT PRIMARY KEY,version_id TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS checkout_terms(user_id TEXT PRIMARY KEY,version_id TEXT NOT NULL,promo_id TEXT)',
 'CREATE TABLE IF NOT EXISTS access_grants(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,plan TEXT NOT NULL,version_id TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL,source TEXT NOT NULL,reference TEXT UNIQUE NOT NULL,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS promotions(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,kind TEXT NOT NULL,value INTEGER NOT NULL,plan TEXT NOT NULL,days INTEGER NOT NULL,max_uses INTEGER NOT NULL,expires INTEGER NOT NULL,enabled INTEGER NOT NULL,stripe_coupon TEXT NOT NULL,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS promotion_terms(promo_id TEXT PRIMARY KEY,duration TEXT NOT NULL,months INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS promo_claims(promo_id TEXT NOT NULL,user_id TEXT NOT NULL,state TEXT NOT NULL,request_key TEXT NOT NULL,PRIMARY KEY(promo_id,user_id))',
 'CREATE TABLE IF NOT EXISTS referral_codes(code TEXT PRIMARY KEY,user_id TEXT NOT NULL,enabled INTEGER NOT NULL,reward_plan TEXT NOT NULL,reward_days INTEGER NOT NULL,max_rewards INTEGER NOT NULL,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS referrals(user_id TEXT PRIMARY KEY,code TEXT NOT NULL,referrer TEXT NOT NULL,state TEXT NOT NULL,grant_id TEXT,invoice TEXT UNIQUE,created TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS shared_connectors(provider TEXT PRIMARY KEY,secret TEXT NOT NULL,enabled INTEGER NOT NULL,user_limit INTEGER NOT NULL,global_limit INTEGER NOT NULL,updated TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS provider_controls(provider TEXT PRIMARY KEY,enabled INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS shared_usage(provider TEXT NOT NULL,user_id TEXT NOT NULL,day TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(provider,user_id,day))'
 ].join(';'));
 if(!db.prepare('SELECT key FROM admin_settings WHERE key=?').get('accessMigrated')){db.exec('BEGIN IMMEDIATE');try{db.prepare("INSERT OR IGNORE INTO user_access SELECT id,'active','Existing account migration',created FROM users").run();db.prepare('INSERT INTO admin_settings VALUES(?,?)').run('accessMigrated','true');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
 for(const[code,p]of Object.entries(defaultPlans))if(!db.prepare('SELECT id FROM plan_versions WHERE code=?').get(code))db.prepare('INSERT INTO plan_versions VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),code,p.amount,p.sites,JSON.stringify(features),process.env['STRIPE_PRICE_'+code.toUpperCase()]||'',1,new Date().toISOString());
}
export const setting=(db,key,fallback)=>{const r=db.prepare('SELECT value FROM admin_settings WHERE key=?').get(key);return r?JSON.parse(r.value):fallback;};
export function planCatalog(db){return db.prepare('SELECT * FROM plan_versions WHERE active=1 ORDER BY amount').all().map(p=>({...p,features:JSON.parse(p.features)}));}
export function planVersion(db,code){const p=db.prepare('SELECT * FROM plan_versions WHERE code=? AND active=1').get(code);if(!p)throw new ProviderError('Plan is not available',400);return {...p,features:JSON.parse(p.features)};}
export function effectivePlan(db,user){
 const sub=db.prepare('SELECT plan,status FROM subscriptions WHERE user_id=?').get(user);
 let p=planVersion(db,sub?.status==='active'&&defaultPlans[sub.plan]?sub.plan:'free');
 const prior=db.prepare('SELECT p.* FROM subscription_versions s JOIN plan_versions p ON p.id=s.version_id WHERE s.user_id=?').get(user);if(sub?.status==='active'&&prior)p={...prior,features:JSON.parse(prior.features)};
 const grants=db.prepare('SELECT p.* FROM access_grants g JOIN plan_versions p ON p.id=g.version_id WHERE g.user_id=? AND g.revoked=0 AND g.expires>?').all(user,Date.now());
 for(const grant of grants)if(grant.sites>=p.sites)p={...grant,features:JSON.parse(grant.features)};
 const manual=db.prepare('SELECT plan FROM manual_payment_grants WHERE user_id=? AND expires>?').all(user,Date.now());for(const g of manual){const candidate=planVersion(db,g.plan);if(candidate.sites>p.sites)p=candidate;}
 return p;
}
export function assertAccess(db,user,feature){
 const access=db.prepare('SELECT status FROM user_access WHERE user_id=?').get(user);
 if(access&&access.status!=='active')throw new ProviderError('Account access is '+access.status+'. Contact contact@sitocal.com for review.',403);
 if(feature){if(setting(db,'toolEnabled:'+feature,true)===false)throw new ProviderError('This tool is temporarily disabled by the platform administrator.',403);const override=db.prepare('SELECT enabled FROM feature_access WHERE user_id=? AND feature=?').get(user,feature);if(override?.enabled===0||(!override&&!effectivePlan(db,user).features.includes(feature)))throw new ProviderError('This tool is not enabled for your account.',403);}
}
export function initializeAccess(db,user,{newAccount=false}={}){db.prepare('INSERT OR IGNORE INTO user_access VALUES(?,?,?,?)').run(user,newAccount&&setting(db,'approvalRequired',false)?'pending':'active','Registration policy',new Date().toISOString());}
export function routeFeature(p,method){
 if(/^\/api\/sites\/[^/]+\/search\/(?:property|inspect)$/.test(p))return'indexing';
 if(/^\/api\/sites\/[^/]+\/search(?:\/|$)/.test(p))return'serp';
 if(p==='/mcp'||p.startsWith('/api/v1/')||p.startsWith('/api/developer/'))return'api';
 if(/^\/api\/connectors\/[^/]+\/execute$/.test(p))return p.includes('/cursor/')?'api':'serp';
 if(p.startsWith('/api/indexing/'))return'indexing';
 if(p.startsWith('/api/serp/')||p==='/api/google/report')return'serp';
 if(p.startsWith('/api/domains/'))return'domains';
 if(p.startsWith('/api/import')||p==='/api/sites'&&method==='POST')return'builder';
 if(/\/publish$/.test(p))return'publish';if(/\/convert$/.test(p))return'wordpress';
 if(p.startsWith('/api/sites/')&&['PUT','DELETE','POST'].includes(method))return'editor';
}
export function audit(db,actor,action,target,reason,detail={}){if(typeof reason!=='string'||reason.trim().length<3||reason.length>500)throw new ProviderError('Enter an action reason (3–500 characters)',400);db.prepare('INSERT INTO admin_audit(actor,action,target,reason,detail,created) VALUES(?,?,?,?,?,?)').run(actor,action,target,reason.trim(),JSON.stringify(detail),new Date().toISOString());}
export function atomic(db,fn){db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');if(/UNIQUE constraint failed/.test(e.message))throw new ProviderError('This code, reference or record already exists',409);throw e;}}
export function grantAccess(db,user,plan,days,source,reference){
 if(!db.prepare('SELECT id FROM users WHERE id=?').get(user))throw new ProviderError('User not found',404);
 const p=planVersion(db,plan),n=Number(days);if(!Number.isInteger(n)||n<1||n>3650)throw new ProviderError('Access duration must be 1–3650 days',400);
 const id=randomUUID();db.prepare('INSERT INTO access_grants VALUES(?,?,?,?,?,?,?,?,?)').run(id,user,plan,p.id,Date.now()+n*86400000,0,source,reference,new Date().toISOString());return id;
}
