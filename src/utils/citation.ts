import type { LayerMetadata } from "../types";

// The short source line: the first author ("et al." when there are more), the title and the period
export function shortCitation(metadata: LayerMetadata): string {
  const [first, ...others] = metadata.author.split("; ");
  return `${first}${others.length > 0 ? " et al." : ""}, "${metadata.title}," ${metadata.period}`;
}
