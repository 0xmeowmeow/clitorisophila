# Clitorisophila display assets

These small assets render the connected organism before the full simulator is loaded. They contain no recorded or fabricated neural activity.

- `corpora.bin`, `bulbs.bin`: original implicit sculpture, authored by `tools/sculpt-anatomy.mjs`. MIT, under the repository software licence. Format: little-endian uint32 vertex count, followed by float32 triangle positions and normals. No externally authored anatomical mesh is included.
- `soma.bin`, `fibres.bin`: display-only soma positions and 16,000 baseline edge routes extracted by `tools/export-preview.py` from the checksum-locked Stonkfly/MaleCNS export. CC BY 4.0; HHMI Janelia, Google Research and MaleCNS collaborators. Includes 139,662 recorded soma locations and 27,038 estimated locations. These spatial estimates do not modify connectivity. Format: little-endian float32 triples.
- `binding.json`: 96 engineered sensory bindings, 15 engineered reward bindings, and endpoints of the retained 7,835 candidate plastic edges. Binding choices are original software parameters; graph-derived endpoints retain the dataset's CC BY 4.0 attribution.

Source: [MaleCNS v1.0](https://male-cns.janelia.org/), via the release and checksums recorded in `stonkfly/neural/sources.lock.json` and `web/public/model/manifest.json` (full model downloaded/hosted separately).

[CC BY 4.0 licence](https://creativecommons.org/licenses/by/4.0/). Rebuild from the repository root after preparing the browser model:

```sh
node tools/sculpt-anatomy.mjs
python3 tools/export-preview.py
```

The image and receptor field are artistic assumptions, not the 2026 human nerve scan. See `docs/browser-artwork.md` for the transduction, artificial binding paths and read-only interior-state interpretation.
