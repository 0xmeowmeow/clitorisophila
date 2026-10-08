# Contributing

Install `pip install -e '.[test,connectome]'`, then run `python -m pytest -q`. Full-graph tests are opt-in after data preparation; see `docs/clitorisophila-validation.md`.

Useful contributions include adapters for other fly simulators, virtual/physical stimulation sources, transparent host action decoders, and controlled preference assays. Keep source neuron IDs, input calibration, timestep, learning rule and decoder visible. Label synthetic circuits and anatomical models explicitly. If adding clitoral scan/segmentation support, provide the original accession, license and spatial provenance; do not bundle restricted scientific assets under the code license.

For model changes, show matched frozen/no-reward controls and separate activity/weight changes from behavioural learning. Preserve the upstream graph and MIT attribution. Never include credentials, datasets or personal stimulation logs in a pull request.
