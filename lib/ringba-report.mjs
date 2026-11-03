import { ProviderError } from './providers.mjs';

function splitCsv(text){
 const rows=[];let row=[],field='',quoted=false,closed=false;
 for(let index=0;index<text.length;index++){
  const char=text[index];
  if(quoted){
   if(char==='"'){
    if(text[index+1]==='"'){field+='"';index++;}
    else{quoted=false;closed=true;}
   }else field+=char;
   continue;
  }
  if(char==='"'&&!field&&!closed){quoted=true;continue;}
  if(char===','||char==='\n'||char==='\r'){
   row.push(field);field='';closed=false;
   if(char!==','){
    if(char==='\r'&&text[index+1]==='\n')index++;
    if(row.some(value=>value.trim()))rows.push(row);
    row=[];
   }
   continue;
  }
  if(closed||char==='"')throw new ProviderError('Check CSV quotes and delimiters',400);
  field+=char;
 }
 if(quoted)throw new ProviderError('A quoted CSV value was not closed',400);
 row.push(field);
 if(row.some(value=>value.trim()))rows.push(row);
 return rows;
}
function dayFrom(value,format){
 const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s|T|$)/);
 let year,month,day;
 if(iso)[,year,month,day]=iso;
 else{
  const local=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|$)/);
  if(!local)return '';
  year=local[3];[month,day]=format==='dmy'?[local[2],local[1]]:[local[1],local[2]];
 }
 const date=year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0');
 return Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date?date:'';
}
export function summarizeRingba(text,{number,format}){
 if(typeof text!=='string'||Buffer.byteLength(text)>262144||!['mdy','dmy'].includes(format))throw new ProviderError('Choose a CSV file under 256 KB and a date format',400);
 const dialed=String(number||'').replace(/\D/g,'');
 if(dialed.length<7||dialed.length>15)throw new ProviderError('Enter the tracking number with country code',400);
 const rows=splitCsv(text.replace(/^\uFEFF/,''));
 const columns=(rows.shift()||[]).map(value=>value.trim().toLowerCase());
 const keys=['inbound call id','call date','dialed #','paid out','payout'];
 const fields=keys.map(key=>columns.indexOf(key));
 if(fields.some(index=>index<0))throw new ProviderError('Export Inbound Call ID, Call Date, Dialed #, Paid Out and Payout columns',400);
 if(rows.length>2500)throw new ProviderError('Import up to 2,500 call rows at a time',400);
 const days=new Map(),seen=new Set();
 for(const row of rows){
  const [id,rawDate,phone,paidOut,amount]=fields.map(index=>String(row[index]??'').trim());
  if(phone.replace(/\D/g,'')!==dialed)continue;
  if(seen.has(id))throw new ProviderError('The report contains duplicate call IDs for this number',400);
  const day=dayFrom(rawDate,format);
  const paid=/^(yes|true|1)$/i.test(paidOut),unpaid=/^(no|false|0)?$/i.test(paidOut);
  const value=amount.replace(/^\$/,'').replaceAll(',','');
  if(!id||!day||!paid&&!unpaid||(!value&&paid)||value&&!/^\d+(\.\d{1,2})?$/.test(value))throw new ProviderError('Check the dates, payout flags and amounts for this tracking number',400);
  const cents=Math.round(Number(value||0)*100);
  if(!Number.isSafeInteger(cents)||cents>100000000)throw new ProviderError('A payout amount is too large',400);
  seen.add(id);
  const total=days.get(day)||{day,calls:0,paid:0,cents:0};
  total.calls++;if(paid)total.paid++;total.cents+=cents;days.set(day,total);
 }
 if(!seen.size)throw new ProviderError('No rows matched this tracking number',400);
 return [...days.values()].sort((a,b)=>a.day.localeCompare(b.day));
}
