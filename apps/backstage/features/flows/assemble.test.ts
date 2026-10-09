import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { assembleFlowGraph, API_ROOT, ROUTES_FILE } from "./assemble";
import type { ProcedureFile } from "./model";
import { buildJourney } from "./query";

const controllerPath = `${API_ROOT}/Features/Employee/MyDetails/BankDetails/Controller.js`;
const servicePath = `${API_ROOT}/Features/Employee/MyDetails/BankDetails/Service.js`;
const ormPath = `${API_ROOT}/ORM/Data/getEmployeeDetailsBySection.js`;
const updatePath = `${API_ROOT}/Features/Employee/MyDetails/Utils/ProcessMyDetailsUpdate.js`;

describe("assembleFlowGraph", () => {
  it("joins a screen, route, handler, and section procedure", () => {
    const procedures: ProcedureFile[] = [
      {
        database: "HRMS",
        relativePath: "HRMS-DATABASE/HRMS/STOREPROCEDURE/SP_MyDetails_GetEmployeeDetailsForGivenFields.sql",
        source: "CREATE PROCEDURE dbo.SP_MyDetails_GetEmployeeDetailsForGivenFields AS BEGIN SELECT 1; END",
      },
      {
        database: "HRMS",
        relativePath: "HRMS-DATABASE/HRMS/STOREPROCEDURE/Usp_Mydetails_Enhanced_Process_Template.sql",
        source:
          "CREATE PROCEDURE dbo.Usp_Mydetails_Enhanced_Process_Template AS BEGIN EXEC dbo.USP_CallsChild; END",
      },
      {
        database: "HRMS",
        relativePath: "HRMS-DATABASE/HRMS/STOREPROCEDURE/USP_CallsChild.sql",
        source: "CREATE PROCEDURE dbo.USP_CallsChild AS BEGIN EXEC dbo.SP_MyDetails_GetEmployeeDetailsForGivenFields; EXEC sp_executesql @sql; END",
      },
    ];
    const apiFiles = new Map<string, string>([
      [
        ROUTES_FILE,
        `
          const BankDetailsController = require("./BankDetails/Controller");
          router.get("/:employeeId/bank-details", BankDetailsController.Get);
          router.put("/:employeeId/bank-details", BankDetailsController.Put);
          router.get("/:employeeId/validate-ifsc/:ifsc", BankDetailsController.ValidateIfsc);
        `,
      ],
      [
        controllerPath,
        `
          const processMyDetailsUpdate = require("../Utils/ProcessMyDetailsUpdate");
          const { getBankDetails, validateIfsc } = require("./Service");
          async function Get(req, res, next) { return getBankDetails(req.params.employeeId); }
          async function Put(req, res, next) {
            return processMyDetailsUpdate({ sectionId: SECTION_IDS[SECTION_KEYS.BANK_DETAILS] });
          }
          async function ValidateIfsc(req, res, next) { return validateIfsc(req.params.ifsc); }
        `,
      ],
      [
        servicePath,
        `
          async function getBankDetails(employeeId) {
            const getEmployeeDetailsBySection = require("#orm/Data/getEmployeeDetailsBySection");
            return getEmployeeDetailsBySection(employeeId, SECTION.BANK_DETAILS);
          }
          async function validateIfsc(ifscCode) { return { isValid: true }; }
        `,
      ],
      [
        ormPath,
        `
          async function getEmployeeDetailsBySection(employeeId, sectionId) {
            await executeStoredProcedure("EXEC SP_MyDetails_GetEmployeeDetailsForGivenFields :employeeIds, :fieldIds");
          }
        `,
      ],
      [
        updatePath,
        `
          async function processMyDetailsUpdate() {
            await executeStoredProcedure("EXEC Usp_Mydetails_Enhanced_Process_Template :employeeId, :sectionId, :data, :fieldList");
          }
        `,
      ],
    ]);
    const graph = assembleFlowGraph({
      procedures,
      apiFiles,
      sdkFiles: [
        {
          relativePath: "src/api/employee/bank-details/getBankDetails.ts",
          source: "export async function getBankDetails(employeeId) { await HttpClient.get(`employees/${employeeId}/bank-details`); }",
        },
        {
          relativePath: "src/hooks/employee/bank-details/useBankDetails.ts",
          source: "import { getBankDetails } from \"@api/employee\";\nexport function useBankDetails(employeeId) { return getBankDetails(employeeId); }",
        },
        {
          relativePath: "src/hooks/employee/bank-details/useBankDetailsMutation.ts",
          source: "import { updateSectionData } from \"@api/employee\";\nexport function useBankDetailsMutation(employeeId) { const key = `employees/${employeeId}/bank-details`; return updateSectionData; }",
        },
      ],
      screenFiles: [
        {
          relativePath: "HRMS.Web/HRMS.Web/HRM/MyDetails_React/src/components/sections/bankDetails/BankDetailsForm.tsx",
          source: "import { useBankDetailsMutation } from \"@hrms/sdk\";\nexport function BankDetailsForm() { return null; }",
        },
      ],
    });

    const put = graph.nodes.find((node) => node.label === "PUT employees/:employeeId/bank-details");
    assert.ok(put);
    assert.equal(put.gap, null);
    const validate = graph.nodes.find((node) => node.kind === "handler" && node.label.endsWith("ValidateIfsc"));
    assert.equal(validate?.gap, "No stored procedure call in this handler.");
    const dynamic = graph.nodes.find((node) => node.label === "USP_CallsChild");
    assert.equal(dynamic?.incomplete, true);

    const screen = graph.nodes.find((node) => node.kind === "screen");
    assert.ok(screen);
    const journey = buildJourney(graph, screen.id);
    assert.ok(journey);
    assert.equal(journey.chain.at(-1)?.label, "Usp_Mydetails_Enhanced_Process_Template");
    assert.match(journey.chart, /sequenceDiagram/);
    assert.equal(journey.callNodes.some((node) => node.label === "USP_CallsChild"), true);
    assert.equal(journey.callEdges.every((edge) => edge.confidence === "extracted"), true);
  });
});
