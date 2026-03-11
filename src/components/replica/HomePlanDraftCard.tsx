import type { ComponentProps } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

const MARKDOWN_COMPONENTS = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
} satisfies Components;

const MARKDOWN_PLUGINS = [remarkGfm, remarkBreaks] as unknown as NonNullable<ComponentProps<typeof ReactMarkdown>["remarkPlugins"]>;

interface HomePlanDraftCardProps {
  readonly markdown: string;
}

export function HomePlanDraftCard(props: HomePlanDraftCardProps): JSX.Element {
  return (
    <section className="home-plan-draft-card">
      <div className="home-plan-draft-label">计划草稿</div>
      <div className="home-plan-draft-body home-chat-markdown home-chat-markdown-assistant">
        <ReactMarkdown components={MARKDOWN_COMPONENTS} remarkPlugins={MARKDOWN_PLUGINS}>
          {props.markdown}
        </ReactMarkdown>
      </div>
    </section>
  );
}
