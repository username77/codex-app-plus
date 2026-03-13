import { useEffect, useMemo, useState } from "react";
import type { Personality } from "../../../protocol/generated/Personality";
import { useI18n, type MessageKey } from "../../../i18n";
import { readPersonalizationConfigView } from "../config/personalizationConfig";
import type {
  GlobalAgentInstructionsOutput,
  UpdateGlobalAgentInstructionsInput
} from "../../../bridge/types";

interface PersonalizationSettingsSectionProps {
  readonly configSnapshot: unknown;
  readonly busy: boolean;
  readonly readGlobalAgentInstructions: () => Promise<GlobalAgentInstructionsOutput>;
  readonly writeGlobalAgentInstructions: (
    input: UpdateGlobalAgentInstructionsInput
  ) => Promise<GlobalAgentInstructionsOutput>;
}

interface SaveFeedback {
  readonly kind: "idle" | "success" | "error";
  readonly message: string;
}

interface GlobalInstructionsState {
  readonly path: string;
  readonly loaded: boolean;
  readonly savedContent: string;
  readonly draftContent: string;
}

const GLOBAL_AGENTS_FALLBACK_PATH = "~/.codex/AGENTS.md";
const EMPTY_FEEDBACK: SaveFeedback = { kind: "idle", message: "" };

const INITIAL_INSTRUCTIONS_STATE: GlobalInstructionsState = {
  path: GLOBAL_AGENTS_FALLBACK_PATH,
  loaded: false,
  savedContent: "",
  draftContent: ""
};
const PERSONALITY_MESSAGE_KEYS: Record<Personality, {
  readonly label: MessageKey;
  readonly description: MessageKey;
}> = {
  none: {
    label: "settings.personalization.none.label",
    description: "settings.personalization.none.description"
  },
  friendly: {
    label: "settings.personalization.friendly.label",
    description: "settings.personalization.friendly.description"
  },
  pragmatic: {
    label: "settings.personalization.pragmatic.label",
    description: "settings.personalization.pragmatic.description"
  }
};

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function InstructionsStatus(props: { readonly feedback: SaveFeedback }): JSX.Element | null {
  if (props.feedback.kind === "success") {
    return <p className="settings-status-note settings-status-note-success">{props.feedback.message}</p>;
  }
  if (props.feedback.kind === "error") {
    return <p className="settings-status-note settings-status-note-error">{props.feedback.message}</p>;
  }
  return null;
}

function PersonalizationStyleCard(props: {
  readonly title: string;
  readonly description: string;
  readonly label: string;
}): JSX.Element {
  return (
    <section className="settings-card">
      <div className="settings-row">
        <div className="settings-row-copy">
          <strong>{props.title}</strong>
          <p>{props.description}</p>
        </div>
        <span className="settings-chip">{props.label}</span>
      </div>
    </section>
  );
}

function InstructionsCard(props: {
  readonly busy: boolean;
  readonly dirty: boolean;
  readonly title: string;
  readonly description: string;
  readonly ariaLabel: string;
  readonly saveLabel: string;
  readonly savingLabel: string;
  readonly value: string;
  readonly feedback: SaveFeedback;
  onChange: (value: string) => void;
  onSave: () => Promise<void>;
}): JSX.Element {
  return (
    <section className="settings-card">
      <div className="settings-section-head">
        <strong>{props.title}</strong>
        <button
          type="button"
          className="settings-head-action"
          onClick={() => void props.onSave()}
          disabled={props.busy || !props.dirty}
        >
          {props.busy ? props.savingLabel : props.saveLabel}
        </button>
      </div>
      <p className="settings-note settings-note-pad">{props.description}</p>
      <textarea
        className="settings-textarea"
        aria-label={props.ariaLabel}
        value={props.value}
        disabled={props.busy}
        onChange={(event) => props.onChange(event.target.value)}
      />
      <InstructionsStatus feedback={props.feedback} />
    </section>
  );
}

function toLoadedState(output: GlobalAgentInstructionsOutput): GlobalInstructionsState {
  return {
    path: output.path,
    loaded: true,
    savedContent: output.content,
    draftContent: output.content
  };
}

function useGlobalInstructionsEditor(props: {
  readonly t: (key: MessageKey, params?: Record<string, string>) => string;
  readonly readGlobalAgentInstructions: () => Promise<GlobalAgentInstructionsOutput>;
  readonly writeGlobalAgentInstructions: (
    input: UpdateGlobalAgentInstructionsInput
  ) => Promise<GlobalAgentInstructionsOutput>;
}) {
  const [instructionsState, setInstructionsState] = useState(INITIAL_INSTRUCTIONS_STATE);
  const [feedback, setFeedback] = useState<SaveFeedback>(EMPTY_FEEDBACK);

  useEffect(() => {
    let active = true;
    void props.readGlobalAgentInstructions()
      .then((output) => active && (setInstructionsState(toLoadedState(output)), setFeedback(EMPTY_FEEDBACK)))
      .catch((error) => active && setFeedback({
        kind: "error",
        message: props.t("settings.personalization.loadFailed", { error: toErrorMessage(error) })
      }));
    return () => {
      active = false;
    };
  }, [props.readGlobalAgentInstructions, props.t]);

  const dirty = instructionsState.draftContent !== instructionsState.savedContent;
  const handleChange = (value: string) => {
    setInstructionsState((current) => ({ ...current, draftContent: value }));
    setFeedback((current) => (current.kind === "idle" ? current : EMPTY_FEEDBACK));
  };

  const handleSave = async () => {
    setFeedback(EMPTY_FEEDBACK);
    try {
      const output = await props.writeGlobalAgentInstructions({ content: instructionsState.draftContent });
      setInstructionsState(toLoadedState(output));
      setFeedback({ kind: "success", message: props.t("settings.personalization.syncedMessage") });
    } catch (error) {
      setFeedback({ kind: "error", message: toErrorMessage(error) });
    }
  };

  return { instructionsState, feedback, dirty, handleChange, handleSave };
}

export function PersonalizationSettingsSection(
  props: PersonalizationSettingsSectionProps
): JSX.Element {
  const { t } = useI18n();
  const view = useMemo(
    () => readPersonalizationConfigView(props.configSnapshot),
    [props.configSnapshot]
  );
  const personalityCopy = useMemo(() => PERSONALITY_MESSAGE_KEYS[view.personality], [view.personality]);
  const { instructionsState, feedback, dirty, handleChange, handleSave } =
    useGlobalInstructionsEditor({
      t,
      readGlobalAgentInstructions: props.readGlobalAgentInstructions,
      writeGlobalAgentInstructions: props.writeGlobalAgentInstructions
    });

  return (
    <div className="settings-panel-group">
      <header className="settings-title-wrap">
        <h1 className="settings-page-title">{t("settings.personalization.title")}</h1>
      </header>
      <PersonalizationStyleCard
        title={t("settings.personalization.styleLabel")}
        description={t(personalityCopy.description)}
        label={t(personalityCopy.label)}
      />
      <InstructionsCard
        busy={props.busy || !instructionsState.loaded}
        dirty={dirty}
        title={t("settings.personalization.instructionsTitle")}
        description={t("settings.personalization.instructionsDescription", {
          path: instructionsState.path
        })}
        ariaLabel={t("settings.personalization.instructionsAriaLabel")}
        saveLabel={t("settings.personalization.instructionsSaveAction")}
        savingLabel={t("settings.personalization.instructionsSaving")}
        value={instructionsState.draftContent}
        feedback={feedback}
        onChange={handleChange}
        onSave={handleSave}
      />
    </div>
  );
}
