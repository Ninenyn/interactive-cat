import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const dir='review/M1';await fs.mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{stdio:['ignore','pipe','pipe']});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(d.toString().includes('ready'))resolve();});server.once('error',reject);server.once('exit',code=>{if(code!==null)reject(new Error('Server exited '+code));});});
const browser=await chromium.launch({channel:'chrome'});
const errors=[],report={stage:'M1',artApproval:'pending',physicalDeviceTested:false,checks:[],assets:{}};
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:3212/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.__studio?.ready(),{timeout:25000});
 for(const pet of ['jew','bo']){
  await page.locator('[data-pet="'+pet+'"]').click();
  await page.waitForFunction(p=>window.__studio.info().pet===p,pet);
  for(const view of ['hero','front','side','back']){
   await page.evaluate(v=>window.__studio.setView(v),view);await page.waitForTimeout(200);
   await page.screenshot({path:dir+'/'+pet+'-'+view+'.png'});
  }
  await page.evaluate(()=>window.__studio.setView('hero'));
  const source=await page.evaluate(()=>JSON.stringify(window.__studio.source()));
  const info=await page.evaluate(()=>window.__studio.info());
  const exportInfo=await page.evaluate(()=>window.__studio.verifyExport());
  assert.equal(exportInfo.magic,0x46546c67);assert.equal(exportInfo.meshes,info.parts);assert.ok(exportInfo.bytes>1000);
  const base64=await page.evaluate(async()=>{
   const buffer=await window.__studio.exportGLB();window.__qaGLB=buffer;
   let s='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);
  });
  const bytes=Buffer.from(base64,'base64');await fs.writeFile(dir+'/'+pet+'-M1.glb',bytes);
  await page.evaluate(()=>window.__studio.showImported(window.__qaGLB));await page.waitForTimeout(200);
  await page.screenshot({path:dir+'/'+pet+'-glb-import.png'});
  await page.evaluate(()=>window.__studio.showSource());
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__studio.source())),source,'export must not change source');
  report.assets[pet]={...info,...exportInfo,glbHash:crypto.createHash('sha256').update(bytes).digest('hex')};
 }
 // A real editable mesh must preserve source data across edits, undo and file reload.
 await page.evaluate(()=>window.__studio.choosePet('jew'));
 const before=await page.evaluate(()=>window.__studio.source());
 await page.locator('.mesh-tools summary').click();await page.locator('#edit-mode').check();
 await page.evaluate(()=>window.__studio.selectVertex(0,0));
 const x=Number(await page.locator('#vertex-x').inputValue());
 await page.locator('#vertex-x').fill(String(x+.08));await page.locator('#vertex-y').focus();
 assert.ok(await page.evaluate(()=>window.__studio.info().edited));
 await page.locator('#undo-edit').click();
 assert.deepEqual(await page.evaluate(()=>window.__studio.source().parts),before.parts);
 await page.locator('#import-json').setInputFiles({name:'restored.mesh.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(before))});
 assert.deepEqual(await page.evaluate(()=>window.__studio.source().parts),before.parts);
 await page.locator('#edit-mode').uncheck();await page.locator('.mesh-tools summary').click();
 await page.locator('[data-surface="wire"]').click();await page.locator('[data-surface="clay"]').click();
 await page.locator('#open-reference').click();assert.ok(await page.locator('#reference-dialog').isVisible());await page.keyboard.press('Escape');
 const download=page.waitForEvent('download');await page.locator('#export-glb').click();const actualDownload=await download;assert.ok(actualDownload.suggestedFilename().endsWith('.glb'));
 report.checks.push('source mesh JSON reload','vertex edit and undo','GLB export and fresh GLB-only render','export does not mutate source','surface and camera controls','reference dialog','user GLB download');
 await page.evaluate(()=>document.querySelector('.toast').classList.remove('visible'));
 await page.setViewportSize({width:390,height:844});
 for(const pet of ['jew','bo']){
  await page.evaluate(p=>window.__studio.choosePet(p),pet);await page.waitForTimeout(200);
  await page.screenshot({path:dir+'/'+pet+'-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
 }
 report.checks.push('390px mobile viewport layout, not physical-phone testing');
 assert.deepEqual(errors,[]);
 report.status='PASS';report.browserVersion=browser.version();
 await fs.writeFile(dir+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}catch(error){report.status='FAIL';report.errors=[error.message,...errors];await fs.writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.error(JSON.stringify(report));process.exitCode=1;}
finally{await browser.close();server.kill('SIGTERM');}
