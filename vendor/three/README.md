# Three.js (vendored)

Version: 0.181.2 (r181), MIT license; see LICENSE.
Source: https://github.com/mrdoob/three.js/tree/r181
Copied from the installed three@0.181.2 npm package.

The renderer, OrbitControls, STLLoader, OBJLoader, GLTFLoader, and their geometry
utility are stored here so the site needs no CDN, package manager, or build step.
The addon modules' bare `three` imports were changed to relative imports of
`../three.module.min.js`. Other code is unchanged. The minified renderer files
are the upstream distribution files; no local build is needed.
