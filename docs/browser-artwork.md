# Browser artwork

The public page is an artwork about language models, large scientific datasets and the ease of constructing convincing connections before establishing any reason for them. The user's requested reference is [The Projection](https://meow-meow.io/anthonys-fire/projection/) for visual quality and explanatory style. The visual audition is retained under `design/`; the subsequent user direction is recorded in `design/DIRECTION.md`.

## Live implementation

`web/` is a static site. The unchanged C++ native kernel is compiled with Emscripten 6.0.11. A module worker runs every retained MaleCNS neuron and connection, with an explicit JavaScript port of the upstream candidate memory rule and stimulation adapter. The page's meshes, camera and point lighting never produce neural spikes. Computed spike counts drive a short fading afterglow. Sixteen thousand strong connections are drawn for legibility; this display sample does not filter simulation edges.

The downloadable export is about 76 MB, SHA-256 verified before use, and includes all 166,700 neurons / 25,582,938 directed connections. It has 139,662 recorded soma positions and 27,038 positions estimated from downstream neighbours or the cloud centre. Display positions are separate from connectivity. CPU time is supplied by the visitor's browser; no Python process is needed on DreamHost. The shared host has Python 3.12.3, but machine-wide CPU/memory figures do not establish this account's resource quota.

## Contact size and assumed density

`web/surface.js` supplies an original schematic surface field, not the study's human data. The field uses deterministic samples on stylised regional surfaces. Assigned weights are glans 1.0, hood 0.6 and surrounding tissue 0.25, with 320 / 200 / 360 samples respectively. Counts and weights are artistic assumptions; neither is a measured ending-density ratio. Surface geometry and sample distribution also affect the effective response.

For each sample within contact radius r, influence is `pressure × weight × (1 − distance/r) / 24`; contributions accumulate per region, capped at 1. Radius is in schematic scene units, not calibrated anatomical millimetres. A wider patch includes more samples; pressure scales their contribution. Region selectors reposition the patch; Move contact allows raycast-based placement on the anatomy. Raw intensities pass through the same adaptation and delayed reward model as the Python API.

## Rebuild

From the repository root, after Python dataset preparation:

```sh
pip install -e '.[connectome]'
clitorisophila prepare
python tools/export_browser.py
# Install/activate Emscripten 6.0.11, then:
bash tools/build_wasm.sh
npm ci --prefix web
npm run build --prefix web
python -m http.server 8771 --directory web/dist
```

Open `http://localhost:8771/`, load the model, hold to stimulate or run the finger demo. Drag either view to rotate. Use the patch-size/intensity controls and Move contact to change the stimulus. Reward delivery and candidate learning can be disabled separately; reset before matched comparisons.

Generated model exports, WebAssembly build output and deployment bundles remain ignored; source, lockfiles and actual render captures are in git. MaleCNS data attribution remains CC BY 4.0; original code and geometry are MIT. Three.js 0.180.0 is an MIT dependency.

## Checks and captures

- Python suite: 20 tests passed, full-graph test opt-in.
- Full native/WASM comparison: all 40 per-neuron spike-count frame hashes and the final candidate-weight hash matched exactly across an 800 ms protocol, including the same 479 total spikes and 13 changed candidate synapses. Reproduce with `node web/verify-wasm.mjs` then `python tools/check_wasm.py`. This assay validates the port for the tested protocol, not every possible state.
- `node web/test-surface.mjs` checks deterministic sampling, increasing contact area, pressure release, zero response outside the field and bounded output.
- Desktop/mobile browser checks use Playwright; actual screenshots and video show the running model rather than generated illustrations.

The page is published under `https://meow-meow.io/clitorisophila/`. Deploy only `web/dist/` to `/home/dh_9vppcg/meow-meow.io/clitorisophila/` with targeted rsync; never run a whole-docroot deletion from this checkout. `.htaccess` supplies WASM/module MIME types and prevents automatic decoding of the explicitly gzipped model payload before browser verification.

The anatomy, surface field, input mapping and learning hypothesis remain synthetic/modelled. No medical sensitivity map, felt pleasure or behavioural learning is established. The artwork keeps those seams visible.
