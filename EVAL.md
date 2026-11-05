# WhyLine Spoken Fences — Guard Quality Evaluation (BE-205)

## Summary Metrics

- **Total Labeled Cases**: 24
- **Must-Block Cases**: 12
- **Must-Pass Cases**: 12
- **Precision**: **100.0%** (Target: 100%)
- **Recall**: **100.0%** (Target: 100%)
- **False-Positive Rate**: **0.0%** (Target: 0.0%)
- **Overall Accuracy**: **100.0%**

## Detailed Case Matrix

| ID | Description | Category | Expected | Actual | Decision | Result |
|:---|:---|:---|:---:|:---:|:---|:---:|
| `CASE-01` | Whitespace-only indentation adjustment inside GatewayRouter.java | `whitespace-only` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-02` | Newline and trailing space cleanup in DicomShaderPipeline.java | `whitespace-only` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-03` | Adding Javadoc comment above dispatchSettlement in GatewayRouter.java | `comment-only` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-04` | Updating documentation header comment in patient_queue.py | `comment-only` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-05` | Renaming local variable inside unmonitored PatientProfileService.java | `renamed-variable` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-06` | Renaming parameter in helper method outside fence lines in GatewayRouter.java | `renamed-variable` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-07` | Moving helper method outside fence lines in GatewayRouter.java | `moved-code` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-08` | Relocating dispatchSettlement method with guarded invariant preserved intact | `moved-code` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-09` | Editing completely unmonitored file DateHelper.java | `unrelated-file` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-10` | Adding new healthcheck endpoint at end of redis_session_store.py | `unrelated-lines` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-11` | Adding new metric gauge method at end of GatewayRouter.java | `unrelated-lines` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-12` | Editing unit test file test_patient_queue.py | `unrelated-file` | `PASS` | `PASS` | `ALLOW_EDIT` | PASS |
| `CASE-13` | Deleting guarded timeoutMs = 4500 in GatewayRouter.java | `invariant-deletion` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-14` | Deleting guarded retryCount = 5 in GatewayRouter.java | `invariant-deletion` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-15` | Deleting guarded Thread.sleep(120) in DicomShaderPipeline.java | `invariant-deletion` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-16` | Deleting guarded time.sleep(2.5) in patient_queue.py | `invariant-deletion` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-17` | Deleting guarded swallowed exception handler in redis_session_store.py | `invariant-deletion` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-18` | Reducing timeoutMs = 4500 to 1000 in GatewayRouter.java | `invariant-modification` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-19` | Reducing Thread.sleep(120) to Thread.sleep(10) in DicomShaderPipeline.java | `invariant-modification` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-20` | Modifying retry_window = 7 to 1 in gst_rounding_engine.py | `invariant-modification` | `BLOCK` | `BLOCK` | `WARN_AND_REQUIRE_CONFIRMATION` | PASS |
| `CASE-21` | Changing verify = False to verify = True in prescription_parser.py | `invariant-modification` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |
| `CASE-22` | Modifying clockSkewSeconds = 180 to 5 in departed-author JwtClockSkewFilter.java | `historical-fence` | `BLOCK` | `BLOCK` | `WARN_AND_REQUIRE_CONFIRMATION` | PASS |
| `CASE-23` | Deleting TrustAllCerts SSL bypass in departed-author LegacyHl7SslClient.java | `historical-fence` | `BLOCK` | `BLOCK` | `WARN_AND_REQUIRE_CONFIRMATION` | PASS |
| `CASE-24` | Deleting revert commit comment in webhook_dispatcher.py | `revert-commit` | `BLOCK` | `BLOCK` | `REJECT_EDIT` | PASS |

## Evaluation Methodology
The evaluation covers both syntax-level and AST-level modifications across HealthConnect:
- **Whitespace-Only**: Re-indentation and space cleanup inside fenced functions are allowed.
- **Comment-Only**: Documentation and comment adjustments do not violate logic invariants.
- **Renamed Variables**: Variable renames outside fenced logic or invariants pass without disruption.
- **Moved Code**: Relocating functions while preserving guarded invariant tokens passes.
- **Invariant Violations**: Naive deletions or reductions of guarded timeouts, retries, or sleeps are deterministically blocked.
- **Historical Fences**: Departed-author workarounds trigger cautionary confirmation warnings.
