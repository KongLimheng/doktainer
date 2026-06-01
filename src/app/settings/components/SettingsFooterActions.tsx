"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";

interface SettingsFooterActionsProps {
  saving: boolean;
  resetting: boolean;
  activeTabLabel: string;
  onReset: () => void;
  onSave: () => void;
}

export default function SettingsFooterActions({
  saving,
  resetting,
  activeTabLabel,
  onReset,
  onSave,
}: SettingsFooterActionsProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onReset}
        disabled={resetting || saving}
        style={{ padding: "9px 18px", fontSize: 13 }}
      >
        {resetting ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Resetting...
          </>
        ) : (
          <>
            <RotateCcw size={13} /> Reset to Defaults
          </>
        )}
      </button>

      <button
        className="btn btn-primary"
        style={{ padding: "9px 22px", fontSize: 13 }}
        onClick={onSave}
        disabled={saving || resetting}
      >
        {saving ? (
          <>
            <Loader2 size={13} className="animate-spin" /> Saving...
          </>
        ) : (
          <>
            <Save size={13} /> Save {activeTabLabel}
          </>
        )}
      </button>
    </div>
  );
}
