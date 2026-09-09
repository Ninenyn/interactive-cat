/** Jew M1 standing anatomy revision. Original shared-index polygon surface. */
export function createJew() {
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
  const rows=[
    [-1.30,1.59,.26,.32],[-1.13,1.58,.36,.43],[-.86,1.60,.39,.44],[-.57,1.62,.34,.35],
    [-.23,1.60,.35,.38],[.12,1.58,.38,.46],[.42,1.61,.37,.49],[.68,1.76,.32,.48],
    [.85,1.97,.285,.43],[1.01,2.19,.34,.395],[1.22,2.28,.43,.39],[1.39,2.27,.425,.35],
    [1.51,2.235,.345,.245],[1.59,2.215,.22,.155],[1.64,2.23,.087,.065],[1.66,2.23,.069,.05]
  ];
  const n=16;
  const rings=rows.map(([z,y,rx,ry],r)=>Array.from({length:n},(_,i)=>{
    const t=i/n*Math.PI*2;
    // Lower cheek pads broaden the muzzle while its forehead recedes gently.
    const cheek=(r===11||r===12)?1+.10*Math.max(0,-Math.cos(t)):1;
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
      [1.24,.31,.42,.15,.19],[1.01,.30,.35,.125,.15],[.77,.29,.38,.10,.11],
      [.48,.29,.41,.086,.09],[.22,.29,.44,.085,.09],[.105,.29,.50,.13,.20],[.015,.29,.52,.14,.22]
    ]:[
      [1.28,.33,-.79,.20,.23],[1.02,.32,-.60,.16,.19],[.78,.31,-.77,.105,.13],
      [.55,.30,-1.01,.085,.11],[.26,.30,-1.02,.071,.083],[.10,.30,-.93,.115,.19],[.015,.30,-.91,.125,.21]
    ];
    for(const [y,x,z,rx,rz] of specs){const next=contour.map(([dx,dz])=>vertex([s*x+dx*rx,y,z+dz*rz]));bridge(prior,next);prior=next;}
    cap(prior);
    anatomicalLandmarks[`${s<0?'left':'right'}_${type}`]=specs.map(([y,x,z])=>[s*x,y,z]);
  }
  // The tail grows directly out of the rump ring. Its root shares all sixteen
  // boundary vertices; cross-sections rotate with the raised tail centerline.
  let prior=[...rings[0]].reverse();
  const tailPath=[[-1.47,1.64,.20],[-1.64,1.78,.145],[-1.80,2.03,.12],[-1.96,2.36,.105],[-2.03,2.72,.085],[-1.99,3.05,.070],[-1.88,3.24,.055],[-1.73,3.28,.036],[-1.66,3.23,.012]];
  for(let k=0;k<tailPath.length;k++){
    const [z,y,r]=tailPath[k],prev=k?tailPath[k-1]:[-1.30,1.59],next=tailPath[Math.min(k+1,tailPath.length-1)];
    const d=unit([0,next[1]-prev[1],next[0]-prev[0]]),u=[1,0,0],v=unit(cross(d,u));
    // Same angular order as reversed rump boundary, avoiding a twisted root.
    const ring=Array.from({length:n},(_,j)=>{const t=(n-1-j)/n*Math.PI*2;return vertex(add([0,y,z],add(scale(u,Math.sin(t)*r),scale(v,-Math.cos(t)*r))));});
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
    const P=(x,y,z)=>[s*x,y,z];
    const v=[P(.12,2.51,1.38),P(.38,2.44,1.31),P(.345,2.79,1.11),P(.255,2.58,1.32),
      P(.12,2.49,1.08),P(.38,2.43,1.025),P(.345,2.77,1.025)];
    finalize(`Jew · ${s<0?'left':'right'} rooted triangular ear`,v,[[0,1,3],[1,2,3],[2,0,3],[4,6,5],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,4],[2,4,0]],null,'clay','Lower ear wedge penetrates the skull; upper rim is thick rather than a floating sheet.');
    attachmentEvidence.push({part:`Jew · ${s<0?'left':'right'} rooted triangular ear`,kind:'embeddedBase',point:P(.24,2.50,1.20)});
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
  for(const s of [-1,1]){
    projectedEye(`Jew · ${s<0?'left':'right'} squint eye`,[[s*.085,2.37],[s*.15,2.415],[s*.255,2.43],[s*.306,2.418],[s*.266,2.367],[s*.17,2.347]],'eye',.023,.009);
  }
  // Mouth branches and philtrum are embedded ribbons on the muzzle. Front and
  // back samples straddle the real surface, guaranteeing visible attachment.
  projectedPatch('Jew · attached short philtrum',[[-.006,2.205],[.006,2.205],[.006,2.148],[-.006,2.148]],'nose',.012,.0025);
  for(const s of [-1,1]){
    const path=[[0,2.15],[s*.038,2.126],[s*.083,2.123],[s*.112,2.137]],a=[],b=[];
    for(const [x,y] of path){a.push([x,y+.003]);b.push([x,y-.003]);}
    projectedPatch(`Jew · ${s<0?'left':'right'} attached closed mouth`,[...a,...b.reverse()],'nose',.014,.0025);
  }
  return {name:'Jew',parts,metadata:{
    status:'M1-revise',stage:'M1 standing anatomical clay revision',coordinateSystem:'+Y up; +Z forward; all four paws grounded',
    sourceReference:'4506533e-61b3-4a79-8ffd-74c9718bf058.png',sourceReferenceSha256:'8b055e21f97e3389a12bf08460bd6dd7cce0c993867175014aabbe67d2d2a218',
    identityReference:'042d83c2-3c1c-4165-99aa-f37c31fa50e2.png',
    revision:'M1.6: eyes tessellated along actual host skull triangles to eliminate interior intersections; shorter feline muzzle, fuller cheeks and lower broad triangular ears after real side/hero render review; standing cat based on full-body anatomy reference; shared-index body, four limbs, neck, head, muzzle, nose and tail. Face details projected onto actual triangles.',
    anatomy:{pose:'standing quadruped',ribcageAxis:'horizontal',paws:4,headBodyRatio:'reduced from seated chibi; short feline muzzle',limbLandmarks:anatomicalLandmarks},
    attachmentEvidence,continuousSkinPart:skin.name,noseConnection:'Nose triangles share vertices with the muzzle within the same closed connected component.',
    targetHeight:3.28,reviewScope:'Full side silhouette; shoulder and hip placement; rear stifle/hock bends; four planted paws; face attachment. Neutral clay, unapproved.',
    limitations:['Opposite side and rear proportions inferred from supplied side reference.','No rig or final coat materials.','Requires owner visual approval.']
  }};
}
