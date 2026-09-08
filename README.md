# Jew & Bo — Model Studio

The current implementation is a Blender-free M1 review web app for two original clay character meshes. It provides orbit/zoom, hero/front/side/back views, silhouette and wireframe, original reference images, vertex editing/undo, editable mesh JSON save/reload, GLB export and PNG capture. The art remains unapproved.

The latest user instruction replaces the earlier local Blender prerequisite. Read `docs/BROWSER_PIPELINE.md` first, then `docs/PRODUCTION_PLAN.md`, `docs/ART_DIRECTION.md` and `docs/ACCEPTANCE.md` for the unchanged reference and review requirements.

## Run

```sh
npm ci
npm run build
npm test
npm run test:web
npm run dev
```

The local studio serves `dist/` on port 3212. Browser QA uses the installed Google Chrome. Vercel serves the static build using the repository's vercel.json. No Blender installation or runtime model generator is required.

## Asset ownership

- `art/source/`: original offline polygon-cage authoring modules, one owner per pet.
- `art/meshes/`: realized portable editable vertex/triangle data.
- `references/original/`: exact user attachments with verified hashes.
- `review/M1/`: actual source/export renders and validation evidence.
- `web/`: review UI and renderer.

This stage does not implement the full companion behavior or final materials/rig. Previous rejected assets remain outside the active project and are not reused.
