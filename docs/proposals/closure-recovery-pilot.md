# Validate closure recovery with a worked pilot

Proposal for review. This does not change the work protocol or evidence rules.
Related discussions: [129](https://github.com/kibertoad/refurbished-dinosaurs/issues/129),
[124](https://github.com/kibertoad/refurbished-dinosaurs/issues/124) and
[91](https://github.com/kibertoad/refurbished-dinosaurs/issues/91).

Successive conditional findings can leave an investigation with no complete
reading or answered queue item. Reading another helper may narrow its local
behavior while leaving the same state, target, backing and interference
conditions unresolved. Existing guidance already requires connected reading,
claim-relevant dependencies, specific writer mechanisms and changed work
selection after poor closure results. The proposed pilot tests whether that
guidance leads to closure in practice.

## Select and freeze the contract

Choose one independently meaningful contract involving shared mutable state and
an indirect service. State its observable answer, entry scope, competing readings
and finite remaining obligations before the first batch. Review retained evidence
first. Identify the producer invariants that could discharge each precondition,
including the actual service binding and the lifetime of its inputs. Record why
the admitted path reaches that service before reading its deeper internals.

For each blocker, name the claim it affects, the access mechanism and the finite
evidence that would remove it. Distinguish an incomplete access census from a
specific unresolved alias and from a hypothetical concern with no identified
mechanism. Apply the existing evidence criteria to each; do not assume callbacks
are harmless or waive an unresolved mechanism.

## Publish a successful and a failing worked example

Carry one example from partial evidence to an accepted whole-entry complete
reading or an evidenced queue answer. Show the connected callers, writers and
helpers considered, where their scope terminates, and the evidence that admits
the required state and targets. Explain why each retained external dependency
does or does not affect the claim. Preserve every transferred unresolved claim;
splitting solely to improve counts is not closure.

The failing counterpart should show batches that keep narrowing local cases
while retaining the same admission mechanisms. At the pilot's outcome review,
compare cumulative obligations with the starting boundary, even when each batch
has made local progress. If no whole mapped obligation has been removed, do not
automatically select the next helper. Record whether the contract was poorly
selected, the census is incomplete, or the evidence method cannot admit the
required state. Select a different contract, a specific census or a different
evidence method according to that diagnosis. Retain the original question and
its unresolved claims.

## Evaluate before adopting another procedure

Use exact revisions and stable IDs for the pilot comparison. Report accepted
complete readings, evidenced answers and removed whole mapped obligations first.
Retain splits, moves, unassigned functions, missing inventories and unresolved
transfers. Findings and commits remain activity measures. Measure time before
attributing the result to bookkeeping or validation overhead.

If the pilot still only adds conditional findings, report failed recovery and
revise the diagnosis. Procedure adoption alone does not show faster closure.
The worked examples and the pilot's outcome should support any later normative
protocol change. This proposal introduces no gate removal, status promotion,
success quota or additional runtime authorization.

