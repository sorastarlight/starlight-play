/* Pure schedule selection for local review. Production grants require server snapshots. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PLAY_SUPPLY_ROTATION=api;})(globalThis,()=>{
  const DAY=86400000,ANCHOR=Date.UTC(2026,10,2);
  function period(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw Error('Choose a valid date.');const start=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()),weekday=(new Date(start).getUTCDay()+6)%7;return {start,week:start-weekday*DAY,weekday};}
  function validate(plan){
    if(plan?.version!==1||plan.dailyCoins!==50||!Array.isArray(plan.weeks)||plan.weeks.length!==4)throw Error('Supply schedule unavailable.');
    for(const week of plan.weeks){if(!Array.isArray(week.daily)||week.daily.length!==7||new Set(week.daily).size!==7)throw Error('Each week needs seven different daily items.');
      for(const key of [...week.daily,...Object.keys(week.weekly||{})])if(typeof key!=='string'||!/^[a-z][a-z0-9_]*$/.test(key)||['masterball','bag_bonus'].includes(key))throw Error('This item cannot be scheduled.');
      if(Object.values(week.weekly||{}).some(q=>!Number.isSafeInteger(q)||q<1||q>100))throw Error('Choose valid supply quantities.');
    }
    return plan;
  }
  function at(plan,value){validate(plan);const p=period(value),index=((Math.floor((p.week-ANCHOR)/(7*DAY))%4)+4)%4,week=plan.weeks[index];return {week:index,periodStart:new Date(p.start).toISOString(),daily:{[week.daily[p.weekday]]:1,coins:50},weekly:{...week.weekly,coins:plan.weeklyCoins}};}
  return {period,validate,at};
});
