// Run only on the service host or your own local data directory. Output contains personal data.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir=process.env.DATA_DIR||fileURLToPath(new URL('../data/',import.meta.url));
const db=new DatabaseSync(path.join(dir,'sitocal.sqlite'),{readOnly:true});
try{console.log(JSON.stringify(db.prepare('SELECT * FROM enquiries ORDER BY created DESC LIMIT 100').all(),null,2));}finally{db.close();}
