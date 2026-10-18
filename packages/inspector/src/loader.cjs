const { transformJsx } = require("./transform.cjs");

/**
 * Webpack and Turbopack loader. Stamps JSX with source locations in development.
 * @this {import("webpack").LoaderContext<{ root?: string }>}
 * @param {string} source
 * @returns {string}
 */
function inspectorLoader(source) {
  if (typeof this.cacheable === "function") this.cacheable();
  const options = typeof this.getOptions === "function" ? this.getOptions() : {};
  const root = options.root;
  if (typeof root !== "string" || root === "" || typeof this.resourcePath !== "string") {
    return source;
  }
  return transformJsx(source, this.resourcePath, root);
}

module.exports = inspectorLoader;
