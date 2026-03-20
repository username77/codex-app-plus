import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PendingUserInputEntry } from "../../../domain/timeline";
import type { ServerRequestResolution } from "../../../domain/types";
import type { ToolRequestUserInputQuestion } from "../../../protocol/generated/v2/ToolRequestUserInputQuestion";
import {
  buildUserInputResolution,
  isUserInputQuestionAnswered,
  usesFreeTextInput,
  type UserInputDraftMap,
} from "../model/homeUserInputPromptModel";
import {
  PromptActions,
  PromptBody,
  PromptHeaderAside,
} from "./HomeUserInputPromptParts";

interface HomeUserInputPromptProps {
  readonly busy: boolean;
  readonly entry: PendingUserInputEntry;
  readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void>;
}

export function HomeUserInputPrompt(props: HomeUserInputPromptProps): JSX.Element | null {
  const questions = props.entry.request.questions;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [freeText, setFreeText] = useState<Record<string, string>>({});

  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOptions({});
    setFreeText({});
  }, [props.entry.requestId]);

  const currentQuestion = questions[currentIndex];
  const currentQuestionAnswered = currentQuestion
    ? isUserInputQuestionAnswered(currentQuestion, selectedOptions, freeText)
    : false;
  const allQuestionsAnswered = useMemo(
    () => questions.every((question) => isUserInputQuestionAnswered(question, selectedOptions, freeText)),
    [freeText, questions, selectedOptions],
  );

  if (!currentQuestion) {
    return null;
  }

  return (
    <UserInputPromptCard
      busy={props.busy}
      currentIndex={currentIndex}
      currentQuestion={currentQuestion}
      entry={props.entry}
      freeText={freeText}
      onResolveServerRequest={props.onResolveServerRequest}
      questions={questions}
      currentQuestionAnswered={currentQuestionAnswered}
      selectedOptions={selectedOptions}
      setCurrentIndex={setCurrentIndex}
      setFreeText={setFreeText}
      setSelectedOptions={setSelectedOptions}
      submitDisabled={!allQuestionsAnswered}
    />
  );
}

function UserInputPromptCard(props: {
  readonly busy: boolean;
  readonly currentIndex: number;
  readonly currentQuestion: ToolRequestUserInputQuestion;
  readonly currentQuestionAnswered: boolean;
  readonly entry: PendingUserInputEntry;
  readonly freeText: UserInputDraftMap;
  readonly onResolveServerRequest: (resolution: ServerRequestResolution) => Promise<void>;
  readonly questions: ReadonlyArray<ToolRequestUserInputQuestion>;
  readonly selectedOptions: UserInputDraftMap;
  readonly setCurrentIndex: Dispatch<SetStateAction<number>>;
  readonly setFreeText: Dispatch<SetStateAction<Record<string, string>>>;
  readonly setSelectedOptions: Dispatch<SetStateAction<Record<string, string>>>;
  readonly submitDisabled: boolean;
}): JSX.Element {
  const submitAnswers = () =>
    void props.onResolveServerRequest(buildUserInputResolution(props.entry, props.selectedOptions, props.freeText));

  return (
    <footer className="composer-area home-user-input-prompt-shell">
      <section className="home-turn-plan-drawer home-user-input-prompt" aria-label="需要补充信息">
        <div className="home-turn-plan-handle home-user-input-prompt-header" data-expanded="true">
          <div className="home-turn-plan-handle-info">
            <span className="home-turn-plan-title">需要补充信息</span>
          </div>
          <PromptHeaderAside
            currentIndex={props.currentIndex}
            questions={props.questions}
            setCurrentIndex={props.setCurrentIndex}
          />
        </div>
        <div className="home-turn-plan-card home-user-input-prompt-card">
          <div className="home-user-input-prompt-body">
            <PromptBody
              busy={props.busy}
              currentIndex={props.currentIndex}
              question={props.currentQuestion}
              currentQuestionAnswered={props.currentQuestionAnswered}
              questions={props.questions}
              selectedOptions={props.selectedOptions}
              freeText={props.freeText}
              setCurrentIndex={props.setCurrentIndex}
              setFreeText={props.setFreeText}
              setSelectedOptions={props.setSelectedOptions}
              submitDisabled={props.submitDisabled}
              onSubmit={submitAnswers}
            />
            {usesFreeTextInput(props.currentQuestion)
              ? null
              : <PromptActions busy={props.busy} submitDisabled={props.submitDisabled} onSubmit={submitAnswers} />}
          </div>
        </div>
      </section>
    </footer>
  );
}
