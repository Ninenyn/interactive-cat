// Local-only visual studio. Compiles the same production rig; no debug route ships.
import { chromium } from "@playwright/test";
import ts from "typescript";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
const dir = "test-results/rig";
await fs.mkdir(dir, { recursive: true });
let source = await fs.readFile("src/companions/animalRig.ts", "utf8");
for (const pet of ["jew", "bo"]) {
  const raw = await fs.readFile("src/assets/pets/" + pet + ".json", "utf8");
  source = source.replace(
    new RegExp("import " + pet + ' from "[^"]+";'),
    "const " + pet + " = " + raw + ";",
  );
}
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
await fs.writeFile(dir + "/rig.js", compiled);
for (const file of ["three.module.js", "three.core.js"])
  await fs.copyFile("node_modules/three/build/" + file, dir + "/" + file);
const html = `<!doctype html><html><style>html,body{margin:0;overflow:hidden;background:#d9d5cb}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/three.module.js"}}</script>
<script type="module">
import * as T from "three";import {AnimalRig} from "/rig.js";
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(600,500);renderer.setPixelRatio(1.5);document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color("#d9d5cb");const camera=new T.OrthographicCamera(-2.65,2.65,2.21,-2.21,.1,40);
camera.position.set(4,2.7,5);camera.lookAt(0,.95,0);
scene.add(new T.AmbientLight(0xffffff,.3),new T.HemisphereLight(0xfff4dc,0x8b8172,1.45));
for(const [p,intensity,color] of [[[-3,7,6],1.8,0xfff2d9],[[4,4,-3],2.1,0xffe3ac],[[2,2,5],.5,0xf5e7d5]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...p);scene.add(light);}
let rig;
window.pose=async(pet,state,heading=0)=>{
 if(rig){scene.remove(rig.root);rig.dispose();}rig=new AnimalRig(pet);scene.add(rig.root);rig.root.rotation.y=heading;
 const input={state:state==="stand"||state==="walk"||state==="carry"?"idle":state,delta:1/60,time:0,stride:0,stand:state==="stand"||state==="walk"?1:0,walking:state==="walk",dragging:state==="carry",reduced:false,target:{x:0,y:0}};
 for(let i=0;i<150;i++){input.time=i/60;input.stride=state==="walk"?i/60*4:0;rig.update(input);}
 renderer.render(scene,camera);
 const bounds=new T.Box3().setFromObject(rig.mesh,true);return {min:bounds.min.toArray(),max:bounds.max.toArray()};
};
window.transition=(state,frames)=>{
 const input={state,delta:1/60,time:3,stride:0,stand:0,walking:false,dragging:false,reduced:false,target:{x:0,y:0}};
 for(let i=0;i<frames;i++){input.time+=1/60;rig.update(input);}renderer.render(scene,camera);
};
window.ready=true;
</script></html>`;
await fs.writeFile(dir + "/index.html", html);
const server = http.createServer(async (req, res) => {
  const name = req.url === "/" ? "/index.html" : req.url;
  try {
    const data = await fs.readFile(path.join(dir, path.basename(name)));
    res.setHeader(
      "Content-Type",
      name.endsWith(".js") ? "text/javascript" : "text/html",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => server.listen(3211, "127.0.0.1", resolve));
const browser = await chromium.launch({ channel: "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 500 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3211");
  await page.waitForFunction(() => window.ready);
  const report = [];
  for (const pet of ["jew", "bo"])
    for (const state of [
      "stand",
      "idle",
      "walk",
      "stretch",
      "sleeping",
      "digging",
      "carry",
      "paw",
      "groom",
      "bite",
    ]) {
      const bounds = await page.evaluate(
        ({ pet, state }) => window.pose(pet, state),
        { pet, state },
      );
      await page.screenshot({ path: dir + "/" + pet + "-" + state + ".png" });
      report.push({ pet, state, bounds });
    }
  if (errors.length) throw new Error(errors.join("\n"));
  await fs.writeFile(dir + "/report.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
