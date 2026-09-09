import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const dir='review/M1-edge';
const entries=(await fs.readdir(dir)).filter(p=>/\.(png|glb|json|txt)$/.test(p)&&p!=='manifest.json').map(p=>dir+'/'+p);
const sources=['art/source/jew.mjs','art/source/bo.mjs','web/studio.js','web/index.html','web/style.css','web/studies.html','scripts/build-web.mjs','scripts/check-edge-study.mjs','tests/anatomy-regression.test.mjs','tests/edge-poses.test.mjs','tests/mesh-contract.test.mjs','references/manifest.json','docs/EDGE_STUDY_REVISION.md'];
for(const pet of ['jew','bo']){sources.push('art/meshes/'+pet+'.mesh.json','references/edge-study/'+pet+'-edge-study.png');for(const pose of ['stand','sit','walk'])sources.push('art/meshes/'+pet+'-'+pose+'.mesh.json');}
const manifest={stage:'M1-edge',state:'ready_for_review',artApproval:'pending',createdAt:new Date().toISOString(),owners:{jew:'jew_edge_mesh',bo:'bo_edge_mesh',renderer:'edge_studio_ui',qa:'edge_render_qa',integration:'root'},poseScope:'Authored static stand/sit/walk, same topology per pet; not a finished rig',conceptLimitations:'Generated guide angles are approximate; concealed geometry inferred. Exact triangle positions and camera angles come from actual mesh captures.',evidence:'48 actual WebGL edge frames, 4 contact sheets, 6 pose GLBs with fresh imports',files:{}};
for(const file of [...sources,...entries]){const bytes=await fs.readFile(file);manifest.files[file]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
await fs.writeFile(dir+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({state:manifest.state,artApproval:manifest.artApproval,files:Object.keys(manifest.files).length}));
