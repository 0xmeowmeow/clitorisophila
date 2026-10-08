"""Compare web/verify-wasm.mjs output with the full Python simulator."""
import hashlib
import json
from clitorisophila import Frame, Loop
from clitorisophila.native import full_backend, synthetic_gateway

backend = full_backend()
loop = Loop(backend, synthetic_gateway(backend))
wasm = json.load(open('/tmp/clitorisophila-wasm-assay.json'))
assert len(wasm) == 40
for i, other in enumerate(wasm):
    row = loop.step(Frame({'glans': 1}) if i < 10 else Frame())
    digest = hashlib.sha256(backend.brain.counts.tobytes()).hexdigest()
    assert digest == other['spike_sha256'], f'Spike-frame mismatch at tick {i+1}'
    assert row['memory']['changed_edges'] == other['changed_edges']
assert hashlib.sha256(backend.brain.weight[backend.brain.circuit['edges']].tobytes()).hexdigest() == wasm[-1]['plastic_sha256'], 'Candidate weight hash mismatch'
print('All 40 full-graph spike frames and changed-edge counts match Python.')
