// Operator-only. Run after independently verifying receipt of a manual payment.
import { openStore,id } from '../lib/store.mjs';
import { fileURLToPath } from 'node:url';
const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1];
if(!args.includes('--verified')||!['--email','--plan','--expires','--reference'].every(k=>args.includes(k)))throw Error('Required: --verified --email CUSTOMER --plan starter|growth|agency --expires ISO_DATE --reference VERIFIED_RECEIPT_REFERENCE');
const email=value('--email'),plan=value('--plan'),expires=Date.parse(value('--expires')),reference=value('--reference');
if(!['starter','growth','agency'].includes(plan)||!Number.isFinite(expires)||expires<=Date.now()||expires>Date.now()+366*86400000||!reference||reference.length>200)throw Error('Invalid plan, receipt reference or future expiry (maximum one year)');
const store=openStore(process.env.DATA_DIR||fileURLToPath(new URL('../data/',import.meta.url)));
try{const user=store.db.prepare('SELECT id FROM users WHERE email=?').get(email);if(!user)throw Error('Customer account not found');store.db.prepare('INSERT INTO manual_payment_grants VALUES(?,?,?,?,?,?)').run(id(),user.id,plan,expires,reference,new Date().toISOString());console.log('Time-limited manual plan grant recorded. No payment was collected by this command.');}finally{store.db.close();}
