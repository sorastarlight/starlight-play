const assert=require('node:assert/strict'),api=require(process.argv[2]||'../js/admin-trainer-styles');
const id='11111111-1111-4111-8111-111111111111',row={id:'fixture',name:'Fixture',gender:'',outfit:'',games:'',visible:false,revision:'a'.repeat(32)},changes={portraitFile:'pending.png',portraitCrop:{},assetKind:'pixel'};
const data={styles:[row],assets:[]},payload={filename:'fixture-published.png',kind:'portrait'};
const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
(async()=>{let passed=0;const failures=[];
 for(const stage of ['prepare','upload','handoff','save','before-display']){
  const calls=[];let release,app,armed=false;
  app=api.model(async(kind,args)=>{calls.push(kind);if(kind==='read')return data;if(kind==='upload'){if(stage==='upload')await new Promise(resolve=>release=resolve);return{filename:args.filename,registered:true};}if(stage==='save')await new Promise(resolve=>release=resolve);return{ok:true,requestId:id,style:{...row,...args.p_request.changes,revision:'b'.repeat(32)}};},state=>{
   if(armed&&stage==='handoff'&&state.phase==='saving'){armed=false;app.reset();}
   if(armed&&stage==='before-display'&&state.phase==='uploading')throw Error('Fictional unavailable display');
  });
  await app.load();app.select(row.id);armed=true;
  const result=app.save('portrait',row,changes,'Local test',id,async()=>{if(stage==='prepare')await new Promise(resolve=>release=resolve);return payload;}).catch(e=>e);
  await flush();if(release){app.reset();release();}const error=await result;
  try{
   assert(!(error instanceof Error),stage+': presentation errors must settle state');
   assert.equal(calls.filter(k=>k==='save').length,stage==='save'?1:0,stage+': no save after reset or failed initial display');
   assert.equal(calls.filter(k=>k==='upload').length,['prepare','before-display'].includes(stage)?0:1);
   assert.equal(app.state.phase,stage==='before-display'?'error':'closed');
   passed++;
  }catch(e){failures.push(e.message);}
 }
 // A failed preparation has a known unsent outcome, unlike a lost upload receipt.
 for(const mode of ['prepare-error','upload-error','unregistered','save-error']){
  const calls=[];const app=api.model(async(kind,args)=>{calls.push(kind);if(kind==='read')return data;if(kind==='upload'){if(mode==='upload-error')throw Error('Lost upload');return{filename:args.filename,registered:mode!=='unregistered'};}throw Error('Lost style receipt');});
  await app.load();app.select(row.id);await app.save('portrait',row,changes,'Local test',id,async()=>{if(mode==='prepare-error')throw Error('Could not encode PNG');return payload;});
  try{assert.equal(app.state.phase,mode==='prepare-error'?'error':'uncertain');if(mode==='prepare-error'){assert.deepEqual(calls,['read']);assert.match(app.state.message,/nothing was|no .*sent/i);}else{assert(app.state.message.includes(payload.filename));assert.equal(calls.filter(k=>k==='save').length,mode==='save-error'?1:0);}passed++;}catch(e){failures.push(e.message);}
 }
 for(const mode of ['details-reset','confirmed-display']){
  let app,armed=false,saves=0;app=api.model(async(kind,args)=>{if(kind==='read')return data;saves++;return{ok:true,requestId:id,style:{...row,...args.p_request.changes,revision:'b'.repeat(32)}};},state=>{if(!armed)return;if(mode==='details-reset'&&state.phase==='saving'){armed=false;app.reset();}if(mode==='confirmed-display'&&state.phase==='saved')throw Error('Fictional terminal display failure');});
  await app.load();app.select(row.id);armed=true;await app.save('details',row,{name:'New fictional name'},'Local test',id);
  try{assert.equal(saves,mode==='details-reset'?0:1,mode+' dispatched saves');assert.equal(app.state.phase,mode==='details-reset'?'closed':'saved');if(mode==='confirmed-display'){assert.match(app.state.message,/saved, but the display/);await app.save('details',row,{name:'New fictional name'},'Local test',id);assert.equal(saves,1);}passed++;}catch(e){failures.push(e.message);}
 }
 if(failures.length){console.error(failures.join('\n'));throw Error(`${failures.length} failed of ${passed+failures.length} portrait stage boundaries`);}
 console.log(`PASS ${passed} portrait preparation/upload/save display and reset boundaries; fictional transports only`);
})().catch(e=>{console.error(e);process.exitCode=1;});
