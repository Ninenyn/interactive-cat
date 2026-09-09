// Bo M1: original, intentionally authored polygon rings and surface patches.
// Coordinate convention: Y up, Z forward. The reference informs proportions;
// this is an editable clay blockout, not a finalized/approved production model.
const TAU = Math.PI * 2;

function part(name, material = 'clay') {
  return { name, material, positions: [], indices: [] };
}
function vertex(mesh, p) {
  const id = mesh.positions.length / 3;
  mesh.positions.push(...p);
  return id;
}
function tri(mesh, a, b, c) { mesh.indices.push(a, b, c); }
function quad(mesh, a, b, c, d, parity = 0) {
  if (parity % 2) { tri(mesh, a, b, d); tri(mesh, b, c, d); }
  else { tri(mesh, a, b, c); tri(mesh, a, c, d); }
}
function bridge(mesh, first, second, reverse = false) {
  for (let i = 0; i < first.length; i++) {
    const j = (i + 1) % first.length;
    if (reverse) quad(mesh, first[i], second[i], second[j], first[j], i);
    else quad(mesh, first[i], first[j], second[j], second[i], i);
  }
}
function cap(mesh, ring, center, reverse = false) {
  const c = vertex(mesh, center);
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    if (reverse) tri(mesh, c, ring[j], ring[i]);
    else tri(mesh, c, ring[i], ring[j]);
  }
}

// Deterministic quadric edge collapse keeps anatomical contours while removing
// the interpolation slivers and uniform micro-tessellation of the sampled skin.
// Link-condition and face-orientation checks preserve the closed manifold.
function simplifySkin(mesh, targetFaces=1800) {
  const vertices=Array.from({length:mesh.positions.length/3},(_,i)=>mesh.positions.slice(i*3,i*3+3));
  const faces=Array.from({length:mesh.indices.length/3},(_,i)=>mesh.indices.slice(i*3,i*3+3));
  const incident=vertices.map(()=>new Set()),quadrics=vertices.map(()=>Array(16).fill(0)),version=vertices.map(()=>0);
  const dead=vertices.map(()=>false),grounded=vertices.map(p=>Math.abs(p[1]-0.025)<1e-8);
  const cross=(a,b,c)=>{const u=b.map((v,i)=>v-a[i]),v=c.map((w,i)=>w-a[i]);return [u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];};
  faces.forEach((f,i)=>{
    for(const v of f) incident[v].add(i);
    const n=cross(...f.map(v=>vertices[v])),len=Math.hypot(...n);
    const plane=[...n.map(v=>v/len),-n.reduce((s,v,j)=>s+v*vertices[f[0]][j],0)/len];
    for(const v of f) for(let a=0;a<4;a++) for(let b=0;b<4;b++) quadrics[v][a*4+b]+=plane[a]*plane[b];
  });
  const neighbors=v=>{const out=new Set();for(const fi of incident[v]) if(faces[fi]) for(const x of faces[fi]) if(x!==v)out.add(x);return out;};
  const heap=[];
  function push(item) {let i=heap.length;heap.push(item);while(i){const p=(i-1)>>1;if(heap[p].cost<=item.cost)break;heap[i]=heap[p];i=p;}heap[i]=item;}
  function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].cost<heap[j].cost)j++;if(heap[j].cost>=last.cost)break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;}
  function candidate(a,b) {
    if(a>b)[a,b]=[b,a];
    const q=quadrics[a].map((v,i)=>v+quadrics[b][i]);
    const pa=vertices[a],pb=vertices[b],mid=pa.map((v,i)=>(v+pb[i])/2);
    const choices=[mid,[...pa],[...pb]];
    const A=[[q[0],q[1],q[2],-q[3]],[q[4],q[5],q[6],-q[7]],[q[8],q[9],q[10],-q[11]]];
    let solved=true;
    for(let i=0;i<3;i++) {
      let pivot=i;for(let j=i+1;j<3;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;
      if(Math.abs(A[pivot][i])<1e-9){solved=false;break;}
      [A[i],A[pivot]]=[A[pivot],A[i]];const d=A[i][i];for(let k=i;k<4;k++)A[i][k]/=d;
      for(let j=0;j<3;j++)if(j!==i){const m=A[j][i];for(let k=i;k<4;k++)A[j][k]-=m*A[i][k];}
    }
    if(solved){const opt=A.map(r=>r[3]),len=Math.hypot(...pa.map((v,i)=>v-pb[i]));if(Math.hypot(...opt.map((v,i)=>v-mid[i]))<=len*1.5)choices.push(opt);}
    for(const p of choices) p[1]=grounded[a]||grounded[b]?0.025:Math.max(0.025,p[1]);
    const error=p=>{const h=[...p,1];let e=0;for(let i=0;i<4;i++)for(let j=0;j<4;j++)e+=h[i]*q[i*4+j]*h[j];return e;};
    choices.sort((a,b)=>error(a)-error(b));
    return {a,b,cost:Math.max(0,error(choices[0])),choices,q,va:version[a],vb:version[b]};
  }
  const initial=new Set();for(const f of faces)for(let i=0;i<3;i++){const a=Math.min(f[i],f[(i+1)%3]),b=Math.max(f[i],f[(i+1)%3]),key=`${a}:${b}`;if(!initial.has(key)){initial.add(key);push(candidate(a,b));}}
  let count=faces.length;
  while(heap.length&&count>targetFaces){
    const e=pop(),{a,b}=e;
    if(dead[a]||dead[b]||e.va!==version[a]||e.vb!==version[b])continue;
    const na=neighbors(a),nb=neighbors(b);
    if(!na.has(b)||[...na].filter(v=>nb.has(v)).length!==2)continue;
    const affected=new Set([...incident[a],...incident[b]]);
    let position;
    for(const p of e.choices){
      let valid=true;
      for(const fi of affected){
        const f=faces[fi];if(!f||f.includes(a)&&f.includes(b))continue;
        const old=cross(...f.map(v=>vertices[v]));
        const nn=cross(...f.map(v=>v===a||v===b?p:vertices[v]));
        const length=Math.hypot(...nn),oldLength=Math.hypot(...old);
        if(length<6e-7||nn.reduce((s,v,i)=>s+v*old[i],0)<0.12*length*oldLength){valid=false;break;}
      }
      if(valid){position=p;break;}
    }
    if(!position)continue;
    const touched=new Set([a,b,...na,...nb]);
    for(const fi of affected){const f=faces[fi];if(!f)continue;for(const v of f)incident[v].delete(fi);if(f.includes(a)&&f.includes(b)){faces[fi]=null;count--;}else {faces[fi]=f.map(v=>v===b?a:v);for(const v of faces[fi])incident[v].add(fi);}}
    vertices[a]=[...position];grounded[a]=grounded[a]||grounded[b];quadrics[a]=e.q;dead[b]=true;incident[b].clear();
    for(const v of touched)version[v]++;
    const added=new Set();for(const v of touched)if(!dead[v])for(const w of neighbors(v)){const lo=Math.min(v,w),hi=Math.max(v,w),key=`${lo}:${hi}`;if(!added.has(key)){added.add(key);push(candidate(lo,hi));}}
  }
  const remap=new Map(),positions=[],indices=[];
  for(const f of faces)if(f)for(const v of f){if(!remap.has(v)){remap.set(v,positions.length/3);positions.push(...vertices[v]);}indices.push(remap.get(v));}
  mesh.positions=positions;mesh.indices=indices;
  return mesh;
}

// Continuous anatomical clay skin, authored from overlapping ellipsoid volumes.
// Marching tetrahedra realizes the closed surface offline, never in the browser.
function bodyAndForelegs() {
  const mesh = part('Bo_connected_ribcage_shoulders_forelegs_seated_haunches');
  const volumes = [
    // Pelvis, abdomen, rib cage, withers and rising neck.
    [[0,1.02,-0.49],[0.60,0.65,0.42],0.17],
    [[0,1.68,-0.21],[0.55,1.01,0.49],0.20],
    [[0,2.29,-0.08],[0.65,0.91,0.59],0.23],
    [[0,2.98,0.015],[0.48,0.78,0.44]],
    [[0,3.42,0.11],[0.37,0.42,0.35]],
  ];
  for (const side of [-1,1]) {
    volumes.push(
      // Shoulder and upper arm stay within the chest silhouette.
      [[side*0.48,2.42,0.08],[0.285,0.61,0.36]],
      [[side*0.47,1.94,0.12],[0.245,0.61,0.275]],
      // Forearm runs almost vertically below the elbow, then a narrow wrist.
      [[side*0.46,1.23,0.255],[0.176,0.76,0.195]],
      [[side*0.46,0.53,0.35],[0.147,0.45,0.17]],
      [[side*0.46,0.23,0.48],[0.19,0.245,0.29]],
      [[side*0.46,0.145,0.62],[0.235,0.17,0.33]],
      // Seated thigh folds down/back to the hock, with compact rear feet.
      [[side*0.61,1.03,-0.36],[0.42,0.78,0.51]],
      [[side*0.80,0.48,-0.25],[0.22,0.31,0.27]],
      [[side*0.82,0.14,-0.14],[0.23,0.17,0.28]],
    );
  }
  function ellipsoid(p,c,r) {
    const q=p.map((v,i)=>(v-c[i])/r[i]);
    const k0=Math.hypot(...q),k1=Math.hypot(...q.map((v,i)=>v/r[i]));
    return k1<1e-10?-Math.min(...r):k0*(k0-1)/k1;
  }
  const smoothMin=(a,b,k)=>{
    const h=Math.max(k-Math.abs(a-b),0)/k;
    return Math.min(a,b)-h*h*k*0.25;
  };
  function field(p) {
    let d=10;
    for(const [c,r,k=0.105] of volumes) d=smoothMin(d,ellipsoid(p,c,r),k);
    // A physical support plane gives all four paws the same ground contact.
    return Math.max(d,0.025-p[1]);
  }
  const spacing=0.09,origin=[-1.201,-0.121,-1.111],dims=[28,47,27];
  const points=[],values=[];
  const gid=(x,y,z)=>(x*dims[1]+y)*dims[2]+z;
  for(let x=0;x<dims[0];x++) for(let y=0;y<dims[1];y++) for(let z=0;z<dims[2];z++) {
    const p=[origin[0]+x*spacing,origin[1]+y*spacing,origin[2]+z*spacing];
    points.push(p); values.push(field(p));
  }
  const edgeCache=new Map();
  function edge(a,b) {
    const key=a<b?`${a}:${b}`:`${b}:${a}`;
    if(edgeCache.has(key)) return edgeCache.get(key);
    const t=values[a]/(values[a]-values[b]);
    const id=vertex(mesh,points[a].map((v,i)=>v+t*(points[b][i]-v)));
    edgeCache.set(key,id);return id;
  }
  let outward=[0,1,0];
  function face(a,b,c) {
    const pa=mesh.positions.slice(a*3,a*3+3),pb=mesh.positions.slice(b*3,b*3+3),pc=mesh.positions.slice(c*3,c*3+3);
    const u=pb.map((v,i)=>v-pa[i]),v=pc.map((v,i)=>v-pa[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    if(n.reduce((s,v,i)=>s+v*outward[i],0)<0) tri(mesh,a,c,b); else tri(mesh,a,b,c);
  }
  const tetra=[[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7],[0,5,1,7]];
  for(let x=0;x<dims[0]-1;x++) for(let y=0;y<dims[1]-1;y++) for(let z=0;z<dims[2]-1;z++) {
    const cube=[gid(x,y,z),gid(x+1,y,z),gid(x,y+1,z),gid(x+1,y+1,z),gid(x,y,z+1),gid(x+1,y,z+1),gid(x,y+1,z+1),gid(x+1,y+1,z+1)];
    for(const tet of tetra) {
      const ids=tet.map(i=>cube[i]),inside=ids.filter(i=>values[i]<0),outside=ids.filter(i=>values[i]>=0);
      if(!inside.length||!outside.length) continue;
      outward=[0,1,2].map(axis=>outside.reduce((s,i)=>s+points[i][axis],0)/outside.length-inside.reduce((s,i)=>s+points[i][axis],0)/inside.length);
      if(inside.length===1) face(...outside.map(i=>edge(inside[0],i)));
      else if(outside.length===1) face(...inside.map(i=>edge(outside[0],i)));
      else {
        const [a,b]=inside,[c,d]=outside;
        const ac=edge(a,c),ad=edge(a,d),bc=edge(b,c),bd=edge(b,d);
        face(ac,ad,bc);face(ad,bd,bc);
      }
    }
  }
  return simplifySkin(mesh);
}

function head() {
  const mesh = part('Bo_broad_domelike_skull_and_cheeks');
  const specs = [
    [1.835,0.35,0.72,-0.01],
    [1.960,0.54,0.91,-0.15],
    [2.155,0.685,0.94,-0.255],
    [2.285,0.735,0.945,-0.290],
    [2.410,0.750,0.91,-0.305],
    [2.650,0.680,0.80,-0.265],
    [2.850,0.490,0.62,-0.100],
    [2.970,0.230,0.41,0.085],
  ];
  const rings = specs.map(([y, rx, front, back]) => {
    const zc=(front+back)/2, rz=(front-back)/2;
    return Array.from({length:16}, (_,i) => {
      const t=i*TAU/16;
      const s=Math.sin(t), c=Math.cos(t);
      // Slightly squarer cheek/forehead sections, deliberate short frontal depth.
      const x = rx * Math.sign(s) * Math.pow(Math.abs(s),0.90);
      const z = zc + rz * Math.sign(c) * Math.pow(Math.abs(c),0.79);
      return vertex(mesh,[x,y,z]);
    });
  });
  rings.slice(1).forEach((ring,i)=>bridge(mesh,rings[i],ring));
  cap(mesh,rings[0],[0,1.835,0.34],true);
  cap(mesh,rings.at(-1),[0,3.015,0.235]);
  return mesh;
}

function muzzle() {
  const mesh=part('Bo_short_wide_soft_muzzle');
  // Front perimeter is purposefully a broad double-cheek profile, not a sphere.
  const outline=[[-0.49,2.075],[-0.43,1.960],[-0.25,1.887],[0,1.870],[0.25,1.887],[0.43,1.960],[0.49,2.075],[0.40,2.205],[0.22,2.280],[0,2.255],[-0.22,2.280],[-0.40,2.205]];
  const base=outline.map(([x,y])=>vertex(mesh,[x,y,0.795]));
  const middle=outline.map(([x,y])=>vertex(mesh,[x*0.92,2.070+(y-2.070)*0.93,1.035]));
  const front=outline.map(([x,y])=>vertex(mesh,[x*0.71,2.065+(y-2.070)*0.78,1.105]));
  bridge(mesh,base,middle);
  bridge(mesh,middle,front);
  // A subdivided central patch creates the restrained muzzle cheeks/nose bridge.
  const middleTop=vertex(mesh,[0,2.175,1.118]);
  const center=vertex(mesh,[0,2.045,1.135]);
  const bottom=vertex(mesh,[0,1.935,1.105]);
  const left=vertex(mesh,[-0.185,2.055,1.15]);
  const right=vertex(mesh,[0.185,2.055,1.15]);
  const ids=[left,left,bottom,bottom,bottom,right,right,right,middleTop,middleTop,middleTop,left];
  for(let i=0;i<front.length;i++) {
    const j=(i+1)%front.length;
    tri(mesh,front[i],front[j],ids[i]);
    if(ids[i]!==ids[j]) tri(mesh,front[j],ids[j],ids[i]);
  }
  tri(mesh,left,bottom,center);tri(mesh,bottom,right,center);tri(mesh,right,middleTop,center);tri(mesh,middleTop,left,center);
  cap(mesh,base,[0,2.07,0.795],true);
  for(let i=0;i<mesh.positions.length;i+=3) {
    mesh.positions[i]*=0.91;
    mesh.positions[i+1]=2.07+(mesh.positions[i+1]-2.07)*1.10;
  }
  return mesh;
}

function hangingEar(side) {
  const mesh=part(`Bo_${side < 0 ? 'left' : 'right'}_thick_hanging_ear`);
  // Ordered around the outer silhouette: crown, shoulder, broad outer flap, tip.
  const silhouette=[
    [0.48,2.82,0.415],[0.70,2.78,0.390],[0.885,2.53,0.350],
    [1.00,2.265,0.405],[0.965,2.030,0.540],[0.845,1.875,0.610],
    [0.690,1.855,0.660],[0.640,2.075,0.670],[0.650,2.350,0.635],
    [0.570,2.635,0.560],
  ];
  const outer=silhouette.map(([x,y,z])=>vertex(mesh,[side*x,y,z]));
  const back=silhouette.map(([x,y,z])=>vertex(mesh,[side*(x-0.034),y+0.005,z-0.110]));
  bridge(mesh,outer,back,side===-1);
  // Authored internal fold running through the ear instead of a flat fan.
  const foldTop=vertex(mesh,[side*0.735,2.595,0.575]);
  const foldMid=vertex(mesh,[side*0.845,2.295,0.655]);
  const foldLow=vertex(mesh,[side*0.800,2.030,0.730]);
  const face=(a,b,c)=>side===1?tri(mesh,a,c,b):tri(mesh,a,b,c);
  face(outer[0],outer[1],foldTop);face(outer[1],outer[2],foldTop);
  face(outer[2],outer[3],foldMid);face(outer[2],foldMid,foldTop);
  face(outer[3],outer[4],foldMid);face(outer[4],foldLow,foldMid);
  face(outer[4],outer[5],foldLow);face(outer[5],outer[6],foldLow);
  face(outer[6],outer[7],foldLow);face(outer[7],foldMid,foldLow);
  face(outer[7],outer[8],foldMid);face(outer[8],foldTop,foldMid);
  face(outer[8],outer[9],foldTop);face(outer[9],outer[0],foldTop);
  cap(mesh,back,[side*0.775,2.335,0.420],side===-1);
  return mesh;
}

function eye(side) {
  const mesh=part(`Bo_${side < 0 ? 'left' : 'right'}_dark_eye`,'eye');
  const cx=side*0.370, cy=2.437;
  // Small convex almond lens; its placement is determined by the skull surface.
  const anchors=[[-1,0],[-0.78,-0.66],[-0.24,-1],[0.45,-0.87],[0.94,-0.37],[1,0.18],[0.61,0.84],[-0.1,1],[-0.74,0.64]];
  // Smooth only the deliberate eyelid outline; the coat retains authored facets.
  const contour=Array.from({length:36},(_,i)=>{
    const k=Math.floor(i/4),t=(i%4)/4,n=anchors.length;
    const p0=anchors[(k+n-1)%n],p1=anchors[k],p2=anchors[(k+1)%n],p3=anchors[(k+2)%n];
    return [0,1].map(d=>0.5*((2*p1[d])+(-p0[d]+p2[d])*t+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t*t+(-p0[d]+3*p1[d]-3*p2[d]+p3[d])*t*t*t));
  });
  const basis=(x,y,depth)=>[cx+x*0.127,cy+y*0.128,0.839-side*x*0.037-y*0.055+depth];
  const rim=contour.map(([x,y])=>vertex(mesh,basis(x,y,0)));
  const inner=contour.map(([x,y])=>vertex(mesh,basis(x*0.70,y*0.70,0.019)));
  const centerRing=contour.map(([x,y])=>vertex(mesh,basis(x*0.32,y*0.32,0.026)));
  bridge(mesh,rim,inner);
  bridge(mesh,inner,centerRing);
  cap(mesh,centerRing,basis(0,0,0.028));
  cap(mesh,rim,basis(0,0,-0.008),true);
  return mesh;
}

function nose() {
  const mesh=part('Bo_small_soft_triangular_nose','nose');
  const boundary=[[-0.132,2.179],[-0.116,2.106],[-0.036,2.031],[0.036,2.031],[0.116,2.106],[0.132,2.179],[0.069,2.206],[-0.069,2.206]];
  const rim=boundary.map(([x,y])=>vertex(mesh,[x,y,1.12]));
  const inset=boundary.map(([x,y])=>vertex(mesh,[x*.82,2.138+(y-2.138)*.8,1.183]));
  bridge(mesh,rim,inset);
  cap(mesh,inset,[0,2.145,1.20]);
  cap(mesh,rim,[0,2.138,1.118],true);
  return mesh;
}

function restingTail() {
  const mesh=part('Bo_curved_tail_resting_on_floor');
  const path=[
    [-0.33,0.40,-0.60,0.235,0.180],[-0.69,0.27,-0.75,0.230,0.170],
    [-1.02,0.18,-0.67,0.205,0.145],[-1.225,0.13,-0.405,0.190,0.125],
    [-1.230,0.115,-0.10,0.167,0.112],[-1.080,0.108,0.130,0.125,0.100],
    [-0.88,0.103,0.24,0.073,0.075],[-0.76,0.100,0.22,0.020,0.036],
  ];
  let first,prior;
  for(let r=0;r<path.length;r++) {
    const [x,y,z,rh,rv]=path[r];
    const before=path[Math.max(r-1,0)],after=path[Math.min(r+1,path.length-1)];
    const dx=after[0]-before[0],dz=after[2]-before[2], len=Math.hypot(dx,dz);
    const nx=-dz/len,nz=dx/len;
    const ring=Array.from({length:8},(_,i)=>{
      const t=i*TAU/8;
      return vertex(mesh,[x+nx*Math.cos(t)*rh,y+Math.sin(t)*rv,z+nz*Math.cos(t)*rh]);
    });
    if(prior) bridge(mesh,prior,ring); else first=ring;
    prior=ring;
  }
  cap(mesh,first,path[0].slice(0,3),true);
  cap(mesh,prior,path.at(-1).slice(0,3));
  for(let i=0;i<mesh.indices.length;i+=3) {
    const b=mesh.indices[i+1];mesh.indices[i+1]=mesh.indices[i+2];mesh.indices[i+2]=b;
  }
  return mesh;
}

export function createBo() {
  const facial=[head(),muzzle(),hangingEar(-1),hangingEar(1),eye(-1),eye(1),nose()];
  for(const p of facial) for(let i=0;i<p.positions.length;i+=3) {
    if(/skull/.test(p.name)&&p.positions[i+1]>2.55) p.positions[i+1]=2.55+(p.positions[i+1]-2.55)*0.80;
    if(/muzzle|nose/.test(p.name)) p.positions[i+2]=0.795+(p.positions[i+2]-0.795)*1.65;
    if(/nose/.test(p.name)) p.positions[i]*=1.12;
    if(/hanging_ear/.test(p.name)) {
      // Crown attachment is preserved while the lower flap drops past the jaw.
      const lower=Math.max(0,Math.min(1,(2.72-p.positions[i+1])/0.86));
      p.positions[i+1]-=0.13*lower;
      p.positions[i]*=1+0.09*lower;
    }
    p.positions[i]*=0.88;
    p.positions[i+1]=3.35+(p.positions[i+1]-1.835)*1.02;
    // Longer retriever foreface while retaining the original facial attachment.
    p.positions[i+2]=0.11+(p.positions[i+2]-0.17)*1.08;
  }
  const tail=restingTail();
  for(let i=0;i<tail.positions.length;i+=3) {
    tail.positions[i]*=0.90;
    tail.positions[i+1]=Math.max(0.025,tail.positions[i+1]);
    tail.positions[i+2]-=0.14;
  }
  const parts=[bodyAndForelegs(),...facial,tail];
  const low=Math.min(...parts.flatMap(p=>p.positions.filter((_,i)=>i%3===1)));
  const high=Math.max(...parts.flatMap(p=>p.positions.filter((_,i)=>i%3===1)));
  const scale=3.015/(high-low);
  for(const p of parts) for(let i=0;i<p.positions.length;i+=3) {
    p.positions[i]*=scale;p.positions[i+1]=(p.positions[i+1]-low)*scale;p.positions[i+2]*=scale;
  }
  return {
    name:'Bo',parts,
    metadata:{
      status:'M1-revise-unapproved',
      sourceHash:'a37b44b6c8a1fee1aa99fb3959bbe6bbfda9c59e64cb947c3ba1d076f4c86ae1',
      reference:'Full-body seated golden retriever sculpture: e2f28ba6-cf77-4a20-875b-6c6a173c3481.png',
      authoring:'Authored anatomical volumes realized offline and simplified with deterministic quadric edge collapse plus manifold link/no-flip checks; one closed connected torso/neck/shoulder/foreleg/pelvis/thigh/hock/paw skin; editable skull and facial patches',
      stage:'Clay anatomy revision awaiting owner review; no finished fur, final material, rig or animation',
      revision:'M1 anatomy revision 4: tucked posterior pelvis and tapering sternum; full-body golden proportions, longer attached retriever muzzle, lower forehead and longer hanging ears; coherent shoulders, straight forearms and four grounded compact paws',
      coordinates:'+Y up, +Z forward; ground Y=0',expectedHeight:3.015,
      anatomy:{scale,groundPlane:0.025,shoulders:[-0.48,0.48],elbows:[-0.47,0.47],wrists:[-0.46,0.46],frontPawCenters:[[-0.46,0.145,0.62],[0.46,0.145,0.62]],rearPawCenters:[[-0.82,0.14,-0.14],[0.82,0.14,-0.14]],surfaceGridSpacing:0.09,bodySurfaceTargetTriangles:1800,bodyConnected:true,neckSkullOverlap:'Neck volume reaches 3.84; skull begins 3.35, measured before display scale'},
      reviewFocus:['full-body seated golden silhouette','head reduced relative to chest and legs','shoulder elbow wrist alignment','continuous shoulder and rib cage','four planted paws with foreleg clearance','folded hind thigh and hock'],
    },
  };
}
