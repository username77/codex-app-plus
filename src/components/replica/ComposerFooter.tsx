import { useState } from "react";
import { OfficialAlertCircleIcon, OfficialChevronRightIcon, OfficialWorktreeIcon } from "./officialIcons";
import {
  BranchPopover,
  DEFAULT_BRANCHES,
  type BranchSummary,
  permissionLabel,
  PermissionsPopover,
  type PermissionLevel,
  PRIMARY_BRANCH_NAME,
  WorkspacePopover
} from "./ComposerFooterPopovers";

type FooterPopover = "workspace" | "permissions" | "branch" | null;

function PopoverBackdrop(props: { readonly onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      className="composer-popover-backdrop"
      onClick={props.onClick}
      aria-label="关闭菜单"
    />
  );
}

function WorkspaceFooterButton(props: {
  readonly active: boolean;
  readonly onToggle: () => void;
  readonly onClose: () => void;
}): JSX.Element {
  return (
    <div className="composer-footer-anchor">
      {props.active ? <WorkspacePopover onClose={props.onClose} /> : null}
      <button
        type="button"
        className={props.active ? "composer-footer-item composer-footer-item-active" : "composer-footer-item"}
        onClick={props.onToggle}
        aria-haspopup="menu"
        aria-expanded={props.active}
      >
        <span className="footer-icon" aria-hidden="true">
          ⌂
        </span>
        本地 <OfficialChevronRightIcon className="footer-caret" />
      </button>
    </div>
  );
}

function PermissionsFooterButton(props: {
  readonly active: boolean;
  readonly selected: PermissionLevel;
  readonly onToggle: () => void;
  readonly onSelect: (level: PermissionLevel) => void;
}): JSX.Element {
  const baseClassName = props.selected === "full" ? "composer-footer-item footer-warning" : "composer-footer-item";
  const className = props.active ? `${baseClassName} composer-footer-item-active` : baseClassName;

  return (
    <div className="composer-footer-anchor">
      {props.active ? <PermissionsPopover selected={props.selected} onSelect={props.onSelect} /> : null}
      <button
        type="button"
        className={className}
        onClick={props.onToggle}
        aria-haspopup="menu"
        aria-expanded={props.active}
      >
        <OfficialAlertCircleIcon className="footer-alert-icon" />
        {permissionLabel(props.selected)} <OfficialChevronRightIcon className="footer-caret" />
      </button>
    </div>
  );
}

function BranchFooterButton(props: {
  readonly active: boolean;
  readonly branches: ReadonlyArray<BranchSummary>;
  readonly selectedBranch: string;
  readonly onToggle: () => void;
  readonly onSelect: (name: string) => void;
  readonly onCreate: () => void;
}): JSX.Element {
  return (
    <div className="composer-footer-anchor composer-footer-anchor-right">
      {props.active ? (
        <BranchPopover
          branches={props.branches}
          selected={props.selectedBranch}
          onSelect={props.onSelect}
          onCreateBranch={props.onCreate}
        />
      ) : null}
      <button
        type="button"
        className={props.active ? "composer-footer-item composer-footer-item-active" : "composer-footer-item"}
        onClick={props.onToggle}
        aria-haspopup="menu"
        aria-expanded={props.active}
      >
        <OfficialWorktreeIcon className="footer-branch-icon" />
        {props.selectedBranch} <OfficialChevronRightIcon className="footer-caret" />
      </button>
    </div>
  );
}

export function ComposerFooter(): JSX.Element {
  const [openPopover, setOpenPopover] = useState<FooterPopover>(null);
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("full");
  const [selectedBranch, setSelectedBranch] = useState(PRIMARY_BRANCH_NAME);

  const closePopover = () => setOpenPopover(null);
  const togglePopover = (target: Exclude<FooterPopover, null>) =>
    setOpenPopover((current) => (current === target ? null : target));

  const onSelectPermission = (level: PermissionLevel) => {
    setPermissionLevel(level);
    closePopover();
  };

  const onSelectBranch = (name: string) => {
    setSelectedBranch(name);
    closePopover();
  };

  return (
    <div className="composer-footer">
      {openPopover ? <PopoverBackdrop onClick={closePopover} /> : null}
      <div className="composer-footer-left">
        <WorkspaceFooterButton active={openPopover === "workspace"} onToggle={() => togglePopover("workspace")} onClose={closePopover} />
        <PermissionsFooterButton active={openPopover === "permissions"} selected={permissionLevel} onToggle={() => togglePopover("permissions")} onSelect={onSelectPermission} />
      </div>
      <BranchFooterButton
        active={openPopover === "branch"}
        branches={DEFAULT_BRANCHES}
        selectedBranch={selectedBranch}
        onToggle={() => togglePopover("branch")}
        onSelect={onSelectBranch}
        onCreate={closePopover}
      />
    </div>
  );
}
