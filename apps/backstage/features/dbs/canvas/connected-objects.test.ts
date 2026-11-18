import assert from "node:assert/strict";
import { describe, it } from "vitest";
import type { DatabaseObjectDetails } from "@/features/dbs/queries";
import {
  buildConnectedObjects,
  clampSelectionForPin,
  filterConnectedObjects,
  isExpandConnectionsDisabled,
  MAX_EXPAND_PIN_BATCH,
  parseObjectId,
} from "@/features/dbs/canvas/connected-objects";

function emptyDetails(
  overrides: Partial<DatabaseObjectDetails> = {},
): DatabaseObjectDetails {
  return {
    object: {
      id: "dbo.TEmployee",
      schema: "dbo",
      name: "TEmployee",
      kind: "table",
      definitionAvailable: false,
      dependencySupport: "full",
    },
    columns: [],
    parameters: [],
    definition: null,
    definitionUnavailableReason: null,
    dependencies: [],
    dependents: [],
    relationships: [],
    indexes: [],
    triggers: [],
    constraints: [],
    warnings: [],
    ...overrides,
  };
}

describe("parseObjectId", () => {
  it("splits schema and name", () => {
    assert.deepEqual(parseObjectId("dbo.TEmployee"), {
      schema: "dbo",
      name: "TEmployee",
    });
  });

  it("defaults schema when the id has no dot", () => {
    assert.deepEqual(parseObjectId("TEmployee"), {
      schema: "dbo",
      name: "TEmployee",
    });
  });
});

describe("isExpandConnectionsDisabled", () => {
  it("stays enabled until connections have been loaded", () => {
    assert.equal(isExpandConnectionsDisabled(false, 0, false), false);
  });

  it("disables while expanding", () => {
    assert.equal(isExpandConnectionsDisabled(false, 0, true), true);
  });

  it("disables after a load that found nothing", () => {
    assert.equal(isExpandConnectionsDisabled(true, 0, false), true);
  });

  it("enables after a load that found connections", () => {
    assert.equal(isExpandConnectionsDisabled(true, 3, false), false);
  });
});

describe("clampSelectionForPin", () => {
  it("preserves order and caps length", () => {
    const ids = Array.from({ length: 60 }, (_, index) => `id-${index}`);
    const clamped = clampSelectionForPin(ids);
    assert.equal(clamped.length, MAX_EXPAND_PIN_BATCH);
    assert.equal(clamped[0], "id-0");
    assert.equal(clamped[MAX_EXPAND_PIN_BATCH - 1], `id-${MAX_EXPAND_PIN_BATCH - 1}`);
  });

  it("returns empty when the cap is zero", () => {
    assert.deepEqual(clampSelectionForPin(["a", "b"], 0), []);
  });
});

describe("filterConnectedObjects", () => {
  const sample = [
    { id: "dbo.TEmployer", schema: "dbo", name: "TEmployer", kind: "table" as const },
    {
      id: "dbo.SP_GetEmployee",
      schema: "dbo",
      name: "SP_GetEmployee",
      kind: "storedProcedure" as const,
    },
  ];

  it("filters by kind and name", () => {
    assert.deepEqual(
      filterConnectedObjects(sample, "employ", "table").map((item) => item.id),
      ["dbo.TEmployer"],
    );
    assert.deepEqual(
      filterConnectedObjects(sample, "get", "all").map((item) => item.id),
      ["dbo.SP_GetEmployee"],
    );
  });
});

describe("buildConnectedObjects", () => {
  it("returns empty splits when details are missing", () => {
    assert.deepEqual(buildConnectedObjects("dbo.TEmployee", undefined, []), {
      fkNeighbors: [],
      allShallow: [],
    });
  });

  it("splits FK neighbors from the full shallow set", () => {
    const details = emptyDetails({
      relationships: [
        {
          id: "fk1",
          from: { objectId: "dbo.TEmployee", column: "EmployerId" },
          to: { objectId: "dbo.TEmployer", column: "EmployerId" },
          label: "FK",
        },
      ],
      dependencies: [
        {
          objectId: "dbo.SP_GetEmployee",
          operation: "execute",
          kind: "storedProcedure",
        },
      ],
      dependents: [
        {
          objectId: "dbo.V_Employee",
          operation: "select",
          kind: "view",
        },
      ],
    });

    const { fkNeighbors, allShallow } = buildConnectedObjects(
      "dbo.TEmployee",
      details,
      [],
    );

    assert.deepEqual(
      fkNeighbors.map((item) => item.id),
      ["dbo.TEmployer"],
    );
    assert.deepEqual(
      allShallow
        .map((item) => ({ id: item.id, kind: item.kind }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      [
        { id: "dbo.SP_GetEmployee", kind: "storedProcedure" },
        { id: "dbo.TEmployer", kind: "table" },
        { id: "dbo.V_Employee", kind: "view" },
      ],
    );
  });

  it("prefers pinned metadata when the related object is already on the canvas", () => {
    const details = emptyDetails({
      relationships: [
        {
          id: "fk1",
          from: { objectId: "dbo.TEmployee", column: "StatusId" },
          to: { objectId: "dbo.TStatus", column: "StatusId" },
          label: "FK",
        },
      ],
    });

    const { fkNeighbors } = buildConnectedObjects("dbo.TEmployee", details, [
      {
        id: "dbo.TStatus",
        schema: "dbo",
        name: "TStatus",
        kind: "view",
      },
    ]);

    assert.deepEqual(fkNeighbors, [
      {
        id: "dbo.TStatus",
        schema: "dbo",
        name: "TStatus",
        kind: "view",
      },
    ]);
  });
});
