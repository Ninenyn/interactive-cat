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

// Anatomical section: flattened breast/front planes and fuller rear quarters.
function bodySection(mesh, y, width, front, back, count = 16) {
  const zc = (front + back) / 2;
  const depth = (front - back) / 2;
  return Array.from({ length: count }, (_, i) => {
    const t = i * TAU / count;
    const s = Math.sin(t), c = Math.cos(t);
    // Broad intentional planes around front chest, with no stochastic decimation.
    return vertex(mesh, [width * s, y, zc + depth * c]);
  });
}

function bodyAndForelegs() {
  const mesh = part('Bo_connected_chest_haunches_forelegs');
  const specs = [
    [0.075, 0.56, 0.22, -0.57],
    [0.24, 0.73, 0.33, -0.76],
    [0.55, 0.76, 0.43, -0.80],
    [0.95, 0.65, 0.59, -0.63],
    [1.35, 0.59, 0.62, -0.43],
    [1.65, 0.54, 0.59, -0.29],
    [1.89, 0.40, 0.46, -0.15],
    [2.015, 0.32, 0.42, -0.08],
  ];
  const rings = specs.map(s => bodySection(mesh, ...s));
  // Two actual openings in the torso become forelegs; these are welded branches.
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < 16; i++) {
      if ((r === 2 || r === 3) && (i === 1 || i === 2 || i === 13 || i === 14)) continue;
      const j = (i + 1) % 16;
      quad(mesh, rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i], r + i);
    }
  }
  cap(mesh, rings[0], [0, 0.075, -0.16], true);
  cap(mesh, rings.at(-1), [0, 2.015, 0.17]);

  for (const side of [-1, 1]) {
    const start = side === 1 ? 1 : 13;
    // Perimeter of a 2x2 front-side torso patch, preserving shared vertex IDs.
    const opening = [
      rings[2][start], rings[2][start + 1], rings[2][start + 2],
      rings[3][start + 2], rings[4][start + 2], rings[4][start + 1],
      rings[4][start], rings[3][start],
    ];
    const centerX = side * 0.455;
    const layouts = [
      [1.015, 0.650, 0.195, 0.205],
      [0.66, 0.655, 0.190, 0.205],
      [0.31, 0.690, 0.175, 0.205],
      [0.190, 0.735, 0.205, 0.252],
      [0.075, 0.756, 0.223, 0.290],
      [0.000, 0.743, 0.202, 0.265],
    ];
    let prior = opening;
    for (const [y, z, halfX, halfZ] of layouts) {
      // Boundary order rotates from the side-facing root to a down-facing paw.
      const contour = [[-0.72,-0.86],[0,-1],[0.72,-0.86],[1,0],[0.76,0.82],[0,1],[-0.76,0.82],[-1,0]];
      const ring = contour.map(([x, zz]) => vertex(mesh, [centerX + x * halfX, y, z + zz * halfZ]));
      const ordered = ring;
      bridge(mesh, prior, ordered);
      prior = ordered;
    }
    cap(mesh, prior, [centerX, 0, 0.743]);
  }
  return mesh;
}

function rearPaw(side) {
  const mesh = part(`Bo_${side < 0 ? 'left' : 'right'}_seated_hind_paw`);
  const cx = side * 0.654;
  const levels = [[0,0.185,0.17,0.245],[0.075,0.185,0.195,0.270],[0.205,0.17,0.205,0.235],[0.31,0.11,0.18,0.195]];
  let first, prior;
  for (const [y,z,rx,rz] of levels) {
    const ring = Array.from({length:8}, (_,i) => {
      const t=i*TAU/8;
      return vertex(mesh,[cx+rx*Math.sin(t),y,z+rz*Math.cos(t)]);
    });
    if (prior) bridge(mesh, prior, ring);
    else first = ring;
    prior = ring;
  }
  cap(mesh,first,[cx,0,0.235],true);
  cap(mesh,prior,[cx,0.31,0.11]);
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
  const basis=(x,y,depth)=>[cx+x*0.127,cy+y*0.151,0.839-side*x*0.037-y*0.055+depth];
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
  const parts=[bodyAndForelegs(),rearPaw(-1),rearPaw(1),head(),muzzle(),hangingEar(-1),hangingEar(1),eye(-1),eye(1),nose(),restingTail()];
  // Proportion correction after actual renderer review: shorten the seated torso
  // while preserving the head, then retain the shared ~3-unit display height.
  const shoulderCut=1.835, torsoScale=0.92, reduction=shoulderCut*(1-torsoScale);
  const uniform=3.015/(3.015-reduction);
  for(const p of parts) for(let i=0;i<p.positions.length;i+=3) {
    const y=p.positions[i+1];
    p.positions[i]*=uniform;
    p.positions[i+1]=(y<shoulderCut?y*torsoScale:y-reduction)*uniform;
    p.positions[i+2]*=uniform;
  }
  return {
    name: 'Bo',
    parts,
    metadata: {
      status: 'M1-unreviewed',
      sourceHash: '41b6d8fbdf8d9f41a71b4cd688ccbaf5fa2a6606abd166ae1d1570ada8274feb',
      reference: 'Concept 01, Bo lower-left seated pose',
      authoring: 'Original deterministic connected polygon-ring body with welded foreleg branches; hand-shaped skull, muzzle and folded ear patches',
      stage: 'Clay silhouette/proportion review; no final color, rig or production animation',
      revision: 'M1 visual revision 2: shorter fuller torso, continuous shoulder sections, less flared paws, narrower/taller muzzle, shallow smooth eye lenses',
      coordinates: '+Y up, +Z forward; ground Y=0',
      expectedHeight: 3.015,
      reviewFocus: ['puppy head/body proportion','short wide muzzle','full hanging ear silhouette','sturdy planted forepaws','seated haunch and resting tail'],
    },
  };
}
