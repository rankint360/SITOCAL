import {id}from'./store.mjs';
import {atomic,grantAccess,assertAccess,planVersion}from'./admin-data.mjs';
import {ProviderError}from'./providers.mjs';
export function promotion(db,code,plan){const p=db.prepare('SELECT * FROM promotions WHERE code=? AND enabled=1 AND expires>?').get(String(code||'').trim().toUpperCase(),Date.now());if(!p||p.plan!==plan)throw new ProviderError('Promotion is invalid, expired or not eligible for this plan',400);return p;}
export function reservePromo(db,p,user,key){
 const previous=db.prepare('SELECT * FROM promo_claims WHERE promo_id=? AND user_id=?').get(p.id,user);if(previous){if(previous.request_key!==key)throw new ProviderError('Promotion was already claimed or reserved for another checkout',409);return;}
 if(db.prepare('SELECT count(*) n FROM promo_claims WHERE promo_id=?').get(p.id).n>=p.max_uses)throw new ProviderError('Promotion redemption limit reached',409);
 db.prepare('INSERT INTO promo_claims VALUES(?,?,?,?)').run(p.id,user,'reserved',key);
}
export function redeemBonus(db,user,code){assertAccess(db,user);return atomic(db,()=>{const p=db.prepare('SELECT * FROM promotions WHERE code=? AND kind=? AND enabled=1 AND expires>?').get(String(code||'').trim().toUpperCase(),'access',Date.now());if(!p)throw new ProviderError('Access code is invalid or expired',400);if(db.prepare('SELECT state FROM promo_claims WHERE promo_id=? AND user_id=?').get(p.id,user))throw new ProviderError('This access code has already been redeemed',409);reservePromo(db,p,user,'access-'+p.id);const grant=grantAccess(db,user,p.plan,p.days,'promo','promo:'+p.id+':'+user);db.prepare('UPDATE promo_claims SET state=? WHERE promo_id=? AND user_id=?').run('redeemed',p.id,user);return {grantId:grant,plan:p.plan,days:p.days};});}
export function attachReferral(db,user,code){assertAccess(db,user);const p=db.prepare('SELECT * FROM referral_codes WHERE code=? AND enabled=1').get(String(code||'').trim().toUpperCase());if(!p||p.user_id===user)throw new ProviderError('Referral code is invalid or belongs to this account',400);
 const sub=db.prepare('SELECT * FROM subscriptions WHERE user_id=?').get(user);if(sub)throw new ProviderError('Referrals must be attached before the first subscription',409);
 const owner=db.prepare('SELECT email FROM users WHERE id=?').get(p.user_id),customer=db.prepare('SELECT email FROM users WHERE id=?').get(user);if(!owner||owner.email===customer?.email)throw new ProviderError('Self-referrals are not eligible',400);
 try{db.prepare('INSERT INTO referrals VALUES(?,?,?,?,?,?,?)').run(user,p.code,p.user_id,'pending',null,null,new Date().toISOString());}catch{throw new ProviderError('A referral is already attached to this account',409);}return {attached:true,rewardEvent:'First confirmed paid invoice; never signup alone'};
}
export function rewardReferral(db,user,invoice){if(!invoice?.id||invoice.status!=='paid'||Number(invoice.amount_paid)<=0)return;const referral=db.prepare('SELECT * FROM referrals WHERE user_id=? AND state=?').get(user,'pending');if(!referral)return;
 const code=db.prepare('SELECT * FROM referral_codes WHERE code=? AND enabled=1').get(referral.code);if(!code)return;
 try{assertAccess(db,referral.referrer);}catch{return;}if(db.prepare('SELECT count(*) n FROM referrals WHERE code=? AND state=?').get(code.code,'rewarded').n>=code.max_rewards)return;
 const grant=grantAccess(db,referral.referrer,code.reward_plan,code.reward_days,'referral','referral:'+user);db.prepare('UPDATE referrals SET state=?,grant_id=?,invoice=? WHERE user_id=? AND state=?').run('rewarded',grant,invoice.id,user,'pending');
}
export function revokeReferralReward(db,user){const r=db.prepare('SELECT grant_id FROM referrals WHERE user_id=? AND state=?').get(user,'rewarded');if(!r)return;db.prepare('UPDATE access_grants SET revoked=1 WHERE id=?').run(r.grant_id);db.prepare('UPDATE referrals SET state=? WHERE user_id=?').run('revoked',user);}
export function customerRewards(db,user){return {grants:db.prepare('SELECT id,plan,expires,source,revoked FROM access_grants WHERE user_id=? ORDER BY created DESC').all(user),codes:db.prepare('SELECT code,enabled,reward_plan,reward_days FROM referral_codes WHERE user_id=?').all(user),referral:db.prepare('SELECT code,state FROM referrals WHERE user_id=?').get(user)||null};}
