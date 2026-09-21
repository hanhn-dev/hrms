import { useEffect, useRef, useState } from "react";
import { MESSAGE, type NetworkCaptureResponse, type NetworkTimingRow } from "@/shared/messaging";
import { showPageToast } from "@/shared/page-toast";
import {
  NetworkTimingPanel,
  PAGE_NETWORK_CAPTURE_EMPTY_HINT,
} from "./NetworkTimingPanel";

export const REQUEST_TIMING_PANEL_ID = "form-autofill-request-timing";

const SLOW_ROW_STYLE_ID = "form-autofill-slow-request-style";

export type RequestTimingSend = (payload: unknown) => Promise<unknown>;

export interface RequestTimingOverlayProps {
  sendMessage: RequestTimingSend;
  onClose: () => void;
}

/**
 * Page-level timing panel. The extension popup closes as soon as the page is
 * clicked, so capture has to stay on the page the user is testing.
 */
export function RequestTimingOverlay({
  sendMessage,
  onClose,
}: RequestTimingOverlayProps) {
  const [rows, setRows] = useState<NetworkTimingRow[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  useEffect(() => {
    if (document.getElementById(SLOW_ROW_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = SLOW_ROW_STYLE_ID;
    style.textContent =
      "tr.autofill-slow-request > td { background-color: #fff7e6 !important; }";
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const pull = async () => {
      try {
        const result = await sendRef.current({ type: MESSAGE.GET_NETWORK_CAPTURE });
        if (cancelled) {
          return;
        }
        if (!isCaptureSnapshot(result)) {
          if (isCaptureFailure(result)) {
            setError(result.error);
          }
          return;
        }
        setRows(result.rows);
        setCapturing(result.capturing);
      } catch (pullError) {
        console.error(pullError);
      }
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const applySnapshot = (result: NetworkCaptureResponse) => {
    setRows(result.rows);
    setCapturing(result.capturing);
    setError(null);
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await sendRef.current({ type: MESSAGE.START_NETWORK_CAPTURE });
      if (isCaptureFailure(result)) {
        setError(result.error);
        showPageToast(result.error, "error");
        return;
      }
      if (isCaptureSnapshot(result)) {
        applySnapshot(result);
      }
    } catch (startError) {
      const message =
        startError instanceof Error ? startError.message : String(startError);
      setError(message);
      showPageToast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await sendRef.current({ type: MESSAGE.STOP_NETWORK_CAPTURE });
      if (isCaptureFailure(result)) {
        setError(result.error);
        showPageToast(result.error, "error");
        return;
      }
      if (isCaptureSnapshot(result)) {
        applySnapshot(result);
      }
    } catch (stopError) {
      const message =
        stopError instanceof Error ? stopError.message : String(stopError);
      setError(message);
      showPageToast(message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id={REQUEST_TIMING_PANEL_ID}
      data-request-timing-panel=""
      aria-label="Request timing"
      style={{
        position: "fixed",
        zIndex: 2147483646,
        top: 12,
        left: 12,
        width: "min(960px, calc(100vw - 24px))",
        maxHeight: "calc(100vh - 24px)",
        overflow: "auto",
        boxSizing: "border-box",
        padding: 12,
        borderRadius: 10,
        background: "#fff",
        color: "#1f1f1f",
        boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
        border: "1px solid rgba(0,0,0,0.08)",
        fontFamily:
          '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <strong style={{ fontSize: 14 }}>Request timing</strong>
        <button
          type="button"
          aria-label="Close request timing"
          onClick={onClose}
          style={{
            appearance: "none",
            border: "1px solid rgba(0,0,0,0.12)",
            background: "#fff",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Close
        </button>
      </div>
      {error ? (
        <p style={{ margin: "0 0 8px", color: "#cf1322", fontSize: 12 }}>{error}</p>
      ) : null}
      <NetworkTimingPanel
        capturing={capturing}
        busy={busy}
        rows={rows}
        showAllTypes={showAllTypes}
        onStart={() => void handleStart()}
        onStop={() => void handleStop()}
        onShowAllTypesChange={setShowAllTypes}
        emptyHint={PAGE_NETWORK_CAPTURE_EMPTY_HINT}
      />
    </section>
  );
}

function isCaptureSnapshot(value: unknown): value is NetworkCaptureResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const snapshot = value as Partial<NetworkCaptureResponse>;
  return snapshot.ok === true && Array.isArray(snapshot.rows);
}

function isCaptureFailure(
  value: unknown,
): value is { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const failure = value as { ok?: unknown; error?: unknown };
  return failure.ok === false && typeof failure.error === "string";
}
