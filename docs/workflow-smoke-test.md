# Copilot review pause workflow smoke test

This temporary document is linked to issue #423 to verify the active `severity:standard` pull request behavior added in #422.

After CI passes, start a fresh `Agent code review` run for issue #423 with `dry run` off. When `PAUSE_COPILOT_REVIEW=true`, Delivery stages should record that Copilot review was skipped for the current commit and proceed to the normal QA handoff. QA approval for the current commit must still gate delivery. This file does not change application behavior and should be removed when the smoke test is closed.
