# Jew & Bo — modeling research and workflow recommendations

Research date: 2026-09-08. Source notes for the clean-slate plan; only the two supplied concept images were used as character targets.

## Evidence from supplied images

Viewed both local attachments directly:

- `042d83c2-3c1c-4165-99aa-f37c31fa50e2.png`: Jew — Mischief Study, with cheeky, side-eye, squint, seated and walking examples.
- `bdf4310f-fcdc-4e2e-bd86-7de37229f673.png`: Jew & Bo — Concept 01, with sit, stand and walk examples.

Recommended authority: use the Mischief sheet for Jew's final coat and facial personality. The earlier Concept 01 cat is lighter and more wide-eyed; mixing those facial targets would recreate ambiguity. Use the lower row of Concept 01 for Bo.

Observed design properties, not measurements inferred as exact geometry:

- Both: intentionally faceted surfaces; broad, arranged planes; softly rounded overall silhouettes; large heads relative to compact bodies; small feet with substantial rounded volume; glossy rounded eyes contrasting with matte bodies. This is not a voxel or sharp geometric toy brief, and low polygon count alone will not reproduce the look.
- Jew: consistently black coat, short muzzle, broad cheek volume, tall triangular ears with muted pink inner ears, small pink nose, amber eyes partially covered by upper eyelids, curled tapered tail. Mischief comes primarily from eyelid shape, gaze direction, slight asymmetry and head tilt. Avoid exaggerating a deeply furrowed brow into an angry/horror expression.
- Bo: golden puppy proportions, a wide rounded head, hanging ears with rounded outlines and visible thickness, dark brown glossy eyes, short cream muzzle, cream chest/paws, dark nose, gently curved tail. Read as a young golden retriever, not an adult dog with a long muzzle.
- These are perspective concept images with poses, not a consistent orthographic blueprint. Rear, top and underside anatomy remain interpretation. Approve that interpretation through turntables rather than claiming pixel-perfect 3D reconstruction from these sheets.

## Seven primary sources, mapped to concrete work

1. **Grant Abbitt — Model Any LOW POLY ANIMAL (Detailed Follow-Along Guide!)**
   - Original creator tutorial: https://www.youtube.com/watch?v=F_JK9eaYYTQ
   - Use for: learning a deliberate low-poly animal modeling workflow before implementation, from simple forms to animal features and color. Adopt its modeling process; the user's attached designs remain the style authority.
   - Verification: primary YouTube result identifies the title, creator Grant Abbitt, and Blender 5 beginner animal-modeling tutorial. The full video could not be fetched by the browsing service, so no invented transcript or timestamp claims are made here.

2. **Blender Manual — Extrude Region**
   - https://docs.blender.org/manual/en/latest/modeling/meshes/tools/extrude_region.html
   - Official mechanism: extrusion extends connected geometry from the existing selection.
   - Use for blockout and body topology: extend torso into neck/head and limbs; keep deforming anatomical transitions connected. Separate eyeballs and appropriate accessories can remain separate. A final body assembled from unrefined overlapping primitives will not satisfy this brief.

3. **Blender Manual — Mirror Modifier**
   - https://docs.blender.org/manual/en/latest/modeling/modifiers/generate/mirror.html
   - Official mechanism: mirrors geometry about local axes or a specified mirror object, with merge/clipping behavior.
   - Use for the early symmetric modeling pass: establish one side of skull, muzzle, ears and body while maintaining a clean center seam. Introduce controlled expressive asymmetry later, after the base anatomy passes review. Confirm centerline vertices actually merge; merely enabling clipping does not cure an already offset seam.

4. **Blender Manual — Shade Smooth & Flat**
   - https://docs.blender.org/manual/en/latest/modeling/meshes/editing/face/shading.html
   - Official mechanism: flat shading exposes face boundaries; smooth shading interpolates the appearance of neighboring surface normals.
   - Use for facet design: construct broad appealing planes on cheeks, forehead, shoulders and thighs, and assess those planes under fixed soft lighting. Body faces should retain the reference's faceted appearance while eyeballs use a smoother appearance. Shading cannot repair a wrong silhouette or poor face placement.

5. **Blender Manual — Shape Keys Workflow**
   - https://docs.blender.org/manual/en/latest/animation/shape_keys/workflow.html
   - Official mechanism: topology defines vertex count/connectivity, while a shape key stores vertex positions.
   - Use for facial expressions: finish base topology before authoring eyelid and mouth shapes. Build independent left/right blink and squint controls, then evaluate cheeky/side-eye/squint as compositions. Sweep values from 0 to 1 and inspect eye intersection and edge collapse, including combined expressions. These named expression controls and the detailed checks are recommendations for this project, not claims from the manual.

6. **Blender Manual — Using Vertex Groups (Weight Paint)**
   - https://docs.blender.org/manual/en/latest/sculpt_paint/weight_paint/usage.html
   - Official mechanism: selecting a deform bone activates its matching vertex group and displays current weights for painting.
   - Use for rig polish: inspect and refine influences around neck, shoulders, hips, knees/hocks and tail. Test sit, step, lifted paw and bent tail before making full clips. Automatic weights are a starting point; the acceptance test is the rendered deformation in required poses.

7. **Blender Manual — glTF 2.0**
   - https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html
   - Official export considerations: flat-shaded edges and discontinuous UVs can increase exported vertex count; supported animation categories include object transforms, pose bones and shape-key values; action association affects what exports. Export options include shape keys and animation sampling.
   - Use for material/rig/export architecture: plan compact PBR materials, named actions and morph targets from the beginning. Bake/sample evaluated deform motion for export as appropriate to the installed Blender version. Do not assume Blender control-rig logic, arbitrary shader graphs, lighting or every animated property transfers to the web renderer. Verify exported GLB in the intended viewer and compare to Blender under matched light, camera and exposure. Measure exported geometry and draw calls, not only Blender's edit-mode face count.

Primary sources above were checked through live web search. Direct full-page opens of several Blender manual pages returned a browsing-service 402; indexed official excerpts were available and support the narrow technical claims made here. Read the manual version matching the installed Blender release when implementing and confirm export options against that actual installation.

## Recommended staged authoring workflow

### A. Reference contract and scene calibration

Keep the two exact supplied reference files unchanged. Designate one hero pose per character, make view crops for working overlays, and record which features must match. Set a neutral ground, fixed camera, fixed focal length and repeatable key/fill/rim setup. Label inferred views clearly. Do not rotate or relight screenshots to hide a mismatch.

Deliverable: one comparison board per character, with source crop, feature checklist, initial proportion landmarks and proposed front/side/back silhouettes. The back and underside are new interpretations requiring visual judgment.

### B. Grayscale blockout

Author Bo and Jew independently to avoid turning one species into a reskinned version of the other. Start from low-resolution volumes with a mirrored modeling workflow; resolve head width/height, muzzle projection, eye socket placement, ears, torso, legs, paws and tail. At this stage, a few primitives can help massing, but the approved asset needs deliberate connected body topology where it deforms.

Render front, side, rear, three-quarter and a slow turntable in uncolored clay. Check silhouettes at both full size and the intended mobile character size. Correct proportions before adding fine face detail or color.

Gate: the character reads correctly in silhouette, and the reference pose has convincing head/body, ear and muzzle relationships. No percentage claim such as "95% identical" without a defined visual metric.

### C. Face and identity pass

Jew first needs eye aperture and upper eyelid contours that produce mild defiance, not flat cartoon lines pasted across round eyes. Place eyelids so they wrap around the eyeball volume and look plausible in profile; support later deformation with appropriate vertex placement. Keep the muzzle and cheeks broad and soft, ears triangular and pink only inside.

Bo needs warm dark eyes, a small short muzzle, correctly placed hanging ears and a wide rounded skull. Avoid recessed tiny eyes, sharp pointed ears, thin paws or a long adult snout. Review face close-ups in front and both three-quarter angles before advancing.

Gate: grayscale head renders capture the intended personality even before color.

### D. Facet layout and restrained materials

Design polygon planes around anatomy rather than applying a uniform triangulation/decimation operation and accepting whatever facets appear. Maintain smooth overall contours while retaining plane changes. Match the black coat using lighting that reveals form without painting gray patches over Jew. Add golden and cream regions for Bo according to the reference. Tune eyes separately for clean catchlights; keep nose and ears restrained.

Deliverable: full-body material renders, head close-ups, and the same neutral light rig used for earlier comparisons. Include the intended light-mode and dark-mode backgrounds so readability problems appear early.

Gate: palette, eye appearance and faceting match the brief without breaking the approved silhouette.

### E. Rig, expressions and deformation

Use a compact quadruped deformation skeleton with spine, neck/head, four legs, ears where useful and a multi-segment tail. Choose an appropriate neutral bind pose; produce seated and walking poses through the rig rather than building separate incompatible meshes. Establish topology before final facial shape keys.

Priority pose tests: neutral stance; sit with planted paws; a single walking stride; head tilt; ears moving; curled tail. Jew facial tests: neutral, cheeky, side-eye, squint, full blink and playful bite. Bo: blink, attentive head tilt and relaxed open mouth if requested. Inspect both individual controls and simultaneous controls.

Gate: elbows, shoulders, cheeks and eyelids retain volume; feet do not detach visually from the floor; pose transitions do not reveal gaps or intersections.

### F. Early GLB proof, then production clips

Export one test mesh and a blink/step animation as soon as topology, a provisional material and rig exist. Use that small test to discover exporter limitations before authoring every clip. Preserve an editable `.blend` source with a defined export collection, saved scene settings and repeatable export script.

Verify morph names, action names, animation duration, axis/scale, clipping, normals, materials and shadow response in the actual runtime. Compare screenshots from equivalent cameras. Web lighting/color-management parity is a separate job from mesh quality. Only then produce the complete interaction clips and performance variants.

Gate: the exact exported GLB, rather than an unrelated concept render, is what the owner reviews before application integration.

## Automation versus visual work

Useful automation: create scene/collections, import unchanged references, set cameras/lights, name assets and bones, apply known mesh operations, batch render orthographic/contact-sheet/turntable views, run mesh/export sanity checks, export repeatably, measure GLB statistics and capture runtime comparisons.

Visual iteration still required: proportions, attractive face placement, eye aperture, muzzle projection, ear shapes, plane arrangement, material roughness and pose appeal. Each iteration must modify a real editable mesh and produce new renders from that mesh. Script completion and code tests are not evidence of resemblance.

An AI-created image may help propose a missing design view, but cannot certify that a corresponding 3D asset exists or will match from other angles. Image-to-3D results, if considered later, should be treated as disposable starting material subject to the same silhouette/topology/rig gates, never as an automatic fidelity guarantee.

## Practical order

1. Lock reference priority and deliver the calibrated comparison scene.
2. Complete both clay blockouts; review each before color.
3. Resolve faces; Jew's narrowed-eye geometry is the higher-risk feature.
4. Author facets and material regions.
5. Build a compact rig and minimal export proof.
6. Refine deformation and clips.
7. Review the actual GLBs in the target runtime; integrate only after the model review passes.

This research places visual checkpoints before full application work. No asset purchases or tool installations were performed during research. The canonical stage order is in PRODUCTION_PLAN.md; rejected project models are excluded as references.
