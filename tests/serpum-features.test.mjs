import{test}from'node:test';
import assert from'node:assert/strict';
import{serpumFeatures,serpumNotices,serpumFeatureRoutes}from'../public/serpum-features.js';
import{uiHarness}from'../scripts/ui-preview.mjs';
test('SERPUM reference library links all 16 explanations and scoped service notices',async()=>{
 const h=await uiHarness(),hub=await h.render('public:serpum/features/');
 assert.equal(serpumFeatures.length,16);assert.equal(serpumNotices.length,2);assert.equal(new Set(serpumFeatureRoutes).size,19);
 assert.equal((hub.match(/class="serpum-feature-card"/g)||[]).length,16);
 for(const p of serpumFeatures){const route='serpum/features/'+p.slug+'.html';assert(hub.includes('href="/'+route+'"'));const html=await h.render('public:'+route);assert(html.includes('<h1>'+p.title+'</h1>'));assert(html.includes('Explanation, not an embedded tool'));assert(html.includes('References &amp; further reading'));for(let i=0;i<p.sections.length;i++)assert(html.includes('id="reference-'+i+'"'));assert(!html.includes('href="undefined"'));assert(!html.includes('/features/uule.html.html'));if(p.code){assert(html.includes('serpum-reference-code'));if(p.code.includes('<')){assert(html.includes('&lt;'));assert(!html.includes(p.code));}}}
 for(const p of serpumNotices){const html=await h.render('public:serpum/'+p.slug);assert(html.includes('AJ Digit, LLC'));assert(html.includes('contact@sitocal.com'));assert(!html.includes('Reference and inspiration: Valentin.app'));assert(html.includes('Current alpha notice'));}
 const checker=await h.render('public:serpum');assert(checker.includes('href="/serpum/features/"'));assert(checker.includes('href="/serpum/privacy"'));assert(checker.includes('href="/serpum/terms"'));
});
