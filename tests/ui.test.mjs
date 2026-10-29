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
  for(const trade of ['plumbing','electrical','cleaning']){assert(html.includes(`id="trade-${trade}"`));assert(html.includes(`for="trade-${trade}"`));}
  assert.equal((html.match(/name="sample-trade"/g)||[]).length,3);assert.equal((html.match(/<details>/g)||[]).length,8);
  assert(html.includes('Public pricing and commercial subscriptions are still being prepared.'));
  assert(!html.includes('<video'));assert(!html.includes('<form'));assert(!html.includes('5-star'));assert(!html.includes('trusted by 1,000'));
  for(const dest of ['app','editor','wp','serp','publish','integrations','login','domains'])assert(html.includes(`href="/${dest}"`));
});
