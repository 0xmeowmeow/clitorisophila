# Validation

Run the package tests with:

```sh
pip install -e '.[test,connectome]'
python -m pytest -q
```

The native synthetic fixture tests signal delivery, a 100 ms delayed reward, activity propagation to the selected output, eligibility-specific weight change, no-reward and frozen controls, adaptation/release, source-ID mapping, input validation, bounded input buffering, and exact continuation including pending rewards. CLI tests check continuing idle ticks and checkpoint/resume. This verifies implementation, not biological learning.

Full-graph integration requires the separately downloaded sources:

```sh
clitorisophila prepare
CLITORISOPHILA_FULL_TEST=1 python -m pytest -q tests_clitorisophila/test_full.py
```

It checks full graph counts/provenance, actual PAM11 and KC activity, and changes confined to the upstream candidate plastic edges. It records measured processing speed. No behavioural preference or subjective-experience claim follows from passing this check.

Original trading tests remain under `tests/` as inherited upstream coverage; they are not run by the new package's default test command. The optional `trading` extra is needed to run them. No trading code is invoked by the Clitorisophila tests or entry point.

## Measured on October 8, 2026

- Local automated suite: 20 passed, one opt-in full-graph test skipped by default.
- Full-graph test: passed using the upstream source checksums and graph-array locks, with 166,700 neurons, 25,582,938 directed connections and 7,835 candidate plastic edges.
- In an 800 ms stimulation/release protocol: 94 spikes in the mapped glans KC population, 360 reward-cell spikes, and 13 changed candidate edges. The matched no-injected-reward run had zero reward-cell spikes and different candidate efficacies. The frozen run preserved every baseline weight; graph endpoints remained identical.
- Native integration took about 0.048 seconds for that 800 ms simulation on this machine, excluding loading, verification and Python orchestration. This is a sparse-input measurement, not a guarantee for highly active networks or other hardware.
- The full CLI's 400 ms protocol took about 53 ms of total tick processing, excluding load/verification and checkpoint writing. Its native-plus-adapter snapshot restored and the next record continued at tick 21.

These are implementation measurements. Behavioural preference and human anatomical transduction have not been tested.
