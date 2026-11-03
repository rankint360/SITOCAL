import assert from 'node:assert/strict';
import {unzip} from '../lib/archive.mjs';
const json=value=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
globalThis.fetch=async(input,options={})=>{
 const url=new URL(input);
 if(url.origin==='https://api.netlify.com'){
  if(options.method==='POST'){
   assert.equal(url.pathname,'/api/v1/sites/fixture-site/deploys');
   const files=unzip(options.body);
   assert(files['index.html'].toString().includes('https://launch.example.invalid/'));
   assert(files['sitemap.xml'].toString().includes('https://launch.example.invalid/contact.html'));
   assert(files['contact.html'].toString().includes('/website-contact/'));
   return json({id:'fixture-deploy',state:'building',deploy_ssl_url:'https://fixture.netlify.app'});
  }
  assert.equal(url.pathname,'/api/v1/deploys/fixture-deploy');
  return json({id:'fixture-deploy',state:'ready'});
 }
 if(url.origin==='https://www.googleapis.com'&&url.pathname==='/webmasters/v3/sites')return json({siteEntry:[{siteUrl:'https://launch.example.invalid/',permissionLevel:'siteOwner'}]});
 if(url.origin==='https://searchconsole.googleapis.com'){
  assert.equal(JSON.parse(options.body).inspectionUrl,'https://launch.example.invalid/');
  return json({inspectionResult:{indexStatusResult:{verdict:'PASS'}}});
 }
 if(url.origin==='https://api.dataforseo.com'){
  assert.equal(JSON.parse(options.body)[0].keyword,'drain cleaning Austin');
  return json({status_code:20000,tasks:[{status_code:20000,result:[{items:[{type:'organic',rank_group:2,url:'https://launch.example.invalid/',title:'Fixture plumbing',domain:'launch.example.invalid'}]}]}]});
 }
 if(url.origin==='https://api.openai.com'){
  assert.equal(url.pathname,'/v1/responses');
  assert.equal(JSON.parse(options.body).store,false);
  return json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({heading:'Clear the drain',body:'Ask about drain cleaning in Austin.',cta:'Get a quote'})}]}]});
 }
 throw Error('Unexpected fixture request to '+url.origin);
};
