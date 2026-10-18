const path = require("node:path");
const ts = require("typescript");

/**
 * @param {string} source
 * @param {string} filename Absolute path of the file being compiled.
 * @param {string} root Monorepo root. Attribute paths are relative to this directory.
 * @returns {string}
 */
function transformJsx(source, filename, root) {
  const relativeFile = repoRelative(root, filename);
  if (relativeFile == null) return source;

  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filename),
  );
  if (sourceFile.parseDiagnostics.length > 0) return source;

  /** @type {Array<{ at: number, text: string }>} */
  const inserts = [];
  visit(sourceFile);

  inserts.sort((left, right) => right.at - left.at);
  let output = source;
  for (const insert of inserts) {
    output = output.slice(0, insert.at) + insert.text + output.slice(insert.at);
  }
  return output;

  /** @param {import("typescript").Node} node */
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const at = insertionPoint(source, node);
      if (at >= 0 && !isFragment(node.tagName, sourceFile) && !alreadyTagged(node, sourceFile)) {
        const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const text = attributeText(
          relativeFile,
          filename.replaceAll("\\", "/"),
          position.line + 1,
          position.character + 1,
        );
        inserts.push({
          at,
          text: needsLeadingSpace(source, at) ? ` ${text}` : text,
        });
      }
    }
    ts.forEachChild(node, visit);
  }
}

/**
 * @param {string} root
 * @param {string} filename
 * @returns {string | null}
 */
function repoRelative(root, filename) {
  const relative = path.relative(root, filename);
  if (relative === "" || path.isAbsolute(relative)) return null;
  const normalized = relative.split(path.sep).join("/");
  if (normalized.startsWith("../") || normalized === "..") return null;
  return normalized;
}

/**
 * @param {string} filename
 * @returns {import("typescript").ScriptKind}
 */
function scriptKind(filename) {
  return filename.endsWith(".jsx") ? ts.ScriptKind.JSX : ts.ScriptKind.TSX;
}

/**
 * @param {string} source
 * @param {import("typescript").JsxOpeningElement | import("typescript").JsxSelfClosingElement} node
 * @returns {number}
 */
function insertionPoint(source, node) {
  if (ts.isJsxSelfClosingElement(node)) {
    return source.slice(node.end - 2, node.end) === "/>" ? node.end - 2 : -1;
  }
  return source[node.end - 1] === ">" ? node.end - 1 : -1;
}

/**
 * @param {import("typescript").JsxTagNameExpression} tagName
 * @param {import("typescript").SourceFile} sourceFile
 * @returns {boolean}
 */
function isFragment(tagName, sourceFile) {
  const text = tagName.getText(sourceFile);
  return text === "Fragment" || text.endsWith(".Fragment");
}

/**
 * @param {import("typescript").JsxOpeningElement | import("typescript").JsxSelfClosingElement} node
 * @param {import("typescript").SourceFile} sourceFile
 * @returns {boolean}
 */
function alreadyTagged(node, sourceFile) {
  return node.attributes.properties.some((attribute) => {
    return ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === "data-insp-path";
  });
}

/**
 * @param {string} file
 * @param {string} absoluteFile
 * @param {number} line
 * @param {number} column
 * @returns {string}
 */
function attributeText(file, absoluteFile, line, column) {
  return `data-insp-path="${escapeAttribute(file)}" data-insp-line={${line}} data-insp-column={${column}} data-insp-file="${escapeAttribute(absoluteFile)}"`;
}

/**
 * @param {string} source
 * @param {number} at
 * @returns {boolean}
 */
function needsLeadingSpace(source, at) {
  const previous = source[at - 1];
  return previous != null && !/\s/.test(previous);
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

module.exports = { transformJsx };
