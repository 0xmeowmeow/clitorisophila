"""Six-cell synthetic fixture exercising the real native kernel, not fly data."""

from pathlib import Path
import tempfile

import numpy as np

from .core import Channel, Mapping
from .native import NativeBackend


def fixture_backend():
    from stonkfly.neural.brain import MemoryBrain

    ids = np.arange(100, 106, dtype=np.int64)
    # Two cue KCs → two MBONs; reward/aversive cells project to those MBONs.
    ptr = np.array([0, 1, 2, 2, 2, 4, 6], dtype=np.int64)
    post = np.array([2, 3, 2, 3, 2, 3], dtype=np.int32)
    edges = np.array([0, 1], dtype=np.int64)
    circuit = {
        "kc": np.array([0, 1], dtype=np.int32),
        "mb": np.array([2, 3], dtype=np.int32),
        "dan": np.array([4, 5], dtype=np.int32),
        "reward": np.array([4], dtype=np.int32),
        "aversive": np.array([5], dtype=np.int32),
        "edges": edges, "pre": np.array([0, 1], dtype=np.int32),
        "gain": np.array([[1, 1], [1, 1]], dtype=np.float32),
        "kc_mask": np.array([1, 1, 0, 0, 0, 0], dtype=np.uint8),
        "dan_index": np.array([-1, -1, -1, -1, 0, 1], dtype=np.int8),
        "report": {"validated": False, "kind": "synthetic six-cell fixture"},
    }
    with tempfile.TemporaryDirectory() as tmp:
        graph = Path(tmp) / "graph.npz"
        np.savez(graph, ids=ids, ptr=ptr, post=post,
                 weight=np.array([60, 60, .275, .275, .275, .275], dtype=np.float32),
                 retina=np.empty(0, dtype=np.int32), uv=np.empty((0, 2), dtype=np.float32),
                 lamina=np.empty(0, dtype=np.int32), sugar=np.empty(0, dtype=np.int32),
                 superclass=np.array(["synthetic"] * 6))
        brain = MemoryBrain(graph, circuit=circuit,
                            modulation_mask=np.array([0, 0, 0, 0, 1, 1], dtype=np.uint8))
    mapping = Mapping(
        (Channel("glans", ("100",)), Channel("hood", ("101",))), ("104",),
        {"output_a": ("102",), "output_b": ("103",)},
        {"kind": "synthetic six-cell fixture", "connectome_data": False,
         "human_anatomy_data": False},
    )
    return NativeBackend(brain), mapping
