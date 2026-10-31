import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initSerpum} from '../public/serpum.js';

class Element{
 constructor(){this.value='';this.dataset={};this.children=[];this.listeners={};this.hidden=false;this.disabled=false;this.checked=false;this.selectedOptions=[];this.attributes={};}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 async dispatch(type){const event={target:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};for(const fn of this.listeners[type]||[])await fn(event);return event;}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);}}
 replaceChildren(...items){this.children=[];this.append(...items);}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 querySelectorAll(selector){return this.children.filter(c=>selector==='button'?c.type==='button':selector==='[data-serpum-google]'?c.dataset.serpumGoogle: false);}
 setAttribute(k,v){this.attributes[k]=v;}
 removeAttribute(k){delete this.attributes[k];if(k==='href')delete this.href;}
 closest(){return this.details??=(new Element());}
 focus(){this.focused=true;}
}
function harness(t,fetcher){
 const els={};for(const id of ['form','status','country','language','address','latitude','longitude','keyword','radius','safe','geocode','geocode-results','open','copy','context-country','context-language','context-coordinates','map','place-label','search'])els[id]=new Element();
 els.country.value='PK';els.country.selectedOptions=[{textContent:'Pakistan (PK)'}];els.language.value='en';els.language.selectedOptions=[{textContent:'English (EN)'}];els.radius.value='150';els.keyword.value='plumber near me';
 const oldDocument=globalThis.document;globalThis.document={createElement:()=>new Element()};t.after(()=>{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;});
 t.mock.method(globalThis,'fetch',fetcher);
 initSerpum({querySelector:s=>els[s.replace('#serpum-','')]});
 return els;
}
const point={label:'Public landmark, Lahore, Pakistan',latitude:31.5112797,longitude:74.3450076};
const response=candidates=>new Response(JSON.stringify({candidates}),{headers:{'Content-Type':'application/json'}});

test('Geocode applies the top point automatically and native form submits directly to Google',async t=>{
 const els=harness(t,async()=>response([point,{label:'Another point',latitude:31.5,longitude:74.3}]));els.address.value='Public landmark, Lahore';
 await els.geocode.dispatch('click');
 assert.equal(els.latitude.value,String(point.latitude));assert.equal(els.longitude.value,String(point.longitude));assert.equal(els['geocode-results'].children.length,2);assert.equal(els['geocode-results'].children[0].attributes['aria-pressed'],'true');
 const event=await els.form.dispatch('submit');assert.equal(event.defaultPrevented,false);assert.equal(els.form.action,'https://www.google.com/search');assert.equal(els.form.method,'get');assert.equal(els.form.target,'_blank');
 const fields=Object.fromEntries(els.form.children.map(e=>[e.name,e.value]));assert.equal(fields.q,'plumber near me');assert.equal(fields.gl,'pk');assert.equal(fields.hl,'en');assert.equal(fields.pws,'0');assert(!Object.hasOwn(fields,'address'));
 const payload=Buffer.from(fields.uule.slice(2),'base64').toString();assert(payload.includes('latitude_e7:315112797'));assert(payload.includes('longitude_e7:743450076'));
 await els['geocode-results'].children[1].dispatch('click');assert.equal(els.latitude.value,'31.5');assert.equal(els.longitude.value,'74.3');
});
test('address and country changes invalidate any previous point; failed geocoding never reuses it',async t=>{
 let count=0;const els=harness(t,async()=>response(++count===1?[point]:[]));els.address.value='Public landmark';await els.geocode.dispatch('click');await els.form.dispatch('submit');assert(els.form.children.length>0);
 els.address.value='Other public landmark';await els.address.dispatch('input');assert.equal(els.latitude.value,'');assert.equal(els.longitude.value,'');assert.equal(els.form.children.length,0);assert(els.open.hidden);assert((await els.form.dispatch('submit')).defaultPrevented);
 els.latitude.value='40';els.longitude.value='-74';await els.country.dispatch('change');assert.equal(els.latitude.value,'');assert.equal(els.longitude.value,'');
 await els.geocode.dispatch('click');assert(els.status.textContent.includes('No address match'));assert(els.open.hidden);assert.equal(els.latitude.value,'');
});
test('search is blocked during geocoding and late results cannot overwrite a changed address',async t=>{
 let finish;const wait=new Promise(r=>finish=r);const els=harness(t,async()=>{await wait;return response([point]);});els.address.value='Public landmark';
 const request=els.geocode.dispatch('click');assert(els.search.disabled);const event=await els.form.dispatch('submit');assert(event.defaultPrevented);assert(els.status.textContent.includes('Wait for'));
 els.address.value='Different address';await els.address.dispatch('input');finish();await request;assert.equal(els.latitude.value,'');assert(els.open.hidden);assert.equal(els.search.disabled,false);
});
test('manual zero coordinates remain valid and do not submit address or local option fields',async t=>{
 const els=harness(t,async()=>{throw Error('Must not geocode');});els.latitude.value='0';els.longitude.value='0';await els.latitude.dispatch('input');
 assert.equal(els.address.value,'');const event=await els.form.dispatch('submit');assert.equal(event.defaultPrevented,false);const fields=Object.fromEntries(els.form.children.map(e=>[e.name,e.value]));assert(fields.uule);assert.deepEqual(Object.keys(fields).sort(),['gl','hl','pws','q','uule']);
});
