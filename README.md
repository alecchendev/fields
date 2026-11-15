# Field models

A static 3D browser for all twelve electric and magnetic field models from [Dan Fleisch’s Maxwell companion site](https://www.danfleisch.com/maxwell/models/index.shtml), plus models you open yourself.

No build step, package installation, CDN, account, API key, or backend. The HTML, CSS, JavaScript, renderer, and models are all included. Serve the folder as-is.

## GitHub Pages

1. Put this folder’s contents in a Git repository and push it to GitHub.
2. In the repository’s **Settings → Pages**, choose **Deploy from a branch**, then select your branch and **/ (root)**.
3. Open the published URL.

There is no build command or custom Actions workflow to configure. Keep `.nojekyll`, `index.html`, `src/`, `vendor/`, and `models/` in the published folder. The documentation and maintenance scripts can remain in the repository too.

Relative URLs support both a domain root and subdirectories such as `username.github.io/field-models/`. No repository name or domain needs to be hardcoded. Preserve the folder structure and filename capitalization.

## Open locally

On this Mac, double-click **Launch Field models.command**. It starts a small local static server and opens your browser. Keep its terminal open while using the app; press Control-C to stop it.

Or, with Python 3 installed, run:

```sh
python3 scripts/serve.py
```

This uses only Python’s standard library and listens on `127.0.0.1`. Any other static HTTP server also works. Python is only a local convenience; visitors to the published site need only a modern browser with WebGL 2. Opening `index.html` directly through `file://` does not work because browsers restrict local module and model loading.

All viewing works without internet while the local server runs. The source attribution link opens the original external website only when clicked. Browsers and graphics APIs can change, so this is self-contained rather than a guarantee of permanent browser compatibility.

## Use

- Click any model in the collection or search by name.
- Drag to orbit, scroll/pinch to zoom, right-drag or two-finger drag to pan.
- **Options** is open by default. It has 3D, Front, Side, and Top camera presets; automatic rotation; wireframe; a grid; image export; and original-file download.
- Keyboard: **↑ / ↓** previous/next collection model, **R** reset camera, **/** search, **Escape** close Options.
- A collection model’s URL can be bookmarked. Opened local files stay in the current tab only.

## Open your own model

Click **Open model…** or drop one file onto the page. Files are read locally in the browser, never uploaded. Existing viewer controls work on your file too; choose a collection model to return to the built-in models.

Supported formats:

- **WRL:** ASCII VRML 1.0 using the same node subset as the collection (Separator, MaterialBinding, Material, Coordinate3, IndexedFaceSet). Other VRML nodes and VRML 2.0 are not supported.
- **STL:** ASCII or binary.
- **OBJ:** Geometry and embedded vertex colors; separate MTL/texture files are not loaded.
- **GLB:** Self-contained glTF 2.0 with embedded buffers/textures. Draco, Meshopt, and KTX2 decoding are not included. External resources are rejected. Models are shown in a static pose; animation playback is not provided.

## Files and attribution

- `index.html`, `src/`: the application, ready for browsers to load directly.
- `models/`: untouched original `.wrl` files and ready-to-view `.bin` geometry.
- `vendor/three/`: a frozen local copy of Three.js 0.181.2, the same renderer version used before removing the build system, plus local controls/loaders. License and provenance are included. No runtime downloads or dependency updates are needed.
- `scripts/`: optional maintenance tools; none run during deployment.

The collection models accompany Dan Fleisch’s *A Student’s Guide to Maxwell’s Equations*. The source page credits © 2008 Cambridge University Press. Original model ownership remains with the source authors; this app adds a viewer.

The source files use VRML 1.0. `src/vrml.mjs` reads their node subset, including separator state and per-face indexed diffuse colors. The converted binary files preserve their original triangles and diffuse colors. Display geometry is centered and uniformly scaled. The viewer uses two-sided surfaces and computed normals; legacy ambient, emissive, and specular settings are not reproduced.

## Optional maintenance

No maintenance commands are required to publish or view the existing site.

To run the dependency-free geometry checks, with Node.js installed:

```sh
node --test scripts/models.test.mjs
```

To download the originals again and regenerate their binary files:

```sh
python3 scripts/download-models.py
node scripts/convert-models.mjs
```

The downloader uses Python 3 and curl. Conversion and geometry checks use only Node.js built-in modules. Run maintenance commands from this folder.
