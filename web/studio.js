import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const host=$('#canvas-host'), stage=$('.stage');
const meta={
 jew:{title:'Jew',subtitle:'แมวยืนสี่ขา · โครงสีเทา',reference:'โครงแมวเต็มตัว',view:'STAND / ANATOMY',focus:['หัว ปาก และจมูกเป็นผิวต่อเนื่อง','แนวหลัง อก และท้องตามภาพเต็มตัว','สี่ขา ข้อขาหลัง และอุ้งเท้ารับพื้น']},
 bo:{title:'Bo',subtitle:'โกลเด้นท่านั่ง · โครงสีเทา',reference:'โครงโกลเด้นเต็มตัว',view:'SIT / ANATOMY',focus:['สัดส่วนหัวต่ออกตามภาพเต็มตัว','แนวไหล่ ศอก ข้อมือ และขาหน้า','สะโพกพับ ขาหลัง และอุ้งเท้ารับพื้น']}
};
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}
catch(error){$('#load-state').textContent='เบราว์เซอร์นี้เปิดโมเดล 3D ไม่ได้ กรุณาใช้เบราว์เซอร์ที่รองรับ WebGL';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
host.append(renderer.domElement);
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-3,3,2.3,-2.3,.1,60);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.085;
controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.5;
controls.minPolarAngle=.12;controls.maxPolarAngle=Math.PI*.51;
controls.autoRotateSpeed=.7;
scene.add(new THREE.HemisphereLight(0xfff7ec,0xc9bbaa,2.25));
const key=new THREE.DirectionalLight(0xfff3e0,3.4);
key.position.set(-3,9,5);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-3.3;key.shadow.camera.right=3.3;key.shadow.camera.top=3.3;key.shadow.camera.bottom=-3.3;
key.shadow.camera.near=.1;key.shadow.camera.far=18;key.shadow.bias=-.001;key.shadow.normalBias=.06;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight(0xf0f3ff,1.1);fill.position.set(5,4,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xfff8e9,1.8);rim.position.set(2,5,-5);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x5e4c3c,opacity:.14}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
const ring=new THREE.Mesh(new THREE.RingGeometry(2.05,2.057,100),new THREE.MeshBasicMaterial({color:0xc0b19e,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));
ring.rotation.x=-Math.PI/2;ring.position.y=-.013;scene.add(ring);
const pointGroup=new THREE.Group();scene.add(pointGroup);
const marker=new THREE.Mesh(new THREE.SphereGeometry(.03,12,8),new THREE.MeshBasicMaterial({color:0xb87f44,depthTest:false}));
marker.renderOrder=20;marker.visible=false;scene.add(marker);
const transform=new TransformControls(camera,renderer.domElement);transform.setMode('translate');transform.setSize(.55);scene.add(transform.getHelper());
transform.addEventListener('dragging-changed',e=>{controls.enabled=!e.value;});

let pet='jew',model=null,modelRoot=null,importedRoot=null,manifest=null;
let referenceMode='anatomy';
let surface='clay',currentView='hero',editing=false,selection=null,undo=[],request=0,edited=false;
const loaded=new Map();
const partMeshes=new Map();
const readJSON=async url=>{const r=await fetch(url);if(!r.ok)throw new Error('โหลดไฟล์ไม่สำเร็จ');return r.json();};
// M1 uses neutral studio light and a ground shadow; self shadows are deferred to material review.
const materials=()=>({
 clay:new THREE.MeshStandardMaterial({color:0xbab7b1,roughness:.88,metalness:0,flatShading:true}),
 eye:new THREE.MeshStandardMaterial({color:0x3f3c36,roughness:.45,metalness:0,flatShading:false}),
 nose:new THREE.MeshStandardMaterial({color:0x6e6960,roughness:.8,metalness:0,flatShading:true}),
 innerEar:new THREE.MeshStandardMaterial({color:0xa39d94,roughness:.94,metalness:0,flatShading:true})
});
function disposeMaterial(value){for(const m of Array.isArray(value)?value:[value])m?.dispose();}
function clayMaterialFor(mesh,palette){const names=mesh.userData.materialKinds;if(names)return names.map(name=>(palette[name]||palette.clay).clone());return (palette[mesh.userData.materialKind]||palette.clay).clone();}
function disposeTree(root){if(!root)return;root.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});root.removeFromParent();}
function clearPoints(){for(const child of [...pointGroup.children])disposeTree(child);}
function clearSelection(){selection=null;transform.detach();marker.visible=false;$('#vertex-label').textContent='ยังไม่ได้เลือกจุดยอด';for(const axis of ['x','y','z'])$('#vertex-'+axis).disabled=true;}
function validateMesh(value){
 if(!value||!Array.isArray(value.parts)||!value.parts.length||value.parts.length>200)throw new Error('ไฟล์ต้องมีรายการ mesh parts');
 let total=0;
 for(const p of value.parts){
  if(!p||typeof p.name!=='string'||!Array.isArray(p.positions)||p.positions.length<9||p.positions.length%3||!Array.isArray(p.indices)||p.indices.length<3||p.indices.length%3)throw new Error('รูปแบบ mesh ไม่ถูกต้อง');
  total+=p.positions.length/3;
  if(total>150000||p.positions.some(v=>!Number.isFinite(v)||Math.abs(v)>50))throw new Error('พิกัดหรือขนาดโมเดลไม่ถูกต้อง');
  if(p.indices.some(v=>!Number.isInteger(v)||v<0||v>=p.positions.length/3))throw new Error('ดัชนีจุดยอดไม่ถูกต้อง');
  if(p.materialGroups){let offset=0;if(!Array.isArray(p.materialGroups)||!p.materialGroups.length)throw new Error('กลุ่มวัสดุไม่ถูกต้อง');for(const g of p.materialGroups){if(g.start!==offset||!Number.isInteger(g.count)||g.count<=0||g.count%3||!['clay','nose','eye','innerEar'].includes(g.material))throw new Error('ขอบเขตวัสดุไม่ถูกต้อง');offset+=g.count;}if(offset!==p.indices.length)throw new Error('กลุ่มวัสดุต้องครอบคลุมผิวทั้งหมด');}
 }
 return value;
}
function buildModel(value){
 disposeTree(modelRoot);disposeTree(importedRoot);importedRoot=null;clearPoints();clearSelection();partMeshes.clear();
 model=structuredClone(validateMesh(value));
 modelRoot=new THREE.Group();modelRoot.name=pet+'-m1-clay';
 const palette=materials();
 model.parts.forEach((part,i)=>{
  let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setIndex(part.indices);if(part.material!=='eye'){const flat=g.toNonIndexed();g.dispose();g=flat;}g.computeVertexNormals();g.computeBoundingSphere();
  const kinds=part.materialGroups?.map(group=>group.material);if(kinds)part.materialGroups.forEach((group,n)=>g.addGroup(group.start,group.count,n));
  const mesh=new THREE.Mesh(g,kinds?kinds.map(kind=>(palette[kind]||palette.clay).clone()):(palette[part.material]||palette.clay).clone());mesh.name=part.name;mesh.castShadow=true;mesh.receiveShadow=false;mesh.userData={partIndex:i,materialKind:part.material||'clay',materialKinds:kinds,renderToSource:part.material==='eye'?null:[...part.indices]};modelRoot.add(mesh);partMeshes.set(i,mesh);
 });
 Object.values(palette).forEach(m=>m.dispose());
 const box=new THREE.Box3().setFromObject(modelRoot),center=box.getCenter(new THREE.Vector3());
 modelRoot.position.set(-center.x,-box.min.y,-center.z);scene.add(modelRoot);modelRoot.updateMatrixWorld(true);
 rebuildPoints();applySurface(surface);updateStats();
}
function rebuildPoints(){
 clearPoints();
 for(const [i,mesh] of partMeshes){
  const pointGeometry=new THREE.BufferGeometry();pointGeometry.setAttribute('position',new THREE.Float32BufferAttribute(model.parts[i].positions,3));const point=new THREE.Points(pointGeometry,new THREE.PointsMaterial({color:0x8c673f,size:.016,depthTest:true,sizeAttenuation:true}));
  point.position.copy(modelRoot.position);point.visible=editing;point.userData.partIndex=i;pointGroup.add(point);
 }
}
function frameModel(direction,focusBox){
 const ratio=host.clientWidth/host.clientHeight||1;
 if(!modelRoot){const h=4.5;camera.left=-h*ratio/2;camera.right=h*ratio/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();return;}
 const box=focusBox||new THREE.Box3().setFromObject(modelRoot),center=box.getCenter(new THREE.Vector3());
 const dir=direction?new THREE.Vector3(...direction).normalize():camera.position.clone().sub(controls.target).normalize();
 camera.position.copy(center).addScaledVector(dir,10);camera.lookAt(center);camera.updateMatrixWorld(true);
 const inverse=camera.quaternion.clone().invert();let loX=Infinity,hiX=-Infinity,loY=Infinity,hiY=-Infinity;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const v=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);loX=Math.min(loX,v.x);hiX=Math.max(hiX,v.x);loY=Math.min(loY,v.y);hiY=Math.max(hiY,v.y);}
 const h=Math.max((hiY-loY)/.68,(hiX-loX)/(ratio*.80),2);
 const screenUp=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 controls.target.copy(center).addScaledVector(screenUp,-h*.045);camera.position.copy(controls.target).addScaledVector(dir,10);camera.zoom=1;
 camera.left=-h*ratio/2;camera.right=h*ratio/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();controls.update();
}
function focusFace(view='side'){
 const box=new THREE.Box3();for(const mesh of partMeshes.values())if(/(skull|head|muzzle|nose|eye|ear|mouth|philtrum)/i.test(mesh.name)&&!/welded standing skin/.test(mesh.name))box.union(new THREE.Box3().setFromObject(mesh));
 if(box.isEmpty())return;box.expandByScalar(.10);controls.autoRotate=false;$('#turntable').setAttribute('aria-pressed','false');currentView='face-'+view;frameModel(view==='side'?[9,0,0]:[5.5,1.8,8],box);
}
$('#face-closeup').onclick=()=>focusFace('side');
function setView(view){
 currentView=view;controls.autoRotate=false;$('#turntable').setAttribute('aria-pressed','false');
 const positions={hero:pet==='jew'?[8,2.6,5]:[5.5,2.5,8],front:[0,0,9],side:[9,0,0],back:[0,0,-9]};
 frameModel(positions[view]||positions.hero);
 $$('[data-view]').forEach(b=>{const yes=b.dataset.view===view;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
}
function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);frameModel();}
new ResizeObserver(resize).observe(host);
function applySurface(next){
 surface=next;
 partMeshes.forEach(mesh=>{
  disposeMaterial(mesh.material);
  if(next==='silhouette')mesh.material=new THREE.MeshBasicMaterial({color:0x37312a});
  else if(next==='wire')mesh.material=new THREE.MeshBasicMaterial({color:0x756149,wireframe:true});
  else{const palette=materials();mesh.material=clayMaterialFor(mesh,palette);Object.values(palette).forEach(m=>m.dispose());}
 });
 floor.visible=next!=='wire';
 $$('[data-surface]').forEach(b=>{const yes=b.dataset.surface===next;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
}
function updateStats(){const verts=model.parts.reduce((n,p)=>n+p.positions.length/3,0),tris=model.parts.reduce((n,p)=>n+p.indices.length/3,0);$('#mesh-count').textContent=verts.toLocaleString()+' vertices · '+tris.toLocaleString()+' faces';$('#source-version').textContent=edited?'M1 · ฉบับแก้ไข':'M1 · '+(manifest?.assets[pet]?.sha256.slice(0,7)||'v1');}
async function choosePet(next){
 const id=++request;$('#load-state').classList.remove('hidden');
 try{
  if(!loaded.has(next))loaded.set(next,await readJSON('/models/'+next+'.mesh.json'));
  if(id!==request)return;
  pet=next;edited=false;undo=[];$('#undo-edit').disabled=true;$('#draft-note').textContent='';
  buildModel(loaded.get(next));setView('hero');
  const m=meta[pet];$('#pet-title').textContent=m.title;$('#pet-subtitle').textContent=m.subtitle;$('#pet-number').textContent=pet==='jew'?'01':'02';
  referenceMode='anatomy';updateReference();
  $('#focus-list').replaceChildren(...m.focus.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
  $$('[data-pet]').forEach(b=>{const yes=b.dataset.pet===pet;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
  $('#load-state').classList.add('hidden');
 }catch(error){$('#load-state').textContent='เปิดโมเดลไม่สำเร็จ กรุณาโหลดหน้าใหม่';console.error(error);}
}
function updateReference(){
 const m=meta[pet],anatomy=referenceMode==='anatomy',title=anatomy?m.reference:(pet==='jew'?'Mischief Study':'Concept 01');
 $('#reference-name').textContent=title;$('#reference-view').textContent=anatomy?m.view:'IDENTITY / COLOR';$('#dialog-title').textContent=m.title+' — '+title;
 for(const img of [$('#reference-image'),$('#reference-large')]){img.src='/references/'+pet+(anatomy?'-anatomy':'')+'.png';img.alt=m.title+' '+title+' ภาพอ้างอิง';}
 $$('[data-reference]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reference===referenceMode)));
}
$$('[data-reference]').forEach(b=>b.onclick=()=>{referenceMode=b.dataset.reference;updateReference();});
function toast(message){const e=$('#toast');e.textContent=message;e.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>e.classList.remove('visible'),3500);}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function getSource(){const value=structuredClone(model);value.metadata={...value.metadata,reviewStatus:'M1-unreviewed',browserEdited:edited,baseMeshHash:manifest?.assets[pet]?.sha256||null};return value;}
async function exportGLB(){
 if(!modelRoot)throw new Error('โมเดลยังไม่พร้อม');
 const clone=modelRoot.clone(true),palette=materials();
 clone.name=pet+'-M1-clay';clone.visible=true;
 clone.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();o.material=clayMaterialFor(o,palette);o.castShadow=false;o.receiveShadow=false;});
 clone.userData={stage:'M1',approval:'pending',pet,sourceHash:manifest?.assets[pet]?.sha256||null,browserEdited:edited};
 try{return await new GLTFExporter().parseAsync(clone,{binary:true,onlyVisible:true});}
 finally{disposeTree(clone);Object.values(palette).forEach(m=>m.dispose());}
}
async function showImported(buffer){
 const imported=await new GLTFLoader().parseAsync(buffer,'');
 disposeTree(importedRoot);importedRoot=imported.scene;
 importedRoot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;}});
 scene.add(importedRoot);modelRoot.visible=false;clearSelection();pointGroup.visible=false;renderer.render(scene,camera);return importedRoot;
}
function showSource(){disposeTree(importedRoot);importedRoot=null;modelRoot.visible=true;pointGroup.visible=true;}
function selectVertex(part,index){
 selection={part,index};const mesh=partMeshes.get(part);marker.position.copy(mesh.localToWorld(new THREE.Vector3().fromArray(model.parts[part].positions,index*3)));marker.visible=true;transform.attach(marker);
 $('#vertex-label').textContent=model.parts[part].name+' · vertex '+index;
 for(const [n,axis]of ['x','y','z'].entries()){const field=$('#vertex-'+axis);field.disabled=false;field.value=model.parts[part].positions[index*3+n].toFixed(3);}
}
function remember(){if(!selection)return;undo.push({part:selection.part,index:selection.index,position:model.parts[selection.part].positions.slice(selection.index*3,selection.index*3+3)});if(undo.length>100)undo.shift();$('#undo-edit').disabled=false;}
function moveVertex(xyz){
 if(!selection||xyz.some(v=>!Number.isFinite(v)||Math.abs(v)>10))return;
 const {part,index}=selection,p=model.parts[part];p.positions.splice(index*3,3,...xyz);
 const mesh=partMeshes.get(part),g=mesh.geometry,map=mesh.userData.renderToSource;if(map){for(let n=0;n<map.length;n++)if(map[n]===index)g.attributes.position.setXYZ(n,...xyz);}else g.attributes.position.setXYZ(index,...xyz);g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
 const point=pointGroup.children.find(o=>o.userData.partIndex===part);point.geometry.attributes.position.setXYZ(index,...xyz);point.geometry.attributes.position.needsUpdate=true;
 edited=true;updateStats();$('#draft-note').textContent='แก้ไขแล้ว · บันทึก JSON เพื่อเก็บฉบับนี้ก่อนเปลี่ยนตัวละคร';
}
transform.addEventListener('mouseDown',remember);
transform.addEventListener('objectChange',()=>{if(!selection)return;const p=partMeshes.get(selection.part).worldToLocal(marker.position.clone());moveVertex(p.toArray());for(const [n,axis]of ['x','y','z'].entries())$('#vertex-'+axis).value=p.toArray()[n].toFixed(3);});
for(const axis of ['x','y','z'])$('#vertex-'+axis).addEventListener('change',()=>{remember();moveVertex(['x','y','z'].map(a=>Number($('#vertex-'+a).value)));selectVertex(selection.part,selection.index);});
let pointerStart=null;
renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
renderer.domElement.addEventListener('pointerup',e=>{
 if(!editing||!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5||transform.dragging)return;
 const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
 const hits=ray.intersectObjects([...partMeshes.values()],false);if(!hits.length)return;
 const hit=hits[0],indices=[hit.face.a,hit.face.b,hit.face.c],local=hit.object.worldToLocal(hit.point.clone()),position=hit.object.geometry.attributes.position;
 indices.sort((a,b)=>new THREE.Vector3().fromBufferAttribute(position,a).distanceToSquared(local)-new THREE.Vector3().fromBufferAttribute(position,b).distanceToSquared(local));selectVertex(hit.object.userData.partIndex,hit.object.userData.renderToSource?.[indices[0]]??indices[0]);
});
$('#edit-mode').addEventListener('change',e=>{editing=e.target.checked;for(const p of pointGroup.children)p.visible=editing;if(!editing)clearSelection();controls.autoRotate=false;$('#turntable').setAttribute('aria-pressed','false');});
$('#undo-edit').onclick=()=>{const action=undo.pop();if(!action)return;selectVertex(action.part,action.index);moveVertex(action.position);selectVertex(action.part,action.index);$('#undo-edit').disabled=undo.length===0;};
$('#reset-mesh').onclick=()=>{edited=false;undo=[];buildModel(loaded.get(pet));$('#undo-edit').disabled=true;$('#draft-note').textContent='';toast('กลับไปโครงต้นฉบับแล้ว');};
$$('[data-pet]').forEach(b=>b.onclick=()=>{if(b.dataset.pet===pet)return;if(edited)download(JSON.stringify(getSource()),pet+'-draft.mesh.json','application/json');choosePet(b.dataset.pet);});
$$('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-surface]').forEach(b=>b.onclick=()=>applySurface(b.dataset.surface));
$('#turntable').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('#turntable').setAttribute('aria-pressed',String(controls.autoRotate));};
$('#reset-view').onclick=()=>setView('hero');
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else toast('เบราว์เซอร์นี้ไม่รองรับโหมดเต็มจอ');}catch{toast('เปิดเต็มจอไม่ได้ในเบราว์เซอร์นี้');}};
const dialog=$('#reference-dialog');$('#open-reference').onclick=()=>dialog.showModal();$('#close-reference').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
$('#export-glb').onclick=async()=>{const b=$('#export-glb');b.disabled=true;try{download(await exportGLB(),pet+'-m1'+(edited?'-edited':'')+'.glb','model/gltf-binary');toast('บันทึกโมเดล GLB แล้ว');}catch(e){console.error(e);toast('ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง');}finally{b.disabled=false;}};
$('#save-json').onclick=()=>{download(JSON.stringify(getSource()),pet+'-m1.mesh.json','application/json');toast('บันทึกจุดยอดและพื้นผิวของโมเดลแล้ว');};
$('#import-json').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20_000_000)throw new Error('ไฟล์ใหญ่เกินไป');const data=validateMesh(JSON.parse(await file.text()));buildModel(data);edited=true;undo=[];$('#undo-edit').disabled=true;$('#draft-note').textContent='เปิดฉบับร่างจากไฟล์แล้ว';updateStats();toast('เปิด mesh JSON แล้ว');}catch(err){toast(err.message);}e.target.value='';};
$('#save-image').onclick=()=>{renderer.render(scene,camera);const c=document.createElement('canvas');c.width=renderer.domElement.width;c.height=renderer.domElement.height;const context=c.getContext('2d');context.fillStyle='#ece4d9';context.fillRect(0,0,c.width,c.height);context.drawImage(renderer.domElement,0,0);c.toBlob(blob=>download(blob,pet+'-M1-'+currentView+'.png','image/png'));};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');if(reduced.matches)controls.enableDamping=false;
function frame(){requestAnimationFrame(frame);if(document.hidden)return;controls.update();renderer.render(scene,camera);}frame();resize();setView('hero');
try{manifest=await readJSON('/models/manifest.json');await choosePet('jew');}
catch(e){console.error(e);$('#load-state').textContent='เปิดข้อมูลโมเดลไม่สำเร็จ กรุณาโหลดหน้าใหม่';}
window.__studio={
 ready:()=>!!modelRoot,choosePet,setView,focusFace,applySurface,source:getSource,exportGLB,showImported,showSource,selectVertex,
 setVertex:xyz=>{remember();moveVertex(xyz);selectVertex(selection.part,selection.index);},
 capture:()=>{renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
 info:()=>({pet,stage:'M1',approval:'pending',edited,sourceHash:manifest?.assets[pet]?.sha256,parts:model?.parts.length,exportPrimitives:model?.parts.reduce((n,p)=>n+(p.materialGroups?.length||1),0),triangles:model?.parts.reduce((n,p)=>n+p.indices.length/3,0),camera:camera.position.toArray(),target:controls.target.toArray(),viewport:{width:host.clientWidth,height:host.clientHeight,dpr:renderer.getPixelRatio()},renderer:THREE.REVISION}),
 async verifyExport(){const buffer=await exportGLB();const imported=await new GLTFLoader().parseAsync(buffer,'');let count=0,vertices=0;imported.scene.traverse(o=>{if(o.isMesh){count++;vertices+=o.geometry.attributes.position.count;}});const magic=new DataView(buffer).getUint32(0,true);disposeTree(imported.scene);return {bytes:buffer.byteLength,magic,meshes:count,vertices};}
};
