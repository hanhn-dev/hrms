import { Prisma } from "../../generated/prisma/client";
import type { HrmsDb } from "../../shared/client";
import { requireResolvedEmployee } from "../../shared/employee";
import { presentTables } from "../../shared/objects";
import { EMPLOYEE_LIST_SECTION_COLUMNS, sectionCountTableNames } from "./list-columns";
import { SECTION_COUNT_SPECS } from "./specs";

export type EmployeeSectionCount = {
  sectionId: number;
  sectionName: string;
  label: string;
  recordCount: number | null;
  missingObjects: string[];
};

type CountRow = {
  SectionId: number;
  SectionName: string;
  Label: string;
  RecordCount: number | bigint;
};

/**
 * Live active My Details row counts for one employee.
 * Soft-delete / Show filters match the Get SPs Troubleshooter does not call.
 */
export async function getEmployeeSectionCounts(
  db: HrmsDb,
  employerId: number,
  employmentNumber: string,
): Promise<EmployeeSectionCount[]> {
  const identity = await requireResolvedEmployee(db, employerId, employmentNumber);
  const employeeId = identity.employeeId;
  const present = await presentTables(db, sectionCountTableNames());
  const branches: Prisma.Sql[] = [];
  const add = (tables: readonly string[], statement: Prisma.Sql) => {
    if (tables.every((table) => present.has(table))) {
      branches.push(statement);
    }
  };

  add(
    [],
    Prisma.sql`
    SELECT
        1 AS SectionId,
        N'Personal Details' AS SectionName,
        N'Personal Details' AS Label,
        CAST(1 AS bigint) AS RecordCount`,
  );
  add(
    ["TEmployeeSkillDetails"],
    Prisma.sql`
    SELECT
        2,
        N'Skill Details',
        N'Skill',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeSkillDetails AS Skill
            WHERE Skill.EmployeeId = ${employeeId}
                AND (Skill.Isdeleted IS NULL OR Skill.Isdeleted = N'N')
        )`,
  );
  add(
    ["TEmployeeDomainDetails"],
    Prisma.sql`
    SELECT
        3,
        N'Domain Details',
        N'Domain Information',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeDomainDetails AS Domain
            WHERE Domain.EmployeeId = ${employeeId}
                AND (Domain.Isdeleted IS NULL OR Domain.Isdeleted = N'N')
        )`,
  );
  add(
    ["TEmployeePassportDetails", "TEmployeeVisaInfo"],
    Prisma.sql`
    SELECT
        4,
        N'Passport Details',
        N'Passport & Visa Details',
        (
            -- TEmployeePassportDetails has no soft-delete column (matches SP_EMPMD_GetPassportDet).
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeePassportDetails AS Passport
            WHERE Passport.EmployeeId = ${employeeId}
        )
        + (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeVisaInfo AS Visa
            WHERE Visa.EmployeeID = ${employeeId}
                AND Visa.Isdeleted IS NULL
        )`,
  );
  add(
    ["TPastEmploymentDetails"],
    Prisma.sql`
    SELECT
        6,
        N'Past Employment Details',
        N'Past Employment',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TPastEmploymentDetails AS Past
            WHERE Past.EmployeeId = ${employeeId}
                AND (Past.IsDelete IS NULL OR Past.IsDelete = 0)
        )`,
  );
  add(
    ["TEmployeeBankDetails"],
    Prisma.sql`
    SELECT
        7,
        N'Bank Details',
        N'Bank Details',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeBankDetails AS Bank
            WHERE Bank.EmployeeId = ${employeeId}
                AND ISNULL(Bank.Show, 1) = 1
                AND ISNULL(Bank.IsDelete, 0) = 0
        )`,
  );
  add(
    ["TEmployeeNomination"],
    Prisma.sql`
    SELECT
        8,
        N'Nomination Details',
        N'Nomination Details',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeNomination AS Nomination
            WHERE Nomination.EmployeeID = ${employeeId}
                AND Nomination.IsDelete = 0
        )`,
  );
  add(
    ["TEducationDetails"],
    Prisma.sql`
    SELECT
        9,
        N'Education Details',
        N'Education Details',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEducationDetails AS Education
            WHERE Education.EmployeeId = ${employeeId}
                AND Education.IsDelete IS NULL
        )`,
  );
  add(
    ["TEmployeeFamilyDetails"],
    Prisma.sql`
    SELECT
        10,
        N'Family Details',
        N'Family Details',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeFamilyDetails AS Family
            WHERE Family.EmployeeID = ${employeeId}
                AND Family.IsDelete = 0
        )`,
  );
  add(
    ["TEmployeeNominee_Details"],
    Prisma.sql`
    SELECT
        17,
        N'Nominee Details',
        N'Nominee Details',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeNominee_Details AS Nominee
            WHERE Nominee.EmployeeID = ${employeeId}
                AND ISNULL(Nominee.IsDelete, 0) = 0
        )`,
  );
  add(
    ["TEmployeeContactDetails"],
    Prisma.sql`
    SELECT
        11,
        N'Contact Details',
        N'Contact Details',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeContactDetails AS Contact
            WHERE Contact.EmployeeID = ${employeeId}
        )`,
  );
  add(
    ["TEmployeeEmergencyContactDetails"],
    Prisma.sql`
    SELECT
        12,
        N'Emergency Contact Details',
        N'Emergency Contacts',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TEmployeeEmergencyContactDetails AS Emergency
            WHERE Emergency.EmployeeID = ${employeeId}
                AND (Emergency.Isdeleted = N'N' OR Emergency.Isdeleted IS NULL)
        )`,
  );
  add(
    ["TCertificationDetails"],
    Prisma.sql`
    SELECT
        13,
        N'Certification Details',
        N'Certifications',
        (
            SELECT COUNT_BIG(*)
            FROM dbo.TCertificationDetails AS Certification
            WHERE Certification.EmployeeId = ${employeeId}
                AND Certification.IsDelete IS NULL
        )`,
  );
  add(
    [],
    Prisma.sql`
    SELECT
        14,
        N'Current Employment Details',
        N'Employment Details',
        CAST(1 AS bigint) AS RecordCount`,
  );

  const rows =
    branches.length === 0
      ? []
      : await db.$queryRaw<CountRow[]>`
          ${Prisma.join(branches, " UNION ALL ")}
        `;

  const bySectionId = new Map(
    rows.map((row) => [
      row.SectionId,
      {
        sectionId: row.SectionId,
        sectionName: row.SectionName,
        label: row.Label,
        recordCount: Number(row.RecordCount),
        missingObjects: [],
      } satisfies EmployeeSectionCount,
    ]),
  );

  return SECTION_COUNT_SPECS.map((spec) => {
    const tables =
      EMPLOYEE_LIST_SECTION_COLUMNS.find((column) => column.sectionId === spec.sectionId)
        ?.tables ?? [];
    const missingObjects = tables
      .filter((table) => !present.has(table))
      .map((table) => `dbo.${table}`);
    if (missingObjects.length > 0) {
      return {
        sectionId: spec.sectionId,
        sectionName: spec.sectionName,
        label: spec.label,
        recordCount: null,
        missingObjects,
      };
    }
    const hit = bySectionId.get(spec.sectionId);
    return (
      hit ?? {
        sectionId: spec.sectionId,
        sectionName: spec.sectionName,
        label: spec.label,
        recordCount: 0,
        missingObjects: [],
      }
    );
  });
}
