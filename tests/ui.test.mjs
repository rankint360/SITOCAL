import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness } from '../scripts/ui-preview.mjs';

test('dedicated product landings use factual capabilities and valid navigation anchors',async()=>{const h=await uiHarness();for(const name of ['serpHome','indexerHome']){const html=await h.render(name);assert.equal((html.match(/<h1>/g)||[]).length,1);const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);for(const a of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(a[1]));for(const id of ['capabilities','workflow','access','faq'])assert(ids.includes(id));assert(html.includes('AJ Digit, LLC'));assert(!html.includes('RankLocal'));assert(!html.includes('5 free'));}const indexer=await h.render('indexerHome');assert(indexer.includes('inspection-count'));assert(indexer.includes('No verdict recorded'));assert(indexer.includes('Verified GSC properties'));const serp=await h.render('serpHome');assert(serp.includes('data-research-sample'));assert(serp.includes('No live check performed'));});
test('email and social sign-in methods render without provider secrets',async()=>{const h=await uiHarness(),html=await h.render('login');for(const provider of ['google','github','linkedin'])assert(html.includes('data-social="'+provider+'"'));assert(html.includes('Sign in with email'));assert(html.includes('autocomplete="current-password"'));assert(!html.includes('CLIENT_SECRET'));});

test('every product workspace renders approved branding, navigation and real empty states',async()=>{
  const h=await uiHarness();h.setState({session:{user:{email:'qa@example.invalid'}},sites:[],connections:[]});
  for(const name of ['overview','editor','converter','serp','integrations','domains','publish']){
    const html=await h.render(name);assert(html.includes('/assets/brand/logo-dark.svg'),name);assert(html.includes('/assets/brand/logo.svg'),name);assert(html.includes('Workspace navigation'),name);assert(html.includes('Sign out'),name);assert(!html.includes('undefined'),name);
    for(const route of ['app','editor','wp','serp','domains','publish','integrations','jobs'])assert(html.includes(`href="/${route}"`),`${name}: missing ${route}`);
  }
  const overview=await h.render('overview');assert(overview.includes('Not configured'));assert(overview.includes('Create your first website'));assert(!overview.includes('Published websites'));
});

test('portfolio uses escaped account data and real page counts',async()=>{
  const h=await uiHarness();h.setState({session:{user:{email:'qa@example.invalid'}},sites:[{id:'test',updated:'2026-10-29',data:{business:'<img src=x onerror=alert(1)>',city:'Lahore',theme:'orchard',pages:[{},{}]}}],connections:['github']});
  const html=await h.render('overview');assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));assert(html.includes('Saved draft'));assert(html.includes('href="/editor?site=test"'));assert(html.includes('<div class="stat-value">2</div>'));
});

test('logged-out landing has complete reference flow, valid anchors and native demo controls',async()=>{
  const h=await uiHarness(),html=await h.render('landing');
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const match of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(match[1]),`Missing section ${match[1]}`);
  for(const id of ['product-preview','features','themes','niches','how-it-works','export','access','faq','get-started'])assert(ids.includes(id));
  assert.equal((html.match(/role="tab"/g)||[]).length,7);assert.equal((html.match(/role="tabpanel"/g)||[]).length,7);
  assert.equal((html.match(/<details data-faq-category=/g)||[]).length,12);
  assert(html.includes('id="contact-form"'));assert(html.includes('Sample review'));assert(html.includes('not yet verified'));
  for(const t of ['Free','Starter','Growth','Agency','Enterprise','$10','$50','$100'])assert(html.includes(t));
  for(const dest of ['app','editor','wp','serp','publish','integrations','login','domains','billing'])assert(html.includes('href="/'+dest+'"'));
});

test('public pages expose operator, draft policy state, useful content and connected navigation',async()=>{
 const h=await uiHarness();
 for(const route of ['about','contact','blog','products-services','privacy-policy','terms-and-conditions','refund-policy','service-policy','shipping-policy','api-mcp','google-indexer']){
  const html=await h.render('public:'+route);assert(html.includes('AJ Digit, LLC'));assert(html.includes('contact@sitocal.com'));assert.equal((html.match(/<h1>/g)||[]).length,1);assert(!html.includes('undefined'));assert(html.includes('/dashboard'));
 }
});

test("vendor assets are real SVG images with recorded official sources",async()=>{const {readFile,readdir}=await import("node:fs/promises");const sources=JSON.parse(await readFile(new URL("../docs/BRAND-ASSET-SOURCES.json",import.meta.url),"utf8"));assert.equal(sources.length,32);for(const source of sources){assert(source.asset);assert(!source.pending);const svg=await readFile(new URL("../public/vendors/"+source.file,import.meta.url),"utf8");assert(svg.includes("<svg"),source.id);assert(!/<html|<script|<foreignObject/i.test(svg),source.id);}});

test('public navigation exposes all niche guides, tools and honest preview states',async()=>{
 const {nichePacks,siteLanguages}=await import('../public/navigation.js');assert.equal(siteLanguages.length,25);assert.equal(new Set(siteLanguages.map(l=>l[0])).size,25);const h=await uiHarness();const home=await h.render('landing');
 assert.equal(nichePacks.length,30);
 for(const [slug,name] of nichePacks){assert(home.includes('href="/niche-packs/'+slug+'"'));const html=await h.render('public:niche-packs/'+slug);assert(html.includes(name));assert(html.includes('Not a preloaded specialist model'));}
 assert(home.includes('data-site-theme'));assert(home.includes('aria-controls="site-menu"'));assert(home.includes('🇬🇧 EN'));assert(home.includes('AJ Digit, LLC. [d/b/a SITOCAL]'));
 const comparison=await h.render('public:why-sitocal');assert(comparison.includes('<table>'));assert(comparison.includes('not a benchmark'));
 const leadsmart=await h.render('public:leadsmart-coverage-intelligence');assert(leadsmart.includes('Not an active coverage engine'));
});

test('language form retains native public-page translation submission',async()=>{const h=await uiHarness();let prevented=false;await h.dispatchSubmit({target:{id:'site-language-form'},preventDefault(){prevented=true;}});assert.equal(prevented,false);const html=await h.render('landing');assert(html.includes('action="https://translate.google.com/translate"'));assert(html.includes('target="_blank"'));assert(html.includes('name="tl"'));assert(html.includes('name="u"'));});

test('translated public pages return private workspace links to trusted original domains',async()=>{const {originalWorkspaceUrl:dest}=await import('../public/navigation.js');assert.equal(dest('https://translate.google.com/website?u=https%3A%2F%2Fapp.sitocal.com%2Flogin'),'https://app.sitocal.com/login');assert.equal(dest('https://sitocal-com.translate.goog/create-account?_x_tr_tl=ur'),'https://app.sitocal.com/login?signup=1');assert.equal(dest('https://translate.google.com/website?u=https%3A%2F%2Fevil.example%2Flogin'),'');assert.equal(dest('https://sitocal-com.translate.goog/about'),'');assert.equal(dest('javascript:alert(1)'),'');});

test('integration catalog uses official local logos and keeps unavailable providers out of credential forms',async()=>{const h=await uiHarness();h.setState({session:{user:{email:'preview@example.invalid'}},connections:['github'],sites:[]});const html=await h.render('integrations');assert.equal((html.match(/class="integration-symbol integration-brand"/g)||[]).length,21);for(const title of ['Semrush','Ahrefs','SE Ranking','Claude AI','Google Antigravity','Google Gemini','Grok AI','Cursor','Replit','Lovable'])assert(html.includes('<h3>'+title+'</h3>'));assert.equal((html.match(/Catalog · not connected/g)||[]).length,10);assert.equal((html.match(/data-configure=/g)||[]).length,10);assert(html.includes('data-configure="github">Replace credentials'));for(const id of ['semrush','ahrefs','seranking','claude','antigravity','gemini','grok','cursor','replit','lovable']){assert(!html.includes('data-configure="'+id+'"'));assert(html.includes('/assets/vendors/'+id+'.svg'));}assert(!html.includes('undefined'));});
