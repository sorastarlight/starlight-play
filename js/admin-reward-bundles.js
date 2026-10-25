/* Typed bundle draft controller. Transport must enforce staff access and revision checks. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./admin-reward-catalog.js'));else root.PLAY_REWARD_BUNDLES=factory(root.PLAY_REWARD_CATALOG);})(globalThis,function(catalog){
'use strict';
const copy=v=>structuredClone(v);
function create(transport,onChange=()=>{}){
 let epoch=0;const state={phase:'closed',catalog:[],daily:[],weekly:[],revision:null,review:null,message:''};
 const emit=()=>onChange(copy(state));
 function reset(){epoch++;Object.assign(state,{phase:'closed',catalog:[],daily:[],weekly:[],revision:null,review:null,message:''});emit();}
 function editable(){if(state.phase!=='ready'||state.review)throw Error('Return to editing before changing rewards.');}
 async function load(){reset();const token=epoch;state.phase='loading';emit();try{const result=await transport('read');if(token!==epoch)return;
 if(!result||typeof result.revision!=='string'||!result.revision)throw Error('Reward settings could not be verified.');
 const rows=catalog.catalog(result.catalog,'pass');
 const daily=catalog.bundle(result.daily,rows).rewards,weekly=catalog.bundle(result.weekly,rows).rewards;
 Object.assign(state,{phase:'ready',catalog:rows,daily,weekly,revision:result.revision});emit();
 }catch(error){if(token!==epoch)return;state.phase='error';state.message=error.message;emit();}}
 function period(name){if(!['daily','weekly'].includes(name))throw Error('Choose daily or weekly rewards.');return state[name];}
 function add(name,entry){editable();const next=[...period(name),catalog.reward(entry,state.catalog)];state[name]=catalog.bundle(next,state.catalog).rewards;emit();}
 function remove(name,index){editable();const rows=period(name);if(!Number.isInteger(index)||index<0||index>=rows.length)throw Error('Choose an existing reward.');state[name]=rows.filter((_,i)=>i!==index);emit();}
 function replace(name,index,entry){editable();const rows=period(name);if(!Number.isInteger(index)||index<0||index>=rows.length)throw Error('Choose an existing reward.');const next=copy(rows);next[index]=catalog.reward(entry,state.catalog);state[name]=catalog.bundle(next,state.catalog).rewards;emit();}
 function review(requestId){editable();if(typeof requestId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId))throw Error('Reload before saving.');state.review={requestId,expectedRevision:state.revision,daily:catalog.bundle(state.daily,state.catalog),weekly:catalog.bundle(state.weekly,state.catalog)};emit();return copy(state.review);}
 function cancel(){if(state.phase!=='ready')throw Error('Wait for the current operation.');state.review=null;emit();}
 async function save(){if(state.phase!=='ready'||!state.review)throw Error('Review the changes first.');const token=epoch,payload=copy(state.review);state.phase='saving';emit();try{const result=await transport('save',payload);if(token!==epoch)return;if(result?.requestId!==payload.requestId||result?.status!=='saved'||typeof result.revision!=='string'||!result.revision)throw Error('Save was not confirmed.');state.phase='saved';state.revision=result.revision;state.review=null;state.message='Pass rewards saved.';emit();}catch(error){if(token!==epoch)return;state.phase='uncertain';state.message='The save could not be confirmed. Check the saved rewards before trying again.';emit();}}
 return {getState:()=>copy(state),load,reset,add,remove,replace,review,cancel,save};
}
return {create};
});
