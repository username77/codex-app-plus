export function GitPushIcon(props: { readonly className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.3 14.7h8.85c1.58 0 2.85-1.23 2.85-2.72 0-1.42-1.17-2.61-2.66-2.71A4.52 4.52 0 0 0 5.88 7.6 3.18 3.18 0 0 0 3 10.76c0 2.17 1.56 3.94 3.5 3.94Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 12.2V6.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="m7.95 8.6 2.05-2.05L12.05 8.6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GitPullIcon(props: { readonly className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5.3 5.3h8.85c1.58 0 2.85 1.23 2.85 2.72 0 1.42-1.17 2.61-2.66 2.71A4.52 4.52 0 0 1 5.88 12.4 3.18 3.18 0 0 1 3 9.24c0-2.17 1.56-3.94 3.5-3.94Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 7.8v5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="m12.05 11.4-2.05 2.05L7.95 11.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GitRefreshIcon(props: { readonly className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M15.5 7.9A5.5 5.5 0 1 0 16 10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M12.9 5.8h3v3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GitBranchIcon(props: { readonly className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="6" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="6" cy="14.5" r="1.8" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="14.1" cy="10" r="1.8" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 7.3v5.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M7.8 5.5h2.9a3.4 3.4 0 0 1 3.4 3.4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
