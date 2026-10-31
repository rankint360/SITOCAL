import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coordinateUule,buildSearchUrl,countryCodes,searchLanguages,serpumArticles} from '../public/serpum-data.js';
import {createSerpumGeocoder as actualGeocoder} from '../lib/serpum-geocode.mjs';
import {uiHarness} from '../scripts/ui-preview.mjs';

const createSerpumGeocoder=options=>actualGeocoder({...options,env:{SERPUM_GEOCODER_PROVIDER:'nominatim',SERPUM_NOMINATIM_PUBLIC_ACK:'true',...options.env}});

test('SERPUM emits encoded Google context with exact coordinates, valid zero and no query injection',()=>{
 const now=1793424000000,url=new URL(buildSearchUrl({keyword:'dentist & café #1',country:'PK',language:'ur',latitude:31.5204,longitude:74.3587,safe:true},{now}));
 assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/search');assert.equal(url.searchParams.get('q'),'dentist & café #1');assert.equal(url.searchParams.get('gl'),'pk');assert.equal(url.searchParams.get('hl'),'ur');assert.equal(url.searchParams.get('pws'),'0');assert.equal(url.searchParams.get('safe'),'active');assert.equal(url.hash,'');
 const value=url.searchParams.get('uule');assert(value.startsWith('a '));const payload=Buffer.from(value.slice(2).replace(/-/g,'+').replace(/_/g,'/'),'base64').toString();
 assert(payload.includes('latitude_e7:315204000'));assert(payload.includes('longitude_e7:743587000'));assert(payload.includes('timestamp:'+now*1000));assert(payload.includes('radius:93000'));
 const zero=coordinateUule(0,0,{now});assert(Buffer.from(zero.slice(2),'base64').toString().includes('latitude_e7:0'));
 assert.equal(new Set(countryCodes).size,countryCodes.length);assert(countryCodes.length>240);assert(searchLanguages.length>60);
});
test('SERPUM rejects missing/out-of-range location, unsupported locales and oversized keywords',()=>{
 const base={keyword:'plumber',country:'US',language:'en',latitude:40,longitude:-74};
 for(const patch of [{latitude:''},{longitude:null},{latitude:91},{longitude:-181},{latitude:NaN},{keyword:''},{keyword:'x'.repeat(501)},{country:'ZZ'},{language:'javascript:alert(1)'},{radius:0},{radius:50001}])assert.throws(()=>buildSearchUrl({...base,...patch}));
 assert.throws(()=>coordinateUule(1,2,{now:Infinity}));assert.throws(()=>coordinateUule(1,2,{now:2**53}));
});
test('geocoder is explicit, cached, bounded and country-filtered without forwarding user URLs',async()=>{
 let now=1793424000000,calls=0;const requests=[];
 const geocode=createSerpumGeocoder({now:()=>now,env:{},fetchImpl:async(url,options)=>{calls++;requests.push({url,options});return new Response(JSON.stringify([{lat:'31.52',lon:'74.35',display_name:'Lahore public landmark',address:{country_code:'pk'},type:'market'},{lat:'40',lon:'-70',display_name:'Other country',address:{country_code:'us'}}]),{headers:{'Content-Type':'application/json'}});}});
 const input={address:'Liberty Market, Lahore',country:'PK',language:'en'},result=await geocode(input);
 assert.equal(result.candidates.length,1);assert.equal(result.candidates[0].latitude,31.52);assert.equal(calls,1);
 const sent=new URL(requests[0].url);assert.equal(sent.origin,'https://nominatim.openstreetmap.org');assert.equal(sent.searchParams.get('countrycodes'),'pk');assert.equal(sent.searchParams.get('q'),input.address);assert(requests[0].options.headers['User-Agent'].includes('contact@sitocal.com'));assert(!requests[0].options.headers.Authorization);
 const cached=await geocode({...input,address:' liberty market,  lahore '});assert(cached.cached);assert.equal(calls,1);
 await assert.rejects(geocode({...input,address:'Another public landmark'}),e=>e.status===429);
 now+=1200;await geocode({...input,address:'Another public landmark'});assert.equal(calls,2);
 await assert.rejects(geocode({...input,address:'<script>'}),e=>e.status===400);
 await assert.rejects(geocode({...input,country:'ZZ'}),e=>e.status===400);
});
test('geocoder failures, empty matches, daily cap, disable and invalid provider responses stay honest',async()=>{
 const input={address:'Public landmark',country:'PK',language:'en'};let now=1793424000000;
 const empty=createSerpumGeocoder({now:()=>now,env:{SERPUM_GEOCODE_DAILY_LIMIT:'1'},fetchImpl:async()=>new Response('[]')});
 assert.deepEqual((await empty(input)).candidates,[]);now+=1200;await assert.rejects(empty({...input,address:'Other landmark'}),e=>e.status===429);
 const disabled=createSerpumGeocoder({env:{SERPUM_GEOCODING_ENABLED:'false'},fetchImpl:()=>{throw Error('Should not call provider');}});await assert.rejects(disabled(input),e=>e.status===503);
 for(const body of ['{"not":"an array"}','not json','[{"lat":"","lon":"0","display_name":"Bad"}]','[{"lat":"999","lon":"3","display_name":"Bad"}]']){const fn=createSerpumGeocoder({env:{},fetchImpl:async()=>new Response(body)});await assert.rejects(fn(input),e=>e.status===502);}
 const denied=createSerpumGeocoder({env:{},fetchImpl:async()=>new Response('provider-private-body',{status:429})});await assert.rejects(denied(input),e=>e.status===429&&!e.message.includes('private-body'));
 const timeout=createSerpumGeocoder({env:{},fetchImpl:async()=>{throw Error('private-provider-data');}});await assert.rejects(timeout(input),e=>e.status===502&&!e.message.includes('private-provider-data'));
 const badEndpoint=createSerpumGeocoder({env:{SERPUM_GEOCODER_URL:'http://localhost/'},fetchImpl:()=>{throw Error('Do not call');}});await assert.rejects(badEndpoint(input),e=>e.status===503);
});
test('concurrent address lookups never exceed the single provider request',async()=>{
 let release;const wait=new Promise(r=>release=r),input={address:'Public landmark',country:'PK',language:'en'};let calls=0;
 const fn=createSerpumGeocoder({env:{},fetchImpl:async()=>{calls++;await wait;return new Response('[]');}});
 const first=fn(input);await assert.rejects(fn({...input,address:'Other public landmark'}),e=>e.status===429);release();await first;assert.equal(calls,1);
});
test('SERPUM public tool and eight original guides have valid anchors and no fabricated rankings',async()=>{
 const h=await uiHarness(),html=await h.render('public:serpum');assert.equal((html.match(/<h1>/g)||[]).length,1);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
 for(const match of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(match[1]),match[1]);
 for(const id of ['keyword','country','language','address','geocode','latitude','longitude','search'])assert(html.includes('id="serpum-'+id+'"'));
 assert(html.includes('No account needed'));assert(html.includes('does not scrape'));assert(html.includes('Photon service & usage'));assert(!html.includes('Guaranteed rankings'));
 assert.equal(serpumArticles.length,8);for(const a of serpumArticles){const page=await h.render('public:serpum/'+a.slug);assert(page.includes(a.title));assert(page.includes('Original SITOCAL editorial guidance'));assert(page.includes('Sources & further reading'));assert(page.includes('id="section-0"'));}
 let intercepted=false;await h.dispatchSubmit({target:{id:'serpum-form'},preventDefault(){intercepted=true;}});assert.equal(intercepted,false);
});

test('default Photon adapter respects GeoJSON coordinate order, country filtering and label fallback',async()=>{let request;const fn=actualGeocoder({env:{},fetchImpl:async(url)=>{request=new URL(url);return new Response(JSON.stringify({features:[{geometry:{type:'Point',coordinates:[74.35,31.52]},properties:{name:'Public landmark',city:'Lahore',country:'Pakistan',countrycode:'PK'}},{geometry:{type:'Point',coordinates:[2,3]},properties:{name:'Other place',countrycode:'FR'}}]}));}});const r=await fn({address:'Public landmark Lahore',country:'PK',language:'ur'});assert.equal(request.origin,'https://photon.komoot.io');assert.equal(request.searchParams.get('countrycode'),'PK');assert.equal(request.searchParams.get('lang'),'en');assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].latitude,31.52);assert.equal(r.candidates[0].longitude,74.35);});
test('public Nominatim is never enabled without explicit operator acknowledgement',async()=>{const fn=actualGeocoder({env:{SERPUM_GEOCODER_PROVIDER:'nominatim'},fetchImpl:()=>{throw Error('Must not call');}});await assert.rejects(fn({address:'Public landmark',country:'PK',language:'en'}),e=>e.status===503);});

test('oversized geocoder responses fail before candidate parsing',async()=>{for(const response of [new Response('[]',{headers:{'content-length':'300000'}}),new Response('x'.repeat(260001))]){const fn=actualGeocoder({env:{},fetchImpl:async()=>response});await assert.rejects(fn({address:'Public landmark',country:'PK',language:'en'}),e=>e.status===502&&e.message.includes('too much data'));}});
