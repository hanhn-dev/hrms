import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "../../generated/prisma/client.ts";
import { renderQueryCall } from "../../shared/query-script.ts";
import {
  sectionLookupDetailQuery,
  sectionLookupFor,
  sectionLookupQuery,
  sectionLookupRefs,
  withSectionLookups,
} from "./section-lookups.ts";

const domainField = {
  fieldId: 9,
  displayText: "Domain",
  dbTable: "TEmployeeDomainDetails",
  dbColumn: "DomainId",
};

const experienceField = {
  fieldId: 10,
  displayText: "Experience (Years)",
  dbTable: "TEmployeeDomainDetails",
  dbColumn: "ExperianceInMonths",
};

const relationshipField = {
  fieldId: 2,
  displayText: "Relationship",
  dbTable: "TEmployeeFamilyDetails",
  dbColumn: "Relation",
};

describe("section lookups", () => {
  it("joins a domain id to its name and keeps the id on the row", () => {
    const values = { Domain: 829, "Experience (Years)": 4 };
    const lookups = sectionLookupRefs({
      liveTable: "TEmployeeDomainDetails",
      fields: [domainField, experienceField],
      values,
      labelByField: new Map([["Domain", "Payments"]]),
    });
    assert.equal(values.Domain, 829);
    assert.deepEqual(lookups, {
      Domain: { id: 829, label: "Payments", lookupKey: "domain" },
    });
    assert.equal(sectionLookupFor("TEmployeeDomainDetails", "DomainId")?.key, "domain");
    assert.equal(
      sectionLookupFor("TEmployeePassportDetails", "PassportNo"),
      undefined,
    );

    const query = sectionLookupQuery("TEmployeeDomainDetails", [
      domainField,
      experienceField,
    ]);
    const sql = renderQueryCall(
      Prisma.sql`SELECT [DomainId], ${Prisma.join(query.selects)} ${query.joins}`,
      [],
    );
    assert.match(sql, /LEFT JOIN dbo\.\[TSkillDomainMaster\]/);
    assert.match(sql, /\[DomainName\]/);
    assert.match(sql, /TRY_CONVERT\(int, \[src\]\.\[DomainId\]\)/);
    assert.equal(query.bindings.length, 1);
    assert.doesNotMatch(sql, /ExperianceInMonths/);
  });

  it("leaves a stored relationship name without an id ref", () => {
    const values = { Relationship: "Spouse", Name: "Ada" };
    const lookups = sectionLookupRefs({
      liveTable: "TEmployeeFamilyDetails",
      fields: [relationshipField, { displayText: "Name", dbTable: "TEmployeeFamilyDetails", dbColumn: "Name" }],
      values,
      labelById: new Map([["relationship", new Map([[789, "Brother In Law"]])]]),
    });
    assert.deepEqual(lookups, {});
    assert.equal(values.Relationship, "Spouse");
  });

  it("keeps an unknown id and an empty name", () => {
    const row = {
      liveTable: "TEmployeeDomainDetails",
      values: { Domain: "829" },
    };
    const [next] = withSectionLookups([domainField], [row], new Map());
    assert.equal(next?.values, row.values);
    assert.equal(next?.values.Domain, "829");
    assert.deepEqual(next?.lookups, {
      Domain: { id: 829, label: null, lookupKey: "domain" },
    });
  });

  it("loads a bank branch row with the bank name", () => {
    const sql = renderQueryCall(sectionLookupDetailQuery("bank-branch", 15), []);
    assert.match(sql, /FROM dbo\.\[TBankBranchDetails\]/);
    assert.match(sql, /LEFT JOIN dbo\.\[TBank\]/);
    assert.match(sql, /\[BankName\]/);
    assert.match(sql, /WHERE \[m\]\.\[ID\] = 15/);
    assert.throws(() => sectionLookupDetailQuery("not-a-lookup", 1), /Unknown section lookup/);
    assert.throws(() => sectionLookupDetailQuery("domain", 0), /positive whole number/);
  });
});
