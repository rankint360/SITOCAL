import vm from 'node:vm';
import { readFile,mkdir,writeFile,copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { draftSite,staticFiles } from '../lib/sites.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export async function uiHarness(){
  const elements={};
  const element=id=>elements[id]||(elements[id]={innerHTML:'',showModal(){},close(){}});
  const context=vm.createContext({document:{getElementById:element,querySelector:()=>({content:''}),addEventListener(){}},window:{addEventListener(){}},location:{hostname:'localhost',pathname:'/app',search:''},URLSearchParams,console});
  const source=(await readFile(path.join(root,'public/app.js'),'utf8')).replace(/^init\(\);\s*$/m,'');
  vm.runInContext(source,context);
  return {elements,setState(state){vm.runInContext(`session=${JSON.stringify(state.session)};sites=${JSON.stringify(state.sites||[])};connections=${JSON.stringify(state.connections||[])};site=null;`,context);},async render(name){await vm.runInContext(name==='login'?'auth(false)':name+'()',context);let html=element('root').innerHTML;if(name==='serp')html=html.replace('<div id="serp-content"></div>',`<div id="serp-content">${element('serp-content').innerHTML}</div>`);return html;}};
}

export async function createPreviews(target){
  await mkdir(path.join(target,'assets/brand'),{recursive:true});
  for(const file of ['style.css','fieldwork.css'])await copyFile(path.join(root,'public',file),path.join(target,'assets',file));
  for(const file of ['logo','logo-dark','icon','icon-dark'])await copyFile(path.join(root,'public/brand',file+'.svg'),path.join(target,'assets/brand',file+'.svg'));
  const data=draftSite({business:'Greenleaf Plumbing',city:'Lahore',services:'Drain cleaning, Water heater repair',businessBrief:'Sample business for design review. This is not a live customer account.'});
  const h=await uiHarness();h.setState({session:{user:{email:'preview@example.invalid'}},sites:[{id:'preview',updated:'2026-10-29T00:00:00Z',data}],connections:[]});
  const routes={landing:'index',overview:'app',editor:'editor',converter:'wp',serp:'serp',integrations:'integrations',domains:'domains',publish:'publish',login:'login'};
  for(const [name,file]of Object.entries(routes)){
    let body=await h.render(name);
    body=body.replaceAll('/assets/','assets/').replace(/href="\/(app|editor|wp|serp|integrations|domains|publish|login|jobs)(\?[^\"]*)?"/g,(_,r)=>`href="${r==='jobs'?'app':r}.html"`).replaceAll('href="/"','href="index.html"').replace(/src="\/api\/sites\/[^\"]+"/g,'src="sample-site.html"');
    await writeFile(path.join(target,file+'.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sitocal Fieldwork / ${file}</title><link rel="stylesheet" href="assets/style.css"><link rel="stylesheet" href="assets/fieldwork.css"></head><body><div style="padding:9px 18px;font:12px Arial;background:#e4ecd9;color:#123f31;text-align:center">STATIC DESIGN PREVIEW · sample account · controls do not save or call providers</div>${body}</body></html>`);
  }
  const files=staticFiles(data);await writeFile(path.join(target,'sample-site.html'),files['index.html']);
  await writeFile(path.join(target,'README.txt'),'Static Fieldwork design previews, not a live app. Open index.html or app.html. Sample data is labelled. Forms and action buttons are inactive. Browser layout QA pending.\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await createPreviews(path.join(root,'../sitocal-fieldwork-preview'));
