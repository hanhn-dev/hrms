"use client";

// React 19 refuses to execute <script> created during a client render and logs
// an error when it sees one. The server emits type="text/javascript" so the
// browser runs the script while parsing HTML (before paint). The client render
// uses type="text/plain", which React treats as a data block and does not warn
// about. suppressHydrationWarning covers that type difference.
export function InlineScript({ html }: { html: string }): React.JSX.Element {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
