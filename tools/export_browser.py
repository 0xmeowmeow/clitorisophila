"""Export the verified retained graph for WASM; never filter simulation edges."""
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np

from clitorisophila.native import full_backend, synthetic_gateway
from stonkfly.neural.common import annotations


out = Path('web/public/model')
out.mkdir(parents=True, exist_ok=True)
backend = full_backend()
b = backend.brain
mapping = synthetic_gateway(backend)
a = annotations(b.ids)
position = np.full((b.n, 3), np.nan)
known = a.somaLocation.notna().to_numpy()
position[known] = np.stack(a.somaLocation[known].to_numpy())
# Only display positions are estimated. Graph endpoints are never altered.
for iteration in range(4):
    missing = np.isnan(position[:, 0])
    valid = ~missing
    if not missing.any():
        break
    for i in np.flatnonzero(missing):
        neighbors = b.post[b.ptr[i]:b.ptr[i+1]]
        neighbors = neighbors[valid[neighbors]]
        if len(neighbors):
            position[i] = position[neighbors].mean(axis=0)
position[np.isnan(position[:, 0])] = np.nanmean(position, axis=0)
center = np.median(position, axis=0)
scale = np.percentile(np.linalg.norm(position-center, axis=1), 98)
position = ((position-center)/scale*3).astype(np.float32)
position[:, 1] *= -1
arrays = {k: getattr(b, k) for k in ['ptr', 'post', 'weight', 'ids']}
arrays.update(position=position, position_observed=known.astype(np.uint8),
              modulation_mask=b.modulation_mask)
chosen = np.argpartition(np.abs(b.weight), -16000)[-16000:]
draw_pre = np.searchsorted(b.ptr, chosen, side='right') - 1
draw_positions = np.stack([position[draw_pre], position[b.post[chosen]]], axis=1).astype(np.float32)
arrays['draw_positions'] = draw_positions
arrays.update({k: b.circuit[k] for k in ['kc', 'mb', 'dan', 'reward', 'aversive', 'edges', 'pre', 'gain', 'kc_mask', 'dan_index']})
manifest = {
    'schema': 'clitorisophila.browser-model.v1', 'neurons': b.n,
    'connections': len(b.post), 'plastic_edges': len(b.circuit['edges']),
    'mapping': mapping.document(), 'source': 'MaleCNS v1.0 / Stonkfly checksum-locked graph',
    'source_lock': json.loads(Path('stonkfly/neural/sources.lock.json').read_text()),
    'license': 'CC-BY-4.0',
    'attribution': 'HHMI Janelia, Google Research and MaleCNS collaborators',
    'observed_positions': int(known.sum()), 'estimated_positions': int((~known).sum()), 'arrays': {},
    'display_edges': 16000,
    'display_edge_selection': 'Strongest absolute baseline weights, drawn only; every simulation edge remains retained.',
}
raw = bytearray()
for key, array in arrays.items():
    array = np.ascontiguousarray(array)
    raw.extend(b'\0'*((-len(raw)) % 8))
    manifest['arrays'][key] = {'offset': len(raw), 'shape': list(array.shape),
                             'dtype': array.dtype.str, 'bytes': array.nbytes}
    raw.extend(array.tobytes())
manifest['payload_sha256'] = hashlib.sha256(raw).hexdigest()
with (out/'connectome.bin.gz').open('wb') as f:
    with gzip.GzipFile(fileobj=f, mode='wb', compresslevel=6, mtime=0) as gz:
        gz.write(raw)
manifest['compressed_bytes'] = (out/'connectome.bin.gz').stat().st_size
manifest['uncompressed_bytes'] = len(raw)
(out/'manifest.json').write_text(json.dumps(manifest, separators=(',', ':'))+'\n')
print(json.dumps({k: manifest[k] for k in ['neurons', 'connections', 'compressed_bytes', 'uncompressed_bytes', 'observed_positions', 'estimated_positions']}))
