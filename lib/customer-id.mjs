const planCodes = {free:1,starter:2,growth:3,agency:4,enterprise:5};

export function customerId(userId, displayName, plan){
 const firstName=String(displayName||'').trim().split(/\s+/)[0]
   .normalize('NFKD').replace(/[^a-zA-Z0-9]/g,'').slice(0,24).toUpperCase()||'MEMBER';
 const key=userId.replaceAll('-','').toUpperCase();
 return 'SITOCAL-'+firstName+'-'+key+'-'+(Object.hasOwn(planCodes,plan)?planCodes[plan]:1);
}

export function customerKey(value){
 const key=/^SITOCAL-[A-Z0-9]{1,24}-([A-F0-9]{32})-[1-5]$/i.exec(String(value||'').trim())?.[1];
 return key?.toLowerCase().replace(/^(........)(....)(....)(....)(............)$/,'$1-$2-$3-$4-$5')||null;
}
