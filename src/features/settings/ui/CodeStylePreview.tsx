import { highlightCodeLine } from "../../git/ui/diffCodeHighlight";
import { type CodeStyleId, getCodeStyleTheme } from "../model/codeStyleCatalog";

interface CodeStylePreviewProps {
  readonly codeStyle: CodeStyleId;
}

type PreviewPanelSide = "after" | "before";
type PreviewRowKind = "add" | "context" | "delete";

interface PreviewDiffLine {
  readonly kind: "change" | "context";
  readonly newContent: string;
  readonly oldContent: string;
}

interface PreviewRow {
  readonly content: string;
  readonly kind: PreviewRowKind;
  readonly lineNumber: number;
}

const PREVIEW_DIFF_LINES: ReadonlyArray<PreviewDiffLine> = [
  {
    kind: "context",
    newContent: "const themePreview: ThemeConfig = {",
    oldContent: "const themePreview: ThemeConfig = {",
  },
  {
    kind: "change",
    newContent: '  surface: "sidebar-elevated",',
    oldContent: '  surface: "sidebar",',
  },
  {
    kind: "change",
    newContent: '  accent: "#0ea5e9",',
    oldContent: '  accent: "#2563eb",',
  },
  {
    kind: "change",
    newContent: "  contrast: 68,",
    oldContent: "  contrast: 42,",
  },
  {
    kind: "context",
    newContent: "};",
    oldContent: "};",
  },
];

function resolvePreviewRowKind(
  side: PreviewPanelSide,
  line: PreviewDiffLine,
): PreviewRowKind {
  if (line.kind === "context") {
    return "context";
  }
  return side === "before" ? "delete" : "add";
}

function createPreviewRows(side: PreviewPanelSide): ReadonlyArray<PreviewRow> {
  return PREVIEW_DIFF_LINES.map((line, index) => ({
    content: side === "before" ? line.oldContent : line.newContent,
    kind: resolvePreviewRowKind(side, line),
    lineNumber: index + 1,
  }));
}

function createPreviewRowClassName(kind: PreviewRowKind): string {
  return `code-style-preview-row code-style-preview-row-${kind}`;
}

function PreviewPanel(props: {
  readonly side: PreviewPanelSide;
}): JSX.Element {
  const previewRows = createPreviewRows(props.side);
  return (
    <div
      className="code-style-preview-panel"
      data-preview-side={props.side}
      data-surface={props.side === "before" ? "primary" : "elevated"}
    >
      {previewRows.map((row) => (
        <div
          key={`${props.side}:${row.lineNumber}`}
          className={createPreviewRowClassName(row.kind)}
        >
          <span className="code-style-preview-line-number">{row.lineNumber}</span>
          <code
            className="code-style-preview-code"
            dangerouslySetInnerHTML={{
              __html: highlightCodeLine(row.content, "themePreview.ts"),
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function CodeStylePreview(
  props: CodeStylePreviewProps,
): JSX.Element {
  return (
    <div
      className="code-style-preview"
      data-code-style={getCodeStyleTheme(props.codeStyle).slug}
    >
      <div className="code-style-preview-window">
        <PreviewPanel side="before" />
        <div className="code-style-preview-divider" />
        <PreviewPanel side="after" />
      </div>
    </div>
  );
}
