# Edge study revision — 9 September 2026

The user requests 360-degree edge studies, multiple poses and actual mesh code revised to match the cute latest concept. This instruction supersedes the 8 September adult/full-body proportion override. Full-body anatomy still informs joint placement and connected surfaces, while the latest cute reference controls head, cheek, muzzle, ear, chest, limb and paw proportions. No art approval has been inferred.

## Source of truth

- Jew identity: MISCHIEF STUDY. Broad cat head, short muzzle, half-lidded eyes, compact body, sturdy paws. Never blend the older gray wide-eyed cat into Jew.
- Bo identity: lower golden puppy row of CONCEPT 01. Broad rounded skull and cheeks, short blunt muzzle, drooping broad ears and seated haunches.
- New generated concept sheets: `references/edge-study/jew-edge-study.png` and `bo-edge-study.png`. These are artistic guides. Concealed surfaces are inferred. The Jew guide's nominal front panel is oblique; exact camera calibration comes from actual web renders, not generated labels. Drawn guide lines cannot be treated as an exported topology graph.
- Source owners: `jew_edge_mesh` for Jew, `bo_edge_mesh` for Bo, `edge_studio_ui` for web presentation, `edge_render_qa` for evidence, root for integration and release.

## Implemented code contract

Offline `createJew({pose})` and `createBo({pose})` realize stand/sit/walk vertex arrays. Each pet uses corresponding vertices and identical face indices across its three poses. This is authored static posing, not a finished animation rig. Play bow exists only in the concept sheets at this stage.

The browser loads the saved JSON; it never generates an animal at runtime. Default files remain Jew stand and Bo sit. Explicit regeneration replaces the default and all pose files; ordinary builds preserve saved JSON edits.

Edge Study draws depth-tested triangle lines over the actual clay mesh. Existing x-ray wireframe remains a separate inspection mode. Diagnostic lines are excluded from GLB exports. The angle selector uses 0/45/90/135/180/225/270/315 degrees around +Y, with +Z as front, +X as right and consistent framing across a pose's turntable.

## Review evidence

`review/M1-edge/`: 48 actual WebGL edge captures (2 pets × 3 poses × 8 views), four contact sheets, six GLB pose exports and reimport images, interaction/mobile report, source hash bindings and geometry tests. Contact sheet layout hides only viewer UI overlays; it does not alter the mesh, lights, camera or rendered pixels. The `/studies.html` page places generated guides next to actual mesh sheets for comparison.

Required validation: all-pose closed surfaces and nondegenerate winding; unchanged facial geometry under static pose translation; Jew skin/nose continuity and actual facial attachment; separate default paw contacts; open air between Bo lower forelegs; exact served JSON hashes; GLB export/reimport from edge mode without edge-line primitives; vertex editing/undo/JSON reload; mobile viewport layout. These checks do not establish artistic likeness.

## Art review scope

Compare overall silhouette first, then skull/cheeks/muzzle/ears, chest/haunch transitions and limb thickness, then visible facet placement. Inspect front, profile and rear before color. The real meshes remain draft interpretations and need visual review; do not claim identical triangulation to a generated image or 100% likeness.
