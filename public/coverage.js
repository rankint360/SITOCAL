const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
export function parseCoverageCsv(text){
 const rows=[];let row=[],field='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
  if(c==='"'&&!field&&!closed){quoted=true;continue;}
  if(c===','||c==='\n'||c==='\r'){row.push(field.trim());field='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}continue;}
  if(closed||c==='"')throw Error('Check CSV quotes and delimiters.');
  field+=c;
 }
 if(quoted)throw Error('An open quote was found in the CSV.');
 row.push(field.trim());if(row.some(Boolean))rows.push(row);
 const headers=rows.shift()?.map(key=>key.replace(/^\uFEFF/,'').toLowerCase())||[];
 const required=['zip','city','state','niche','model','payout'];
 const source=['ringba_offer_name','top_net_duration_payout','top_net_cpl_payout'].map(key=>headers.indexOf(key));
 if(source.every(index=>index>=0)){
  const location=['zip','city','state'].map(key=>headers.indexOf(key));
  if(location.some(index=>index<0))throw Error('LeadSmart CSV needs ZIP, city and state.');
  const normalized=rows.flatMap(cells=>{
   const [offer,duration,cpl]=source.map(index=>cells[index]??'');
   const market=location.map(index=>cells[index]??'');
   if(!/^\d{5}$/.test(market[0])||!market[1]||!/^[A-Z]{2}$/i.test(market[2]))return [];
   return [['call',duration],['cpl',cpl]].filter(([,payout])=>/^\d+(?:\.\d+)?$/.test(payout)).map(pair=>[...market,offer,...pair]);
  });
  rows.length=0;
  for(const cells of normalized)rows.push(cells);
  headers.splice(0,headers.length,...required);
 }
 if(!required.every(key=>headers.includes(key)))throw Error('Include zip, city, state, niche, model and payout columns.');
 if(!rows.length||rows.length>800000)throw Error('Import between 1 and 800,000 rows.');
 const seen=new Set();
 return rows.map((cells,i)=>{
  const get=key=>cells[headers.indexOf(key)]||'';
  const zip=get('zip'),city=get('city'),state=get('state').toUpperCase(),niche=get('niche'),model=get('model').toLowerCase(),payout=Number(get('payout')),population=get('population')?Number(get('population')):null;
  if(!/^\d{5}$/.test(zip)||!city||city.length>100||!(/^[A-Z]{2}$/).test(state)||!niche||niche.length>100||!['cpl','call'].includes(model)||!get('payout')||!Number.isFinite(payout)||payout<0||payout>100000||population!==null&&(!Number.isSafeInteger(population)||population<0))throw Error('Invalid coverage data on row '+(i+2)+'.');
  const key=JSON.stringify([zip,niche.toLowerCase(),model]);
  if(seen.has(key))throw Error('Duplicate ZIP, niche and model on row '+(i+2)+'.');
  seen.add(key);
  return {zip,city,state,niche,model,payout,population};
 });
}
export function coverageGroups(rows,mode){
 const groups=new Map();
 for(const row of rows){
  const place=mode==='national'?'Nationwide':mode==='state'?row.state:mode==='zip'?row.zip+' · '+row.city+', '+row.state:row.city+', '+row.state;
  const key=JSON.stringify([place,row.niche,row.model]);
  if(!groups.has(key))groups.set(key,{key,place,niche:row.niche,model:row.model,population:mode==='state'?null:row.population,zips:new Set(),payouts:[]});
  const item=groups.get(key);item.zips.add(row.zip);item.payouts.push(row.payout);
 }
 return [...groups.values()].map(item=>({...item,count:item.zips.size,payout:median(item.payouts),range:[item.payouts.reduce((a,b)=>Math.min(a,b),Infinity),item.payouts.reduce((a,b)=>Math.max(a,b),0)]}));
}
export function coverageBundles(rows,min){
 const groups=new Map();
 for(const row of rows){
  if(!groups.has(row.zip))groups.set(row.zip,{zip:row.zip,place:row.city+', '+row.state,niches:new Set()});
  groups.get(row.zip).niches.add(row.niche);
 }
 return [...groups.values()].filter(item=>item.niches.size>=min).sort((a,b)=>b.niches.size-a.niches.size);
}
export function initCoverage(){
 const root=document.getElementById('coverage-tool');
 if(!root)return;
 let rows=[],tab='city',page=0,saved=new Set();
 try{saved=new Set(JSON.parse(localStorage.getItem('sitocal-coverage-saved')||'[]'));}catch{}
 const get=id=>root.querySelector('#coverage-'+id),value=id=>get(id).value;
 const choices=(items,label)=>'<option value="">'+label+'</option>'+items.map(item=>'<option>'+esc(item)+'</option>').join('');
 function render(){
  root.querySelectorAll('[data-coverage-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.coverageTab===tab)));
  const results=get('results');results.innerHTML='';
  if(!rows.length){get('summary').textContent='Coverage results appear when a snapshot is published or a CSV is loaded.';pager(0);return;}
  const query=value('query').trim().toLowerCase(),state=value('state'),niche=value('niche'),model=value('model'),minPay=Number(value('min-pay')),maxPay=value('max-pay')?Number(value('max-pay')):Infinity,minPopulation=Number(value('population')),minZip=Number(value('min-zip'))||1;
  const filtered=rows.filter(row=>(!state||row.state===state)&&(!niche||row.niche===niche)&&(!model||row.model===model)&&row.payout>=minPay&&row.payout<=maxPay&&(!minPopulation||row.population>=minPopulation)&&(!query||(get('search-kind').value==='zip'?row.zip.startsWith(query):(row.city+', '+row.state).toLowerCase().includes(query))));
  if(tab==='bundles'){
   const bundles=coverageBundles(filtered,Number(value('overlap')));
   get('summary').textContent=bundles.length+' matching ZIP bundles';
   results.innerHTML=bundles.length?bundles.slice(page*30,(page+1)*30).map(item=>'<article class="activity-item"><strong>'+esc(item.zip+' · '+item.place)+'</strong><p>'+esc([...item.niches].sort().join(', '))+'</p></article>').join(''):'<p>No ZIPs match these filters.</p>';
   pager(bundles.length);return;
  }
  const mode=tab==='state'?'state':tab==='city'&&value('search-kind')==='zip'?'zip':'city';
  let items=(tab==='saved'?[...new Map(['city','state','zip'].flatMap(group=>coverageGroups(rows,group)).filter(item=>saved.has(item.key)).map(item=>[item.key,item])).values()]:coverageGroups(filtered,mode).filter(item=>item.count>=minZip));
  const sort=value('sort');
  items.sort((a,b)=>sort==='zips'?b.count-a.count:sort==='population'?(a.population??Infinity)-(b.population??Infinity):b.payout-a.payout||b.count-a.count);
  get('summary').textContent=items.length+' matching markets · '+new Set(rows.map(row=>row.zip)).size+' ZIPs in imported data';
  const cpc=value('cpc'),clicks=Number(value('clicks')),rate=Number(value('qualification'))/100;
  results.innerHTML=items.length?'<div class="table-scroll"><table><thead><tr><th>Market</th><th>Niche</th><th>ZIPs</th><th>Median payout</th><th>Estimated margin per lead</th><th>Save</th></tr></thead><tbody>'+items.slice(page*30,(page+1)*30).map(item=>'<tr><td>'+esc(item.place)+(item.population===null?'':'<br><small>'+item.population.toLocaleString()+' population</small>')+'</td><td>'+esc(item.niche)+'<br><small>'+(item.model==='cpl'?'Cost per lead':'Pay per call')+'</small></td><td>'+item.count+'</td><td>'+money(item.payout)+'<br><small>'+money(item.range[0])+'–'+money(item.range[1])+'</small></td><td>'+(cpc!==''&&clicks>0&&rate>=0&&rate<=1?money(item.payout*rate-Number(cpc)*clicks):'—')+'</td><td><button class="btn small" type="button" data-coverage-save="'+esc(item.key)+'" aria-pressed="'+saved.has(item.key)+'">'+(saved.has(item.key)?'Saved':'Save')+'</button></td></tr>').join('')+'</tbody></table></div>':'<p>No markets match this view.</p>';
  pager(items.length);
 }
 function pager(count){get('previous').disabled=page===0;get('next').disabled=(page+1)*30>=count;}
 function installDataset(imported,label){
  rows=imported;
  get('state').innerHTML=choices([...new Set(rows.map(row=>row.state))].sort(),'All states');
  get('niche').innerHTML=choices([...new Set(rows.map(row=>row.niche))].sort(),'All niches');
  get('file-status').textContent=label;
  const rankings=coverageGroups(rows,'national').sort((a,b)=>b.payout-a.payout);
  const stats=get('snapshot-stats');
  const range=rankings.reduce(([low,high],item)=>[Math.min(low,item.range[0]),Math.max(high,item.range[1])],[Infinity,0]);
  const metrics=[
   ['Offers tracked',new Set(rows.map(row=>row.niche)).size],
   ['ZIP codes covered',new Set(rows.map(row=>row.zip)).size.toLocaleString()],
   ['Reported payout range',range.map(money).join('–')]
  ];
  stats.innerHTML=metrics.map(([title,value])=>'<article><small>'+title+'</small><strong>'+value+'</strong></article>').join('');
  get('highlights').innerHTML=rankings.slice(0,3).map((item,index)=>'<article><small>0'+(index+1)+' · '+(item.model==='cpl'?'Cost per lead':'Pay per call')+'</small><strong>'+money(item.payout)+'</strong><span>'+esc(item.niche)+'</span><small>'+item.count.toLocaleString()+' ZIPs</small></article>').join('');
  get('rankings').innerHTML='<div class="table-scroll"><table><thead><tr><th>Offer</th><th>Model</th><th>ZIPs</th><th>Median</th><th>Range</th></tr></thead><tbody>'+rankings.map(item=>'<tr><td>'+esc(item.niche)+'</td><td>'+(item.model==='cpl'?'Cost per lead':'Pay per call')+'</td><td>'+item.count+'</td><td>'+money(item.payout)+'</td><td>'+money(item.range[0])+'–'+money(item.range[1])+'</td></tr>').join('')+'</tbody></table></div>';
  page=0;
  render();
 }
 fetch('/api/coverage/snapshot').then(async response=>{
  if(response.status===204)return;
  if(!response.ok)throw Error('Coverage snapshot is temporarily unavailable.');
  const csv=await response.text();
  const published=response.headers.get('Last-Modified');
  if(!rows.length)installDataset(parseCoverageCsv(csv),published?'Published '+new Date(published).toLocaleString():'Published coverage');
 }).catch(()=>{if(!rows.length)get('file-status').textContent='Could not load the published snapshot. You can still import a CSV for this session.';});
 get('file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
   if(file.size>40*1024*1024)throw Error('Choose a CSV under 40 MB.');
   installDataset(parseCoverageCsv(await file.text()),file.name+' · local preview');
  }catch(error){get('file-status').textContent=error.message;}
  finally{event.target.value='';}
 });
 root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.coverageTab){tab=button.dataset.coverageTab;if(tab==='niche'&&!value('niche')&&get('niche').options.length>1)get('niche').selectedIndex=1;page=0;}
  else if(button.dataset.coverageSave){const key=button.dataset.coverageSave;if(saved.has(key))saved.delete(key);else saved.add(key);try{localStorage.setItem('sitocal-coverage-saved',JSON.stringify([...saved]));}catch{}}
  else if(button.id==='coverage-previous')page=Math.max(0,page-1);
  else if(button.id==='coverage-next')page++;
  else if(button.id==='coverage-reset'){get('filters').reset();page=0;}
  else return;
  render();
 });
 get('filters').addEventListener('submit',event=>{event.preventDefault();page=0;render();});
 get('filters').addEventListener('change',()=>{page=0;render();});
 render();
}
