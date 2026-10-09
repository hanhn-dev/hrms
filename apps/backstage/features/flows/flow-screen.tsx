"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mermaid } from "@/lib/mermaid-diagram";
import { getSetting, migrateLocalSetting } from "@/shared/client-db";
import { CHECKOUTS } from "./checkout-copy";
import { EDITOR_SETTING, readEditor } from "./editor-preference";
import { FlowCanvas } from "./flow-canvas";
import { REPO_IDS, type FlowNode } from "./model";
import type { Journey } from "./query";
import { FLOW_ROOTS_SETTING, readRoots, ROOTS_KEY, type Roots } from "./roots-storage";

type ProcedureReading = {
  docHref: string | null;
  script: string | null;
  scriptError: string | null;
  scriptFrom: "database" | "repository" | null;
};

export function FlowScreen(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FlowNode[]>([]);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [roots, setRoots] = useState<Roots>({});
  const [rootsReady, setRootsReady] = useState(false);
  const [hrefs, setHrefs] = useState<Record<string, string | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reading, setReading] = useState<ProcedureReading | null>(null);
  const [readingError, setReadingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = readRoots(await migrateLocalSetting(FLOW_ROOTS_SETTING, ROOTS_KEY));
        if (!cancelled) setRoots(stored);
      } catch {
        // Saved folders are optional; the server list still fills defaults.
      }
      try {
        const response = await fetch("/api/flows/roots");
        const payload = (await response.json()) as { roots?: Roots };
        if (!cancelled) setRoots((current) => ({ ...payload.roots, ...current }));
      } catch {
        // The graph still opens files when a folder was saved in this browser.
      } finally {
        if (!cancelled) setRootsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      void fetch(`/api/flows/search?q=${encodeURIComponent(query)}`)
        .then((response) => response.json())
        .then((payload: { nodes?: FlowNode[] }) => setResults(payload.nodes ?? []))
        .catch(() => setResults([]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!journey) return;
    const files = [...journey.chain, ...journey.callNodes].flatMap((node) => {
      if (!node.source) return [];
      return [{ id: node.id, source: node.source }];
    });
    void (async () => {
      const editor = await getSetting(EDITOR_SETTING)
        .then(readEditor)
        .catch(() => readEditor(undefined));
      const response = await fetch("/api/flows/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roots, files, editor }),
      });
      const payload = (await response.json()) as { hrefs?: Record<string, string | null> };
      setHrefs(payload.hrefs ?? {});
    })().catch(() => setHrefs({}));
  }, [journey, roots]);

  const selected = procedureById(journey, selectedId);

  useEffect(() => {
    setSelectedId(defaultProcedureId(journey));
  }, [journey]);

  useEffect(() => {
    if (!selected) {
      setReading(null);
      setReadingError(null);
      return;
    }
    const controller = new AbortController();
    setReading(null);
    setReadingError(null);
    const params = new URLSearchParams({ database: selected.detail, name: selected.label });
    void fetch(`/api/flows/procedure?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as ProcedureReading & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Could not read this procedure.");
        if (payload.script || !selected.source) {
          setReading({ ...payload, scriptFrom: payload.script ? "database" : null });
          return;
        }
        const fileResponse = await fetch("/api/flows/source", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ roots, source: selected.source }),
          signal: controller.signal,
        });
        const filePayload = (await fileResponse.json()) as { script?: string | null };
        setReading({
          docHref: payload.docHref,
          script: filePayload.script ?? null,
          scriptError: payload.scriptError,
          scriptFrom: filePayload.script ? "repository" : null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setReadingError(error instanceof Error ? error.message : "Could not read this procedure.");
      });
    return () => controller.abort();
  }, [roots, selected]);

  const missing = REPO_IDS.filter((repo) => !roots[repo]).map((repo) => CHECKOUTS[repo].title);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
        <header>
          <h1 className="text-2xl font-semibold">Request Flow</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            My Details, from the screen through the API handler into the stored procedures it calls.
            Open a procedure to read its write-up and the script from the database. A file link opens that file in Cursor when this machine has the checkout.
          </p>
        </header>
        {rootsReady && missing.length > 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            File links need the local checkout for {missing.join(", ")}.{" "}
            <Link className="text-sky-700 hover:underline dark:text-sky-300" href="/settings">
              Set the folders
            </Link>
          </p>
        ) : null}
        <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
          <div>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              placeholder="Search a screen, route, or procedure"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <ul className="mt-3 max-h-[32rem] space-y-1 overflow-auto">
              {results.map((node) => (
                <li key={node.id}>
                  <button
                    className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    type="button"
                    onClick={() => {
                      void fetch(`/api/flows/journey?id=${encodeURIComponent(node.id)}`)
                        .then((response) => response.json())
                        .then((payload: { journey?: Journey | null }) => setJourney(payload.journey ?? null))
                        .catch(() => setJourney(null));
                    }}
                  >
                    <span className="text-xs uppercase text-slate-500">{node.kind}</span>
                    <div className="break-all">{node.label}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 space-y-4">
            {journey ? (
              <>
                <Mermaid chart={journey.chart} />
                <ul className="space-y-1 text-sm">
                  {journey.chain.map((node) => (
                    <Participant
                      key={node.id}
                      node={node}
                      href={hrefs[node.id] ?? null}
                      selected={node.id === selectedId}
                      onRead={setSelectedId}
                    />
                  ))}
                </ul>
                {journey.truncated ? (
                  <p className="text-sm text-slate-500">The call graph shows the first 60 procedures within two calls.</p>
                ) : null}
                <FlowCanvas
                  nodes={journey.callNodes}
                  edges={journey.callEdges}
                  hrefFor={(nodeId) => hrefs[nodeId] ?? null}
                  selectedId={selectedId}
                  onSelectProcedure={setSelectedId}
                />
                <ProcedureReader node={selected} reading={reading} error={readingError} />
              </>
            ) : (
              <p className="text-sm text-slate-500">Choose a screen, route, or procedure.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Participant(props: {
  node: FlowNode;
  href: string | null;
  selected: boolean;
  onRead: (nodeId: string) => void;
}): React.JSX.Element {
  const note = props.node.gap ?? (props.node.incomplete ? "Some calls in this file are dynamic." : null);
  const label = props.href ? (
    <a className="text-sky-700 hover:underline dark:text-sky-300" href={props.href}>
      {props.node.label}
    </a>
  ) : (
    <span>{props.node.label}</span>
  );
  return (
    <li className={props.selected ? "rounded-md bg-sky-50 px-2 py-1 dark:bg-slate-800" : undefined}>
      {props.node.kind === "procedure" ? (
        <button className="text-left hover:underline" type="button" onClick={() => props.onRead(props.node.id)}>
          {props.node.label}
        </button>
      ) : (
        label
      )}
      {props.node.kind === "procedure" && props.href ? (
        <a className="ml-2 text-slate-500 hover:underline" href={props.href}>
          Open file
        </a>
      ) : null}
      <span className="ml-2 text-slate-500">{props.node.detail}</span>
      {note ? <span className="ml-2 text-amber-700">{note}</span> : null}
    </li>
  );
}

function ProcedureReader(props: {
  node: FlowNode | null;
  reading: ProcedureReading | null;
  error: string | null;
}): React.JSX.Element | null {
  if (!props.node) return null;
  return (
    <section className="rounded-md border border-slate-200 p-4 dark:border-slate-700">
      <h2 className="break-all text-lg font-semibold">{props.node.label}</h2>
      <p className="text-sm text-slate-500">{props.node.detail}</p>
      <div className="mt-3">
        {props.reading?.docHref ? (
          <a className="text-sm text-sky-700 hover:underline dark:text-sky-300" href={props.reading.docHref}>
            Read the write-up
          </a>
        ) : props.reading ? (
          <p className="text-sm text-slate-500">No write-up in the database folder yet.</p>
        ) : null}
      </div>
      {props.error ? <p className="mt-3 text-sm text-amber-700">{props.error}</p> : null}
      {props.reading?.scriptFrom === "repository" ? (
        <p className="mt-3 text-sm text-amber-700">
          {props.reading.scriptError ?? "The database did not return a script."} Showing the script from the database repository.
        </p>
      ) : props.reading?.scriptError ? (
        <p className="mt-3 text-sm text-amber-700">{props.reading.scriptError}</p>
      ) : null}
      {props.reading?.scriptFrom === "database" ? (
        <p className="mt-3 text-sm text-slate-500">Script from the database.</p>
      ) : null}
      {props.reading?.script ? (
        <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
          {props.reading.script}
        </pre>
      ) : !props.error && !props.reading ? (
        <p className="mt-3 text-sm text-slate-500">Reading the procedure from the database…</p>
      ) : null}
    </section>
  );
}

function procedureById(journey: Journey | null, id: string | null): FlowNode | null {
  if (!journey || !id) return null;
  return [...journey.chain, ...journey.callNodes].find((node) => node.id === id && node.kind === "procedure") ?? null;
}

function defaultProcedureId(journey: Journey | null): string | null {
  if (!journey) return null;
  const fromChain = [...journey.chain].reverse().find((node) => node.kind === "procedure");
  if (fromChain) return fromChain.id;
  return journey.callNodes.find((node) => node.kind === "procedure")?.id ?? null;
}

