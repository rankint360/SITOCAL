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
