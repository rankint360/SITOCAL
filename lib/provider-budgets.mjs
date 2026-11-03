import {ProviderError} from './providers.mjs';

export function providerBudget(db,user,now=new Date()){
 const since=now.toISOString().slice(0,10),dayEnd=new Date(Date.parse(since)+86400000).toISOString();
 const configured=db.prepare('SELECT ai,search FROM provider_budgets WHERE user_id=?').get(user);
 const used=db.prepare(`SELECT
   count(CASE WHEN kind IN ('ai-generation','section-rewrite') THEN 1 END) AS ai,
   count(CASE WHEN kind IN ('site-rank','check','demand','traffic','backlinks') OR kind LIKE 'connector-%' THEN 1 END) AS search
   FROM jobs WHERE user_id=? AND created>=?`).get(user,since);
 const cap=Math.max(1,Math.min(1000,Number(process.env.DAILY_PROVIDER_ACTION_LIMIT)||50));
 return {ai:Math.min(configured?.ai??cap,cap),search:Math.min(configured?.search??cap,cap),used,cap,resetsAt:dayEnd};
}
export function updateProviderBudget(db,user,input){
 const {cap}=providerBudget(db,user);
 if(!input||!['ai','search'].every(key=>Number.isInteger(input[key])&&input[key]>=0&&input[key]<=cap))throw new ProviderError('Set whole-number daily attempt limits from 0 to '+cap,400);
 db.prepare('INSERT INTO provider_budgets VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET ai=excluded.ai,search=excluded.search').run(user,input.ai,input.search);
 return providerBudget(db,user);
}
export function enforceProviderBudget(db,user,kind){
 const group=['ai-generation','section-rewrite'].includes(kind)?'ai':['site-rank','check','demand','traffic','backlinks'].includes(kind)||kind.startsWith('connector-')?'search':null;
 if(!group)return;
 const budget=providerBudget(db,user);
 if(budget.used[group]>=budget[group])throw new ProviderError('Your daily '+(group==='ai'?'AI':'search')+' provider attempt limit is reached. Adjust it in Settings or wait for the UTC reset.',429);
}
