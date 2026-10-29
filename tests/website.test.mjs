import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftSite,validateSite,staticFiles,renderPage,converterFiles } from '../lib/sites.mjs';
import { parseDraft } from '../lib/ai.mjs';

test('complete website plan stays editable and produces working internal links',()=>{
  const site=draftSite({business:'Greenleaf Plumbing',city:'Lahore',services:'Drain cleaning, Water heaters',businessBrief:'We discuss household plumbing needs in Lahore.',phone:'+92 300 1234567'});
  assert.deepEqual(site.pages.map(p=>p.slug),['home','drain-cleaning','water-heaters','services','about','contact']);
  assert(site.pages.every(p=>p.sections.length>=4));
  assert.equal(site.pages[0].sections[0].body,site.businessBrief);
  const files=staticFiles(site);
  for(const page of site.pages){
    const html=renderPage(site,page);
    for(const match of html.matchAll(/href="([^"#]+\.html)"/g))assert(files[match[1]],`Missing internal destination: ${match[1]}`);
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert(html.includes('tel:+923001234567'));
  }
  assert(renderPage(site,site.pages[0],true).includes('data-edit="0:heading"'));
  const restored=validateSite(JSON.parse(files['rankleem.json']));assert.deepEqual(restored,site);
  assert(converterFiles(site,'gutenberg')['wordpress.xml'].includes('About Greenleaf Plumbing'));
});

test('service names cannot collide with system pages or normalized service slugs',()=>{
  const site=draftSite({business:'Test',city:'Karachi',services:'Home, About, Services, Contact, index, A & B, A B, Home'});
  assert.equal(new Set(site.pages.map(p=>p.slug)).size,site.pages.length);
  assert(site.pages.some(p=>p.slug==='home-service'));
  assert(site.pages.some(p=>p.slug==='a-b-2'));
});

test('untrusted business brief remains plain text; legacy sites still render',()=>{
  const site=draftSite({business:'A&B',city:'Lahore',services:'Repair',businessBrief:'<img src=x onerror=alert(1)>',email:'hello@example.com'});
  const html=renderPage(site,site.pages[0]);assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));assert(html.includes('mailto:hello%40example.com'));
  const old=validateSite({business:'Legacy',city:'Multan',pages:[{slug:'home',title:'Old page',sections:[{heading:'Saved headline',body:'Saved body',cta:'Contact'}]}]});
  const legacy=renderPage(old,old.pages[0],true);assert(legacy.includes('Saved headline'));assert(legacy.includes('data-edit="0:body"'));assert(!legacy.includes('undefined'));
});

test('AI cannot silently discard the full page section plan',()=>{
  const base=draftSite({business:'Test',city:'Lahore'}),pages=structuredClone(base.pages);pages[0].sections.pop();
  assert.throws(()=>parseDraft({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({pages})}]}]},base),/section plan/);
});
