import test from 'node:test';
import assert from 'node:assert/strict';
import {createJew} from '../art/source/jew.mjs';
import {createBo} from '../art/source/bo.mjs';

const point=(mesh,i)=>mesh.positions.slice(3*i,3*i+3);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function components(mesh,keep=()=>true){
 const graph=new Map();
 for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3);for(const id of ids)if(keep(point(mesh,id))&&!graph.has(id))graph.set(id,new Set());for(const [a,b] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]])if(graph.has(a)&&graph.has(b)){graph.get(a).add(b);graph.get(b).add(a);}}
 const unseen=new Set(graph.keys()),out=[];while(unseen.size){const first=unseen.values().next().value,stack=[first],group=[];unseen.delete(first);while(stack.length){const id=stack.pop();group.push(id);for(const next of graph.get(id))if(unseen.delete(next))stack.push(next);}out.push(group);}return out;
}
// Independent Moller-Trumbore rays through realized indexed triangles, +Z.
function depthHits(mesh,x,y){
 const origin=[x,y,-100],direction=[0,0,1],hits=[];
 for(let i=0;i<mesh.indices.length;i+=3){const [a,b,c]=mesh.indices.slice(i,i+3).map(id=>point(mesh,id));const e1=sub(b,a),e2=sub(c,a),h=cross(direction,e2),d=dot(e1,h);if(Math.abs(d)<1e-13)continue;const s=sub(origin,a),u=dot(s,h)/d;if(u< -1e-8||u>1+1e-8)continue;const q=cross(s,e1),v=dot(direction,q)/d;if(v< -1e-8||u+v>1+1e-8)continue;const t=dot(e2,q)/d;if(t>=0)hits.push(origin[2]+t);}
 return hits.sort((a,b)=>a-b).filter((z,i,a)=>!i||z-a[i-1]>1e-7);
}
function height(asset){const ys=asset.parts.flatMap(p=>p.positions.filter((_,i)=>i%3===1));return Math.max(...ys)-Math.min(...ys);}
const jew=createJew(),bo=createBo();
const jewSkin=jew.parts.find(p=>/welded standing skin/.test(p.name));
const boBody=bo.parts.find(p=>/connected_ribcage/.test(p.name));

test('Jew nose is part of the same shared-index skin with a shared muzzle boundary',()=>{
 assert.ok(jewSkin);assert.equal(components(jewSkin).length,1);
 const noseGroups=jewSkin.materialGroups.filter(g=>g.material==='nose');assert.ok(noseGroups.length);
 const noseTriangleStarts=new Set(noseGroups.flatMap(g=>Array.from({length:g.count/3},(_,i)=>g.start+i*3)));
 const edgeMaterials=new Map();for(let i=0;i<jewSkin.indices.length;i+=3){const ids=jewSkin.indices.slice(i,i+3),m=noseTriangleStarts.has(i)?'nose':'skin';for(const [a,b] of [[ids[0],ids[1]],[ids[1],ids[2]],[ids[2],ids[0]]]){const key=[a,b].sort((a,b)=>a-b).join(':');if(!edgeMaterials.has(key))edgeMaterials.set(key,new Set());edgeMaterials.get(key).add(m);}}
 assert.ok([...edgeMaterials.values()].filter(s=>s.size===2).length>=3,'nose must share a closed boundary of indexed edges with muzzle skin');
});

test('Jew mouth and philtrum actual mesh thickness straddles the realized face',()=>{
 const patches=jew.parts.filter(p=>/attached.*(philtrum|mouth)/.test(p.name));assert.equal(patches.length,3);
 const H=height(jew);
 for(const patch of patches){const columns=new Map();for(let i=0;i<patch.positions.length;i+=3){const [x,y,z]=patch.positions.slice(i,i+3),key=x+':'+y;if(!columns.has(key))columns.set(key,{x,y,zs:[]});columns.get(key).zs.push(z);}
  for(const {x,y,zs} of columns.values()){const surface=depthHits(jewSkin,x,y).at(-1);assert.ok(Number.isFinite(surface),'patch must have actual supporting face: '+patch.name);const back=Math.min(...zs),front=Math.max(...zs);assert.ok(back<surface-1e-4,'back surface must be buried in muzzle: '+patch.name);assert.ok(front>surface,'front surface must remain visible: '+patch.name);assert.ok(front-surface<.005*H,'facial marking must hug the face: '+patch.name);}
 }
});

test('Jew exposed eye triangle interiors and edges stay above the actual skull',()=>{
 const eyes=jew.parts.filter(p=>p.material==='eye');assert.equal(eyes.length,2);
 const H=height(jew),weights=[[1/3,1/3,1/3],[.5,.5,0],[.5,0,.5],[0,.5,.5],[.5,.25,.25],[.25,.5,.25],[.25,.25,.5]];
 for(const eye of eyes){let exposedTriangles=0;
  for(let i=0;i<eye.indices.length;i+=3){const vertices=eye.indices.slice(i,i+3).map(id=>point(eye,id));const normal=cross(sub(vertices[1],vertices[0]),sub(vertices[2],vertices[0]));
   // These closed projected shells use outward winding. Positive projected
   // area faces the viewer on +Z; embedded backs face -Z and walls have zero
   // XY area. This identifies visible faces from geometry, not author tags.
   if(normal[2]<=1e-12)continue;exposedTriangles++;
   for(const bary of weights){const sample=[0,1,2].map(axis=>vertices.reduce((sum,v,j)=>sum+bary[j]*v[axis],0));const host=depthHits(jewSkin,sample[0],sample[1]).at(-1);
    assert.ok(Number.isFinite(host),'visible eye sample requires underlying skull');
    assert.ok(sample[2]>=host-1e-5,`skull pierces exposed eye triangle ${i/3} in ${eye.name}: depth deficit ${host-sample[2]}`);
    assert.ok(sample[2]-host<.01*H,'eye surface must remain attached rather than float');
   }
  }
  assert.ok(exposedTriangles>0,'eye must contain visible front triangles');
 }
});

for(const [name,asset,body] of [['Jew',jew,jewSkin],['Bo',bo,boBody]])test(name+' continuous body has four individually planted paw contact patches',()=>{
 assert.equal(components(body).length,1,'limbs described as continuous must share one component');
 const H=height(asset),ys=body.positions.filter((_,i)=>i%3===1),ground=Math.min(...ys);assert.ok(ground<.01*H);
 const patches=components(body,p=>p[1]<=ground+1e-6);assert.equal(patches.length,4,'four distinct ground contacts on the body, excluding separate tail');
 const centers=patches.map(ids=>ids.reduce((sum,id)=>{const p=point(body,id);return sum.map((v,i)=>v+p[i]/ids.length);},[0,0,0]));
 assert.equal(centers.filter(p=>p[0]<0).length,2);assert.equal(centers.filter(p=>p[0]>0).length,2);
 for(const c of centers)assert.ok(Math.abs(c[1]-ground)<1e-6);
});

test('Bo lower forelegs have a central foreground clearance at three heights',()=>{
 const H=height(bo);
 for(const fraction of [.15,.23,.32]){const y=H*fraction,left=depthHits(boBody,-.1*H,y).at(-1),right=depthHits(boBody,.1*H,y).at(-1),center=depthHits(boBody,0,y).at(-1);assert.ok([left,right].every(Number.isFinite),'both foreground legs must intersect the test rays');
  const front=Math.min(left,right),gap=Number.isFinite(center)?front-center:Infinity;assert.ok(gap>.015*H,'lower forelegs must project clear of central torso, at height '+fraction);
  // No center hit is valid open air beneath the raised abdomen.
  const sliceZ=Number.isFinite(center)?center+gap*.5:front-.015*H;
  for(const x of [-.015,0,.015]){const hits=depthHits(boBody,x*H,y);assert.ok(!hits.length||hits.at(-1)<sliceZ,'foreground leg gap must contain air at x='+x);}
 }
});
