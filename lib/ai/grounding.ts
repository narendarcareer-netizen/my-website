import type { ResumeJobComparison, SourceFacts } from "./types";

function normalized(value: unknown) {
  return JSON.stringify(value).toLowerCase();
}

export function filterGroundedSuggestedEdits(
  comparison: ResumeJobComparison,
  parsedText: string,
  sourceFacts: SourceFacts,
) {
  const facts = normalized(sourceFacts);

  return {
    ...comparison,
    suggestedEdits: comparison.suggestedEdits.filter((edit) => {
      const exactOriginalExists = parsedText.includes(edit.original);
      const citedFactExists = facts.includes(edit.sourceFact.toLowerCase());
      const numbersAreGrounded = [...edit.suggested.matchAll(/\d+(?:\.\d+)?%?/g)].every(
        ([value]) => parsedText.includes(value) || facts.includes(value.toLowerCase()),
      );

      return exactOriginalExists && citedFactExists && numbersAreGrounded;
    }),
  };
}
