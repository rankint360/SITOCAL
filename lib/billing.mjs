import { createHmac,timingSafeEqual } from 'node:crypto';
import { ProviderError,request } from './providers.mjs';
export const plans={free:{sites:1,amount:0},starter:{sites:5,amount:1000},growth:{sites:15,amount:5000},agency:{sites:100,amount:10000}};
const secret=()=>process.env.STRIPE_SECRET_KEY||'';
const priceFor=plan=>process.env['STRIPE_PRICE_'+plan.toUpperCase()]||'';
const ready=()=>Boolean(process.env.BILLING_ENABLED==='true'&&secret()&&process.env.STRIPE_WEBHOOK_SECRET&&['starter','growth','agency'].every(p=>/^price_/.test(priceFor(p))));
const stripeHeaders=()=>({Authorization:'Bearer '+secret(),'Stripe-Version':'2026-10-28.endive','Content-Type':'application/x-www-form-urlencoded'});
export function siteAllowance(db,user){const sub=db.prepare('SELECT plan,status FROM subscriptions WHERE user_id=?').get(user);let plan=sub?.status==='active'&&plans[sub.plan]?sub.plan:'free';const manual=db.prepare('SELECT plan FROM manual_payment_grants WHERE user_id=? AND expires>? ORDER BY expires DESC').all(user,Date.now());for(const grant of manual)if(plans[grant.plan]?.sites>plans[plan].sites)plan=grant.plan;return {plan,limit:plans[plan].sites,used:db.prepare('SELECT count(*) n FROM sites WHERE user_id=?').get(user).n};}
export function checkSiteCapacity(db,user){const q=siteAllowance(db,user);if(q.used>=q.limit)throw new ProviderError(`Your ${q.plan} plan allows ${q.limit} saved website${q.limit===1?'':'s'}. Existing websites remain available. Open Billing to review your plan.`,409);}
export function billingStatus(db,user){const subscription=db.prepare('SELECT plan,status,customer,subscription_id,updated FROM subscriptions WHERE user_id=?').get(user);return {checkoutReady:ready(),subscription,capacity:siteAllowance(db,user),allowances:Object.fromEntries(Object.entries(plans).map(([p,v])=>[p,v.sites+' saved website'+(v.sites===1?'':'s')+'. Provider usage is billed separately.'])),methods:[['paypal','PayPal'],['alipay','AliPay'],['wise','Wise'],['bank','Bank Transfer']].map(([id,label])=>({id,label,instructions:'',note:'Request payment instructions'}))};}
function stripeUrl(value,host){let u;try{u=new URL(value);}catch{throw new ProviderError('Stripe did not return a valid checkout destination');}if(u.protocol!=='https:'||u.hostname!==host||u.username||u.password)throw new ProviderError('Stripe returned an unexpected destination');return u.href;}
export async function checkout(db,user,email,input,origin){
 if(!ready())throw new ProviderError('Stripe checkout requires merchant configuration in Render: billing enable flag, secret key, webhook secret and three recurring price IDs.',409);
 const plan=String(input.plan||''),key=String(input.requestKey||'');if(!['starter','growth','agency'].includes(plan)||! /^(?:[a-zA-Z0-9_-]){8,100}$/.test(key)||input.agreed!==true)throw new ProviderError('Select a paid plan, accept the terms and use a valid checkout request key',400);
 const sub=db.prepare('SELECT * FROM subscriptions WHERE user_id=?').get(user);if(sub&&['active','past_due','unpaid','trialing','incomplete'].includes(sub.status))throw new ProviderError('Manage the existing subscription in the Stripe billing portal',409);
 let row=db.prepare('SELECT * FROM billing_checkouts WHERE user_id=?').get(user);
 if(row?.session_id){const previous=await request('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(row.session_id),{headers:stripeHeaders()});if(previous.status==='expired'){db.prepare('DELETE FROM billing_checkouts WHERE user_id=?').run(user);row=null;}else if(previous.status==='complete')throw new ProviderError('Your completed checkout is awaiting billing reconciliation. Do not pay again.',409);}
 if(row){if(row.plan!==plan)throw new ProviderError('A checkout already exists for a different plan. Complete or reconcile it before starting another.',409);if(row.url)return {url:stripeUrl(row.url,'checkout.stripe.com'),reused:true};if(row.request_key!==key)throw new ProviderError('Retry the original checkout request key; the previous outcome may be unknown.',409);if(Date.now()-row.started>23*3600000)throw new ProviderError('Checkout outcome requires merchant reconciliation before another attempt.',409);}
 const price=await request('https://api.stripe.com/v1/prices/'+encodeURIComponent(priceFor(plan)),{headers:stripeHeaders()});
 if(price.active!==true||price.currency!=='usd'||price.unit_amount!==plans[plan].amount||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1)throw new ProviderError('Stripe price must match the published USD monthly plan amount',409);
 if(!row){db.prepare('INSERT INTO billing_checkouts VALUES(?,?,?,?,?,?,?)').run(user,key,plan,null,null,Date.now(),'pending');row={request_key:key};}
 const form=new URLSearchParams({mode:'subscription',client_reference_id:user,customer_email:email,'line_items[0][price]':priceFor(plan),'line_items[0][quantity]':'1','payment_method_types[0]':'card',success_url:origin+'/billing?checkout=returned',cancel_url:origin+'/billing?checkout=cancelled','metadata[user_id]':user,'metadata[plan]':plan,'subscription_data[metadata][user_id]':user,'subscription_data[metadata][plan]':plan});
 const result=await request('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{...stripeHeaders(),'Idempotency-Key':'sitocal-'+user+'-'+key},body:form.toString()});const url=stripeUrl(result.url,'checkout.stripe.com');
 db.prepare('UPDATE billing_checkouts SET session_id=?,url=?,status=? WHERE user_id=?').run(result.id,url,'created',user);return {url};
}
export async function billingPortal(db,user,origin){if(!secret())throw new ProviderError('Stripe merchant configuration required',409);const sub=db.prepare('SELECT customer FROM subscriptions WHERE user_id=?').get(user);if(!sub?.customer)throw new ProviderError('No verified Stripe customer is connected to this account',409);const r=await request('https://api.stripe.com/v1/billing_portal/sessions',{method:'POST',headers:stripeHeaders(),body:new URLSearchParams({customer:sub.customer,return_url:origin+'/billing'}).toString()});return {url:stripeUrl(r.url,'billing.stripe.com')};}
export function verifyStripeSignature(raw,header,signingSecret,now=Date.now()){
 if(!signingSecret)throw new ProviderError('Stripe webhook is not configured',409);
 const values=String(header||'').split(',').map(x=>x.split('=')),stamp=values.find(([k])=>k==='t')?.[1];if(!/^\d+$/.test(stamp||'')||Math.abs(now/1000-Number(stamp))>300)throw new ProviderError('Invalid Stripe webhook timestamp',400);
 const digest=createHmac('sha256',signingSecret).update(stamp+'.').update(raw).digest();
 if(!values.some(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v||'')&&timingSafeEqual(Buffer.from(v,'hex'),digest)))throw new ProviderError('Invalid Stripe webhook signature',400);
}
let webhookQueue=Promise.resolve(),pendingWebhooks=0;
export function stripeWebhook(db,raw,signature){
 verifyStripeSignature(raw,signature,process.env.STRIPE_WEBHOOK_SECRET);if(pendingWebhooks>=20)throw new ProviderError('Webhook queue is busy; retry delivery',429);
 pendingWebhooks++;const run=webhookQueue.catch(()=>{}).then(()=>reconcileStripeWebhook(db,raw));webhookQueue=run;return run.finally(()=>pendingWebhooks--);
}
async function reconcileStripeWebhook(db,raw){
 let event;try{event=JSON.parse(raw);}catch{throw new ProviderError('Invalid webhook JSON',400);}if(typeof event.id!=='string'||!event.data?.object)throw new ProviderError('Invalid Stripe event',400);
 if(db.prepare('SELECT id FROM stripe_events WHERE id=?').get(event.id))return {received:true,duplicate:true};
 const object=event.data.object;let subscriptionId;
 if(event.type==='checkout.session.completed')subscriptionId=object.subscription;
 else if(event.type.startsWith('customer.subscription.'))subscriptionId=object.id;
 else if(['invoice.paid','invoice.payment_failed'].includes(event.type))subscriptionId=object.subscription||object.parent?.subscription_details?.subscription;
 if(!subscriptionId){db.prepare('INSERT OR IGNORE INTO stripe_events VALUES(?,?)').run(event.id,new Date().toISOString());return {received:true,ignored:true};}
 if(typeof subscriptionId!=='string'||!/^sub_[a-zA-Z0-9]+$/.test(subscriptionId))throw new ProviderError('Invalid subscription reference',400);
 // Reconcile current provider state rather than trusting out-of-order event snapshots.
 const current=await request('https://api.stripe.com/v1/subscriptions/'+subscriptionId+'?expand[]=latest_invoice',{headers:stripeHeaders()});const user=current.metadata?.user_id,plan=current.metadata?.plan;
 const row=user?db.prepare('SELECT * FROM billing_checkouts WHERE user_id=? AND plan=?').get(user,plan):null;
 if(!row||!plans[plan]||plan==='free')throw new ProviderError('Subscription does not match a Sitocal checkout',400);
 const item=current.items?.data?.[0]?.price;if(current.items?.data?.length!==1||item?.id!==priceFor(plan)||item?.unit_amount!==plans[plan].amount||item?.currency!=='usd'||item?.recurring?.interval!=='month'||item?.recurring?.interval_count!==1)throw new ProviderError('Subscription price does not match the Sitocal plan',400);
 const invoice=current.latest_invoice;const status=current.status==='active'&&invoice?.status==='paid'?'active':current.status==='active'?'pending_payment':current.status;
 db.exec('BEGIN IMMEDIATE');try{if(db.prepare('SELECT id FROM stripe_events WHERE id=?').get(event.id)){db.exec('ROLLBACK');return {received:true,duplicate:true};}db.prepare('INSERT INTO subscriptions VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET plan=excluded.plan,status=excluded.status,customer=excluded.customer,subscription_id=excluded.subscription_id,updated=excluded.updated').run(user,plan,status,typeof current.customer==='string'?current.customer:current.customer.id,current.id,new Date().toISOString());db.prepare('INSERT INTO stripe_events VALUES(?,?)').run(event.id,new Date().toISOString());db.prepare('UPDATE billing_checkouts SET status=? WHERE user_id=?').run(status,user);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return {received:true};
}
