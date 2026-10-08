import json
import subprocess
import sys


def test_cli_runs_and_resumes_native_fixture(tmp_path):
    snap = tmp_path / "snapshot"
    command = [sys.executable, "-m", "clitorisophila", "demo", "--steps", "8", "--fast"]
    first = subprocess.run([*command, "--checkpoint", str(snap)], capture_output=True, text=True, check=True)
    rows = [json.loads(line) for line in first.stdout.splitlines()]
    assert len(rows) == 8 and rows[-1]["tick"] == 8
    second = subprocess.run([*command, "--restore", str(snap)], capture_output=True, text=True, check=True)
    assert json.loads(second.stdout.splitlines()[0])["tick"] == 9


def test_live_ticking_continues_after_input_eof_with_released_channels():
    process = subprocess.run([sys.executable, "-m", "clitorisophila", "live", "--backend", "fixture", "--steps", "3"],
                             input="", capture_output=True, text=True, check=True)
    rows = [json.loads(line) for line in process.stdout.splitlines()]
    assert len(rows) == 3
    assert all(r["input"] == {} for r in rows)
    assert rows[-1]["sim_ms"] == 60


def test_live_input_expires_while_producer_remains_connected():
    process = subprocess.Popen([sys.executable, "-m", "clitorisophila", "live", "--backend", "fixture",
                                "--steps", "12", "--timeout-ms", "30"],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        process.stdin.write(json.dumps({"schema": "clitorisophila.input.v1", "channels": {"glans": 1}}) + "\n")
        process.stdin.flush()
        rows = [json.loads(process.stdout.readline()) for _ in range(12)]
        assert any(r["input"] == {"glans": 1} for r in rows)
        assert rows[-1]["input"] == {} and rows[-1]["input_stale"]
        assert rows[-1]["reward_delivered"] == 0
        process.wait(timeout=5)
        assert process.returncode == 0
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()
        process.stdin.close()
        process.stdout.close()
        process.stderr.close()
