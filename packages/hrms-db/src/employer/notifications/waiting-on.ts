export type InboxPerson = {
  name: string | null;
  employmentNumber: string | null;
};

const PERSON_SEPARATOR = "\u001e";
const FIELD_SEPARATOR = "\u001f";

export function parseWaitingOn(value: string | null): InboxPerson[] {
  if (!value) {
    return [];
  }
  const people: InboxPerson[] = [];
  for (const part of value.split(PERSON_SEPARATOR)) {
    const [name, employmentNumber] = part.split(FIELD_SEPARATOR);
    const person = {
      name: name?.trim() || null,
      employmentNumber: employmentNumber?.trim() || null,
    };
    if (person.name || person.employmentNumber) {
      people.push(person);
    }
  }
  return people;
}
