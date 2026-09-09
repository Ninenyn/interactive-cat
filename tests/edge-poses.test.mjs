import test from 'node:test';
import assert from 'node:assert/strict';
import {createJew} from '../art/source/jew.mjs';
import {createBo} from '../art/source/bo.mjs';
const poses=['stand','sit','walk'];
for(const [pet,create] of [['Jew',createJew],['Bo',createBo]]){
 test(pet+' study poses preserve vertex correspondence and facial identity',()=>{
  const assets=poses.map(pose=>create({pose})),base=assets[0];
  // All vertices retain the same part/index identity across the three poses.
  for(const asset of assets.slice(1)){
   assert.deepEqual(asset.parts.map(p=>p.name),base.parts.map(p=>p.name));
   for(let i=0;i<base.parts.length;i++){
    assert.equal(asset.parts[i].positions.length,base.parts[i].positions.length);
    assert.deepEqual(asset.parts[i].indices,base.parts[i].indices);
    assert.deepEqual(asset.parts[i].materialGroups,base.parts[i].materialGroups);
   }
  }
  assert.notDeepEqual(assets[0].parts[0].positions,assets[1].parts[0].positions,'sit changes the body');
  assert.notDeepEqual(assets[0].parts[0].positions,assets[2].parts[0].positions,'walk changes the limbs');
  // Measure the actual face vertex constellation, independent of body pose.
  // Jew skull is welded into the main skin, so include its anterior head
  // vertices as well as every separately named facial shell and ear.
  const ids=[];
  base.parts.forEach((p,part)=>{
   if(pet==='Bo'&&(/connected_ribcage|tail/.test(p.name)))return;
   for(let i=0;i<p.positions.length;i+=3){
    if(pet==='Jew'&&part===0&&!(p.positions[i+2]>=.83&&p.positions[i+1]>1.6))continue;
    ids.push([part,i]);
   }
  });
  assert.ok(ids.length>50,'substantial actual head geometry sampled');
  const points=a=>ids.map(([part,i])=>a.parts[part].positions.slice(i,i+3));
  const rest=points(base),origin=rest[0];
  for(const asset of assets.slice(1)){
   const current=points(asset),anchor=current[0];
   current.forEach((p,i)=>p.forEach((v,d)=>assert.ok(Math.abs((v-anchor[d])-(rest[i][d]-origin[d]))<3e-6,pet+' face shape must not change with body pose')));
  }
 });
 test(pet+' non-default poses retain closed surfaces and nondegenerate outward triangles',()=>{
  for(const pose of poses){
   const asset=create({pose});let minY=Infinity;
   for(const part of asset.parts){
    const p=part.positions,edges=new Map();let volume=0;
    assert.ok(p.every(Number.isFinite));
    for(let i=1;i<p.length;i+=3)minY=Math.min(minY,p[i]);
    for(let i=0;i<part.indices.length;i+=3){
     const ids=part.indices.slice(i,i+3);assert.equal(new Set(ids).size,3);
     for(const id of ids)assert.ok(Number.isInteger(id)&&id>=0&&id<p.length/3);
     const [a,b,c]=ids.map(id=>p.slice(id*3,id*3+3)),u=b.map((v,d)=>v-a[d]),v=c.map((n,d)=>n-a[d]);
     const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
     assert.ok(cross.reduce((sum,n)=>sum+n*n,0)>1e-14,`${pet} ${pose}: collapsed triangle in ${part.name}`);
     volume+=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);
     for(const [x,y] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){const key=Math.min(x,y)+':'+Math.max(x,y);const edge=edges.get(key)||[0,0];edge[0]++;edge[1]+=x<y?1:-1;edges.set(key,edge);}
    }
    assert.ok(volume>0,`${pet} ${pose} ${part.name}: outward winding`);
    for(const edge of edges.values())assert.deepEqual(edge,[2,0],`${pet} ${pose} ${part.name}: closed consistently wound edge`);
   }
   assert.ok(minY>=-.025&&minY<=.06,`${pet} ${pose}: floor support without below-floor body`);
  }
 });
}
