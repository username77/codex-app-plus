import { useMemo, useState } from "react";
import { OfficialArrowTopRightIcon, OfficialWorktreeIcon } from "./officialIcons";

export type PermissionLevel = "default" | "full";

interface PermissionOption {
  readonly key: PermissionLevel;
  readonly label: string;
  readonly icon: string;
}

const PERMISSION_OPTIONS: ReadonlyArray<PermissionOption> = [
  { key: "default", label: "默认权限", icon: "☺" },
  { key: "full", label: "完全访问权限", icon: "!" }
];

export const PRIMARY_BRANCH_NAME = "main";

const DEFAULT_UNCOMMITTED_FILES = 6;
const DEFAULT_UNCOMMITTED_ADDITIONS = 105;
const DEFAULT_UNCOMMITTED_DELETIONS = 22;

export interface BranchSummary {
  readonly name: string;
  readonly uncommittedFiles: number;
  readonly additions: number;
  readonly deletions: number;
}

export const DEFAULT_BRANCHES: ReadonlyArray<BranchSummary> = [
  {
    name: PRIMARY_BRANCH_NAME,
    uncommittedFiles: DEFAULT_UNCOMMITTED_FILES,
    additions: DEFAULT_UNCOMMITTED_ADDITIONS,
    deletions: DEFAULT_UNCOMMITTED_DELETIONS
  }
];

export function permissionLabel(level: PermissionLevel): string {
  return level === "full" ? "完全访问权限" : "默认权限";
}

function filterBranches(branches: ReadonlyArray<BranchSummary>, query: string): ReadonlyArray<BranchSummary> {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return branches;
  }
  return branches.filter((branch) => branch.name.toLowerCase().includes(normalizedQuery));
}

function BranchSearchBar(props: { readonly query: string; readonly onChange: (value: string) => void }): JSX.Element {
  return (
    <div className="branch-search">
      <span className="branch-search-icon" aria-hidden="true">
        ⌕
      </span>
      <input
        className="branch-search-input"
        value={props.query}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="搜索分支"
        aria-label="搜索分支"
      />
    </div>
  );
}

function BranchUncommittedSummary({ branch }: { readonly branch: BranchSummary }): JSX.Element {
  return (
    <span className="branch-item-sub">
      未提交的更改：{branch.uncommittedFiles} 个文件{" "}
      <span className="branch-add">+{branch.additions}</span>{" "}
      <span className="branch-del">-{branch.deletions}</span>
    </span>
  );
}

function BranchListItem(props: {
  readonly branch: BranchSummary;
  readonly selected: boolean;
  readonly onSelect: (name: string) => void;
}): JSX.Element {
  const { branch, selected, onSelect } = props;
  return (
    <button
      type="button"
      className="branch-item"
      role="menuitem"
      onClick={() => onSelect(branch.name)}
    >
      <span className="branch-item-top">
        <OfficialWorktreeIcon className="branch-icon" />
        <span className="branch-name">{branch.name}</span>
        {selected ? (
          <span className="branch-check" aria-hidden="true">
            ✓
          </span>
        ) : null}
      </span>
      <BranchUncommittedSummary branch={branch} />
    </button>
  );
}

export function WorkspacePopover(props: { readonly onClose: () => void }): JSX.Element {
  return (
    <div className="composer-footer-popover" role="menu" aria-label="使用位置">
      <div className="composer-footer-popover-title">继续使用</div>
      <button
        type="button"
        className="composer-footer-popover-item"
        role="menuitem"
        onClick={props.onClose}
      >
        <span className="popover-item-left">
          <span className="popover-item-icon" aria-hidden="true">
            ▭
          </span>
          本地项目
        </span>
        <span className="popover-item-right popover-check" aria-hidden="true">
          ✓
        </span>
      </button>
      <button
        type="button"
        className="composer-footer-popover-item"
        role="menuitem"
        onClick={props.onClose}
      >
        <span className="popover-item-left">
          <span className="popover-item-icon" aria-hidden="true">
            ☺
          </span>
          关联 Codex web
        </span>
        <OfficialArrowTopRightIcon className="popover-item-right popover-external" />
      </button>
      <button
        type="button"
        className="composer-footer-popover-item composer-footer-popover-item-disabled"
        role="menuitem"
        disabled
      >
        <span className="popover-item-left">
          <span className="popover-item-icon" aria-hidden="true">
            ☁
          </span>
          发送至云端
        </span>
      </button>
    </div>
  );
}

export function PermissionsPopover(props: {
  readonly selected: PermissionLevel;
  readonly onSelect: (level: PermissionLevel) => void;
}): JSX.Element {
  const { selected, onSelect } = props;
  return (
    <div className="composer-footer-popover composer-footer-popover-sm" role="menu" aria-label="权限级别">
      {PERMISSION_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          className="composer-footer-popover-item"
          role="menuitem"
          onClick={() => onSelect(option.key)}
        >
          <span className="popover-item-left">
            <span className="popover-item-icon" aria-hidden="true">
              {option.icon}
            </span>
            {option.label}
          </span>
          {option.key === selected ? (
            <span className="popover-item-right popover-check" aria-hidden="true">
              ✓
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function BranchPopover(props: {
  readonly branches: ReadonlyArray<BranchSummary>;
  readonly selected: string;
  readonly onSelect: (name: string) => void;
  readonly onCreateBranch: () => void;
}): JSX.Element {
  const { branches, selected, onSelect, onCreateBranch } = props;
  const [query, setQuery] = useState("");
  const visibleBranches = useMemo(() => filterBranches(branches, query), [branches, query]);

  return (
    <div className="composer-footer-popover composer-branch-popover composer-footer-popover-right" role="menu" aria-label="分支">
      <BranchSearchBar query={query} onChange={setQuery} />
      <div className="branch-section-title">分支</div>
      <div className="branch-list">
        {visibleBranches.map((branch) => (
          <BranchListItem key={branch.name} branch={branch} selected={branch.name === selected} onSelect={onSelect} />
        ))}
      </div>
      <div className="branch-divider" />
      <button type="button" className="branch-create" role="menuitem" onClick={onCreateBranch}>
        <span className="branch-create-plus" aria-hidden="true">
          +
        </span>
        创建并检出新分支...
      </button>
    </div>
  );
}

