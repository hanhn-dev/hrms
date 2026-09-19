import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  AimOutlined,
  FontSizeOutlined,
  FormOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { showPageToast } from "@/shared/page-toast";
import { isEscapeKey, shortcutLabelFor } from "@/features/shortcuts";
import {
  FAB_ID,
  FAB_SIZE,
  FLOAT_MENU_ITEMS,
  MENU_ID,
  ROOT_ID,
  clampFabPosition,
  defaultFabPosition,
  executeFloatMenuAction,
  fetchPersistedFabPosition,
  isDragGesture,
  persistFabPosition,
  type FabPosition,
  type FloatMenuActionId,
  type FloatMenuIconName,
  type SendMessage,
} from "./float-menu-logic";

const ICON_MAP: Record<
  FloatMenuIconName,
  ComponentType<{ style?: CSSProperties }>
> = {
  aim: AimOutlined,
  reload: ReloadOutlined,
  form: FormOutlined,
  fontSize: FontSizeOutlined,
};

export interface FloatMenuHandle {
  open: boolean;
  busy: boolean;
  setOpen: (open: boolean) => void;
  runAction: (actionId: FloatMenuActionId) => Promise<void>;
}

export interface FloatMenuPanelProps {
  sendMessage: SendMessage;
  onReady?: (handle: FloatMenuHandle) => void;
}

export function FloatMenuPanel({ sendMessage, onReady }: FloatMenuPanelProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<FabPosition>(() =>
    defaultFabPosition(
      typeof window !== "undefined" ? window.innerWidth : 1280,
      typeof window !== "undefined" ? window.innerHeight : 720,
    ),
  );

  const openRef = useRef(false);
  const busyRef = useRef(false);
  const sendRef = useRef(sendMessage);
  sendRef.current = sendMessage;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await fetchPersistedFabPosition(
        sendRef.current,
        window.innerWidth,
        window.innerHeight,
      );
      if (!cancelled) {
        setPosition(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setOpenState = (next: boolean) => {
    openRef.current = next;
    setOpen(next);
  };

  const setBusyState = (next: boolean) => {
    busyRef.current = next;
    setBusy(next);
  };

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    moved: boolean;
  } | null>(null);
  /** After a drag, ignore the browser's follow-up click so the menu does not toggle. */
  const skipNextClickRef = useRef(false);

  const runAction = async (actionId: FloatMenuActionId) => {
    if (busyRef.current) {
      return;
    }
    setBusyState(true);
    setOpenState(false);
    try {
      await executeFloatMenuAction(actionId, sendRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showPageToast(message, "error");
    } finally {
      setBusyState(false);
    }
  };

  useEffect(() => {
    onReady?.({
      get open() {
        return openRef.current;
      },
      get busy() {
        return busyRef.current;
      },
      setOpen: setOpenState,
      runAction,
    });
    // Register handle once; refs keep open/busy/send current.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const root = document.getElementById(ROOT_ID);
      if (target && root?.contains(target)) {
        return;
      }
      setOpenState(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isEscapeKey(event)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setOpenState(false);
    };
    document.addEventListener("click", onDocumentClick, true);
    // Window capture runs before document; catches Esc while a page field is focused.
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      setPosition((prev) =>
        clampFabPosition(prev, window.innerWidth, window.innerHeight),
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (busy || event.button !== 0) {
      return;
    }
    skipNextClickRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: position.left,
      originTop: position.top,
      moved: false,
    };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && !isDragGesture(deltaX, deltaY)) {
      return;
    }
    drag.moved = true;
    if (openRef.current) {
      setOpenState(false);
    }
    setPosition(
      clampFabPosition(
        {
          left: drag.originLeft + deltaX,
          top: drag.originTop + deltaY,
        },
        window.innerWidth,
        window.innerHeight,
      ),
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    if (drag.moved) {
      // pointerup is followed by click; pointercancel is not.
      skipNextClickRef.current = event.type !== "pointercancel";
      setPosition((prev) => {
        const next = clampFabPosition(
          prev,
          window.innerWidth,
          window.innerHeight,
        );
        void persistFabPosition(sendRef.current, next);
        return next;
      });
      return;
    }
  };

  // Open/close on click so keyboard, .click(), and Vimium hints work.
  // Pointer events are only for dragging; a drag's follow-up click is skipped.
  const onFabClick = () => {
    if (skipNextClickRef.current) {
      skipNextClickRef.current = false;
      return;
    }
    if (!busyRef.current) {
      setOpenState(!openRef.current);
    }
  };

  const shellStyle: CSSProperties = {
    position: "fixed",
    zIndex: 2147483645,
    left: position.left,
    top: position.top,
    width: FAB_SIZE,
    height: FAB_SIZE,
    fontFamily:
      '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    opacity: busy ? 0.65 : 1,
  };

  const menuStyle: CSSProperties = {
    display: open ? "flex" : "none",
    flexDirection: "column",
    gap: 4,
    position: "absolute",
    right: 0,
    bottom: FAB_SIZE + 8,
    minWidth: 220,
    padding: 8,
    borderRadius: 10,
    background: "#fff",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
    border: "1px solid rgba(0,0,0,0.08)",
  };

  const fabStyle: CSSProperties = {
    appearance: "none",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: "50%",
    border: "none",
    background: "#1677ff",
    color: "#fff",
    cursor: busy ? "not-allowed" : "grab",
    boxShadow: "0 6px 16px rgba(22, 119, 255, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    touchAction: "none",
    userSelect: "none",
  };

  return (
    <div style={shellStyle} data-form-autofill-float="">
      <div
        id={MENU_ID}
        role="menu"
        style={menuStyle}
        hidden={!open}
        onKeyDown={(event) => {
          if (!isEscapeKey(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setOpenState(false);
        }}
      >
        {FLOAT_MENU_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon];
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-action-id={item.id}
              aria-keyshortcuts={shortcutLabelFor(item.id)}
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                void runAction(item.id);
              }}
              style={{
                appearance: "none",
                border: "none",
                background: "transparent",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: busy ? "not-allowed" : "pointer",
                fontSize: 13,
                color: "#1f1f1f",
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(event) => {
                if (!busy) {
                  event.currentTarget.style.background =
                    "rgba(22, 119, 255, 0.08)";
                }
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "transparent";
              }}
            >
              <Icon style={{ fontSize: 14, color: "#1677ff" }} />
              <span>{item.label}</span>
              <span
                aria-hidden="true"
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  color: "#8c8c8c",
                  letterSpacing: 0.2,
                  whiteSpace: "nowrap",
                }}
              >
                {shortcutLabelFor(item.id)}
              </span>
            </button>
          );
        })}
      </div>
      <button
        id={FAB_ID}
        type="button"
        aria-label="Form Autofill actions"
        aria-keyshortcuts={shortcutLabelFor("toggle-menu")}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        style={fabStyle}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClick={onFabClick}
        onKeyDown={(event) => {
          if (!open || !isEscapeKey(event)) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setOpenState(false);
        }}
      >
        <FormOutlined />
      </button>
    </div>
  );
}
