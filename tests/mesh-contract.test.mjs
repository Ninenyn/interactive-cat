import test from 'node:test';
import assert from 'node:assert/strict';
import {createJew} from '../art/source/jew.mjs';
import {createBo} from '../art/source/bo.mjs';

for(const [name,create] of [['Jew',createJew],['Bo',createBo]])test(name+' is a portable closed polygon mesh with usable triangles',()=>{
 const asset=create();assert.equal(asset.name,name);assert.ok(asset.parts.length>0);
 assert.equal(JSON.stringify(asset),JSON.stringify(create()),'authoring output must be deterministic');
 const restored=JSON.parse(JSON.stringify(asset));assert.ok(restored.parts.every((p,i)=>p.positions.every((v,n)=>v===asset.parts[i].positions[n])),'coordinates must survive JSON save/reload');
 let minY=Infinity,maxY=-Infinity;
 const names=new Set();
 for(const part of asset.parts){
  assert.ok(!names.has(part.name),'part names must be unique');names.add(part.name);
  const p=part.positions,idx=part.indices;assert.equal(p.length%3,0);assert.equal(idx.length%3,0);assert.ok(idx.length>=12);
  const edges=new Map();
  for(let n=0;n<p.length;n+=3){assert.ok(p.slice(n,n+3).every(Number.isFinite));minY=Math.min(minY,p[n+1]);maxY=Math.max(maxY,p[n+1]);}
  for(let i=0;i<idx.length;i+=3){
   const ids=idx.slice(i,i+3);for(const v of ids)assert.ok(Number.isInteger(v)&&v>=0&&v<p.length/3);
   assert.equal(new Set(ids).size,3);
   const [a,b,c]=ids.map(v=>p.slice(v*3,v*3+3)),u=b.map((v,j)=>v-a[j]),v=c.map((n,j)=>n-a[j]);
   const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
   assert.ok(cross.reduce((n,v)=>n+v*v,0)>1e-14,'no zero-area triangles: '+part.name);
   for(const [a,b]of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){const key=Math.min(a,b)+':'+Math.max(a,b);const e=edges.get(key)||{count:0,winding:0};e.count++;e.winding+=a<b?1:-1;edges.set(key,e);}
  }
  for(const e of edges.values()){assert.equal(e.count,2,'closed edge: '+part.name);assert.equal(e.winding,0,'consistent face winding: '+part.name);}
 }
 assert.ok(Math.abs(minY)<.06);assert.ok(maxY>2.7&&maxY<3.5);
});
