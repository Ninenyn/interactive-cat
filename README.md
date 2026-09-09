# Jew & Bo — Model Studio

The M1 edge-study revision is ready for preview publication. See status.json for deployment tracking.

The current implementation is a Blender-free M1 review web app for two original clay character meshes. It provides orbit/zoom, hero/front/side/back views, silhouette and wireframe, original reference images, vertex editing/undo, editable mesh JSON save/reload, GLB export and PNG capture. The art remains unapproved.

The latest full-body references govern anatomy: Jew stands on four connected legs; Bo is a seated golden with revised shoulders, forelegs and paws. Jew's nose shares the facial skin and the mouth follows its surface. Read `docs/ANATOMY_REVISION.md` for this revision.

The user authorizes a Blender-free browser pipeline. Read `docs/BROWSER_PIPELINE.md` first, then `docs/PRODUCTION_PLAN.md`, `docs/ART_DIRECTION.md` and `docs/ACCEPTANCE.md` for the stage and review requirements, subject to the latest anatomy amendment.

## Run

```sh
npm ci
npm run build
npm test
npm run test:web
npm run dev
```

Use `npm run models:generate` only to intentionally replace realized JSON from revised source cages. Ordinary builds preserve saved mesh JSON.

The local studio serves `dist/` on port 3212. Browser QA uses the installed Google Chrome. Vercel serves the static build using the repository's vercel.json. No Blender installation or runtime model generator is required.

## Asset ownership

- `art/source/`: original offline polygon-cage authoring modules, one owner per pet.
- `art/meshes/`: realized portable editable vertex/triangle data.
- `references/original/`: exact user attachments with verified hashes.
- `review/M1-anatomy/`: current source/export renders and validation evidence; `review/M1/` is historical.
- `web/`: review UI and renderer.

This stage does not implement the full companion behavior or final materials/rig. Previous rejected assets remain outside the active project and are not reused.

## 360-degree edge study

Read docs/EDGE_STUDY_REVISION.md for the latest authority. The viewer includes stand/sit/walk static poses, eight fixed camera angles and depth-tested triangle edges. Open /studies.html for generated guides next to actual web-mesh turnaround and pose sheets. Art approval remains pending. Run node scripts/check-edge-study.mjs to regenerate the actual evidence, then copy the four contact-sheet PNGs from review/M1-edge into web/studies before deployment.
