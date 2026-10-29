"use client";

import { useEffect } from "react";
import {
  SOFT_NAV_URL_WAIT_MS,
  hrefArrived,
  isNavigationRscFetch,
  normalizeHref,
  softNavRecoveryHref,
} from "@/components/soft-nav-recovery";

const SKELETON_SELECTOR = ".ant-skeleton";
const RECOVERED_KEY = "backstage:soft-nav-recovered";
const TICK_MS = 250;

function readRecovered(): string[] {
  try {
    const raw = sessionStorage.getItem(RECOVERED_KEY);
    const parsed: unknown = raw == null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function rememberRecovered(href: string): void {
  const key = normalizeHref(href);
  const recovered = readRecovered();
  if (recovered.includes(key)) {
    return;
  }
  recovered.push(key);
  try {
    sessionStorage.setItem(RECOVERED_KEY, JSON.stringify(recovered));
  } catch {
    // A private-mode quota error still allows this attempt to assign.
  }
}

function internalHrefFromClick(event: MouseEvent): string | null {
  if (event.button !== 0) {
    return null;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const target = event.target;
  if (!(target instanceof Element)) {
    return null;
  }
  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }
  if (anchor.target !== "" && anchor.target !== "_self") {
    return null;
  }
  if (anchor.hasAttribute("download")) {
    return null;
  }
  const raw = anchor.getAttribute("href");
  if (raw == null || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(anchor.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

/**
 * Recovers a soft navigation that committed a shell and then left a
 * SectionFallback skeleton up, and a click whose URL never changes.
 * The first document load is ignored: its stream is not a navigation fetch.
 */
export function SoftNavRecovery(): null {
  useEffect(() => {
    let inflight = 0;
    let sawNavigationFetch = false;
    let targetHref: string | null = null;
    let clickAt: number | null = null;
    let skeletonIdleSince: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const originalFetch = window.fetch.bind(window);

    function currentHref(): string {
      return `${window.location.pathname}${window.location.search}`;
    }

    function tick(): void {
      timer = null;
      const now = Date.now();
      const skeletonVisible = document.querySelector(SKELETON_SELECTOR) != null;
      const flightOpen = inflight > 0;
      if (!sawNavigationFetch || !skeletonVisible || flightOpen) {
        skeletonIdleSince = null;
      } else if (skeletonIdleSince == null) {
        skeletonIdleSince = now;
      }
      const href = softNavRecoveryHref({
        targetHref,
        currentHref: currentHref(),
        skeletonVisible: sawNavigationFetch && skeletonVisible,
        navigationInflight: inflight,
        sinceClickMs: clickAt == null ? 0 : now - clickAt,
        skeletonIdleMs: skeletonIdleSince == null ? 0 : now - skeletonIdleSince,
        recoveredHrefs: readRecovered(),
      });
      if (href != null) {
        rememberRecovered(href);
        window.location.assign(href);
        return;
      }
      if (
        clickAt != null &&
        targetHref != null &&
        inflight === 0 &&
        (hrefArrived(currentHref(), targetHref) || now - clickAt >= SOFT_NAV_URL_WAIT_MS)
      ) {
        clickAt = null;
        targetHref = null;
      }
      const watching =
        clickAt != null || (sawNavigationFetch && skeletonVisible) || inflight > 0;
      if (watching) {
        timer = setTimeout(tick, TICK_MS);
      }
    }

    function schedule(): void {
      if (timer == null) {
        timer = setTimeout(tick, TICK_MS);
      }
    }

    function onClick(event: MouseEvent): void {
      const href = internalHrefFromClick(event);
      if (href == null) {
        return;
      }
      targetHref = href;
      clickAt = Date.now();
      schedule();
    }

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const track = isNavigationRscFetch(input, init);
      if (track) {
        inflight += 1;
        sawNavigationFetch = true;
        schedule();
      }
      const release = (): void => {
        if (!track) {
          return;
        }
        inflight = Math.max(0, inflight - 1);
        schedule();
      };
      // `fetch` resolves on the response headers. The RSC body stays open
      // until every Suspense slot finishes, so the flight is still in progress
      // until that body ends or is cancelled.
      return originalFetch(input, init).then(
        (response) => {
          if (!track || response.body == null) {
            release();
            return response;
          }
          const reader = response.body.getReader();
          let released = false;
          const finish = (): void => {
            if (released) {
              return;
            }
            released = true;
            release();
          };
          const stream = new ReadableStream<Uint8Array>({
            async pull(controller) {
              try {
                const { done, value } = await reader.read();
                if (done || value == null) {
                  finish();
                  controller.close();
                  return;
                }
                controller.enqueue(value);
              } catch (error) {
                finish();
                controller.error(error);
              }
            },
            cancel(reason) {
              finish();
              return reader.cancel(reason);
            },
          });
          const wrapped = new Response(stream, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
          Object.defineProperty(wrapped, "url", { value: response.url });
          Object.defineProperty(wrapped, "redirected", { value: response.redirected });
          return wrapped;
        },
        (error: unknown) => {
          release();
          throw error;
        },
      );
    };

    document.addEventListener("click", onClick, true);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      if (timer != null) {
        clearTimeout(timer);
      }
    };
  }, []);

  return null;
}
