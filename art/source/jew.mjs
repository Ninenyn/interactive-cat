/** Jew M1 edge-study revision. Authored cute proportions, shared-index polygon surface. */
export function createJew({pose='stand'}={}) {
  if(!['stand','sit','walk'].includes(pose))throw new Error('Unknown Jew study pose: '+pose);
  const sitting=pose==='sit',walking=pose==='walk',faceLift=sitting?.13:0;
  const headY=y=>1.78+(y-1.85)*.85;
  const parts=[], positions=[], faces=[], faceMaterials=[];
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),scale=(a,s)=>a.map(v=>v*s);
  const unit=a=>scale(a,1/(Math.hypot(...a)||1));
  const vertex=p=>{positions.push(p);return positions.length-1;};
  const tri=(a,b,c,m='clay')=>{faces.push([a,b,c]);faceMaterials.push(m);};
  const quad=(a,b,c,d,p=0,m='clay')=>p%2?(tri(a,b,d,m),tri(b,c,d,m)):(tri(a,b,c,m),tri(a,c,d,m));
  const bridge=(a,b,m='clay')=>a.forEach((id,i)=>{const j=(i+1)%a.length;quad(id,a[j],b[j],b[i],i,m);});
  const cap=(ring,reverse=false,m='clay')=>{const c=vertex(scale(ring.reduce((a,id)=>add(a,positions[id]),[0,0,0]),1/ring.length));ring.forEach((id,i)=>reverse?tri(c,ring[(i+1)%ring.length],id,m):tri(c,id,ring[(i+1)%ring.length],m));};
  function finalize(name,verts,fs,materials=null,material='clay',notes='') {
    const used=new Set(fs.flat()),map=new Map(),v=[];
    verts.forEach((p,i)=>{if(used.has(i)){map.set(i,v.length);v.push(p.map(n=>+n.toFixed(6)));}});
    const ind=fs.flatMap(f=>f.map(i=>map.get(i)));let vol=0;
    for(let i=0;i<ind.length;i+=3)vol+=dot(v[ind[i]],cross(v[ind[i+1]],v[ind[i+2]]));
    if(vol<0)for(let i=0;i<ind.length;i+=3)[ind[i+1],ind[i+2]]=[ind[i+2],ind[i+1]];
    const p={name,positions:v.flat(),indices:ind,material,authorNotes:notes};
    if(materials){p.materialGroups=[];materials.forEach((m,i)=>{const prev=p.materialGroups.at(-1);if(prev?.material===m)prev.count+=3;else p.materialGroups.push({start:i*3,count:3,material:m});});}
    parts.push(p);return p;
  }
  // Cross-sections progress from rump to face. Shoulder and hip openings are
  // replaced with continuous limb rings: no hidden limb caps or intersections.
  // Individually authored shoulder, crown, cheek and short-muzzle sections.
  // Enlarging the skull is local: the paws and compact trunk retain their own
  // anatomy and the facial projections are rebuilt on this actual surface.
  const rows=[
    [-1.00,1.30,.28,.34],[-.82,1.29,.39,.40],[-.59,1.30,.41,.42],[-.37,1.31,.37,.36],
    [-.12,1.29,.38,.39],[.13,1.28,.41,.45],[.37,1.34,.405,.47],[.55,1.54,.38,.46],
    [.69,1.82,.43,.49],[.83,1.96,.56,.53],[1.04,1.98,.635,.555],[1.23,1.94,.625,.50],
    [1.36,1.81,.53,.335],[1.43,1.755,.32,.19],[1.49,1.765,.10,.068],[1.515,1.765,.08,.051]
  ];
  rows.forEach((r,i)=>{if(i>=8){r[1]=headY(r[1]);r[3]*=.85;}else if(i===7)r[1]-=.08;});
  if(sitting){
    // A compact upright pelvis/chest, not a scaled standing diagonal trunk.
    const seatedRows=[[-.45,.46,.32,.34],[-.30,.62,.45,.50],[-.12,.80,.49,.66],
      [.03,.94,.47,.72],[.16,1.05,.44,.69],[.26,1.16,.40,.61],
      [.36,1.30,.36,.54],[.40,1.48,.32,.44],[.34,1.885,.43,.4165]];
    rows.forEach((r,i)=>{if(i<seatedRows.length)r.splice(0,4,...seatedRows[i]);else{r[0]-=.50;r[1]+=faceLift;}});
  }
  const n=16;
  const rings=rows.map(([z,y,rx,ry],r)=>Array.from({length:n},(_,i)=>{
    const t=i/n*Math.PI*2;
    if(r>=14){
      // A real inverted triangular nose boundary, with shared muzzle indices.
      const nose=[[0,.045],[.03,.045],[.06,.045],[.09,.045],[.072,.025],[.054,.005],[.036,-.015],[.018,-.035],[0,-.055],[-.018,-.035],[-.036,-.015],[-.054,.005],[-.072,.025],[-.09,.045],[-.06,.045],[-.03,.045]];
      const [nx,ny]=nose[i],f=r===14?1.05:.92;
      return vertex([nx*f,y+ny*f*.85,z-(r===15?.015:0)]);
    }
    // Lower cheek pads broaden the muzzle while its forehead recedes gently.
    const cheek=(r===11||r===12)?1+.12*Math.max(0,-Math.cos(t)):1;
    return vertex([rx*Math.sin(t)*cheek,y+ry*Math.cos(t),z]);
  }));
  const holes=[{r:1,i:4,side:1,type:'hind'},{r:1,i:10,side:-1,type:'hind'},
    {r:5,i:4,side:1,type:'fore'},{r:5,i:10,side:-1,type:'fore'}];
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){
    if(holes.some(h=>r>=h.r&&r<h.r+2&&i>=h.i&&i<h.i+2))continue;
    const j=(i+1)%n;quad(rings[r][i],rings[r][j],rings[r+1][j],rings[r+1][i],r+i,r>=14?'nose':'clay');
  }
  cap(rings.at(-1),false,'nose');
  const contour=[[.72,-.86],[0,-1],[-.72,-.86],[-1,0],[-.72,.86],[0,1],[.72,.86],[1,0]];
  const anatomicalLandmarks={};
  for(const h of holes){
    const {r,i,side:s,type}=h;
    let prior=[rings[r][i],rings[r][i+1],rings[r][i+2],rings[r+1][i+2],rings[r+2][i+2],rings[r+2][i+1],rings[r+2][i],rings[r+1][i]];
    const specs=type==='fore'?[
      [.99,.325,.36,.16,.215],[.79,.325,.33,.15,.185],[.60,.33,.35,.135,.15],
      [.39,.33,.39,.12,.135],[.20,.33,.42,.12,.135],[.095,.33,.48,.175,.23],[.015,.33,.50,.18,.245]
    ]:[
      [1.01,.35,-.57,.235,.25],[.80,.345,-.40,.20,.21],[.62,.335,-.54,.15,.16],
      [.42,.33,-.74,.12,.135],[.23,.33,-.76,.11,.12],[.095,.33,-.67,.16,.22],[.015,.33,-.65,.17,.235]
    ];
    if(sitting&&type==='hind'){
      const folded=[ [.64,.40,-.04,.245,.34],[.43,.44,.08,.23,.30],[.25,.46,.06,.20,.25],
        [.16,.47,-.03,.17,.20],[.115,.49,-.055,.15,.18],[.09,.49,-.035,.17,.215],[.015,.49,-.025,.18,.22] ];
      specs.splice(0,specs.length,...folded);
    }
    if(sitting&&type==='fore'){
      specs[0]=[1.16,.32,.41,.16,.19];
      specs[1]=[.94,.325,.40,.15,.175];
    }
    if(walking){
      const swing=(type==='fore'?s:-s)>0;
      specs.forEach((r,k)=>{const weight=(k+1)/specs.length;r[2]+=(swing?.24:-.20)*weight;r[0]+=(swing?.13:0)*weight;});
    }
    for(const [y,x,z,rx,rz] of specs){const next=contour.map(([dx,dz])=>vertex([s*x+dx*rx,y,z+dz*rz]));bridge(prior,next);prior=next;}
    cap(prior);
    anatomicalLandmarks[`${s<0?'left':'right'}_${type}`]=specs.map(([y,x,z])=>[s*x,y,z]);
  }
  // The tail grows directly out of the rump ring. Its root shares all sixteen
  // boundary vertices; cross-sections rotate with the raised tail centerline.
  let prior=[...rings[0]].reverse();
  const tailPath=[[-1.18,1.35,.22],[-1.38,1.44,.18],[-1.56,1.59,.155],[-1.68,1.81,.14],[-1.67,2.04,.12],[-1.57,2.24,.10],[-1.44,2.36,.074],[-1.34,2.40,.043],[-1.31,2.37,.015]];
  // Sitting tail curls on the animal's right, outside the four paw contacts.
  if(sitting)tailPath.splice(0,tailPath.length,[-.60,.40,.18,.12],[-.68,.29,.15,.30],[-.66,.20,.13,.52],[-.49,.16,.11,.72],[-.22,.145,.09,.83],[.04,.13,.073,.87],[.26,.12,.055,.85],[.42,.12,.035,.80],[.50,.12,.013,.74]);
  for(let k=0;k<tailPath.length;k++){
    const [z,y,r,x=0]=tailPath[k],prev=k?tailPath[k-1]:[rows[0][0],rows[0][1],0,0],next=tailPath[Math.min(k+1,tailPath.length-1)];
    const d=unit([(next[3]??0)-(prev[3]??0),next[1]-prev[1],next[0]-prev[0]]),u=sitting?unit(cross(d,[0,1,0])):[1,0,0],v=unit(cross(d,u));
    // Same angular order as reversed rump boundary, avoiding a twisted root.
    const ring=Array.from({length:n},(_,j)=>{const t=(n-1-j)/n*Math.PI*2;return vertex(add([x,y,z],add(scale(u,Math.sin(t)*r),scale(v,-Math.cos(t)*r))));});
    bridge(prior,ring);prior=ring;
  }
  cap(prior);
  const skin=finalize('Jew · welded standing skin head muzzle nose body four legs tail',positions,faces,faceMaterials,'clay','One closed connected surface. Four branch openings share boundary indices with the trunk; head, muzzle, nose and raised tail belong to the same component.');
  // Surface projection onto the actual triangulated skin, not an analytic
  // approximation. Every facial contour uses the foremost triangle at x/y.
  function surfaceZ(x,y){
    let best=-Infinity;const p=skin.positions,idx=skin.indices;
    for(let j=0;j<idx.length;j+=3){
      const a=idx[j]*3,b=idx[j+1]*3,c=idx[j+2]*3;
      const den=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(den)<1e-10)continue;
      const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/den;
      const v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/den,w=1-u-v;
      if(u>=-1e-8&&v>=-1e-8&&w>=-1e-8)best=Math.max(best,u*p[a+2]+v*p[b+2]+w*p[c+2]);
    }
    if(!Number.isFinite(best))throw new Error(`Facial point outside Jew skin: ${x},${y}`);return best;
  }
  // Thick pointed ear wedges are seated deeply into the skull. They are kept
  // independent for future ear posing, with recorded embedded base points.
  const attachmentEvidence=[];
  for(const s of [-1,1]){
    const P=(x,y,z)=>[s*x,headY(y)+faceLift,z-(sitting?.50:0)];
    const v=[P(.19,2.36,1.37),P(.60,2.18,1.25),P(.49,2.73,1.15),P(.38,2.43,1.30),
      P(.20,2.28,.95),P(.59,2.16,.92),P(.49,2.70,1.02)];
    finalize(`Jew · ${s<0?'left':'right'} rooted triangular ear`,v,[[0,1,3],[1,2,3],[2,0,3],[4,6,5],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,4],[2,4,0]],null,'clay','Lower ear wedge penetrates the skull; upper rim is thick rather than a floating sheet.');
    attachmentEvidence.push({part:`Jew · ${s<0?'left':'right'} rooted triangular ear`,kind:'embeddedBase',point:P(.38,2.29,1.15)});
  }
  function projectedPatch(name,outline,material,depth=.014,protrusion=.004){
    outline=outline.map(([x,y])=>[x,headY(y)+faceLift]);
    const v=outline.map(([x,y])=>[x,y,surfaceZ(x,y)+protrusion]);
    const back=outline.map(([x,y])=>[x,y,surfaceZ(x,y)-depth]),n=v.length,fs=[];
    const centroid=scale(outline.reduce((a,p)=>add(a,p),[0,0]),1/n);
    const center=v.length*2;v.push(...back,[...centroid,surfaceZ(...centroid)+protrusion],[...centroid,surfaceZ(...centroid)-depth]);
    for(let i=0;i<n;i++){const j=(i+1)%n;fs.push([center,i,j],[center+1,n+j,n+i],[i,n+i,n+j],[i,n+j,j]);}
    const p=finalize(name,v,fs,null,material,'Every outline point is projected onto the actual skin triangles and has an embedded back vertex.');
    attachmentEvidence.push({part:name,kind:'surfaceProjected',protrusion,embeddedDepth:depth,samples:outline.map(([x,y])=>({x,y,surfaceZ:+surfaceZ(x,y).toFixed(6)}))});return p;
  }
  function projectedEye(name,outline,material,depth,protrusion){
    outline=outline.map(([x,y])=>[x,headY(y)+faceLift]);
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
  for(const s of [-1,1]){
    const side=s<0?'left':'right';
    projectedEye(`Jew · ${side} neutral outer eye`,[[s*.10,2.005],[s*.18,2.055],[s*.33,2.070],[s*.46,2.055],[s*.44,1.93],[s*.35,1.875],[s*.23,1.87],[s*.14,1.92]],'innerEar',.02,.006);
    projectedEye(`Jew · ${side} squint eye`,[[s*.245,2.05],[s*.335,2.06],[s*.375,2.015],[s*.37,1.945],[s*.32,1.895],[s*.255,1.90],[s*.215,1.95],[s*.215,2.015]],'eye',.014,.012);
  }
  // Mouth branches and philtrum are embedded ribbons on the muzzle. Front and
  // back samples straddle the real surface, guaranteeing visible attachment.
  projectedPatch('Jew · attached short philtrum',[[-.007,1.727],[.007,1.727],[.007,1.665],[-.007,1.665]],'nose',.012,.0025);
  for(const s of [-1,1]){
    const path=[[0,1.669],[s*.049,1.639],[s*.105,1.640],[s*.145,1.659]],a=[],b=[];
    for(const [x,y] of path){a.push([x,y+.003]);b.push([x,y-.003]);}
    projectedPatch(`Jew · ${s<0?'left':'right'} attached closed mouth`,[...a,...b.reverse()],'nose',.014,.0025);
  }
  return {name:'Jew',parts,metadata:{
    status:'M1-edge-unapproved',stage:'M1 cute edge-study clay revision',coordinateSystem:'+Y up; +Z forward; floor Y=.015; walk study has two diagonal lifted paws',
    sourceReference:'4506533e-61b3-4a79-8ffd-74c9718bf058.png',sourceReferenceSha256:'8b055e21f97e3389a12bf08460bd6dd7cce0c993867175014aabbe67d2d2a218',
    identityReference:'042d83c2-3c1c-4165-99aa-f37c31fa50e2.png',
    revision:'M1.8 actual-render refinement: lower broad skull and rooted ears, triangular shared nose, neutral outer eye and inset dark pupils;  locally authored broad rounded skull, full cheeks, short muzzle, enlarged half-lidded eyes, compact trunk, thick tapered limbs and broad paws; shorter curved tail. Shared-index body and connected nose retained, facial shells rebuilt against actual host triangles.',
    anatomy:{pose,availablePoses:['stand','sit','walk'],poseMethod:'Authored connected cross-sections and seven-ring limb chains; no skeleton animation yet',ribcageAxis:'horizontal',paws:4,headBodyRatio:'skull width 1.27 / trunk width .82 = 1.55; head height 1.11; compact trunk length 1.55; broad short feline muzzle',limbLandmarks:anatomicalLandmarks},
    attachmentEvidence,continuousSkinPart:skin.name,noseConnection:'Nose triangles share vertices with the muzzle within the same closed connected component.',
    targetHeight:sitting?2.658:2.528,edgeStudyReference:'exec-36708df1-e2f8-4d47-bfb8-9a43971c37ce.png',edgeStudyLandmarks:{skullWidth:1.27,skullHeight:.9435,trunkWidth:.82,trunkLength:1.55,forePawWidth:.36,foreLegLength:.975,tailCrown:2.40},reviewScope:'Full side silhouette; shoulder and hip placement; rear stifle/hock bends; four planted paws; face attachment. Neutral clay, unapproved.',
    limitations:['Opposite side and rear proportions inferred from the concept guide; generated panel camera labels are not geometric proof.','No rig or final coat materials.','Requires owner visual approval.']
  }};
}
