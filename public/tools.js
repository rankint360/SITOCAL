const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function toolScreen(route,{api,shell,header,href,button}){
 if(route==='developer'){
  const {keys}=await api('/api/developer/keys');
  shell(header('API & MCP','Connect an assistant or automate website drafts with scoped access.')+`<section class="panel"><h2>Connect your assistant</h2><ol><li>Create a key with the minimum scopes your client needs.</li><li>Configure the MCP endpoint and send the key as a Bearer token.</li><li>Ask your assistant to list your sites or create a local website draft.</li></ol><p><button class="btn small" type="button" data-tool-action="copy-mcp">Copy MCP endpoint</button></p><p>REST base: <code>${e(location.origin)}/api/v1</code><br>MCP endpoint: <code>${e(location.origin)}/mcp</code></p><p>Use clients that support bearer headers, or the bundled stdio bridge. OAuth-only remote connectors are not supported yet.</p><form id="api-key-form"><div class="grid2"><label class="field">Key name<input name="name" maxlength="80" required placeholder="My local assistant"></label><label class="field">Expires in days<input name="days" type="number" min="1" max="90" value="30" required></label></div><fieldset><legend>Explicit permissions</legend>${[['sites:read','Read owned websites'],['sites:write','Create template drafts'],['sites:export','Export owned websites']].map(([v,t],i)=>`<label class="mk-consent"><input type="checkbox" name="scopes" value="${v}" ${i===0?'checked':''}>${t}</label>`).join('')}</fieldset><button class="btn primary" type="submit">Create API key</button></form><div id="api-key-result" role="status"></div></section><section class="panel"><h2>Your keys</h2>${keys.length?keys.map(k=>`<article class="activity-item"><strong>${e(k.name)}</strong> <code>${e(k.prefix)}…</code><p>${e(k.scopes.join(', '))} · Expires ${e(new Date(k.expires).toLocaleDateString())} · ${k.revoked?'Revoked':k.expires<Date.now()?'Expired':'Active'}</p>${k.revoked?'':`<button class="btn small" data-revoke-key="${e(k.id)}">Revoke key</button>`}</article>`).join(''):'<p>No API keys yet.</p>'}</section><section class="panel"><h2>REST API examples</h2><pre class="result">GET /api/v1/sites
Authorization: Bearer YOUR_KEY

POST /api/v1/sites
Idempotency-Key: unique-request-001
{"business":"My business","city":"Lahore","services":"Plumbing"}</pre><p>Scopes and account ownership apply to every request. Create calls are template-only; no paid provider action or live publish is performed. Rate limit: 60 requests/minute per key; 100 new API drafts/day per key. Keys expire within 90 days.</p></section>`,'developer');return;
 }
 if(route==='indexing'){
  const [{events},{batches,usage}]=await Promise.all([api('/api/indexing/history'),api('/api/indexing/batches')]);
  const site=new URLSearchParams(location.search).get('site');
  const linked=site&&/^[a-f0-9-]+$/.test(site)?await api('/api/sites/'+site+'/search').catch(()=>null):null;
  return indexingWorkspace({shell,header,href,button,batches,events,usage,linked});
 }
 if(route==='billing'){
  const r=await api('/api/billing');
  shell(header('Upgrade your plan','Review your plan, use Stripe card checkout, or request manual payment instructions.')+`<section class="panel"><h2>Current billing status</h2><p>Plan: <strong>${e(r.capacity.plan)}</strong> · ${r.capacity.used} of ${r.capacity.limit} websites used · Status: ${e(r.subscription?.status||r.accessSource||(r.capacity.plan==='free'?'Free / private alpha':'Verified manual payment'))}</p><p>${e(r.checkoutReady?'Stripe card checkout is configured. Review the plan and terms before continuing.':'Stripe checkout is not enabled yet. Merchant secrets and commercial plan configuration must be completed in Render.')}</p>${r.subscription?.customer?'<button class="btn" data-tool-action="billing-portal">Manage subscription in Stripe</button>':''}</section><section class="grid3">${(r.plans||[]).filter(p=>['starter','growth','agency'].includes(p.code)).map(({code:plan,amount,checkoutConfigured})=>`<article class="panel"><h2>${plan[0].toUpperCase()+plan.slice(1)}</h2><h3>$${amount/100}<small> USD / month</small></h3><p>${e(r.allowances?.[plan]||'Included allowances await confirmation.')}</p><form class="checkout-form"><input type="hidden" name="plan" value="${plan}"><label class="field">Discount code (optional)<input name="promo" maxlength="40" placeholder="Promotion code"></label><label class="mk-consent"><input type="checkbox" name="agreed" required>I agree to the <a href="${href('terms-and-conditions')}">Terms</a> and <a href="${href('refund-policy')}">Refund Policy</a>.</label><button class="btn primary" type="submit" ${r.checkoutReady&&checkoutConfigured?'':'disabled'}>Continue to Stripe</button></form></article>`).join('')}</section><section class="panel"><h2>Other ways to pay</h2><p>Manual methods require payment instructions and verification. Sending a reference does not activate a paid plan.</p>${r.methods.map(m=>`<details class="activity-item"><summary>${e(m.label)}</summary>${m.instructions?`<pre class="result">${e(m.instructions)}</pre>`:'<p>Request current payment instructions from contact@sitocal.com.</p>'}<a class="text-link" href="/contact?payment=${e(m.id)}">Request ${e(m.label)} instructions ↗</a></details>`).join('')}<a class="text-link" href="/contact?payment=custom">Request a custom payment method ↗</a><section class="panel"><h2>Access codes & referrals</h2><p>Redeem a free-access code, or attach a referral before your first subscription. Paid discount codes belong in the checkout form above.</p><div class="grid2"><form id="bonus-code-form"><label class="field">Free-access code<input name="code" maxlength="40" required></label><button class="btn" type="submit">Redeem access</button></form><form id="referral-code-form"><label class="field">Referral code<input name="code" maxlength="40" required></label><button class="btn" type="submit">Attach referral</button></form></div><button class="btn small ghost" type="button" data-tool-action="reward-status">View my grants & referral codes</button><div id="reward-result" role="status"></div></section></section>`,'billing');
 }
}
export function reviewInspectionUrls(value){
   const lines=value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
   const unique=new Set();
   let invalid=0;
   for(const line of lines){
     try{const url=new URL(line);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.hash)throw Error();unique.add(url.href);}
     catch{invalid++;}
   }
 return {lines,unique,invalid};
}
function indexingWorkspace({shell,header,href,button,batches,events,usage,linked}){
 const labels={overview:'Overview',submit:'Submit',jobs:'Jobs',usage:'Usage'};
 const selected=new URLSearchParams(location.search).get('tab');
 const tab=Object.hasOwn(labels,selected)?selected:'overview';
 const link=(view,query='')=>href('indexing','?tab='+view+query);
 const open=batches.filter(batch=>['queued','running'].includes(batch.status)).length;
 const stats=`<section class="stats-row" aria-label="Indexing summary"><div class="stat"><span class="stat-label">Inspections queued today</span><div class="stat-value">${usage.used}</div></div><div class="stat"><span class="stat-label">Remaining today</span><div class="stat-value">${usage.remaining}</div></div><div class="stat"><span class="stat-label">Active batches</span><div class="stat-value">${open}</div></div></section>`;
 const content={
  overview:()=>stats+`<section class="panel empty"><h2>${batches.length?'Continue your indexing workflow':'Check your first pages'}</h2><p>Connect Search Console, select a verified property and inspect the URLs you want to track.</p><a class="btn primary" href="${link('submit')}">Inspect URLs or submit a sitemap</a></section>`,
  submit:()=>`<section class="panel"><div class="row between"><h2>1. Choose a verified property</h2>${button('Connect Google','google-connect','small')}</div><button type="button" class="btn" data-tool-action="index-properties">Load verified properties</button><label class="field">Search Console property<select id="index-property">${linked?.property?`<option value="${e(linked.property)}">${e(linked.property)}</option>`:'<option value="">Load your connected properties first</option>'}</select></label></section>
  <section class="panel"><h2>2. Review URL inspections</h2><p>Paste URLs or upload a UTF-8 TXT or CSV with the URL in the first column. Checks read Google’s indexed version.</p><form id="inspection-batch-form"><label class="field">URLs, one per line<textarea name="urls" rows="6" maxlength="100000" placeholder="https://yourbusiness.com/services" required></textarea></label><label class="field">Import URL file<input id="index-url-file" type="file" accept=".txt,.csv,text/plain,text/csv"></label><div id="index-review" role="status"></div><button class="btn primary" type="submit" disabled>Queue URL inspections</button></form><div id="inspection-batch-result" role="status"></div></section>
  <section class="panel"><h2>Single URL and sitemap tools</h2><p>Submit a sitemap to help Google discover pages. Google determines when to crawl and index them.</p><button type="button" class="btn small" data-tool-action="google-write">Authorize sitemap writes</button><form id="indexing-form"><label class="field">Action<select name="kind"><option value="inspect">Inspect URL index status</option><option value="sitemaps">List submitted sitemaps</option><option value="submit">Submit a sitemap URL</option></select></label><label class="field">Page or sitemap URL<input name="url" type="url" placeholder="https://yourbusiness.com/sitemap.xml" value="${linked?.origin?e(linked.origin+'/sitemap.xml'):''}"></label><label class="mk-consent"><input type="checkbox" name="confirmed">I authorize submitting this sitemap if “Submit” is selected.</label><button class="btn primary" type="submit">Run Search Console action</button></form><div id="indexing-result" role="status"></div></section>`,
  jobs:()=>`<section class="panel"><div class="row between"><h2>Inspection jobs</h2><div class="row"><a class="btn small" href="${link('jobs')}">Refresh</a><a class="btn primary small" href="${link('submit')}">Inspect URLs</a></div></div>
  ${batches.length?batches.map(batch=>`<details class="activity-item"><summary><strong>${e(batch.property)}</strong> · ${e(batch.status.replaceAll('_',' '))} · ${batch.finished} of ${batch.total} processed · ${e(new Date(batch.created).toLocaleString())}</summary><div class="row"><button class="btn small" type="button" data-batch="${e(batch.id)}">Load or refresh URLs</button><a class="text-link" href="/api/indexing/batches/${e(batch.id)}/csv">Download CSV</a></div><div data-batch-report="${e(batch.id)}" role="status"></div></details>`).join(''):'<div class="empty"><h3>No inspection jobs yet</h3><p>Queue a batch to see its progress and results here.</p></div>'}</section>
  <section class="panel"><h2>Recent URL and sitemap activity</h2>${events.map(event=>`<details class="activity-item"><summary>${e(event.kind)} · ${e(event.config.url)} · ${e(new Date(event.created).toLocaleString())}</summary><pre class="result">${e(JSON.stringify(event.result,null,2))}</pre></details>`).join('')||'<p>No completed actions yet.</p>'}</section>`,
  usage:()=>stats+`<section class="panel"><h2>Daily inspection allowance</h2><p>Each URL queued in a batch uses one unit of the daily allowance. You can queue up to ${usage.batchLimit} URLs per batch. The ${usage.limit}-URL account allowance resets at midnight UTC. Google also applies its own API quotas.</p><progress value="${usage.used}" max="${usage.limit}">${usage.used} / ${usage.limit}</progress><p>${usage.used} of ${usage.limit} used · Resets ${e(new Date(usage.resetsAt).toLocaleString())}</p></section>`
 };
 shell(header('Google Indexer','Inspect pages, submit sitemaps and track Search Console results.')+
   `<nav class="row panel" aria-label="Google Indexer sections">${Object.entries(labels).map(([key,label])=>`<a class="btn small ${key===tab?'primary':''}" ${key===tab?'aria-current="page"':''} href="${link(key)}">${label}</a>`).join('')}</nav>`+content[tab](),'indexing');
 if(tab!=='submit')return;
 const form=document.getElementById('inspection-batch-form'),property=document.getElementById('index-property');
 const review=document.getElementById('index-review');
 function preview(){
   const {lines,unique,invalid}=reviewInspectionUrls(form.elements.urls.value);
   review.textContent=unique.size+' unique URLs · '+(lines.length-unique.size-invalid)+' duplicates · '+invalid+' invalid · '+usage.remaining+' remaining today';
   form.querySelector('[type=submit]').disabled=Boolean(form.querySelector('[type=submit]').dataset.queued)||!property.value||invalid>0||!unique.size||unique.size>Math.min(usage.batchLimit,usage.remaining)||open>0;
 }
 form.elements.urls.addEventListener('input',preview);
 property.addEventListener('change',preview);
 document.getElementById('index-url-file').addEventListener('change',async event=>{
   const file=event.target.files[0];if(!file)return;
   if(file.size>100000){review.textContent='Choose a file under 100 KB.';event.target.value='';return;}
   try{
     const text=await file.text();
     const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
     const csv=/\.csv$/i.test(file.name);
     form.elements.urls.value=lines.map(line=>csv?(line.match(/^\s*"([^"]*)"\s*(?:,|$)/)?.[1]??line.split(',')[0]).trim():line.trim()).filter((line,index)=>index!==0||!/^url$/i.test(line)).join('\n');
     preview();
   }catch{review.textContent='Could not read this file. Paste your URLs instead.';}
   event.target.value='';
 });
 preview();
}

export function initToolEvents({api,notify,refreshScreen}){
 document.addEventListener('submit',async event=>{
  const form=event.target;if(!['api-key-form','indexing-form','inspection-batch-form','bonus-code-form','referral-code-form'].includes(form.id)&&!form.classList.contains('checkout-form'))return;
  event.preventDefault();event.stopImmediatePropagation();const submit=form.querySelector('[type=submit]');if(submit.disabled)return;submit.disabled=true;const b=Object.fromEntries(new FormData(form));
  try{
   if(['bonus-code-form','referral-code-form'].includes(form.id)){const r=await api('/api/rewards/'+(form.id==='bonus-code-form'?'redeem':'referral'),{method:'POST',body:b});document.getElementById('reward-result').textContent=JSON.stringify(r,null,2);}
   if(form.id==='api-key-form'){b.scopes=new FormData(form).getAll('scopes');const r=await api('/api/developer/keys',{method:'POST',body:b});document.getElementById('api-key-result').innerHTML=`<div class="alert"><strong>Copy your key now. It will not be shown again.</strong><pre class="result">${e(r.token)}</pre><p>Store it in your client’s secret environment, never in public source code.</p><button type="button" class="btn small" data-tool-action="hide-key">I saved it — hide key</button></div>`;form.reset();}
   if(form.id==='inspection-batch-form'){
    const {unique,invalid}=reviewInspectionUrls(b.urls);
    const property=document.getElementById('index-property').value;
    if(invalid||!unique.size||!property)throw Error('Choose a verified property and enter valid page URLs.');
    await api('/api/indexing/batches',{method:'POST',body:{urls:[...unique].join('\n'),property}});
    submit.dataset.queued='1';
    document.getElementById('inspection-batch-result').innerHTML='<p>Batch queued. <a href="?tab=jobs">View jobs →</a></p>';
   }
   if(form.id==='indexing-form'){b.property=document.getElementById('index-property').value;if(!b.property)throw Error('Choose a verified Search Console property.');const r=await api('/api/indexing/'+b.kind,{method:'POST',body:{...b,confirmed:b.confirmed==='on'}});document.getElementById('indexing-result').innerHTML=`<pre class="result">${e(JSON.stringify(r,null,2))}</pre>`;}
   if(form.classList.contains('checkout-form')){const name='sitocal-checkout-'+b.plan;let key=sessionStorage.getItem(name);if(!key){key=crypto.randomUUID();sessionStorage.setItem(name,key);}const r=await api('/api/billing/checkout',{method:'POST',body:{plan:b.plan,requestKey:key,promo:b.promo||'',agreed:b.agreed==='on'}});location.href=r.url;}
  }catch(error){notify(error.message);}finally{submit.disabled=Boolean(submit.dataset.queued);}
 },true);
 document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-tool-action],[data-revoke-key],[data-batch]');if(!el)return;el.disabled=true;
  try{
   if(el.dataset.toolAction==='copy-mcp'){await navigator.clipboard.writeText(location.origin+'/mcp');notify('MCP endpoint copied.');}
   if(el.dataset.batch){const r=await api('/api/indexing/batches/'+el.dataset.batch);el.closest('details').querySelector('[data-batch-report]').innerHTML=`<div class="table-scroll"><table><thead><tr><th>URL</th><th>Request status</th><th>Google verdict</th><th>Details</th></tr></thead><tbody>${r.items.map(item=>`<tr><td>${e(item.url)}</td><td>${e(item.status)}</td><td>${e(item.result.verdict||'—')}</td><td>${e(item.result.error||item.result.coverageState||'—')}</td></tr>`).join('')}</tbody></table></div>`;}
   if(el.dataset.revokeKey){await api('/api/developer/keys/'+el.dataset.revokeKey,{method:'DELETE'});await refreshScreen();}
   if(el.dataset.toolAction==='hide-key'){document.getElementById('api-key-result').textContent='Key hidden. Create another key if you did not save it.';await refreshScreen();}
   if(el.dataset.toolAction==='reward-status'){const r=await api('/api/rewards');document.getElementById('reward-result').textContent=JSON.stringify(r,null,2);}
   if(el.dataset.toolAction==='index-properties'){const r=await api('/api/indexing/properties',{method:'POST',body:{}});document.getElementById('index-property').innerHTML=r.properties.some(p=>p.permissionLevel!=='siteUnverifiedUser')?r.properties.filter(p=>p.permissionLevel!=='siteUnverifiedUser').map(p=>`<option value="${e(p.siteUrl)}">${e(p.siteUrl)} · ${e(p.permissionLevel)}</option>`).join(''):'<option value="">No verified accessible property</option>';document.getElementById('index-property').dispatchEvent(new Event('change'));}
   if(el.dataset.toolAction==='google-write'){const r=await api('/api/google/start',{method:'POST',body:{indexing:true}});location.href=r.url;}
   if(el.dataset.toolAction==='billing-portal'){const r=await api('/api/billing/portal',{method:'POST',body:{}});location.href=r.url;}
  }catch(error){notify(error.message);}finally{el.disabled=false;}
 });
}
