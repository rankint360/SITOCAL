import {ProviderError}from'./providers.mjs';import{atomic,assertAccess}from'./admin-data.mjs';
export const sharedProviders=['openai','claude','gemini','grok','semrush','ahrefs','seranking','dataforseo'];
export function providerEnabled(db,provider){if(db.prepare('SELECT enabled FROM provider_controls WHERE provider=?').get(provider)?.enabled===0)throw new ProviderError('This provider is disabled by the platform administrator',403);}
export function managedProviders(db){return db.prepare('SELECT provider FROM shared_connectors WHERE enabled=1').all().map(x=>x.provider).filter(p=>db.prepare('SELECT enabled FROM provider_controls WHERE provider=?').get(p)?.enabled!==0);}
export function resolveConnection(store,user,provider){
 const db=store.db;assertAccess(db,user);providerEnabled(db,provider);
 const own=db.prepare('SELECT secret FROM connections WHERE user_id=? AND provider=?').get(user,provider);if(own)return store.unseal(own.secret);
 if(!sharedProviders.includes(provider))throw new ProviderError('Connect '+provider+' in Integrations first',409);
 const config=db.prepare('SELECT * FROM shared_connectors WHERE provider=? AND enabled=1').get(provider);if(!config)throw new ProviderError('Connect '+provider+' in Integrations first',409);
 atomic(db,()=>{const day=new Date().toISOString().slice(0,10),used=db.prepare('SELECT count FROM shared_usage WHERE provider=? AND user_id=? AND day=?').get(provider,user,day)?.count||0,total=db.prepare('SELECT COALESCE(sum(count),0) n FROM shared_usage WHERE provider=? AND day=?').get(provider,day).n;
 if(used>=config.user_limit||total>=config.global_limit)throw new ProviderError('Platform connector daily request allowance reached',429);
 db.prepare('INSERT INTO shared_usage VALUES(?,?,?,1) ON CONFLICT(provider,user_id,day) DO UPDATE SET count=count+1').run(provider,user,day);
 });return store.unseal(config.secret);
}
