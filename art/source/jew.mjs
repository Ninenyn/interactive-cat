/** Original Jew M1 polygon cage. Coordinates: +Y up, +Z face/front. */
export function createJew() {
  const parts = [];
  const V=(x,y,z)=>[x,y,z];
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const sub=(a,b)=>a.map((v,i)=>v-b[i]);
  const mul=(a,s)=>a.map(v=>v*s);
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm=a=>mul(a,1/(Math.hypot(...a)||1));

  function part(name, vertices, faces, material='clay', authorNotes='') {
    const indices=[];
    for(const f of faces) for(let i=1;i<f.length-1;i++) indices.push(f[0],f[i],f[i+1]);
    // All of these cages are closed: use signed volume for reliable outward winding.
    let volume=0;
    for(let i=0;i<indices.length;i+=3) volume+=dot(vertices[indices[i]],cross(vertices[indices[i+1]],vertices[indices[i+2]]));
    if(volume<0) for(let i=0;i<indices.length;i+=3) [indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
    const result={name,positions:vertices.flat().map(v=>+v.toFixed(6)),indices,material};
    if(authorNotes) result.authorNotes=authorNotes;
    parts.push(result);
    return result;
  }

  function closedLoops(name, loops, material='clay', notes='') {
    const n=loops[0].length, verts=loops.flat(), faces=[];
    for(let j=0;j<loops.length-1;j++) for(let i=0;i<n;i++) {
      const k=(i+1)%n, a=j*n+i,b=j*n+k,c=(j+1)*n+k,d=(j+1)*n+i;
      if((i+j)%2) {faces.push([a,b,d],[b,c,d]);} else {faces.push([a,b,c],[a,c,d]);}
    }
    for(const [j,reverse] of [[0,true],[loops.length-1,false]]) {
      const ring=loops[j], center=ring.reduce((s,p)=>add(s,p),[0,0,0]).map(v=>v/n);
      const ci=verts.length;verts.push(center);
      for(let i=0;i<n;i++) faces.push(reverse?[ci,j*n+(i+1)%n,j*n+i]:[ci,j*n+i,j*n+(i+1)%n]);
    }
    return part(name,verts,faces,material,notes);
  }

  function yCage(name, rows, n=16, material='clay', shape=null,notes='') {
    const loops=rows.map((r,j)=>Array.from({length:n},(_,i)=>{
      const t=i/n*Math.PI*2, sn=Math.sin(t),cs=Math.cos(t);
      let p=[r.x+(r.rx*sn),r.y,r.z+(cs>=0?(r.rf??r.rz):r.rz)*cs];
      return shape?shape(p,{row:r,rowIndex:j,t,sn,cs}):p;
    }));
    return closedLoops(name,loops,material,notes);
  }

  // ONE connected branching surface: torso -> shared shoulder boundaries ->
  // forelegs -> paws. No limb caps or intersecting shoulder primitives exist.
  function connectedBody() {
    const rows=[
      {y:.16,z:-.18,rx:.40,rz:.39,rf:.32},
      {y:.30,z:-.14,rx:.58,rz:.49,rf:.37},
      {y:.52,z:-.13,rx:.62,rz:.49,rf:.39},
      {y:.80,z:-.10,rx:.58,rz:.46,rf:.40},
      {y:1.05,z:-.02,rx:.51,rz:.415,rf:.415},
      {y:1.28,z:.045,rx:.47,rz:.395,rf:.395},
      {y:1.48,z:.10,rx:.425,rz:.36,rf:.36},
      {y:1.65,z:.13,rx:.31,rz:.26,rf:.26},
      {y:1.76,z:.16,rx:.20,rz:.20,rf:.20}
    ];
    const vertices=[],faces=[],n=20;
    const vertex=p=>{const i=vertices.length;vertices.push(p);return i;};
    const quad=(a,b,c,d,parity=0)=>{
      if(parity%2)faces.push([a,b,d],[b,c,d]);else faces.push([a,b,c],[a,c,d]);
    };
    const bridge=(a,b)=>{for(let i=0;i<a.length;i++){const j=(i+1)%a.length;quad(a[i],a[j],b[j],b[i],i);}};
    const cap=(ring,reverse=false)=>{
      const center=ring.reduce((sum,id)=>add(sum,vertices[id]),[0,0,0]).map(x=>x/ring.length),c=vertex(center);
      for(let i=0;i<ring.length;i++){const j=(i+1)%ring.length;faces.push(reverse?[c,ring[j],ring[i]]:[c,ring[i],ring[j]]);}
    };
    const rings=rows.map(r=>Array.from({length:n},(_,i)=>{
      const t=i/n*Math.PI*2,c=Math.cos(t);
      return vertex([r.rx*Math.sin(t),r.y,r.z+c*(c>=0?r.rf:r.rz)]);
    }));
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++) {
      // A 2x2 surface patch on each front shoulder becomes the branch root.
      if((r===4||r===5)&&(i===1||i===2||i===17||i===18))continue;
      const j=(i+1)%n;quad(rings[r][i],rings[r][j],rings[r+1][j],rings[r+1][i],r+i);
    }
    cap(rings[0],true);cap(rings.at(-1));
    const contour=[[-.72,-.86],[0,-1],[.72,-.86],[1,0],[.76,.82],[0,1],[-.76,.82],[-1,0]];
    for(const side of [-1,1]) {
      const start=side===1?1:17;
      let prior=[
        rings[4][start],rings[4][start+1],rings[4][start+2],
        rings[5][start+2],rings[6][start+2],rings[6][start+1],
        rings[6][start],rings[5][start]
      ];
      const specs=[
        // Broad shoulder bend, wrist taper, then a single continuous paw.
        [1.095,.495,.165,.185],
        [.82,.445,.15,.165],
        [.55,.415,.14,.15],
        [.31,.41,.14,.155],
        [.245,.435,.16,.195],
        [.165,.48,.195,.255],
        [.075,.49,.205,.285],
        [.010,.48,.185,.265]
      ];
      for(const [y,z,rx,rz] of specs) {
        const ring=contour.map(([x,zz])=>vertex([side*.285+x*rx,y,z+zz*rz]));
        bridge(prior,ring);prior=ring;
      }
      cap(prior);
    }
    // Remove the two unused patch-center vertices; all remaining vertices are
    // part of the single closed component and all branch boundaries are welded.
    const used=new Set(faces.flat()),remap=new Map(),compact=[];
    for(let i=0;i<vertices.length;i++)if(used.has(i)){remap.set(i,compact.length);compact.push(vertices[i]);}
    part('Jew · connected torso chest forelegs and paws',compact,faces.map(f=>f.map(i=>remap.get(i))),'clay',
      'One closed connected mesh with welded shoulder openings and continuous descending foreleg/paw sections; no overlapping upper-limb cages or shoulder end caps.');
  }
  connectedBody();

  // Rear folded thighs are broad low cages, buried into the trunk at the root.
  for(const s of [-1,1]) {
    yCage(`Jew · ${s<0?'left':'right'} seated haunch`,[
      {y:.12,x:s*.42,z:-.055,rx:.20,rz:.27},
      {y:.23,x:s*.48,z:-.085,rx:.29,rz:.35},
      {y:.43,x:s*.49,z:-.13,rx:.29,rz:.34},
      {y:.65,x:s*.45,z:-.16,rx:.255,rz:.30},
      {y:.82,x:s*.39,z:-.145,rx:.18,rz:.245},
      {y:.92,x:s*.34,z:-.11,rx:.11,rz:.16}
    ],12);
    yCage(`Jew · ${s<0?'left':'right'} rear planted paw`,[
      {y:.015,x:s*.52,z:.17,rx:.175,rz:.255},
      {y:.095,x:s*.52,z:.185,rx:.205,rz:.275},
      {y:.19,x:s*.50,z:.15,rx:.185,rz:.235},
      {y:.265,x:s*.48,z:.095,rx:.135,rz:.185}
    ],12);
  }

  const headRows=[
    {y:1.47,x:0,z:.29,rx:.16,rz:.18,rf:.20},
    {y:1.55,x:0,z:.28,rx:.40,rz:.31,rf:.39},
    {y:1.70,x:0,z:.25,rx:.595,rz:.395,rf:.50},
    {y:1.86,x:0,z:.23,rx:.71,rz:.46,rf:.565},
    {y:2.03,x:0,z:.21,rx:.76,rz:.49,rf:.60},
    {y:2.20,x:0,z:.19,rx:.735,rz:.495,rf:.60},
    {y:2.37,x:0,z:.16,rx:.66,rz:.47,rf:.555},
    {y:2.50,x:0,z:.125,rx:.49,rz:.37,rf:.44},
    {y:2.57,x:0,z:.105,rx:.235,rz:.20,rf:.225},
    {y:2.585,x:0,z:.105,rx:.06,rz:.055,rf:.06}
  ];
  function frontZ(x,y) {
    let a=headRows[0],b=headRows[1];
    for(let i=0;i<headRows.length-1;i++) if(y>=headRows[i].y && y<=headRows[i+1].y){a=headRows[i];b=headRows[i+1];break;}
    const f=Math.max(0,Math.min(1,(y-a.y)/(b.y-a.y))),r={};
    for(const k of ['rx','z','rf']) r[k]=a[k]+(b[k]-a[k])*f;
    const c=Math.sqrt(Math.max(.01,1-(x/r.rx)**2));
    let z=r.z+r.rf*Math.pow(c,.61);
    // Short integrated feline muzzle: very shallow paired pads, not a protruding snout.
    z+=.083*Math.exp(-(((y-1.79)/.155)**2))*Math.exp(-(((Math.abs(x)-.145)/.18)**2));
    return z;
  }
  yCage('Jew · sculpted broad skull and cheeks',headRows,24,'clay',(p,{cs,sn,rowIndex,t})=>{
    // Landmark-led ring heights: central forehead ridge, a lower outer brow,
    // rising cheek plane and a softened jaw interrupt mechanical latitude bands.
    const ridgeHeight=[0,0,-.018,.024,-.018,.030,.044,-.018,0,0][rowIndex];
    p[1]+=ridgeHeight*Math.cos(t*2)*Math.max(0,cs);
    if(cs>0) p[2]=frontZ(p[0],p[1]);
    return p;
  },'Single closed faceted skull: broad cheek contour, short chin, central forehead and integrated muzzle depth.');

  // Triangular ears with deliberately bowed front planes, thick dark-rim geometry.
  for(const s of [-1,1]) {
    const P=(x,y,z)=>[s*x,y,z];
    const verts=[
      P(.275,2.45,.18), P(.73,2.29,.19), P(.765,2.905,.075),
      P(.44,2.505,.235), P(.60,2.60,.185),
      P(.275,2.45,-.04), P(.73,2.29,-.065), P(.765,2.905,-.015),
      P(.51,2.56,-.075)
    ];
    const faces=[[0,1,3],[1,4,3],[1,2,4],[2,0,3],[2,3,4],
      [5,8,6],[6,8,7],[7,8,5],[0,5,6,1],[1,6,7,2],[2,7,5,0]];
    part(`Jew · ${s<0?'left':'right'} thick triangular ear`,verts,faces,'clay');
    const inn=[P(.414,2.482,.226),P(.666,2.405,.208),P(.716,2.77,.12),P(.557,2.56,.223)];
    const back=inn.map(p=>[p[0],p[1],p[2]-.016]);
    part(`Jew · ${s<0?'left':'right'} inset inner ear`,[...inn,...back],[[0,1,3],[1,2,3],[2,0,3],[4,7,5],[5,7,6],[6,7,4],[0,4,5,1],[1,5,6,2],[2,6,4,0]],'innerEar');
  }

  // Almond eye apertures and sculpted rims conform to the curved face.
  // Polygon is intentionally squinted: upward outer corner, low upper lid.
  const eyeXY=[
    [.165,2.078],[.265,2.120],[.395,2.146],[.515,2.151],[.584,2.133],
    [.555,2.067],[.465,2.008],[.350,1.988],[.255,2.014]
  ];
  for(const s of [-1,1]) {
    const center=[.388,2.069];
    const loop=eyeXY.map(([x,y])=>[s*x,y,frontZ(s*x,y)+.020]);
    const lens=eyeXY.map(([x,y])=>{
      const xx=center[0]+(x-center[0])*.67,yy=center[1]+(y-center[1])*.67;
      return [s*xx,yy,frontZ(s*xx,yy)+.031];
    });
    const back=loop.map(([x,y,z])=>[x,y,z-.035]);
    closedLoops(`Jew · ${s<0?'left':'right'} recessed squint aperture`,[back,loop,lens],'eye','Shallow diagnostic dark eye surface follows the skull; no exposed spherical eyeball.');

    const inner=loop.map(p=>[p[0],p[1],p[2]+.003]);
    const outer=eyeXY.map(([x,y],i)=>{
      const xx=center[0]+(x-center[0])*1.16;
      const yy=center[1]+(y-center[1])*1.32+(i<=4?.008:-.003);
      return [s*xx,yy,frontZ(s*xx,yy)+.011];
    });
    const embedded=outer.map(([x,y,z])=>[x,y,z-.040]);
    const vertices=[...inner,...outer,...embedded],faces=[],n=inner.length;
    for(let i=0;i<n;i++) {
      const j=(i+1)%n;
      faces.push([i,j,n+j],[i,n+j,n+i]);
      faces.push([n+i,n+j,2*n+j,2*n+i]);
      faces.push([2*n+i,2*n+j,j,i]);
    }
    part(`Jew · ${s<0?'left':'right'} continuous upper and lower eyelid`,vertices,faces,'clay','Upper lid is lower at the inner corner; the restrained side-eye/squint is modeled in the aperture silhouette.');
  }

  // Small three-dimensional nose, closed mouth and a short philtrum.
  part('Jew · small triangular nose',[
    [-.106,1.911,.912],[0,1.925,.940],[.106,1.911,.912],
    [.062,1.864,.951],[0,1.824,.962],[-.062,1.864,.951],
    [0,1.872,.995],[0,1.883,.889]
  ],[[0,1,6],[1,2,6],[2,3,6],[3,4,6],[4,5,6],[5,0,6],
    [7,1,0],[7,2,1],[7,3,2],[7,4,3],[7,5,4],[7,0,5]],'nose');

  function sweep(name,path,radii,n=8,material='clay',notes='') {
    const loops=path.map((p,i)=>{
      const d=norm(sub(path[Math.min(path.length-1,i+1)],path[Math.max(0,i-1)]));
      let u=norm(cross(Math.abs(d[1])<.92?[0,1,0]:[1,0,0],d));
      const v=norm(cross(d,u));
      return Array.from({length:n},(_,j)=>add(p,add(mul(u,Math.cos(j/n*Math.PI*2)*radii[i]),mul(v,Math.sin(j/n*Math.PI*2)*radii[i]))));
    });
    return closedLoops(name,loops,material,notes);
  }
  sweep('Jew · short philtrum',[[0,1.83,.960],[0,1.795,.952],[0,1.762,.925]],[.009,.009,.008],6,'nose');
  for(const s of [-1,1]) sweep(`Jew · ${s<0?'left':'right'} subtle closed mouth`,[
    [0,1.765,.925],[s*.06,1.741,.924],[s*.13,1.735,.910],[s*.195,1.756,.876]
  ],[.008,.008,.007,.003],6,'nose');

  // Thick curled tail rests outside the seated haunch instead of hovering.
  sweep('Jew · curled seated tail',[
    [-.40,.39,-.48],[-.66,.30,-.46],[-.85,.23,-.31],[-.96,.19,-.08],
    [-.97,.16,.18],[-.90,.14,.405],[-.73,.13,.555],[-.52,.125,.64],[-.38,.13,.625]
  ],[.16,.17,.18,.18,.17,.15,.125,.095,.025],10,'clay','Purpose-built tapered cross-sections follow a ground-level curl, with a buried attachment to the rear torso.');

  // M1 review iteration: bring the head down over a shorter, fuller seated chest.
  // This deforms each closed cage continuously and leaves the ground contact at 0.
  const compressY=y=>y<=1.45 ? y*(1.29/1.45) : y-.16;
  for(const p of parts) for(let i=1;i<p.positions.length;i+=3) p.positions[i]=+compressY(p.positions[i]).toFixed(6);

  return {
    name:'Jew',parts,
    metadata:{
      status:'M1-unreviewed',stage:'M1 original faceted clay blockout',
      sourceReference:'042d83c2-3c1c-4165-99aa-f37c31fa50e2.png',
      sourceReferenceSha256:'3df98037cbbf466a7877302f79c4cc928616acee44de6cefb6092ac7397d2ec5',
      coordinateSystem:'+Y up; +Z front; grounded seated paws',
      targetHeight:2.745,
      revision:'M1.3: torso, chest, both forelegs and front paws are one continuous closed branching mesh with welded shoulder boundaries. Head, face, ears, tail and compact height preserved; clay only.',
      geometryOrigin:'Original numeric polygon cages constructed from the authoritative MISCHIEF STUDY reference; no previous project geometry reused.',
      reviewScope:'Body silhouette, facial proportions, thick ears, eye aperture, seated pose. Materials are neutral diagnostic clay, not approved final coat.',
      limitations:['Single seated M1 pose; not rigged.','No true profile/back reference was supplied; unseen anatomy is a proposal.','Face landmarks and camera must be compared to the source before visual approval.'],
      author:'Reference art-direction agent'
    }
  };
}
