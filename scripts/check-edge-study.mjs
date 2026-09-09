import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

// Evidence is captured from the production Three.js viewer and its loaded JSON.
// The board page only arranges those screenshots; it never draws replacement art.
const dir='review/M1-edge';
const angles=[0,45,90,135,180,225,270,315],poses=['stand','sit','walk'];
const basePose={jew:'stand',bo:'sit'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
await fs.mkdir(dir,{recursive:true});
const report={stage:'M1-edge',artApproval:'pending',evidence:'ACTUAL WEB MESH',physicalDeviceTested:false,poseMeaning:'Authored static pose studies; no animation rig claimed',angles,poses,assets:{},frames:[],boards:[],checks:[]};
const errors=[];
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Review server did not become ready')),15000);server.stdout.on('data',d=>{if(d.toString().includes('ready')){clearTimeout(timer);resolve();}});server.once('error',e=>{clearTimeout(timer);reject(e);});server.once('exit',code=>{clearTimeout(timer);reject(new Error('Review server exited '+code));});});
 browser=await chromium.launch({channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:3212/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__studio?.ready(),{timeout:25000});
 // Hide only HTML labels/buttons over the canvas for clean evidence panels.
 // Visibility preserves the exact viewport, camera fitting, lighting and mesh.
 await page.addStyleTag({content:'.stage > :not(#canvas-host) { visibility:hidden !important; }'});
 report.capturePresentation='Only HTML stage labels and controls hidden; canvas layout, mesh, camera and lighting unchanged';
 const manifest=JSON.parse(await fs.readFile('dist/models/manifest.json','utf8'));
 report.manifestHash=sha(await fs.readFile('dist/models/manifest.json'));
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 for(const pet of ['jew','bo']){
  await page.evaluate(p=>window.__studio.choosePet(p),pet);
  report.assets[pet]={};
  for(const pose of poses){
   await page.evaluate(p=>window.__studio.setPose(p),pose);await settle();
   await page.evaluate(()=>window.__studio.applySurface('edge'));
   const source=await page.evaluate(()=>JSON.stringify(window.__studio.source()));
   const info=await page.evaluate(()=>window.__studio.info());
   assert.equal(info.pet,pet);assert.equal(info.pose,pose);assert.ok(info.edgeOverlays>0,'visible actual triangle edges');
   const entry=manifest.poses?.[pet]?.[pose]||manifest.assets[pet+'-'+pose]||(basePose[pet]===pose?manifest.assets[pet]:null);
   assert.ok(entry,'pose is published in built manifest');assert.equal(info.sourceHash,entry.sha256);
   const response=await page.request.get('http://127.0.0.1:3212/models/'+pet+'-'+pose+'.mesh.json');assert.ok(response.ok(),'pose JSON served successfully');const served=await response.body();assert.equal(sha(served),entry.sha256,'served bytes match manifest');assert.deepEqual(JSON.parse(served.toString('utf8')).parts,JSON.parse(source).parts,'rendered source equals served indexed mesh');
   for(const angle of angles){
    await page.evaluate(a=>window.__studio.setAngle(a),angle);await settle();
    const camera=await page.evaluate(()=>window.__studio.info());
    assert.equal(camera.angle,angle);assert.equal(camera.surface,'edge');
    const filename=pet+'-'+pose+'-edge-'+String(angle).padStart(3,'0')+'.png';
    const bytes=await page.locator('#canvas-host canvas').screenshot({path:dir+'/'+filename});
    report.frames.push({pet,pose,angle,filename,sha256:sha(bytes),sourceHash:info.sourceHash,triangles:info.triangles,camera:camera.camera,target:camera.target,frustum:camera.frustum,viewport:camera.viewport});
   }
   // Export while edges are visible: every GLB primitive must still be triangles.
   const base64=await page.evaluate(async()=>{window.__edgeGLB=await window.__studio.exportGLB();let text='';const b=new Uint8Array(window.__edgeGLB);for(let i=0;i<b.length;i+=32768)text+=String.fromCharCode(...b.subarray(i,i+32768));return btoa(text);});
   const bytes=Buffer.from(base64,'base64');assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
   assert.equal(bytes.readUInt32LE(16),0x4e4f534a);const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8').trim());
   const primitives=gltf.meshes.flatMap(m=>m.primitives);assert.equal(primitives.length,info.exportPrimitives);
   assert.ok(primitives.every(p=>(p.mode??4)===4),'edge overlays must never become GLB line primitives');
   assert.ok((gltf.nodes||[]).every(n=>!n.extras?.edgeStudy),'diagnostic edge overlay nodes excluded');
   await fs.writeFile(dir+'/'+pet+'-'+pose+'-M1.glb',bytes);
   await page.evaluate(()=>window.__studio.setAngle(45));
   await page.evaluate(()=>window.__studio.showImported(window.__edgeGLB));await settle();
   const importFilename=pet+'-'+pose+'-glb-import.png';const imported=await page.locator('#canvas-host canvas').screenshot({path:dir+'/'+importFilename});
   await page.evaluate(()=>window.__studio.showSource());
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__studio.source())),source,'pose source survives GLB export/reimport unchanged');
   report.assets[pet][pose]={...info,glbHash:sha(bytes),glbBytes:bytes.length,glbPrimitives:primitives.length,allGLBPrimitivesTriangles:true,importFilename,importScreenshotHash:sha(imported)};
  }
 }
 assert.equal(report.frames.length,48);assert.deepEqual(errors,[]);
 const boardPage=await browser.newPage({viewport:{width:2160,height:1400},deviceScaleFactor:1});
 async function board(pet,type,frames,columns){
  const tiles=[];for(const frame of frames){const data=(await fs.readFile(dir+'/'+frame.filename)).toString('base64');tiles.push(`<article><div class="label">${frame.pose.toUpperCase()} · ${frame.angle}°</div><img src="data:image/png;base64,${data}" alt="Actual ${pet} ${frame.pose} ${frame.angle} degree triangle mesh"><footer>${frame.triangles.toLocaleString('en-US')} triangles · mesh ${frame.sourceHash.slice(0,12)}</footer></article>`);}
  const title=type==='turnaround'?'360° TRIANGLE EDGE STUDY':'POSE & EDGE STUDY';
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${pet} ${title}</title><style>*{box-sizing:border-box}body{margin:0;background:white;color:#202322;font:18px Arial,sans-serif}.board{width:2160px;padding:48px}header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid #24362f;padding-bottom:20px}h1{font-size:42px;letter-spacing:-1px;margin:0}.tag{font-weight:700;letter-spacing:2px;color:#2e5c46}.note{font-size:20px;line-height:1.5;color:#626861;margin:16px 0 28px}.grid{display:grid;grid-template-columns:repeat(${columns},1fr);gap:20px}article{border:1px solid #d7dbd6;border-radius:10px;overflow:hidden}.label{font-size:21px;font-weight:700;padding:15px 18px;background:#f4f6f2}img{display:block;width:100%;height:${columns===4?390:440}px;object-fit:contain;background:#f6f3ee}footer{padding:12px 18px;font-size:15px;color:#666b64}.bottom{margin-top:25px;font-size:18px;color:#656b62}</style></head><body><main class="board"><header><h1>${pet.toUpperCase()} / ${title}</h1><span class="tag">ACTUAL WEB MESH</span></header><p class="note">M1 · VISUAL APPROVAL PENDING · Exact indexed triangle edges from the web app.<br>0° front · 90° side · 180° back · 270° opposite side. Unseen reference angles are inferred geometry.</p><section class="grid">${tiles.join('')}</section><p class="bottom">${type==='turnaround'?'One source pose and one mesh revision across all eight views.':'Stand / sit / walk are static shape studies with shared topology; this is not a finished animation rig.'} Clay surfaces · No reference images or generated artwork used in this evidence board.</p></main></body></html>`;

  await boardPage.setContent(html,{waitUntil:'load'});await boardPage.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  const filename=pet+'-'+type+'.png';const bytes=await boardPage.locator('.board').screenshot({path:dir+'/'+filename});
  report.boards.push({pet,type,filename,sha256:sha(bytes),frameFiles:frames.map(f=>f.filename),source:'Layout of actual WebGL screenshots only'});
 }
 for(const pet of ['jew','bo']){
  await board(pet,'turnaround',report.frames.filter(f=>f.pet===pet&&f.pose===basePose[pet]),4);
  await board(pet,'poses',report.frames.filter(f=>f.pet===pet&&[0,45,90].includes(f.angle)),3);
 }
 report.checks=['48 real WebGL triangle-edge captures: 8 azimuth angles × 3 authored poses × 2 pets','6 manifest-bound source hashes','6 GLB export/fresh import checks while diagnostic edges visible','GLB contains triangles only, no diagnostic edge nodes','GLB export/reimport does not mutate source','4 actual-mesh contact sheets'];
 report.status='PASS';report.browserVersion=browser.version();
 await fs.writeFile(dir+'/edge-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,frames:report.frames.length,boards:report.boards,assets:report.assets,browserVersion:report.browserVersion}));
}catch(error){report.status='FAIL';report.errors=[error.stack||error.message,...errors];await fs.writeFile(dir+'/edge-report.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report.errors));process.exitCode=1;}
finally{if(browser)await browser.close();server.kill('SIGTERM');}
