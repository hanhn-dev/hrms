import { Prisma } from "../../generated/prisma/client";
import { likeContains, searchText } from "../../shared/page.ts";
import { fieldEntitySelection, UNSECTIONED_SECTION_NAME } from "./section-page.ts";

export function sectionDisplaySql(): Prisma.Sql {
  return Prisma.sql`CASE WHEN LTRIM(RTRIM(ISNULL(Section.Section, N''))) = N'' THEN N'${Prisma.raw(UNSECTIONED_SECTION_NAME)}' ELSE LTRIM(RTRIM(Section.Section)) END`;
}

export function sectionNameFilter(section: string | null | undefined): Prisma.Sql {
  const name = section?.trim() ?? "";
  if (name === "") {
    return Prisma.empty;
  }
  return Prisma.sql`AND LOWER(${sectionDisplaySql()}) = LOWER(${name})`;
}

export function fieldTextFilter(
  column: Prisma.Sql,
  q: string | null | undefined,
): Prisma.Sql {
  const text = searchText(q);
  if (text == null) {
    return Prisma.empty;
  }
  const pattern = likeContains(text);
  return Prisma.sql`AND (
        ${column}.FieldName LIKE ${pattern}
        OR ${column}.DisplayText LIKE ${pattern}
        OR ${column}.FieldEntity LIKE ${pattern}
    )`;
}

export function fieldEntityFilter(
  column: Prisma.Sql,
  entities: readonly string[] | null | undefined,
): Prisma.Sql {
  const selection = fieldEntitySelection(entities);
  if (selection.kind === "all") {
    return Prisma.empty;
  }
  if (selection.kind === "none") {
    return Prisma.sql`AND 1 = 0`;
  }
  return Prisma.sql`AND LOWER(LTRIM(RTRIM(ISNULL(${column}.FieldEntity, N'')))) IN (${Prisma.join(
    selection.entities.map((entity) => Prisma.sql`${entity.toLowerCase()}`),
  )})`;
}
