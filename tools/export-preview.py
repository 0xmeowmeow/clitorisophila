"""Extract display-only soma positions and binding IDs from the locked model."""
import gzip,json
from pathlib import Path
import numpy as np
base=Path('web/public/model');out=Path('web/public/sculpture');out.mkdir(exist_ok=True)
m=json.loads((base/'manifest.json').read_text());raw=gzip.decompress((base/'connectome.bin.gz').read_bytes())
def array(key):
 s=m['arrays'][key];return np.ndarray(s['shape'],dtype=s['dtype'],buffer=raw,offset=s['offset'])
for key,name in [('position','soma'),('draw_positions','fibres')]:
 a=array(key);(out/(name+'.bin')).write_bytes(a.tobytes())
ids={str(v):i for i,v in enumerate(array('ids'))}
groups={'sensory':[[ids[str(v)] for v in c['source_ids']] for c in m['mapping']['channels']],'reward':[ids[str(v)] for v in m['mapping']['reward_ids']]}
groups['circuit']={'pre':array('pre').tolist(),'post':array('post')[array('edges')].tolist()}
(out/'binding.json').write_text(json.dumps(groups))
print('display bounds',array('position').min(0),array('position').max(0))
