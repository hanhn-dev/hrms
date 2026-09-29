import { Prisma } from "../../generated/prisma/client";

/**
 * LEFT JOIN aggregates for Employees search list.
 * Scoped to the employer so SQL Server does not scan every tenant's rows.
 */
export function employeeListSectionCountJoins(employerId: number): Prisma.Sql {
  return Prisma.sql`
    LEFT JOIN (
        SELECT
            Skill.EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeSkillDetails AS Skill
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Skill.EmployeeId
        WHERE Emp.Employerid = ${employerId}
            AND (Skill.Isdeleted IS NULL OR Skill.Isdeleted = N'N')
        GROUP BY Skill.EmployeeId
    ) AS SkillCounts
        ON SkillCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Domain.EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeDomainDetails AS Domain
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Domain.EmployeeId
        WHERE Emp.Employerid = ${employerId}
            AND (Domain.Isdeleted IS NULL OR Domain.Isdeleted = N'N')
        GROUP BY Domain.EmployeeId
    ) AS DomainCounts
        ON DomainCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Combined.EmployeeId,
            SUM(Combined.Cnt) AS Cnt
        FROM (
            SELECT
                Passport.EmployeeId,
                COUNT_BIG(*) AS Cnt
            FROM dbo.TEmployeePassportDetails AS Passport
            INNER JOIN dbo.TEmployee AS Emp
                ON Emp.EmployeeId = Passport.EmployeeId
            WHERE Emp.Employerid = ${employerId}
            GROUP BY Passport.EmployeeId
            UNION ALL
            SELECT
                Visa.EmployeeID AS EmployeeId,
                COUNT_BIG(*) AS Cnt
            FROM dbo.TEmployeeVisaInfo AS Visa
            INNER JOIN dbo.TEmployee AS Emp
                ON Emp.EmployeeId = Visa.EmployeeID
            WHERE Emp.Employerid = ${employerId}
                AND Visa.Isdeleted IS NULL
            GROUP BY Visa.EmployeeID
        ) AS Combined
        GROUP BY Combined.EmployeeId
    ) AS PassportVisaCounts
        ON PassportVisaCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Past.EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TPastEmploymentDetails AS Past
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Past.EmployeeId
        WHERE Emp.Employerid = ${employerId}
            AND (Past.IsDelete IS NULL OR Past.IsDelete = 0)
        GROUP BY Past.EmployeeId
    ) AS PastEmploymentCounts
        ON PastEmploymentCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Bank.EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeBankDetails AS Bank
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Bank.EmployeeId
        WHERE Emp.Employerid = ${employerId}
            AND ISNULL(Bank.Show, 1) = 1
            AND ISNULL(Bank.IsDelete, 0) = 0
        GROUP BY Bank.EmployeeId
    ) AS BankCounts
        ON BankCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Nomination.EmployeeID AS EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeNomination AS Nomination
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Nomination.EmployeeID
        WHERE Emp.Employerid = ${employerId}
            AND Nomination.IsDelete = 0
        GROUP BY Nomination.EmployeeID
    ) AS NominationCounts
        ON NominationCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Education.EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEducationDetails AS Education
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Education.EmployeeId
        WHERE Emp.Employerid = ${employerId}
            AND Education.IsDelete IS NULL
        GROUP BY Education.EmployeeId
    ) AS EducationCounts
        ON EducationCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Family.EmployeeID AS EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeFamilyDetails AS Family
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Family.EmployeeID
        WHERE Emp.Employerid = ${employerId}
            AND Family.IsDelete = 0
        GROUP BY Family.EmployeeID
    ) AS FamilyCounts
        ON FamilyCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Nominee.EmployeeID AS EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeNominee_Details AS Nominee
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Nominee.EmployeeID
        WHERE Emp.Employerid = ${employerId}
            AND ISNULL(Nominee.IsDelete, 0) = 0
        GROUP BY Nominee.EmployeeID
    ) AS NomineeCounts
        ON NomineeCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Contact.EmployeeID AS EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeContactDetails AS Contact
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Contact.EmployeeID
        WHERE Emp.Employerid = ${employerId}
        GROUP BY Contact.EmployeeID
    ) AS ContactCounts
        ON ContactCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Emergency.EmployeeID AS EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TEmployeeEmergencyContactDetails AS Emergency
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Emergency.EmployeeID
        WHERE Emp.Employerid = ${employerId}
            AND (Emergency.Isdeleted = N'N' OR Emergency.Isdeleted IS NULL)
        GROUP BY Emergency.EmployeeID
    ) AS EmergencyCounts
        ON EmergencyCounts.EmployeeId = Employee.EmployeeId
    LEFT JOIN (
        SELECT
            Certification.EmployeeId,
            COUNT_BIG(*) AS Cnt
        FROM dbo.TCertificationDetails AS Certification
        INNER JOIN dbo.TEmployee AS Emp
            ON Emp.EmployeeId = Certification.EmployeeId
        WHERE Emp.Employerid = ${employerId}
            AND Certification.IsDelete IS NULL
        GROUP BY Certification.EmployeeId
    ) AS CertificationCounts
        ON CertificationCounts.EmployeeId = Employee.EmployeeId
  `;
}

export const employeeListSectionCountSelect = Prisma.sql`
    CAST(ISNULL(SkillCounts.Cnt, 0) AS int) AS SkillCount,
    CAST(ISNULL(DomainCounts.Cnt, 0) AS int) AS DomainCount,
    CAST(ISNULL(PassportVisaCounts.Cnt, 0) AS int) AS PassportVisaCount,
    CAST(ISNULL(PastEmploymentCounts.Cnt, 0) AS int) AS PastEmploymentCount,
    CAST(ISNULL(BankCounts.Cnt, 0) AS int) AS BankCount,
    CAST(ISNULL(NominationCounts.Cnt, 0) AS int) AS NominationCount,
    CAST(ISNULL(EducationCounts.Cnt, 0) AS int) AS EducationCount,
    CAST(ISNULL(FamilyCounts.Cnt, 0) AS int) AS FamilyCount,
    CAST(ISNULL(NomineeCounts.Cnt, 0) AS int) AS NomineeCount,
    CAST(ISNULL(ContactCounts.Cnt, 0) AS int) AS ContactCount,
    CAST(ISNULL(EmergencyCounts.Cnt, 0) AS int) AS EmergencyCount,
    CAST(ISNULL(CertificationCounts.Cnt, 0) AS int) AS CertificationCount
`;
