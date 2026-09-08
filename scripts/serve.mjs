import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const port=Number(process.env.PORT||3212);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.glb':'model/gltf-binary'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const file=path.resolve(root,'.'+relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const data=await fs.readFile(file);
  res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log('Model studio ready on port '+port));
