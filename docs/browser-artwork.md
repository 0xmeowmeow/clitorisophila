# Browser artwork

The public page is an artwork about language models, large scientific datasets and the ease of constructing convincing connections before establishing any reason for them. The user's requested reference is [The Projection](https://meow-meow.io/anthonys-fire/projection/) for visual quality and explanatory style. The visual audition is retained under `design/`; the subsequent user direction is recorded in `design/DIRECTION.md`.

## Accepted version

The user accepted the live artwork on 9 October 2026. The interactive implementation is commit `9cb2b0f`, with [passing repository checks](https://github.com/0xmeowmeow/clitorisophila/actions/runs/37782887596). Public-browser verification covered automatic loading, real pointer input, computed reward response, pause/reset and mobile layout. GIF and MP4 downloads are available under `share/`. The homepage work tile and updates entry link directly into the artwork. Rebuild, export and deployment instructions are below; no implementation work remains in the accepted scope.

## Live implementation

`web/` is a static site. The unchanged C++ native kernel is compiled with Emscripten 6.0.11. A module worker runs every retained MaleCNS neuron and connection, with an explicit JavaScript port of the upstream candidate memory rule and stimulation adapter. The page's meshes, camera and point lighting never produce neural spikes. Computed spike counts drive a short fading afterglow. One scene contains the original implicit anatomical sculpture, the full soma cloud and 111 synthetic binding paths. Ninety-six paths terminate at the chosen sensory Kenyon cells, and fifteen at the reward PAM11 cells. Particle brightness represents current delivered through those bindings; their travel speed is a visual convention, not a conduction model. Reward-path brightness follows the actual delayed delivery, not an animation timer. The 7,835 existing candidate plastic edges are also drawn and light from their endpoints’ computed spikes. Sixteen thousand strong baseline connections are drawn for legibility; this display sample does not filter simulation edges.

The downloadable export is about 76 MB, SHA-256 verified before use, and includes all 166,700 neurons / 25,582,938 directed connections. It has 139,662 recorded soma positions and 27,038 positions estimated from downstream neighbours or the cloud centre. Display positions are separate from connectivity. CPU time is supplied by the visitor's browser; no Python process is needed on DreamHost. The shared host has Python 3.12.3, but machine-wide CPU/memory figures do not establish this account's resource quota.

## Contact size and assumed density

`web/surface.js` supplies an original schematic surface field, not the study's human data. The field uses deterministic samples on stylised regional surfaces. Assigned weights are glans 1.0, hood 0.6 and surrounding tissue 0.25, with 320 / 200 / 910 samples respectively. Counts and weights are artistic assumptions; neither is a measured ending-density ratio. Surface geometry and sample distribution also affect the effective response.

For each sample within contact radius r, influence is `pressure × weight × (1 − distance/r) / 24`; contributions accumulate per region, are capped at 1, then square-root compressed. This authored input gain lets sparse branches produce a usable response while preserving zero, bounds and density ordering. Radius is in schematic scene units, not calibrated anatomical millimetres. A wider patch includes more samples; pressure scales their contribution. Clicking or dragging chooses a visible nerve endpoint; candidates close in screen space prefer the frontmost endpoint so a rear branch cannot steal a touch on the glans. A quick tap produces a bounded 140 ms input pulse so it reaches the worker between simulation ticks; blur, hiding the page, pause, reset and errors cancel it. Raw intensities pass through the same adaptation and delayed reward model as the Python API.

## Light and hearts

Every one of the 1,430 receptive samples is an endpoint of the authored branching tree in `web/nerve-arbor.js`. Median spatial splits form local arbors, which converge on a common junction and continue through the 111 synthetic bindings into the fly. A faint, grazing-angle shell supplies shape. The lower fly soma cloud is drawn more faintly so the human-side branches remain legible; all neurons remain in the simulation.

An occasional local glimmer invites touch. That invitation is decoration and never supplies neural activity. Touch lights activated branches; moving light visualises signal transport at an authored visual speed. The native model still uses its declared simulation delays.

`web/reward-hearts.js` receives actual PAM11 spike counts. A new reward burst produces a heart, and further spikes accumulate at 65 spikes per additional heart, with at most 40 visible at once. Their size, colour and drift are visual choices. The hearts never feed input, plasticity or a desire variable back into the simulation.

The front view has no metric panels. Optional instruments in About retain the mean PAM11 firing trace, the edge-weighted rate trace of bound KC inputs and a filtered aversive-cell firing rate. These are read-only diagnostics; no subjective experience or metabolic state is inferred.

## Sculpture and cinematography

`tools/sculpt-anatomy.mjs` authors smooth implicit corpora/crura and separate vestibular bulbs. Gaussian fields are blended and polygonised with Three.js MarchingCubes; the original surface geometry is distributed under MIT. The educational Odile Fillod model was inspected as a proportional reference, but its STL is not bundled or transformed into this geometry. Procedural internal branching is schematic. Neither geometry nor routes are the 2026 human scan.

`tools/export-preview.py` extracts display-only positions, a baseline edge sample, candidate-edge endpoints and the exact synthetic bindings from the checksum-locked browser payload. Those small assets show the connected body while the full model loads automatically behind a visible central progress indicator. An error exposes a visible retry control. Idle glimmer is confined to the authored receptor arbor. Lighting, bloom and afterglow affect appearance only. The camera remains under the viewer’s control; there are no scroll chapters or automatic orbit.

## Rebuild

From the repository root, after Python dataset preparation:

```sh
pip install -e '.[connectome]'
clitorisophila prepare
python tools/export_browser.py
# Install/activate Emscripten 6.0.11, then:
bash tools/build_wasm.sh
npm ci --prefix web
node tools/sculpt-anatomy.mjs
python tools/export-preview.py
npm run build --prefix web
python -m http.server 8771 --directory web/dist
```

Open `http://localhost:8771/`; the model loads automatically. Click or drag over the nerves, change touch size and strength, or use Pulse. Right-drag (or use two fingers) to rotate, and scroll/pinch to zoom. About contains the optional instruments, reset, pause, reward/learning switches and view reset.

Full model exports, WebAssembly build output and deployment bundles remain ignored; small display-only CC BY 4.0 soma/edge assets and original MIT anatomical meshes are distributed with file-level provenance under `web/public/sculpture/README.md`; source, lockfiles and actual render captures are in git. MaleCNS data attribution remains CC BY 4.0; original code and geometry are MIT. Three.js 0.180.0 is an MIT dependency.

## Checks and captures

- Python suite: 20 tests passed, full-graph test opt-in.
- Full native/WASM comparison: all 40 per-neuron spike-count frame hashes and the final candidate-weight hash matched exactly across an 800 ms protocol, including the same 479 total spikes and 13 changed candidate synapses. Reproduce with `node web/verify-wasm.mjs` then `python tools/check_wasm.py`. This assay validates the port for the tested protocol, not every possible state.
- `node web/test-surface.mjs` checks deterministic sampling, increasing contact area, pressure release, zero response outside the field and bounded output.
- Desktop/mobile browser checks use Playwright; actual screenshots and video show the running model rather than generated illustrations.

The page is published under `https://meow-meow.io/clitorisophila/`. Deploy only `web/dist/` to `/home/dh_9vppcg/meow-meow.io/clitorisophila/` with targeted rsync; never run a whole-docroot deletion from this checkout. `.htaccess` supplies WASM/module MIME types and prevents automatic decoding of the explicitly gzipped model payload before browser verification.

The anatomy, surface field, input mapping and learning hypothesis remain synthetic/modelled. No medical sensitivity map, felt pleasure or behavioural learning is established. The artwork keeps those seams visible.

## Social export

`web/render-social.mjs` records actual live contact and reward response into a square social composition with only title and URL. `tools/encode-social.py` exports a looping GIF and matching MP4. The simulation resets before recording, then all responses during the recording come from the running model. Output is under `assets/social/` and published under the artwork’s `share/` path.
