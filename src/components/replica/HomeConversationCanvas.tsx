import { useEffect, useMemo, useRef } from "react";
import type { ConversationMessage, ThreadSummary } from "../../domain/types";

interface HomeConversationCanvasProps {
  readonly messages: ReadonlyArray<ConversationMessage>;
  readonly selectedThread: ThreadSummary | null;
}

function roleLabel(role: ConversationMessage["role"]): string {
  switch (role) {
    case "assistant":
      return "Codex";
    case "system":
      return "系统";
    default:
      return "你";
  }
}

function createMessageClassName(role: ConversationMessage["role"]): string {
  return `home-chat-message home-chat-message-${role}`;
}

function ConversationPlaceholder(props: { readonly selectedThread: ThreadSummary | null }): JSX.Element {
  if (props.selectedThread === null) {
    return (
      <div className="home-chat-placeholder">
        <p className="home-chat-placeholder-title">选择工作区后即可开始会话</p>
        <p className="home-chat-placeholder-body">发送第一条消息后，这里会切换成聊天记录视图。</p>
      </div>
    );
  }

  return (
    <div className="home-chat-placeholder">
      <p className="home-chat-placeholder-title">会话已创建</p>
      <p className="home-chat-placeholder-body">发送第一条消息后，聊天内容会显示在这里。</p>
    </div>
  );
}

function ConversationBubble(props: { readonly message: ConversationMessage }): JSX.Element {
  return (
    <article className={createMessageClassName(props.message.role)}>
      <div className="home-chat-message-header">
        <span>{roleLabel(props.message.role)}</span>
        <span>{props.message.status === "streaming" ? "生成中" : "已完成"}</span>
      </div>
      <div className="home-chat-bubble">
        <pre className="home-chat-text">{props.message.text}</pre>
      </div>
    </article>
  );
}

export function HomeConversationCanvas(props: HomeConversationCanvasProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastMessage = props.messages[props.messages.length - 1] ?? null;
  const scrollKey = useMemo(() => {
    if (lastMessage === null) {
      return props.selectedThread?.id ?? "empty";
    }
    return `${lastMessage.id}:${lastMessage.status}:${lastMessage.text.length}`;
  }, [lastMessage, props.selectedThread]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }
    element.scrollTop = element.scrollHeight;
  }, [scrollKey]);

  return (
    <main className="home-conversation" aria-label="会话内容">
      <div ref={scrollRef} className="home-conversation-scroll">
        <div className="home-conversation-thread">
          {props.messages.length === 0 ? <ConversationPlaceholder selectedThread={props.selectedThread} /> : null}
          {props.messages.map((message) => (
            <ConversationBubble key={message.id} message={message} />
          ))}
        </div>
      </div>
    </main>
  );
}
