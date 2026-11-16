# Copilot review pause workflow smoke test

This temporary document is linked to issue #423 to verify the `severity:standard` pull request behavior added in #422.

With `PAUSE_COPILOT_REVIEW=true`, the delivery workflow should record that Copilot review was skipped for this commit. CI, the QA handoff, and the current-commit QA approval must still gate delivery. This file does not change application behavior and should be removed when the smoke test is closed.
