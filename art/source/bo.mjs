// Bo M1 edge study: original authored polygon rings, welded branches and facial patches.
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

// Hand-authored cross-sections and shared-index limb branches. Large planes
// follow chest, abdomen, haunch and limb flow; there is no sampled isosurface.
function bodyAndForelegs(pose='sit') {
 const mesh=part('Bo_connected_ribcage_shoulders_forelegs_seated_haunches');
 const seated=pose==='sit';
 const rows=seated?[
  [-.85,.91,.23,.30],[-.73,1.01,.55,.42],[-.54,1.12,.66,.47],[-.33,1.23,.59,.51],
  [-.12,1.37,.53,.57],[.10,1.49,.50,.55],[.31,1.62,.47,.49],[.48,1.77,.40,.44],[.57,1.98,.32,.35]
 ]:[
  [-1.22,1.40,.28,.34],[-1.07,1.43,.43,.45],[-.82,1.45,.48,.50],[-.55,1.46,.44,.46],
  [-.22,1.48,.44,.48],[.07,1.48,.48,.53],[.31,1.59,.46,.57],[.46,1.78,.39,.52],[.53,2,.31,.37]
 ];
 const n=16, rings=rows.map(([z,y,rx,ry])=>Array.from({length:n},(_,i)=>{const a=i*TAU/n;const c=Math.cos(a),bottom=seated?Math.max(.70,y-ry):y-ry;return vertex(mesh,[rx*Math.sin(a),c<0?y+(y-bottom)*c:y+ry*c,z]);}));
 const holes=[{r:1,i:4,s:1,type:'hind'},{r:1,i:10,s:-1,type:'hind'},{r:5,i:4,s:1,type:'fore'},{r:5,i:10,s:-1,type:'fore'}];
 for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){
  if(holes.some(h=>r>=h.r&&r<h.r+2&&i>=h.i&&i<h.i+2))continue;
  const j=(i+1)%n;quad(mesh,rings[r][i],rings[r][j],rings[r+1][j],rings[r+1][i],r+i);
 }
 cap(mesh,rings[0],[0,rows[0][1],rows[0][0]],true);
 cap(mesh,rings.at(-1),[0,rows.at(-1)[1],rows.at(-1)[0]]);
 const contour=[[.72,-.86],[0,-1],[-.72,-.86],[-1,0],[-.72,.86],[0,1],[.72,.86],[1,0]];
 const landmarks={};
 for(const h of holes){
  const {r,i,s,type}=h;
  let prior=[rings[r][i],rings[r][i+1],rings[r][i+2],rings[r+1][i+2],rings[r+2][i+2],rings[r+2][i+1],rings[r+2][i],rings[r+1][i]];
  const specs=type==='fore'?[
   [1.00,.38,.34,.215,.225],[.74,.37,.37,.185,.18],[.44,.37,.43,.16,.165],[.21,.37,.50,.19,.235],[.095,.37,.55,.225,.285],[.018,.37,.57,.21,.265]
  ]:seated?[
   [.71,.54,-.50,.245,.365],[.46,.59,-.42,.265,.33],[.25,.62,-.30,.225,.29],[.14,.63,-.22,.215,.295],[.075,.63,-.17,.215,.29],[.018,.63,-.15,.20,.27]
  ]:[
   [1.10,.40,-.96,.23,.22],[.82,.40,-.82,.185,.20],[.47,.40,-.94,.145,.16],[.20,.40,-.91,.175,.215],[.08,.40,-.83,.21,.28],[.018,.40,-.81,.20,.26]
  ];
  for(const [y,x,z,rx,rz] of specs){
   const gait=pose==='walk'?(type==='fore'?s*.30:-s*.24)*Math.max(0,1-y/1.25):0;
   const lift=pose==='walk'&&((type==='fore'&&s===1)||(type==='hind'&&s===-1))?.12*Math.max(0,1-y/.6):0;
   const next=contour.map(([dx,dz])=>vertex(mesh,[s*x+dx*rx,y+lift,z+dz*rz+gait]));bridge(mesh,prior,next);prior=next;
  }
  const center=[0,0,0];for(const id of prior)for(let d=0;d<3;d++)center[d]+=mesh.positions[id*3+d]/prior.length;
  cap(mesh,prior,center);landmarks[`${s<0?'left':'right'}_${type}`]=specs.map(([y,x,z])=>[s*x,y,z]);
 }
 mesh.limbLandmarks=landmarks;
 return mesh;
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
      const stagger=y>2.60?Math.cos(t*4)*.025:0;return vertex(mesh,[x,y+stagger,z]);
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

function restingTail(pose='sit') {
  const mesh=part('Bo_curved_tail_resting_on_floor');
  const path=pose!=='sit'?[
    [0,1.46,-1.10,.23,.19],[0,1.52,-1.39,.22,.18],
    [.015,1.67,-1.65,.19,.155],[.025,1.90,-1.85,.16,.14],
    [.03,2.15,-1.96,.13,.115],[.03,2.36,-1.96,.10,.09],
    [.025,2.51,-1.86,.065,.06],[.02,2.54,-1.75,.022,.026]
  ]:[
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
      if(pose!=='sit'){
        const dy=after[1]-before[1],dlen=Math.hypot(dy,dz);
        return vertex(mesh,[x+Math.cos(t)*rh,y-Math.sin(t)*rv*dz/dlen,z+Math.sin(t)*rv*dy/dlen]);
      }
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

function facialProjection(skin) {
 const parts=[],attachmentEvidence=[];
 const add=(a,b)=>a.map((v,i)=>v+b[i]),scale=(a,s)=>a.map(v=>v*s);
 function finalize(name,v,fs,materials,material,notes){const p={name,positions:v.flat(),indices:fs.flat(),material,authorNotes:notes};parts.push(p);return p;}
  function surfaceZ(x,y){
    let best=-Infinity;const p=skin.positions,idx=skin.indices;
    for(let j=0;j<idx.length;j+=3){
      const a=idx[j]*3,b=idx[j+1]*3,c=idx[j+2]*3;
      const den=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(den)<1e-10)continue;
      const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/den;
      const v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/den,w=1-u-v;
      if(u>=-1e-8&&v>=-1e-8&&w>=-1e-8)best=Math.max(best,u*p[a+2]+v*p[b+2]+w*p[c+2]);
    }
    if(!Number.isFinite(best))throw new Error(`Facial point outside Bo facial surface: ${x},${y}`);return best;
  }
  function projectedPatch(name,outline,material,depth=.014,protrusion=.004){
    const v=outline.map(([x,y])=>[x,y,surfaceZ(x,y)+protrusion]);
    const back=outline.map(([x,y])=>[x,y,surfaceZ(x,y)-depth]),n=v.length,fs=[];
    const centroid=scale(outline.reduce((a,p)=>add(a,p),[0,0]),1/n);
    const center=v.length*2;v.push(...back,[...centroid,surfaceZ(...centroid)+protrusion],[...centroid,surfaceZ(...centroid)-depth]);
    for(let i=0;i<n;i++){const j=(i+1)%n;fs.push([center,i,j],[center+1,n+j,n+i],[i,n+i,n+j],[i,n+j,j]);}
    const p=finalize(name,v,fs,null,material,'Every outline point is projected onto the actual skin triangles and has an embedded back vertex.');
    attachmentEvidence.push({part:name,kind:'surfaceProjected',protrusion,embeddedDepth:depth,samples:outline.map(([x,y])=>({x,y,surfaceZ:+surfaceZ(x,y).toFixed(6)}))});return p;
  }
  function projectedEye(name,outline,material,depth,protrusion){
    // Clip the eye into the actual projected skull triangles. Each resulting
    // front face lies parallel to one host triangle, so no un-sampled interior
    // can cut through a forehead ridge as happened with a coarse center fan.
    const xy=[],frontFaces=[],keyToId=new Map(),p=skin.positions,idx=skin.indices;
    const area=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const id=q=>{const key=q.map(v=>Math.round(v*1e8)).join(',');if(keyToId.has(key))return keyToId.get(key);const i=xy.length;xy.push(q);keyToId.set(key,i);return i;};
    for(let f=0;f<idx.length;f+=3){
      const host=idx.slice(f,f+3).map(i=>p.slice(i*3,i*3+3)),sgn=Math.sign(area(...host));
      if(!sgn||Math.abs(area(...host))<1e-10)continue;
      let poly=outline.map(q=>[...q]);
      for(let edge=0;edge<3&&poly.length;edge++){
        const a=host[edge],b=host[(edge+1)%3],out=[];
        for(let i=0;i<poly.length;i++){
          const c=poly[i],d=poly[(i+1)%poly.length],ac=sgn*area(a,b,c),ad=sgn*area(a,b,d);
          if(ac>=-1e-10)out.push(c);
          if((ac>1e-10&&ad < -1e-10)||(ac < -1e-10&&ad>1e-10)){
            const t=ac/(ac-ad);out.push([c[0]+t*(d[0]-c[0]),c[1]+t*(d[1]-c[1])]);
          }
        }
        poly=out.filter((q,i)=>Math.hypot(q[0]-out[(i+out.length-1)%out.length][0],q[1]-out[(i+out.length-1)%out.length][1])>1e-8);
      }
      if(poly.length<3)continue;
      const c=scale(poly.reduce((a,q)=>add(a,q),[0,0]),1/poly.length),den=area(...host);
      const u=area(host[1],host[2],c)/den,v=area(host[2],host[0],c)/den,w=1-u-v;
      const hostZ=u*host[0][2]+v*host[1][2]+w*host[2][2];
      if(Math.abs(hostZ-surfaceZ(...c))>1e-6)continue;
      const ids=poly.map(id);
      for(let i=1;i<ids.length-1;i++)if(Math.abs(area(xy[ids[0]],xy[ids[i]],xy[ids[i+1]]))>1e-10)frontFaces.push([ids[0],ids[i],ids[i+1]]);
    }
    const front=xy.map(([x,y])=>[x,y,surfaceZ(x,y)+protrusion]),back=xy.map(([x,y])=>[x,y,surfaceZ(x,y)-depth]);
    const count=xy.length,fs=[...frontFaces,...frontFaces.map(f=>[...f].reverse().map(i=>i+count))],edges=new Map();
    for(const face of frontFaces)for(let i=0;i<3;i++){const a=face[i],b=face[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');const e=edges.get(key);if(e)e.count++;else edges.set(key,{a,b,count:1});}
    for(const e of edges.values())if(e.count===1){const {a,b}=e;fs.push([b,a,a+count],[b,a+count,b+count]);}
    finalize(name,[...front,...back],fs,null,material,'Eye shell tessellated at actual skull triangle boundaries; all front triangle interiors stay at the bounded surface offset, with welded embedded rear shell.');
    attachmentEvidence.push({part:name,kind:'surfaceProjected',method:'hostTriangleClipped',protrusion,embeddedDepth:depth,samples:xy.map(([x,y])=>({x,y,surfaceZ:+surfaceZ(x,y).toFixed(6)}))});
  }

 return {parts,projectedEye,projectedPatch};
}
function makeProjectedEyes(skull){
 const p=facialProjection(skull);
 for(const s of [-1,1]){
  const cx=s*.395,cy=2.458;
  const outline=Array.from({length:20},(_,i)=>{const a=i*TAU/20;return [cx+Math.cos(a)*.152,cy+Math.sin(a)*.164];});
  p.projectedEye(`Bo_${s<0?'left':'right'}_gray_eye_region`,outline,'innerEar',.035,.012);
  const eyeSkin=p.parts.at(-1),q=facialProjection(eyeSkin);
  const pupil=Array.from({length:16},(_,i)=>{const a=i*TAU/16;return [cx+Math.cos(a)*.103,cy+Math.sin(a)*.119];});
  q.projectedEye(`Bo_${s<0?'left':'right'}_dark_eye`,pupil,'eye',.022,.009);
  p.parts.push(...q.parts);
 }
 return p.parts;
}
function makeMouth(snout){
 const p=facialProjection(snout);
 p.projectedPatch('Bo_attached_philtrum',[[-.009,2.075],[.009,2.075],[.009,1.997],[-.009,1.997]],'nose',.016,.003);
 for(const s of [-1,1])p.projectedPatch(`Bo_${s<0?'left':'right'}_attached_mouth`,[[0,2.006],[s*.095,1.977],[s*.17,1.992],[s*.17,1.981],[s*.095,1.966],[0,1.995]],'nose',.016,.003);
 return p.parts;
}

function orient(mesh) {
 let v=0;const p=mesh.positions;
 for(let k=0;k<mesh.indices.length;k+=3){const [a,b,c]=mesh.indices.slice(k,k+3).map(i=>p.slice(i*3,i*3+3));v+=a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]);}
 if(v<0)for(let i=0;i<mesh.indices.length;i+=3)[mesh.indices[i+1],mesh.indices[i+2]]=[mesh.indices[i+2],mesh.indices[i+1]];
 return mesh;
}

export function createBo({pose='sit'}={}) {
 if(!['sit','stand','walk'].includes(pose))throw new Error(`Unknown Bo study pose: ${pose}`);
 const skull=head(),snout=muzzle();
 // Puppy proportion: full cranium, cheek width and short blunt muzzle.
 for(let i=0;i<skull.positions.length;i+=3){skull.positions[i]*=1.12;skull.positions[i+1]=2.36+(skull.positions[i+1]-2.36)*1.08;if(skull.positions[i+1]>2.68)skull.positions[i+1]=2.68+(skull.positions[i+1]-2.68)*.88;}
 for(let i=0;i<snout.positions.length;i+=3){snout.positions[i]*=1.04;snout.positions[i+2]=.795+(snout.positions[i+2]-.795)*.74;}
 const body=bodyAndForelegs(pose),ears=[hangingEar(-1),hangingEar(1)];
 for(const p of ears)for(let i=0;i<p.positions.length;i+=3){p.positions[i]*=1.09;p.positions[i+1]=2.36+(p.positions[i+1]-2.36)*1.08;}
 const n=nose();for(let i=0;i<n.positions.length;i+=3)n.positions[i+2]=.795+(n.positions[i+2]-.795)*.74;
 const tail=restingTail(pose);for(let i=0;i<tail.positions.length;i+=3)tail.positions[i+1]=Math.max(.018,tail.positions[i+1]);
 const facial=[skull,snout,...ears,n];
 const eyes=makeProjectedEyes(skull),mouth=makeMouth(snout);
 const parts=[body,...facial,...eyes,...mouth,tail].map(orient);
 for(const p of parts)for(let i=0;i<p.positions.length;i+=3){p.positions[i+1]-=.018;for(let d=0;d<3;d++)p.positions[i+d]=+p.positions[i+d].toFixed(6);}
 return {name:'Bo',parts,metadata:{status:'M1-edge-unapproved',pose,availablePoses:['sit','stand','walk'],reference:'Low polygon form study and original Concept 01 golden puppy lower row',sourceReference:'f5d01f2a-a5d7-499d-9e31-9675adee9fb0.png',authoring:'Original explicit anatomical rings and welded limb branches; deterministic authored large planes; no marching tetrahedra or decimation.',revision:'M1 edge 2: broad puppy skull and cheek, short blunt attached muzzle, drooping broad ears, compact full seated chest and haunches, thick tapering legs and paws. Shared topology pose studies.',coordinates:'+Y up, +Z forward; Y=0 ground',continuousSkinPart:body.name,anatomy:{bodyConnected:true,pose,limbLandmarks:body.limbLandmarks},reviewFocus:['Broad round puppy head','Short muzzle and integrated facial features','Natural full shoulder-to-front-paw taper','Continuous coherent chest and haunch planes','360 degree actual triangle-edge study'],limitations:['Clay review asset; visual approval pending.','Study poses are authored deformations, not an animation rig.','Rear views inferred from supplied concept.']}};
}
