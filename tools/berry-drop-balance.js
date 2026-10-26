// Offline balance model only. Not imported by the site and cannot grant rewards.
const anchors = [[0,.90],[355,.75],[1446,.60],[4830,.45],[8428,.35]];
const weights = {
  common:[70,25,4,1,0], uncommon:[55,30,10,4,1],
  rare:[40,35,15,8,2], epic:[25,35,22,13,5]
};
const buckets=['everyday','better','rare','evolution','premium'];
function chance(xp) {
  if (!Number.isFinite(xp) || xp < 0) throw Error('Invalid authoritative XP');
  for(let i=1;i<anchors.length;i++) {
    const [end,p1]=anchors[i], [start,p0]=anchors[i-1];
    if(xp<=end)return p0+(p1-p0)*(xp-start)/(end-start);
  }
  return .35;
}
function pool(rows) {
  const result=[],seen=new Set();
  for(const row of rows) {
    const entries=Object.entries(row.grants||{});
    if(!['coins','balls'].includes(row.kind)||entries.length!==1)continue;
    const [key,qty]=entries[0];
    if(['bag_bonus','box_bonus','storage','coins','masterball'].includes(key)||key.startsWith('_'))continue;
    if(!Number.isInteger(qty)||qty<1||!Number.isFinite(row.cost)||row.cost<=0)throw Error('Invalid catalog value');
    if(seen.has(key))throw Error('Duplicate item requires explicit pool review');
    seen.add(key);
    const unitCost=row.cost/qty;
    const bucket=['silverpinap','goldenrazz'].includes(key)?'premium':
      key.endsWith('stone')||key==='linkingcord'?'evolution':
      ['pokeball','bait','lure'].includes(key)||unitCost<=60?'everyday':
      unitCost<=175?'better':'rare';
    result.push({key,name:row.name,unitCost,bucket,quantity:1});
  }
  return result;
}
function expectedValue(items, rarity) {
  const w=weights[rarity];if(!w)throw Error('Unknown rarity');
  return buckets.reduce((sum,b,i)=>{
    const group=items.filter(x=>x.bucket===b);if(w[i]&&!group.length)throw Error('Empty weighted pool');
    return sum+(group.length?group.reduce((s,x)=>s+x.unitCost,0)/group.length:0)*w[i]/100;
  },0);
}
function choose(items,rarity,xp,rolls) {
  if(!weights[rarity])throw Error('Unknown rarity');
  if(rolls.length!==3||rolls.some(x=>!Number.isFinite(x)||x<0||x>=1))throw Error('Invalid random draws');
  if(rolls[0]>=chance(xp))return null;
  let threshold=0,index=0;
  for(;index<buckets.length;index++){threshold+=weights[rarity][index]/100;if(rolls[1]<threshold)break;}
  const group=items.filter(x=>x.bucket===buckets[index]);if(!group.length)throw Error('Empty weighted pool');
  return group[Math.floor(rolls[2]*group.length)];
}
function milestones() {
  let xp=0;const result=[];
  for(let level=1;level<=100;level++){
    if([1,2,3,5,8,10,15,20,30,50,100].includes(level))result.push({level,xp,chance:chance(xp),watchHoursOnly:xp/20});
    xp+=Math.round(100*Math.pow(level,1.35));
  }
  return result;
}
function scenario(catches,successRate,firstSpecies,watchHours=0) {
  let xp=watchHours*20,drops=0;
  for(let n=0;n<catches;n++){
    drops+=chance(xp);
    xp+=10+5/successRate+(n<firstSpecies?25:0);
  }
  return {catches,successRate,firstSpecies,watchHours,expectedDrops:drops,endingXp:xp};
}
module.exports={anchors,weights,buckets,chance,pool,expectedValue,choose,milestones,scenario};
if(require.main===module){
  const items=pool(require('../docs/project-command-center/berry-drop-catalog-snapshot.json').rows);
  const result={model:'proposal, not deployed',milestones:milestones(),eligibleItems:items.length,
    pools:buckets.map(bucket=>({bucket,items:items.filter(x=>x.bucket===bucket)})),
    expectedValues:Object.keys(weights).map(rarity=>({rarity,perDrop:expectedValue(items,rarity),perBeginnerCatch:expectedValue(items,rarity)*.9,perVeteranCatch:expectedValue(items,rarity)*.35})),
    scenarios:[scenario(50,.5,25),scenario(100,.5,50),scenario(250,.5,100),scenario(100,.25,50),scenario(100,.85,50),scenario(100,.5,50,100)]};
  console.log(JSON.stringify(result,null,2));
}
