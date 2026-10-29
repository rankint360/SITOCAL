import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,renameSync,existsSync,readFileSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openStore } from '../lib/store.mjs';
import { prepareDatabase,sessionCandidates,findManifest } from '../lib/migration.mjs';

test('database rename preserves rows, encrypted secrets, and a recoverable snapshot',()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-migration-'));
 let store=openStore(dir);
 store.db.prepare('INSERT INTO users VALUES(?,?,?,?)').run('u','fixture@example.com','hash','now');
 const secret=store.seal({token:'fixture-secret'});
 store.db.prepare('INSERT INTO connections VALUES(?,?,?)').run('u','fixture',secret);
 store.db.prepare('INSERT INTO sites VALUES(?,?,?,?,?)').run('s','u','{"pages":[]}','now','now');
 store.db.prepare('INSERT INTO revisions VALUES(?,?,?,?,?)').run('r','s','u','{}','now');
 store.db.close();renameSync(join(dir,'sitocal.sqlite'),join(dir,'previous.sqlite'));
 store=openStore(dir);
 assert.equal(store.db.prepare('SELECT count(*) AS n FROM users').get().n,1);
 assert.equal(store.db.prepare('SELECT count(*) AS n FROM sites').get().n,1);
 assert.equal(store.db.prepare('SELECT count(*) AS n FROM revisions').get().n,1);
 assert.equal(store.unseal(store.db.prepare('SELECT secret FROM connections').get().secret).token,'fixture-secret');
 store.db.close();
 const marker=JSON.parse(readFileSync(join(dir,'brand-migration.json')));
 assert(existsSync(join(dir,'migration-backups',marker.backup)));
 assert(!existsSync(join(dir,'previous.sqlite')));
 assert.equal(prepareDatabase(dir),join(dir,'sitocal.sqlite'));
 renameSync(join(dir,'sitocal.sqlite'),join(dir,'missing.sqlite'));
 assert.throws(()=>prepareDatabase(dir),/Migrated database missing/);
});
test('ambiguous databases and unsafe interrupted state fail closed',()=>{
 const dir=mkdtempSync(join(tmpdir(),'sitocal-migration-'));
 writeFileSync(join(dir,'one.sqlite'),'');writeFileSync(join(dir,'two.sqlite'),'');
 assert.throws(()=>prepareDatabase(dir),/Multiple prior databases/);
 writeFileSync(join(dir,'brand-migration.json'),JSON.stringify({state:'started',source:'../outside.sqlite',staging:'stage.sqlite',backup:'backup.sqlite'}));
 assert.throws(()=>prepareDatabase(dir),/Invalid migration state/);
});
test('prior session cookie names and validated manifest filenames remain compatible',()=>{
 const token='a'.repeat(64);
 assert.equal(sessionCandidates('previous_session='+token)[0][1],token);
 assert.equal(sessionCandidates('other=bad;previous_session=bad').length,0);
 const validate=value=>{assert.equal(value.version,1);return value;};
 assert.equal(findManifest({'previous-export.json':Buffer.from('{"version":1,"pages":[]}')},validate).version,1);
 assert.equal(findManifest({'irrelevant.json':Buffer.from('{}')},validate),null);
 assert.throws(()=>findManifest({'sitocal.json':Buffer.from('invalid')},validate));
});
