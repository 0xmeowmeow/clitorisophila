import io
import json

import numpy as np
import pytest

from clitorisophila import Channel, Config, Frame, Loop, Mapping
from clitorisophila.cli import LatestInput
from clitorisophila.fixture import fixture_backend


def run_protocol(loop, n=40):
    return [loop.step(Frame({"glans": 1.0}) if i < 10 else Frame()) for i in range(n)]


def make_loop(config=None):
    backend, mapping = fixture_backend()
    return Loop(backend, mapping, config)


@pytest.mark.parametrize("intensity", [float("nan"), float("inf"), -.1, 1.1, True, "1"])
def test_invalid_stimulus_rejected(intensity):
    with pytest.raises(ValueError):
        Frame({"glans": intensity})


def test_unknown_channel_does_not_advance_state():
    loop = make_loop()
    with pytest.raises(ValueError, match="Unknown"):
        loop.step(Frame({"unknown": 1}))
    assert loop.tick == 0 and loop.backend.brain.cursor == 0


def test_mapping_resolves_source_ids_and_rejects_missing_or_reward_overlap(tmp_path):
    backend, mapping = fixture_backend()
    mapping.save(tmp_path / "mapping.json")
    assert Mapping.load(tmp_path / "mapping.json").signature() == mapping.signature()
    absent = Mapping((Channel("touch", ("999",)),), mapping.reward_ids, {})
    with pytest.raises(ValueError, match="absent"):
        Loop(backend, absent)
    with pytest.raises(ValueError, match="separate"):
        Mapping((Channel("touch", ("104",)),), ("104",), {})


def test_native_reward_causes_specific_memory_change_and_readout_activity():
    paired, no_reward, frozen = make_loop(), make_loop(Config(reward_enabled=False)), make_loop(Config(learning=False))
    rows = run_protocol(paired)
    control = run_protocol(no_reward)
    run_protocol(frozen)
    assert paired.backend.brain.cursor == 40 * 200
    assert rows[4]["reward_delivered"] == 0 and rows[5]["reward_delivered"] == 1
    assert sum(r["reward_spikes"] for r in rows) > 0
    assert sum(r["readout_hz"]["output_a"] for r in rows) > 0
    assert all(r["readout_hz"]["output_b"] == 0 for r in rows)
    assert paired.backend.memory()["changed_edges"] == 1
    assert control[-1]["memory"]["changed_edges"] == 0
    assert frozen.backend.memory()["changed_edges"] == 0
    assert paired.backend.brain.weight[1] == 60  # Unstimulated cue's synapse.
    assert np.isfinite(paired.backend.brain.weight).all()


def test_adaptation_and_release():
    loop = make_loop()
    rows = [loop.step(Frame({"glans": 1})) for _ in range(30)]
    assert rows[-1]["sensory_response"]["glans"] < rows[0]["sensory_response"]["glans"]
    released = [loop.step() for _ in range(6)]
    assert all(r["sensory_response"]["glans"] == 0 for r in released)
    assert released[-1]["reward_delivered"] == 0


def test_exact_resume_includes_pending_rewards_adaptation_and_native_memory(tmp_path):
    loop = make_loop()
    for _ in range(3):
        loop.step(Frame({"glans": 1}))
    loop.checkpoint(tmp_path / "snapshot")
    original = run_protocol(loop)
    resumed = make_loop()
    resumed.restore(tmp_path / "snapshot")
    replay = run_protocol(resumed)
    for a, b in zip(original, replay):
        a.pop("compute_seconds")
        b.pop("compute_seconds")
        assert a == b
    assert np.array_equal(loop.backend.brain.v, resumed.backend.brain.v)


def test_checkpoint_provenance_and_integrity(tmp_path):
    loop = make_loop()
    loop.checkpoint(tmp_path / "snapshot")
    with pytest.raises(ValueError, match="configuration"):
        make_loop(Config(learning=False)).restore(tmp_path / "snapshot")
    path = tmp_path / "snapshot/brain.npz"
    path.write_bytes(path.read_bytes() + b"corruption")
    with pytest.raises(ValueError, match="checksum"):
        make_loop().restore(tmp_path / "snapshot")


def test_mailbox_is_bounded_and_eof_releases():
    reader = LatestInput(io.StringIO(''), ["glans"])
    reader.put(Frame({"glans": .2}))
    reader.put(Frame({"glans": .7}))
    assert reader.mailbox.qsize() == 1
    assert reader.poll()[1].channels == {"glans": .7}
    reader.run()
    assert reader.poll()[1].channels == {}


def test_bad_input_releases_instead_of_latching_previous_stimulation(capsys):
    # Poll between lines so EOF does not mask rejection behaviour.
    reader = LatestInput(iter(['{"schema":"wrong","channels":{"glans":1}}\n']), ["glans"])
    reader.run()
    assert "Rejected input" in capsys.readouterr().err
    assert reader.poll()[1].channels == {}


@pytest.mark.parametrize("config", [{"tick_ms": 1.03}, {"tick_ms": 30, "reward_delay_ms": 100}, {"learning": 1}])
def test_invalid_clock_and_flags(config):
    with pytest.raises(ValueError):
        Config(**config)
