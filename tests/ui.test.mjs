import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uiHarness } from '../scripts/ui-preview.mjs';

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
  assert.equal((html.match(/<details /g)||[]).length,12);
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

test("vendor assets are real SVG images with recorded official sources",async()=>{const {readFile,readdir}=await import("node:fs/promises");const sources=JSON.parse(await readFile(new URL("../docs/BRAND-ASSET-SOURCES.json",import.meta.url),"utf8"));assert.equal(sources.length,23);for(const source of sources){assert(source.asset);assert(!source.pending);const svg=await readFile(new URL("../public/vendors/"+source.file,import.meta.url),"utf8");assert(svg.includes("<svg"),source.id);assert(!/<html|<script|<foreignObject/i.test(svg),source.id);}});
