import {test} from 'node:test';
import assert from 'node:assert/strict';
import {probeSite,publicIPv4} from '../lib/launch-probe.mjs';
import {searchLocations} from '../lib/serp-locations.mjs';
import {configuredDestination} from '../lib/launch.mjs';

test('launch probes pin public addresses, reject private destinations and separate check results',async()=>{
 for(const ip of ['0.0.0.0','10.1.2.3','127.0.0.1','100.64.0.1','169.254.169.254','172.16.0.1','192.168.1.1','198.19.0.1','203.0.113.1','224.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4('8.8.8.8'),true);
 let calls=0;
 const read=async(url,address)=>{
  calls++;assert.equal(address,'8.8.8.8');assert.equal(url.origin,'https://site.example');
  return {status:200,body:url.pathname==='/sitemap.xml'?'<urlset><url><loc>https://site.example/</loc></url></urlset>':'<h1>Home</h1>'};
 };
 await assert.rejects(()=>probeSite('https://site.example',{resolve:async()=>[{address:'8.8.8.8'},{address:'10.0.0.1'}],read}),/public IPv4/);
 assert.equal(calls,0);
 const result=await probeSite('https://site.example',{resolve:async()=>[{address:'8.8.8.8'}],read,hasContactPage:false,contactUrl:'https://app.example/website-contact/fixture'});
 assert.equal(calls,2);
 assert.deepEqual(result.checks.map(row=>[row.key,row.passed]),[['homepage',true],['sitemap',true],['contact',false]]);
});

test('city lookup uses the fixed provider endpoint and filters its bounded response',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{
   assert.equal(url,'https://api.dataforseo.com/v3/serp/google/locations/US');
   assert.equal(options.headers.Authorization,'Basic '+Buffer.from('fixture:test').toString('base64'));
   return new Response(JSON.stringify({status_code:20000,tasks:[{status_code:20000,result:[{country_iso_code:'US',location_code:101,location_name:'Austin,Texas,United States'},{country_iso_code:'CA',location_code:102,location_name:'Austin,Canada'}]}]}));
  };
  assert.deepEqual(await searchLocations('us','Aus',{login:'fixture',password:'test'}),[{code:101,name:'Austin,Texas,United States'}]);
  await assert.rejects(()=>searchLocations('../admin','Austin',{}),/two-letter country code/);
 }finally{globalThis.fetch=original;}
});

test('saved destination overrides apply only to their selected providers',()=>{
 const plan={source:'github',repository:'owner/site',branch:'production',host:'netlify',project:'site-id'};
 const config={token:'fixture',repository:'owner/default',branch:'main',project:'default-id'};
 assert.deepEqual(configuredDestination(plan,'source','github',config),{...config,repository:'owner/site',branch:'production'});
 assert.deepEqual(configuredDestination(plan,'host','netlify',config),{...config,project:'site-id'});
 assert.equal(configuredDestination(plan,'host','vercel',config),config);
});
