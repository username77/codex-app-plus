import { useEffect, useState } from "react";
import type { ServerRequestResolution } from "../../domain/types";
import type { PendingUserInputEntry } from "../../domain/timeline";

interface HomePlanRequestComposerProps {
  readonly entry: PendingUserInputEntry;
  readonly busy: boolean;
  readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void>;
}

type UserInputQuestion = PendingUserInputEntry["request"]["questions"][number];

export function HomePlanRequestComposer(props: HomePlanRequestComposerProps): JSX.Element {
  const questions = props.entry.request.questions;
  const [selectedById, setSelectedById] = useState<Record<string, string | null>>(() => createInitialSelections(questions));
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedById(createInitialSelections(questions));
    setNotesById({});
  }, [props.entry.requestId, questions]);

  return (
    <footer className="composer-area">
      <section className="plan-request-composer" aria-label={questions[0]?.question ?? "计划确认"}>
        <div className="plan-request-header">
          <p className="plan-request-title">{questions[0]?.question ?? "实施此计划？"}</p>
          <p className="plan-request-subtitle">确认实施，或补充你希望 Codex 调整的方案细节。</p>
        </div>
        <div className="plan-request-body">
          {questions.map((question) => (
            <QuestionBlock
              key={question.id}
              question={question}
              selectedOption={selectedById[question.id] ?? null}
              notes={notesById[question.id] ?? ""}
              disabled={props.busy}
              onSelect={(label) => setSelectedById((current) => ({ ...current, [question.id]: label }))}
              onNotesChange={(value) => setNotesById((current) => ({ ...current, [question.id]: value }))}
            />
          ))}
        </div>
        <div className="plan-request-actions">
          <button
            type="button"
            className="plan-request-escape"
            disabled={props.busy}
            onClick={() => {
              setSelectedById(createInitialSelections(questions));
              setNotesById({});
            }}
          >
            Esc
          </button>
          <button
            type="button"
            className="plan-request-submit"
            disabled={props.busy || questions.some((question) => isQuestionUnanswered(question, selectedById, notesById))}
            onClick={() => void props.onResolveServerRequest(buildPlanRequestResolution(props.entry, selectedById, notesById))}
          >
            提交
          </button>
        </div>
      </section>
    </footer>
  );
}

function QuestionBlock(props: {
  readonly question: UserInputQuestion;
  readonly selectedOption: string | null;
  readonly notes: string;
  readonly disabled: boolean;
  readonly onSelect: (label: string | null) => void;
  readonly onNotesChange: (value: string) => void;
}): JSX.Element {
  const notesVisible = shouldShowNotes(props.question, props.selectedOption);
  return (
    <section className="plan-request-question">
      {props.question.header.trim().length > 0 ? <p className="plan-request-question-header">{props.question.header}</p> : null}
      {props.question.options?.map((option, index) => (
        <button
          key={option.label}
          type="button"
          className="plan-request-option"
          data-selected={props.selectedOption === option.label ? "true" : undefined}
          disabled={props.disabled}
          onClick={() => props.onSelect(option.label)}
        >
          <span className="plan-request-option-index">{index + 1}.</span>
          <span className="plan-request-option-copy">
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </span>
        </button>
      ))}
      {notesVisible ? (
        <textarea
          className="plan-request-notes"
          value={props.notes}
          disabled={props.disabled}
          placeholder={createNotesPlaceholder(props.question, props.selectedOption)}
          onChange={(event) => props.onNotesChange(event.currentTarget.value)}
        />
      ) : null}
    </section>
  );
}

function createInitialSelections(questions: ReadonlyArray<UserInputQuestion>): Record<string, string | null> {
  return Object.fromEntries(questions.map((question) => [question.id, question.options?.[0]?.label ?? null]));
}

function shouldShowNotes(question: UserInputQuestion, selectedOption: string | null): boolean {
  if (question.options === null) {
    return true;
  }
  if (question.isOther) {
    return true;
  }
  const recommended = question.options[0]?.label ?? null;
  return selectedOption !== null && selectedOption !== recommended;
}

function createNotesPlaceholder(question: UserInputQuestion, selectedOption: string | null): string {
  if (question.options === null) {
    return "请输入回复";
  }
  return selectedOption === question.options[0]?.label ? "可选补充说明" : "请告诉 Codex 该如何调整方案";
}

function isQuestionUnanswered(
  question: UserInputQuestion,
  selectedById: Record<string, string | null>,
  notesById: Record<string, string>,
): boolean {
  if (question.options === null) {
    return (notesById[question.id] ?? "").trim().length === 0;
  }
  return selectedById[question.id] === null;
}

function buildPlanRequestResolution(
  entry: PendingUserInputEntry,
  selectedById: Record<string, string | null>,
  notesById: Record<string, string>,
): ServerRequestResolution {
  return {
    kind: "userInput",
    requestId: entry.requestId,
    answers: Object.fromEntries(entry.request.questions.map((question) => [question.id, buildAnswers(question, selectedById, notesById)])),
  };
}

function buildAnswers(
  question: UserInputQuestion,
  selectedById: Record<string, string | null>,
  notesById: Record<string, string>,
): Array<string> {
  const selected = selectedById[question.id];
  const notes = (notesById[question.id] ?? "").trim();
  if (question.options === null) {
    return notes.length === 0 ? [] : [notes];
  }
  return [selected, notes].filter((value): value is string => value !== null && value.length > 0);
}
