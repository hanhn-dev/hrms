"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReadMode } from "./read-mode";

const SHOW_AFTER_PX = 240;

const STUCK_HEADER_BASE =
  "absolute inset-x-0 top-0 z-20 border-b border-slate-200 bg-white py-3 transition-[opacity,transform,box-shadow] duration-300 ease-out dark:border-slate-800 dark:bg-slate-950";

const STUCK_HEADER_VISIBLE =
  "pointer-events-auto translate-y-0 opacity-100 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.18)] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.45)]";

const STUCK_HEADER_HIDDEN =
  "pointer-events-none -translate-y-full opacity-0 shadow-none";

export function ScrollableArticle({
  header,
  stickyHeader,
  children,
}: {
  header: React.ReactNode;
  stickyHeader?: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  const articleRef = useRef<HTMLElement>(null);
  const inFlowHeaderRef = useRef<HTMLElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [stuck, setStuck] = useState(false);
  const { immersive } = useReadMode();

  useEffect(() => {
    const article = articleRef.current;
    const inFlowHeader = inFlowHeaderRef.current;
    if (!article || !inFlowHeader) return;

    const scrollRoot: HTMLElement = article;
    const headerNode: HTMLElement = inFlowHeader;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setStuck(!entry.isIntersecting);
      },
      { root: scrollRoot, threshold: 0, rootMargin: "0px" },
    );
    observer.observe(headerNode);

    function onScroll(): void {
      setShowTop(scrollRoot.scrollTop > SHOW_AFTER_PX);
    }

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      scrollRoot.removeEventListener("scroll", onScroll);
    };
  }, []);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const overlay = article.parentElement?.querySelector("[data-doc-header]");
    article.style.scrollPaddingTop =
      stuck && overlay instanceof HTMLElement
        ? `${overlay.offsetHeight}px`
        : "0px";
  }, [stuck]);

  function scrollToTop(): void {
    articleRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div
        aria-hidden={!stuck}
        data-doc-header={stuck ? "" : undefined}
        inert={stuck ? undefined : true}
        className={`${STUCK_HEADER_BASE} ${stuck ? STUCK_HEADER_VISIBLE : STUCK_HEADER_HIDDEN}`}
      >
        <div className={immersive ? "mx-auto max-w-5xl px-8" : "px-8"}>
          {stickyHeader ?? header}
        </div>
      </div>
      <article
        ref={articleRef}
        className="prose prose-slate dark:prose-invert isolate max-w-none min-h-0 min-w-0 flex-1 overflow-y-auto"
      >
        <header
          ref={inFlowHeaderRef}
          aria-hidden={stuck}
          inert={stuck || undefined}
          className={
            immersive
              ? "not-prose mx-auto max-w-5xl px-8 pt-10 pb-4"
              : "not-prose px-8 pt-8 pb-4"
          }
        >
          {header}
        </header>
        <div className={immersive ? "mx-auto max-w-5xl px-8 pb-16" : "px-8 pb-8"}>
          {children}
        </div>
      </article>
      {showTop ? (
        <button
          type="button"
          aria-label="Back to top"
          onClick={scrollToTop}
          className={
            "absolute right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 " +
            (immersive ? "bottom-24" : "bottom-6 max-lg:bottom-24")
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
