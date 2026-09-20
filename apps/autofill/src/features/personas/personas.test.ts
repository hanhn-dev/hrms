import {
  DEFAULT_PERSONA_ID,
  generateValueForPersona,
  getPersona,
  isPersonaId,
  personaForcesInvalid,
  PERSONAS,
} from "./personas";

describe("personas", () => {
  it("lists random-valid and invalid-contact (positive)", () => {
    expect(PERSONAS.map((p) => p.id)).toEqual([
      "random-valid",
      "invalid-contact",
    ]);
    expect(DEFAULT_PERSONA_ID).toBe("random-valid");
  });

  it("rejects unknown persona ids (negative)", () => {
    expect(isPersonaId("random-valid")).toBe(true);
    expect(isPersonaId("nope")).toBe(false);
    expect(isPersonaId(null)).toBe(false);
  });

  it("falls back to default persona (edge)", () => {
    expect(getPersona(undefined).id).toBe("random-valid");
    expect(getPersona("invalid-contact").invalidKinds).toContain("email");
  });
});

describe("personaForcesInvalid", () => {
  const invalidContact = getPersona("invalid-contact");
  const randomValid = getPersona("random-valid");

  it("forces invalid for email/phone kinds (positive)", () => {
    expect(personaForcesInvalid(invalidContact, "Work Email", "email")).toBe(
      true,
    );
    expect(personaForcesInvalid(invalidContact, "Mobile", "phone")).toBe(true);
  });

  it("does not force invalid on random-valid (negative)", () => {
    expect(personaForcesInvalid(randomValid, "Work Email", "email")).toBe(
      false,
    );
  });

  it("matches email/phone via label when kind is text (edge)", () => {
    expect(personaForcesInvalid(invalidContact, "Email Address", "text")).toBe(
      true,
    );
    expect(personaForcesInvalid(invalidContact, "Company Name", "text")).toBe(
      false,
    );
  });
});

describe("generateValueForPersona", () => {
  it("returns valid-looking email for random-valid (positive)", () => {
    const value = generateValueForPersona({
      label: "Email",
      kind: "email",
      personaId: "random-valid",
    });
    expect(value).toContain("@");
  });

  it("returns invalid email for invalid-contact (negative)", () => {
    const value = generateValueForPersona({
      label: "Email",
      kind: "email",
      personaId: "invalid-contact",
    });
    expect(value).toBe("not-an-email");
  });

  it("honors explicit invalid override (edge)", () => {
    const value = generateValueForPersona({
      label: "Company",
      kind: "text",
      personaId: "random-valid",
      invalid: true,
    });
    expect(value).toBe("");
  });
});
