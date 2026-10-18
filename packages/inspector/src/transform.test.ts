import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "vitest";

const require = createRequire(import.meta.url);
const { transformJsx } = require("./transform.cjs") as {
  transformJsx: (source: string, filename: string, root: string) => string;
};

const root = "D:/hrms";
const file = "D:/hrms/apps/backstage/app/layout.tsx";

describe("transformJsx", () => {
  it("tags host and component elements on their source lines", () => {
    const source = [
      "export function Page() {",
      "  return (",
      "    <main>",
      "      <Button>Save</Button>",
      "    </main>",
      "  );",
      "}",
      "",
    ].join("\n");

    const output = transformJsx(source, file, root);

    assert.match(
      output,
      /<main data-insp-path="apps\/backstage\/app\/layout.tsx" data-insp-line=\{3\} data-insp-column=\{5\} data-insp-file="D:\/hrms\/apps\/backstage\/app\/layout.tsx">/,
    );
    assert.match(
      output,
      /<Button data-insp-path="apps\/backstage\/app\/layout.tsx" data-insp-line=\{4\} data-insp-column=\{7\} data-insp-file="D:\/hrms\/apps\/backstage\/app\/layout.tsx">Save<\/Button>/,
    );
    assert.equal(output.includes("</main data-insp"), false);
    assert.equal(output.split("\n").length, source.split("\n").length);
  });

  it("skips fragments and keeps the original formatting", () => {
    const source = [
      "export const view = (",
      "  <>",
      "    <div className=\"a\" />",
      "  </>",
      ");",
      "const named = (",
      "  <Fragment>",
      "    <span />",
      "  </Fragment>",
      ");",
      "const member = <React.Fragment><i /></React.Fragment>;",
      "",
    ].join("\n");

    const output = transformJsx(source, file, root);

    assert.equal(output.includes("<> data-insp"), false);
    assert.equal(output.includes("<Fragment data-insp"), false);
    assert.equal(output.includes("<React.Fragment data-insp"), false);
    assert.match(
      output,
      /<div className="a"\s+data-insp-path="apps\/backstage\/app\/layout.tsx" data-insp-line=\{3\} data-insp-column=\{5\} data-insp-file="D:\/hrms\/apps\/backstage\/app\/layout.tsx"\/>/,
    );
    assert.match(output, /<span data-insp-path=.*data-insp-line=\{8\}/);
    assert.match(output, /<i data-insp-path=.*data-insp-line=\{11\}/);
    assert.equal(output.split("\n").length, source.split("\n").length);
  });

  it("tags a multiline component on the line where the tag starts", () => {
    const source = [
      "export function View() {",
      "  return (",
      "    <List<Item>",
      "      rows={rows}",
      "    >",
      "      <div />",
      "    </List>",
      "  );",
      "}",
      "",
    ].join("\n");

    const output = transformJsx(source, file, root);

    assert.match(output, /<List<Item>\s+rows=\{rows\}\s+data-insp-path="apps\/backstage\/app\/layout.tsx" data-insp-line=\{3\} data-insp-column=\{5\} data-insp-file="D:\/hrms\/apps\/backstage\/app\/layout.tsx">/);
    assert.equal(output.split("\n").length, source.split("\n").length);
  });

  it("does not tag a file twice", () => {
    const source = "export const view = <div />;\n";
    const once = transformJsx(source, file, root);
    const twice = transformJsx(once, file, root);
    assert.equal(twice, once);
    assert.equal(once.split("data-insp-path").length - 1, 1);
  });

  it("leaves files outside the project unchanged", () => {
    const source = "export const view = <div />;\n";
    assert.equal(transformJsx(source, "D:/other/app.tsx", root), source);
  });
});
