import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostConfig } from '../lib/config.mjs';
test('dummy domain allows exactly its six configured hosts plus local and Render preview',()=>{const c=hostConfig({BASE_DOMAIN:'PPC.PM',RENDER_EXTERNAL_HOSTNAME:'rankleem-test.onrender.com'});assert.equal(c.baseDomain,'ppc.pm');for(const name of ['ppc.pm','www.ppc.pm','app.ppc.pm','editor.ppc.pm','wp.ppc.pm','serp.ppc.pm','rankleem-test.onrender.com'])assert(c.allowedHosts.has(name));assert(!c.allowedHosts.has('evilppc.pm'));assert(!c.allowedHosts.has('ppc.pm.evil.test'));assert(!c.allowedHosts.has('rankleem.com'));});
test('base domain rejects markup, URL, port, path and wildcard',()=>{for(const s of ['https://ppc.pm','ppc.pm:443','ppc.pm/path','*.ppc.pm','ppc.pm\"><script>','localhost'])assert.throws(()=>hostConfig({BASE_DOMAIN:s}));assert.equal(hostConfig({}).baseDomain,'');});
