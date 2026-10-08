"""Opt-in test against the full released MaleCNS graph, never a fixture."""

import hashlib
import json
import os

import numpy as np
import pytest

from clitorisophila import Config, Frame, Loop
from clitorisophila.native import full_backend, synthetic_gateway


@pytest.mark.skipif(os.environ.get("CLITORISOPHILA_FULL_TEST") != "1",
                    reason="Requires separately downloaded full MaleCNS data")
def test_retained_full_graph_stimulation_reward_and_frozen_control():
    backend = full_backend()
    b = backend.brain
    assert b.n == 166700 and len(b.post) == 25582938
    assert len(b.circuit["reward"]) == 15
    assert len(b.circuit["edges"]) == 7835
    mapping = synthetic_gateway(backend)
    loop = Loop(backend, mapping)
    topology = hashlib.sha256(b.ptr.tobytes() + b.post.tobytes()).hexdigest()
    original_weight = b.weight.copy()
    rows = [loop.step(Frame({"glans": 1.0}) if i < 10 else Frame()) for i in range(40)]
    assert sum(r["reward_spikes"] for r in rows) > 0
    assert sum(r["total_spikes"] for r in rows) > 0
    assert sum(r["sensory_spikes"]["glans"] for r in rows) > 0
    assert b.memory()["changed_edges"] > 0
    changed = np.flatnonzero(b.weight != original_weight)
    assert np.isin(changed, b.circuit["edges"]).all()
    assert hashlib.sha256(b.ptr.tobytes() + b.post.tobytes()).hexdigest() == topology
    paired_weights = b.weight[b.circuit["edges"]].copy()
    assert np.isfinite(b.weight).all()
    b.reset()
    disabled = Loop(backend, mapping, Config(reward_enabled=False))
    controls = [disabled.step(Frame({"glans": 1.0}) if i < 10 else Frame()) for i in range(40)]
    assert not np.array_equal(paired_weights, b.weight[b.circuit["edges"]])
    b.reset()
    frozen = Loop(backend, mapping, Config(learning=False))
    for i in range(40):
        frozen.step(Frame({"glans": 1.0}) if i < 10 else Frame())
    assert np.array_equal(b.weight, original_weight)
    report = {
        "neurons": b.n, "directed_connections": len(b.post),
        "plastic_edges": len(b.circuit["edges"]), "changed_edges_paired": len(changed),
        "reward_spikes_paired": sum(r["reward_spikes"] for r in rows),
        "sensory_spikes_paired": sum(r["sensory_spikes"]["glans"] for r in rows),
        "reward_spikes_no_injection": sum(r["reward_spikes"] for r in controls),
        "neural_simulated_ms": rows[-1]["sim_ms"],
        "native_compute_seconds": sum(r["compute_seconds"] for r in rows),
        "frozen_weights_unchanged": True, "topology_unchanged": True,
        "behavioural_learning_tested": False,
    }
    print(json.dumps(report, sort_keys=True))
