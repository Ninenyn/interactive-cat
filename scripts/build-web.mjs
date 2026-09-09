import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createJew} from '../art/source/jew.mjs';
import {createBo} from '../art/source/bo.mjs';

const root=process.cwd(), out=path.join(root,'dist');
await fs.mkdir(out,{recursive:true});
await fs.cp(path.join(root,'web'),out,{recursive:true});
await fs.mkdir(path.join(out,'models'),{recursive:true});
const assetManifest={stage:'M1-edge',approval:'pending',pipeline:'editable polygon mesh → Three.js → GLB',assets:{},poses:{}};
for(const [pet,create] of [['jew',createJew],['bo',createBo]]){
 const defaultPose=pet==='jew'?'stand':'sit';assetManifest.poses[pet]={};
 for(const pose of ['stand','sit','walk']){
  const filename=pet+'-'+pose+'.mesh.json',sourcePath=path.join(root,'art/meshes',filename);let bytes;
  if(!process.argv.includes('--regenerate')){try{bytes=await fs.readFile(sourcePath,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}}
  if(bytes===undefined){const generated=create({pose});generated.schemaVersion=1;bytes=JSON.stringify(generated);await fs.mkdir(path.dirname(sourcePath),{recursive:true});await fs.writeFile(sourcePath,bytes);}
  const model=JSON.parse(bytes),hash=crypto.createHash('sha256').update(bytes).digest('hex');
  await fs.writeFile(path.join(out,'models',filename),bytes);
  assetManifest.poses[pet][pose]={name:model.name,pose,sha256:hash,bytes:Buffer.byteLength(bytes),vertices:model.parts.reduce((n,p)=>n+p.positions.length/3,0),triangles:model.parts.reduce((n,p)=>n+p.indices.length/3,0)};
  if(pose===defaultPose){
   const canonical=path.join(root,'art/meshes',pet+'.mesh.json');
   if(process.argv.includes('--regenerate'))await fs.writeFile(canonical,bytes);
   else{try{bytes=await fs.readFile(canonical,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;await fs.writeFile(canonical,bytes);}}
   await fs.writeFile(path.join(out,'models',pet+'.mesh.json'),bytes);
   const base=JSON.parse(bytes);assetManifest.assets[pet]={...assetManifest.poses[pet][pose],sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:Buffer.byteLength(bytes),vertices:base.parts.reduce((n,p)=>n+p.positions.length/3,0),triangles:base.parts.reduce((n,p)=>n+p.indices.length/3,0)};
  }
 }
}
await fs.writeFile(path.join(out,'models/manifest.json'),JSON.stringify(assetManifest,null,2));
const vendorFiles=['build/three.module.js','build/three.core.js','examples/jsm/controls/OrbitControls.js','examples/jsm/controls/TransformControls.js','examples/jsm/exporters/GLTFExporter.js','examples/jsm/loaders/GLTFLoader.js','examples/jsm/utils/BufferGeometryUtils.js','examples/jsm/utils/SkeletonUtils.js'];
for(const relative of vendorFiles){
 const dest=path.join(out,'vendor/three',relative);
 await fs.mkdir(path.dirname(dest),{recursive:true});
 await fs.copyFile(path.join(root,'node_modules/three',relative),dest);
}
await fs.mkdir(path.join(out,'references'),{recursive:true});
for(const [from,to] of [['042d83c2-3c1c-4165-99aa-f37c31fa50e2.png','jew.png'],['bdf4310f-fcdc-4e2e-bd86-7de37229f673.png','bo.png'],['4506533e-61b3-4a79-8ffd-74c9718bf058.png','jew-anatomy.png'],['e2f28ba6-cf77-4a20-875b-6c6a173c3481.png','bo-anatomy.png']]){
 await fs.copyFile(path.join(root,'references/original',from),path.join(out,'references',to));
}
for(const pet of ['jew','bo'])await fs.copyFile(path.join(root,'references/edge-study',pet+'-edge-study.png'),path.join(out,'references',pet+'-edge-study.png'));
console.log(JSON.stringify({status:'built',assets:assetManifest.assets,poses:assetManifest.poses}));

await fs.mkdir(path.join(out,'studies'),{recursive:true});
for(const pet of ['jew','bo'])for(const sheet of ['turnaround','poses']){const name=pet+'-'+sheet+'.png';try{await fs.copyFile(path.join(root,'review/M1-edge',name),path.join(out,'studies',name));}catch(error){if(error.code!=='ENOENT')throw error;}}
