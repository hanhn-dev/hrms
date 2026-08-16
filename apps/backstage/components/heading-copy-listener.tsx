"use client";

import { useEffect } from "react";

const COPIED_MS = 2000;

function sectionUrl(id: string): string {
  const url = new URL(window.location.href);
  url.hash = id;
  return url.toString();
}

function markCopied(link: HTMLAnchorElement): void {
  const label = link.dataset.headingLabel ?? "section";
  const previous = Number(link.dataset.copiedTimer);
  if (previous) window.clearTimeout(previous);

  link.dataset.copied = "true";
  link.title = "Copied";
  link.setAttribute("aria-label", `Copied link to ${label}`);

  const timer = window.setTimeout(() => {
    delete link.dataset.copied;
    delete link.dataset.copiedTimer;
    link.title = "Copy link";
    link.setAttribute("aria-label", `Copy link to ${label}`);
  }, COPIED_MS);
  link.dataset.copiedTimer = String(timer);
}

export function HeadingCopyListener(): null {
  useEffect(() => {
    function onClick(event: MouseEvent): void {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[data-heading-copy]");
      if (!link) return;

      const id = link.dataset.headingCopy;
      if (!id) return;

      event.preventDefault();
      void navigator.clipboard.writeText(sectionUrl(id)).then(
        () => markCopied(link),
        () => undefined,
      );
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
