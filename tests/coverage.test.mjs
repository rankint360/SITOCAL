import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseCoverageCsv,coverageGroups,coverageBundles} from '../public/coverage.js';
const csv='zip,city,state,niche,model,payout,population\n01234,"Fixture City",MA,Plumbing,cpl,40,5000\n01235,Fixture City,MA,Plumbing,cpl,60,5000\n01234,Fixture City,MA,Plumbing,call,20,5000\n01234,Fixture City,MA,HVAC,call,30,5000';
test('coverage retains ZIP prefixes, separates payout models and finds actual ZIP overlap',()=>{
 const rows=parseCoverageCsv(csv);
 assert.equal(rows[0].zip,'01234');
 const city=coverageGroups(rows,'city');
 const plumbing=city.find(row=>row.niche==='Plumbing'&&row.model==='cpl');
 assert.deepEqual([plumbing.count,plumbing.payout,plumbing.range],[2,50,[40,60]]);
 assert.equal(city.find(row=>row.niche==='Plumbing'&&row.model==='call').payout,20);
 assert.equal(coverageGroups(rows,'state')[0].place,'MA');
 assert.deepEqual(coverageBundles(rows,2).map(row=>row.zip),['01234']);
 assert.throws(()=>parseCoverageCsv(csv+'\n01234,Fixture City,MA,Plumbing,cpl,40,5000'),/Duplicate/);
});
