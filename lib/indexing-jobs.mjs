import { id } from './store.mjs';
import { ProviderError } from './providers.mjs';
import { indexingAction,propertyUrl } from './indexing.mjs';
export async function queueInspection(store,user,input){
 const property=String(input.property||''),urls=[...new Set(String(input.urls||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];
 if(!urls.length||urls.length>100)throw new ProviderError('Submit 1–100 unique URLs, one per line',400);
 const normalized=urls.map(url=>propertyUrl(property,url));
 const accessible=await indexingAction(store,user,'properties',{});if(!accessible.properties.some(p=>p.siteUrl===property&&p.permissionLevel!=='siteUnverifiedUser'))throw new ProviderError('Choose an accessible verified property',403);
 const db=store.db;if(db.prepare("SELECT id FROM indexing_batches WHERE user_id=? AND status IN ('queued','running')").get(user))throw new ProviderError('Wait for your current inspection batch to finish',409);
 const used=db.prepare('SELECT count(*) n FROM indexing_items i JOIN indexing_batches b ON b.id=i.batch_id WHERE b.user_id=? AND b.created>=?').get(user,new Date().toISOString().slice(0,10)).n;
 if(used+urls.length>200)throw new ProviderError('The application limit is 200 queued URL inspections per account per day',429);
 const batch=id(),now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO indexing_batches VALUES(?,?,?,?,?,?)').run(batch,user,property,'queued',now,now);for(const url of normalized)db.prepare('INSERT INTO indexing_items VALUES(?,?,?,?,?)').run(id(),batch,url,'queued','{}');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 return {id:batch,status:'queued',count:normalized.length,note:'Read-only inspections of Google’s indexed version; this does not request indexing.'};
}
export function inspectionBatch(db,user,batch){const row=db.prepare('SELECT * FROM indexing_batches WHERE id=? AND user_id=?').get(batch,user);if(!row)throw new ProviderError('Batch not found',404);return {...row,items:db.prepare('SELECT id,url,status,result FROM indexing_items WHERE batch_id=? ORDER BY rowid').all(batch).map(r=>({...r,result:JSON.parse(r.result)}))};}
export function startInspectionWorker(store){
 const db=store.db;db.prepare("UPDATE indexing_items SET status='queued' WHERE status='running'").run();let active=false,stopped=false;
 async function tick(){if(active||stopped)return;const item=db.prepare("SELECT i.*,b.user_id,b.property FROM indexing_items i JOIN indexing_batches b ON b.id=i.batch_id WHERE i.status='queued' ORDER BY i.rowid LIMIT 1").get();if(!item)return;active=true;
  try{db.prepare("UPDATE indexing_items SET status='running' WHERE id=?").run(item.id);db.prepare("UPDATE indexing_batches SET status='running',updated=? WHERE id=?").run(new Date().toISOString(),item.batch_id);let result,status;try{result=await indexingAction(store,item.user_id,'inspect',{property:item.property,url:item.url});status='completed';}catch(e){status='failed';result={error:e instanceof ProviderError?e.message:'Inspection failed; no indexing verdict was recorded.'};}db.prepare('UPDATE indexing_items SET status=?,result=? WHERE id=?').run(status,JSON.stringify(result),item.id);const pending=db.prepare("SELECT count(*) n FROM indexing_items WHERE batch_id=? AND status IN ('queued','running')").get(item.batch_id).n;if(!pending){const failed=db.prepare("SELECT count(*) n FROM indexing_items WHERE batch_id=? AND status='failed'").get(item.batch_id).n;db.prepare('UPDATE indexing_batches SET status=?,updated=? WHERE id=?').run(failed?'completed_with_errors':'completed',new Date().toISOString(),item.batch_id);}}
  finally{active=false;}
 }
 const timer=setInterval(()=>tick().catch(()=>{active=false;}),1200);timer.unref();return ()=>{stopped=true;clearInterval(timer);};
}
export function batchCsv(batch){const cell=v=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+@\-]/,"'")+'"';return ['URL,Request status,Google verdict,Error',...batch.items.map(i=>[i.url,i.status,i.result.verdict||'',i.result.error||''].map(cell).join(','))].join('\r\n');}
