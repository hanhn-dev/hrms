export type OrderedSearchTarget = {
  schema: string;
  name: string;
  hasEmployerColumn: boolean;
  referenceCount: number;
};

function qualifiedName(target: OrderedSearchTarget): string {
  return `${target.schema}.${target.name}`;
}

/**
 * Employer-scoped tables first when an employer is selected, then tables the
 * database modules reference most often, then shorter names (the live table
 * is usually shorter than a copy).
 */
export function orderSearchTargets<T extends OrderedSearchTarget>(
  targets: readonly T[],
  employerSelected: boolean,
): T[] {
  return [...targets].sort((left, right) => {
    if (
      employerSelected &&
      left.hasEmployerColumn !== right.hasEmployerColumn
    ) {
      return left.hasEmployerColumn ? -1 : 1;
    }
    if (left.referenceCount !== right.referenceCount) {
      return right.referenceCount - left.referenceCount;
    }
    if (left.name.length !== right.name.length) {
      return left.name.length - right.name.length;
    }
    return qualifiedName(left).localeCompare(qualifiedName(right));
  });
}
