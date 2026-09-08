# Browser authoring pipeline — user-authorized change

On 8 September 2026 the user asked to continue without Blender installed on Machine B and put the result in a web app. This instruction replaces the local Blender and `.blend` prerequisites in the earlier production plan. The reference priority and visual review requirements remain binding.

## Actual source and output

- `art/source/jew.mjs` and `art/source/bo.mjs`: independent original authored polygon control cages. They run offline at build time, never as the animal runtime.
- `art/meshes/<pet>.mesh.json`: realized editable vertex and triangle data, with named parts and reference metadata. This is the portable source geometry and must be retained.
- `web/studio.js`: Three.js review renderer, vertex selection/editing, mesh JSON download/reload, camera views, surface modes and GLB export.
- `review/M1/`: screenshots, exact exported GLBs and the test report. These are proposed M1 assets, not approved final art.
- `references/original/`: both exact uploaded images, staged on Machine B and checked against the manifest hashes.

Three.js represents vertex/face geometry with [BufferGeometry](https://threejs.org/docs/pages/BufferGeometry.html), renders PBR surfaces with [MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html), and exports mesh/material data using [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html). This provides the web deliverable without a local Blender installation. It does not claim to reproduce every Blender authoring feature or guarantee likeness automatically.

## Revised M0 and M1

M0 now means exact reference staging, deterministic polygon mesh generation, realized JSON save/reload, and source render → GLB export → fresh GLB import/render. Required technical checks cover finite coordinates, valid indices, triangle area, closed part edges, winding, export isolation, module loading, and basic browser interaction.

M1 means the actual uncolored Jew/Bo form review. Default materials are neutral clay with restrained gray facial diagnostic surfaces. User-facing views include hero, front, side, back, silhouette, wireframe and a turntable. The editor can select vertices, adjust coordinates, undo, save JSON, reopen JSON, download GLB and save an image.

The source cages are an authoring tool, not evidence of likeness. Independent visual review must inspect rendered screenshots against the exact images. Numeric generation can repeat the same silhouette and facial failures as any other authoring method; fix the source geometry when a comparison reveals a mismatch.

## Remaining stages

M2 face/expression topology, M3 final color/materials, M4 full rig/deformation, M5 behavior animation, M6 companion interaction integration and M7 final release remain future work. An optional later Blender import may use the GLB, but `.blend` delivery is no longer required.

For M2, extend the saved format with explicit morph-target vertex arrays after topology stabilizes. For M4, author and retain bone hierarchy, bind transforms, skin indices and normalized weights; add a joint/weight inspection surface, then prove sit/stand/blink and one step before full clips. Three.js [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html) supports bone-driven deformation with skin indices and weights, and [AnimationClip](https://threejs.org/docs/pages/AnimationClip.html) stores reusable keyframe tracks. This is a feasible next implementation path, not a claim that rigging tools exist in the current M1 editor. Export clips explicitly in the GLTFExporter animations option and compare fresh imports. Version the expanded source schema and preserve the reviewed face/silhouette.

The published surface in this step is a clearly labeled model-review web app. A working viewer and successful export do not approve the art or claim that walking, nibbling, digging or the full companion experience is implemented.

## Collaboration and change tracking

One writer owns each pet's source module and realized mesh revision. Root owns the web renderer and build pipeline. Visual QA reads the output independently. When a source asset changes, regenerate its JSON, update hashes and produce new screenshots/export evidence; do not cite an old image for changed geometry.

Browser edits are local drafts. Explicit JSON/GLB downloads preserve them. The renderer separates editable source indices from duplicated render vertices so flat normals survive GLB export. It clones geometry/materials before export and re-imports the GLB for verification.

Ordinary `npm run build` preserves the existing realized JSON byte for byte. To adopt a downloaded edit, review and replace only the corresponding `art/meshes/<pet>.mesh.json`, then build. `npm run models:generate` explicitly replaces both realized assets from the offline cages; use that only for an intentional cage revision, with prior edits saved in Git. Deployments never regenerate over an existing edited JSON.
