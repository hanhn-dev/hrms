import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Card, Divider, Typography, message } from "antd";
import {
  DEFAULT_SETTINGS,
  MESSAGE,
  type AutofillSettings,
  type AutofillResponse,
  type FillReport,
  type ScannedField,
} from "@/shared/messaging";
import {
  bindPageShortcuts,
  resolvePopupShortcutAction,
} from "@/features/shortcuts";
import { ActionBar } from "./ActionBar";
import { FieldList } from "./FieldList";
import { TypeSettings } from "./TypeSettings";
import { ProfileSettings } from "./ProfileSettings";
import { FillReportPanel } from "./FillReportPanel";
import { HostAllowlist } from "./HostAllowlist";

async function sendMessage<T>(payload: unknown): Promise<T> {
  return (await chrome.runtime.sendMessage(payload)) as T;
}

export function PopupPanel() {
  const [fields, setFields] = useState<ScannedField[]>([]);
  const [url, setUrl] = useState("");
  const [rootSelector, setRootSelector] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<AutofillSettings>(DEFAULT_SETTINGS);
  const [fillReport, setFillReport] = useState<FillReport | null>(null);
  const [customHosts, setCustomHosts] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [picking, setPicking] = useState(false);
  const [filling, setFilling] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFromStorage = useCallback(async () => {
    try {
      const scanResult = await sendMessage<
        AutofillResponse & {
          fields?: ScannedField[];
          url?: string;
          rootSelector?: string;
        }
      >({ type: MESSAGE.GET_LAST_SCAN });
      if (scanResult.ok && "fields" in scanResult) {
        setFields(scanResult.fields ?? []);
        setUrl(scanResult.url ?? "");
        setRootSelector(scanResult.rootSelector);
      }
      const settingsResult = await sendMessage<{
        ok: true;
        settings: AutofillSettings;
      }>({ type: MESSAGE.GET_SETTINGS });
      if (settingsResult.ok) {
        setSettings(settingsResult.settings);
      }
      const reportResult = await sendMessage<{
        ok: true;
        report: FillReport | null;
      }>({ type: MESSAGE.GET_LAST_FILL_REPORT });
      if (reportResult.ok) {
        setFillReport(reportResult.report);
      }
      const hostsResult = await sendMessage<{
        ok: true;
        hosts: string[];
      }>({ type: MESSAGE.GET_CUSTOM_HOSTS });
      if (hostsResult.ok) {
        setCustomHosts(hostsResult.hosts ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refreshFromStorage();
  }, [refreshFromStorage]);

  const applyFillResponse = (response: AutofillResponse) => {
    if (!response.ok || !("filledCount" in response)) {
      return;
    }
    const report: FillReport = {
      filledCount: response.filledCount,
      skippedCount: response.skippedCount,
      failedCount: response.failedCount ?? 0,
      entries: response.entries ?? [],
      personaId: settings.activePersonaId,
      scenarioId: settings.activeScenarioId,
      at: Date.now(),
      url,
    };
    setFillReport(report);
    message.success(
      `Filled ${response.filledCount}, skipped ${response.skippedCount}${
        report.failedCount ? `, failed ${report.failedCount}` : ""
      }`,
    );
  };

  const handleScanPage = async () => {
    setScanning(true);
    setError(null);
    try {
      const response = await sendMessage<AutofillResponse>({
        type: MESSAGE.SCAN,
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if ("fields" in response) {
        setFields(response.fields);
        setUrl(response.url);
        setRootSelector(response.rootSelector);
        setSelectedIds([]);
        message.success(`Scanned ${response.fields.length} field(s)`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(false);
    }
  };

  const handlePickScan = async () => {
    setPicking(true);
    setError(null);
    try {
      const response = await sendMessage<AutofillResponse>({
        type: MESSAGE.START_PICK_SCAN,
      });
      if (!response.ok) {
        setError(response.error);
        setPicking(false);
        return;
      }
      if (!("started" in response) || response.started !== true) {
        setError(
          "Pick mode did not start on any frame. Refresh the page and try again.",
        );
        setPicking(false);
        return;
      }
      message.info("Click a form section on the page…");
      window.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPicking(false);
    }
  };

  const handlePickFill = async () => {
    setPicking(true);
    setError(null);
    try {
      const response = await sendMessage<AutofillResponse>({
        type: MESSAGE.START_PICK_FILL,
        personaId: settings.activePersonaId,
        scenarioId: settings.activeScenarioId,
        overwriteExistingValues: settings.overwriteExistingValues,
      });
      if (!response.ok) {
        setError(response.error);
        setPicking(false);
        return;
      }
      if (!("started" in response) || response.started !== true) {
        setError(
          "Pick mode did not start on any frame. Refresh the page and try again.",
        );
        setPicking(false);
        return;
      }
      message.info("Click a form section to fill…");
      window.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPicking(false);
    }
  };

  const handlePickAutoType = async () => {
    setPicking(true);
    setError(null);
    try {
      const response = await sendMessage<AutofillResponse>({
        type: MESSAGE.START_PICK_AUTO_TYPE,
        typingDelayMs: settings.typingDelayMs,
        startWithInvalid: settings.startWithInvalid,
        personaId: settings.activePersonaId,
      });
      if (!response.ok) {
        setError(response.error);
        setPicking(false);
        return;
      }
      if (!("started" in response) || response.started !== true) {
        setError(
          "Pick mode did not start on any frame. Refresh the page and try again.",
        );
        setPicking(false);
        return;
      }
      message.info("Click a field to auto-type…");
      window.close();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPicking(false);
    }
  };

  const handleFillSelected = async () => {
    setFilling(true);
    setError(null);
    try {
      const response = await sendMessage<AutofillResponse>({
        type: MESSAGE.FILL,
        fieldIds: selectedIds,
        useMarkedRoot: true,
        rootSelector,
        personaId: settings.activePersonaId,
        scenarioId: settings.activeScenarioId,
        overwriteExistingValues: settings.overwriteExistingValues,
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      applyFillResponse(response);
      await refreshFromStorage();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFilling(false);
    }
  };

  const handleAutoType = async () => {
    const fieldId = selectedIds[0];
    if (!fieldId) {
      message.warning("Select a field to auto-type");
      return;
    }
    setTyping(true);
    setError(null);
    try {
      const response = await sendMessage<AutofillResponse>({
        type: MESSAGE.AUTO_TYPE,
        fieldId,
        typingDelayMs: settings.typingDelayMs,
        startWithInvalid: settings.startWithInvalid,
        personaId: settings.activePersonaId,
      });
      if (!response.ok) {
        setError(response.error);
        return;
      }
      if ("label" in response) {
        message.success(`Auto-typed into ${response.label}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTyping(false);
    }
  };

  const handleSettingsChange = async (patch: Partial<AutofillSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await sendMessage({ type: MESSAGE.SET_SETTINGS, settings: patch });
  };

  const handleCustomHostsChange = async (hosts: string[]) => {
    const result = await sendMessage<{
      ok: boolean;
      hosts?: string[];
      error?: string;
    }>({ type: MESSAGE.SET_CUSTOM_HOSTS, hosts });
    if (!result.ok) {
      throw new Error(result.error || "Could not update hosts");
    }
    setCustomHosts(result.hosts ?? hosts);
  };

  const shortcutActionsRef = useRef({
    busy: false,
    hasSelection: false,
    pickScan: handlePickScan,
    scanPage: handleScanPage,
    pickFill: handlePickFill,
    fillSelected: handleFillSelected,
    pickAutoType: handlePickAutoType,
    autoType: handleAutoType,
  });
  shortcutActionsRef.current = {
    busy: scanning || picking || filling || typing,
    hasSelection: selectedIds.length > 0,
    pickScan: handlePickScan,
    scanPage: handleScanPage,
    pickFill: handlePickFill,
    fillSelected: handleFillSelected,
    pickAutoType: handlePickAutoType,
    autoType: handleAutoType,
  };

  useEffect(() => {
    return bindPageShortcuts({
      document,
      onAction: (actionId) => {
        const actions = shortcutActionsRef.current;
        if (actions.busy) {
          return;
        }
        const popupAction = resolvePopupShortcutAction(
          actionId,
          actions.hasSelection,
        );
        switch (popupAction) {
          case "pick-scan":
            void actions.pickScan();
            break;
          case "scan-page":
            void actions.scanPage();
            break;
          case "pick-fill":
            void actions.pickFill();
            break;
          case "fill-selected":
            void actions.fillSelected();
            break;
          case "pick-auto-type":
            void actions.pickAutoType();
            break;
          case "auto-type":
            void actions.autoType();
            break;
          default:
            break;
        }
      },
    });
    // Bind once; shortcutActionsRef always has the latest handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only
  }, []);

  return (
    <Card
      size="small"
      className="autofill:w-[380px] autofill:border-0 autofill:shadow-none"
      title={
        <div>
          <Typography.Title level={5} className="autofill:!mb-0">
            Form Autofill
          </Typography.Title>
          {url ? (
            <Typography.Text
              type="secondary"
              ellipsis
              className="autofill:text-xs"
            >
              {url}
            </Typography.Text>
          ) : null}
        </div>
      }
    >
      {error ? (
        <Alert
          type="error"
          message={error}
          showIcon
          className="autofill:mb-3"
          closable
          onClose={() => setError(null)}
        />
      ) : null}

      <Typography.Paragraph type="secondary" className="autofill:!mb-2 autofill:text-xs">
        Use <strong>Pick &amp; scan</strong> or <strong>Pick &amp; fill</strong>{" "}
        like DevTools inspector: click the form section (or any field inside it)
        to capture or fill that area. <strong>Pick &amp; type</strong> highlights
        a single field — click it to keystroke-type. Shortcuts:{" "}
        <strong>Alt+Shift+P</strong> / <strong>S</strong> / <strong>F</strong> /{" "}
        <strong>T</strong>.
      </Typography.Paragraph>

      <ActionBar
        scanning={scanning}
        picking={picking}
        filling={filling}
        typing={typing}
        hasSelection={selectedIds.length > 0}
        onScanPage={() => void handleScanPage()}
        onPickScan={() => void handlePickScan()}
        onPickFill={() => void handlePickFill()}
        onFillSelected={() => void handleFillSelected()}
        onPickAutoType={() => void handlePickAutoType()}
        onAutoTypeSelected={() => void handleAutoType()}
      />

      <Divider className="autofill:!my-3" />

      <ProfileSettings
        settings={settings}
        onChange={(p) => void handleSettingsChange(p)}
      />

      <Divider className="autofill:!my-3" />

      <TypeSettings
        settings={settings}
        onChange={(p) => void handleSettingsChange(p)}
      />

      <Divider className="autofill:!my-3" />

      <Typography.Text strong className="autofill:mb-2 autofill:block">
        Last fill report
      </Typography.Text>
      <FillReportPanel report={fillReport} />

      <Divider className="autofill:!my-3" />

      <HostAllowlist
        hosts={customHosts}
        onChange={handleCustomHostsChange}
      />

      <Divider className="autofill:!my-3" />

      <Typography.Text strong className="autofill:mb-2 autofill:block">
        Captured fields ({fields.length})
        {rootSelector ? (
          <Typography.Text type="secondary" className="autofill:ml-1 autofill:font-normal">
            · scoped
          </Typography.Text>
        ) : null}
      </Typography.Text>
      <FieldList
        fields={fields}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </Card>
  );
}

export {
  ActionBar,
  FieldList,
  TypeSettings,
  ProfileSettings,
  FillReportPanel,
  HostAllowlist,
};
