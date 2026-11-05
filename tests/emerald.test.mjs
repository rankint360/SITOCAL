import{test}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{draftSite}from'../lib/sites.mjs';import{uiHarness}from'../scripts/ui-preview.mjs';
test('Emerald Studio preserves workspace destinations and escaped editor page controls',async()=>{
 const h=await uiHarness(),data=draftSite({business:'QA <script>alert(1)</script>',city:'Lahore',services:'Drain cleaning, Water heater repair'});h.setState({session:{user:{email:'qa@example.invalid'}},sites:[{id:'fixture',updated:'2026-10-31',data}],connections:[]});
 const overview=await h.render('overview');assert(overview.includes('studio-sidebar'));assert(overview.includes('Mobile workspace navigation'));assert(overview.includes('data-appearance'));assert(overview.indexOf('class="panel portfolio"')<overview.indexOf('class="fieldwork-panels"'));
 const editor=await h.render('editor');assert(editor.includes('aria-label="Website pages"'));assert.equal((editor.match(/data-editor-page=/g)||[]).length,data.pages.length);assert(editor.includes('data-editor-page="0" class="active" aria-current="page"'));assert(!editor.includes('<script>alert(1)</script>'));for(const id of ['editor-page','editor-section','edit-heading','edit-body','edit-cta','edit-title','edit-description','site-frame','save-state'])assert.equal((editor.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);assert(editor.includes('sandbox="allow-scripts"'));
 const home=await h.render('landing');assert(home.includes('>Product <'));assert(home.includes('>Solutions <'));assert(home.includes('>Resources <'));assert(home.indexOf('id="how-it-works"')<home.indexOf('id="features"'));assert(!home.includes('Example persona'));assert(home.includes('logo.svg'));
});
test('Emerald Studio fonts are bundled WOFF2 with licenses and UI-only scope',async()=>{
 for(const name of ['inter','manrope']){const css=await readFile(new URL('../public/font-'+name+'.css',import.meta.url),'utf8');const b=Buffer.from(css.match(/base64,([A-Za-z0-9+/=]+)/)[1],'base64');assert.equal(b.subarray(0,4).toString(),'wOF2');assert(css.includes('font-display:swap'));assert((await readFile(new URL('../docs/FONT-LICENSE-'+name.toUpperCase()+'.txt',import.meta.url),'utf8')).includes('OPEN FONT LICENSE'));}
 const css=await readFile(new URL('../public/emerald.css',import.meta.url),'utf8');assert(css.includes('prefers-reduced-motion'));assert(css.includes('html[data-theme=dark]'));assert(css.includes('.studio-mobile-nav'));assert(!css.includes('@import'));assert(!css.includes('https://'));
});

test('appearance shares palette and mode across workspace hosts and lets System follow the device',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=(await readFile(new URL('../public/appearance.js',import.meta.url),'utf8')).replaceAll('export function','function');
 let cookie='',dark=false;
 const open=hostname=>{
  const html={dataset:{},style:{}};
  const listeners={};
  const document={
   documentElement:html,
   get cookie(){return cookie.split(';')[0];},
   set cookie(value){cookie=value;},
   querySelector:()=>({content:'fixture.example'}),
   querySelectorAll:()=>[],
   addEventListener:(name,callback)=>{listeners[name]=callback;}
  };
  const appearance=runInNewContext(source+'\n;({applyAppearance,saveAppearance})',{
   document,window:{addEventListener(){}},location:{hostname,protocol:'https:'},
   matchMedia:()=>({matches:dark,addEventListener(){}})
  });
  return {html,appearance,listeners};
 };
 const editor=open('editor.fixture.example');
 editor.appearance.saveAppearance('Glass','Light');
 assert.match(cookie,/Domain=fixture\.example/);
 for(const host of ['fixture.example','app','wp','serp','admin']){
  const target=open(host.includes('.')?host:host+'.fixture.example');
  target.listeners['sitocal-account-theme']({detail:'dark'});
  assert.equal(target.html.dataset.theme,'light');
  assert.equal(target.html.dataset.palette,'glass');
 }
 editor.appearance.saveAppearance('Violet','System');
 dark=true;
 const admin=open('admin.fixture.example');
 admin.appearance.applyAppearance();
 assert.equal(admin.html.dataset.theme,'dark');
 assert.equal(admin.html.dataset.palette,'violet');
});
