import { maskEmail } from '../owner-account-diagnostics/handler.mjs';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export const RESET_DESTINATION='https://play.sorastarlight.net/reset-password.html';
export function createRecoveryHandler({caller,adminUser,revision,send,finish}){
 return async req=>{
  const origin=req.headers.get('origin'),allowed=origin==='https://play.sorastarlight.net';
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed?{
   'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type',
   'Access-Control-Allow-Methods':'POST, OPTIONS'}:{})};
  const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&!allowed)return reply({error:'Origin unavailable.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'Use POST.'},405);
  try{
   const token=req.headers.get('authorization')||'';
   if(!/^Bearer \S+$/i.test(token))return reply({error:'Sign in first.'},401);
   const body=await req.json(),target=body?.targetUuid;
   if(!UUID.test(target||'')||!['prepare','send'].includes(body.action))return reply({error:'Invalid recovery request.'},400);
   const client=caller(token),auth=await client.auth.getUser();
   if(auth.error||!auth.data?.user)return reply({error:'Sign in first.'},401);
   const gate=await client.rpc('owner_recovery_email_gate',{p_target:target});
   if(gate.error)return reply({error:'Owner access and a sign-in within five minutes are required. Protected accounts are unavailable.'},403);
   if(!gate.data?.enabled)return reply({state:'disabled',message:'Recovery email is awaiting email-template and delivery configuration verification.'});
   const result=await adminUser(target),user=result.data?.user;
   if(result.error||user?.id!==target)return reply({error:'Recovery unavailable.'},503);
   if(!user.email||!user.email_confirmed_at||user.deleted_at||
    (user.banned_until&&Date.parse(user.banned_until)>Date.now()))return reply({error:'A verified existing email and eligible account are required.'},409);
   const snapshot=await revision(user);
   if(body.action==='prepare'){
    const prepared=await client.rpc('owner_recovery_email_prepare',{p_target:target,p_revision:snapshot,p_masked:maskEmail(user.email)});
    if(prepared.error)return reply({error:'Could not prepare recovery confirmation.'},409);
    return reply(prepared.data);
   }
   if(!UUID.test(body.requestUuid||'')||!UUID.test(body.challengeId||'')||body.snapshotRevision!==snapshot||
    typeof body.reason!=='string'||body.reason.trim().length<3||body.reason.trim().length>1000||
    (body.caseRef!==undefined&&(typeof body.caseRef!=='string'||body.caseRef.trim().length>100)))
    return reply({error:'Confirmation changed or expired. Review this account again.'},409);
   const reserved=await client.rpc('owner_recovery_email_reserve',{p_request:body.requestUuid,p_challenge:body.challengeId,
    p_target:target,p_revision:snapshot,p_reason:body.reason,p_case_ref:body.caseRef||''});
   if(reserved.error)return reply({error:'Confirmation changed or expired. Review this account again.'},409);
   const receipt=reserved.data;
   if(!receipt?.dispatch)return reply({state:receipt?.state||'uncertain',receiptId:receipt?.receiptId,retryAfter:receipt?.retryAfter});
   // The reservation is durable before external dispatch. A crash never permits automatic resending.
   let state='uncertain';
   try{
    const latest=await adminUser(target);
    if(latest.error||latest.data?.user?.id!==target||await revision(latest.data.user)!==snapshot){
     await finish(receipt.receiptId,'failed');
     return reply({state:'failed',receiptId:receipt.receiptId,message:'Account changed before dispatch. Review it again.'});
    }
    const sent=await send(user.email,RESET_DESTINATION);
    state=!sent.error?'accepted':sent.error.status>=400&&sent.error.status<500?'failed':'uncertain';
   }catch{}
   try{const saved=await finish(receipt.receiptId,state);if(saved?.error)state='uncertain';}catch{state='uncertain';}
   return reply({state,receiptId:receipt.receiptId,maskedDestination:maskEmail(user.email)});
  }catch{return reply({error:'Recovery unavailable. No automatic retry will be made.'},503);}
 };
}
