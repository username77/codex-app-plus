import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function WorkspaceMoreIcon(props: IconProps): JSX.Element {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <circle cx="5" cy="10" r="1.2" fill="currentColor" />
      <circle cx="10" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function WorkspaceNewThreadIcon(props: IconProps): JSX.Element {
  return (
    <svg width={20} height={20} viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" {...props}>
      <path d="M729.4208 528.3712c-13.44 0-24.96 10.88-24.96 24.96v239.36h-472.96v-472.96h258.56c13.44 0 24.96-10.88 24.96-24.96s-10.88-24.96-24.96-24.96h-258.56c-27.52 0-49.28 22.4-49.28 49.28v472.96c0 27.52 22.4 49.28 49.28 49.28h472.96c27.52 0 49.28-22.4 49.28-49.28v-236.8-2.56c0.64-13.44-10.88-24.32-24.32-24.32z" fill="currentColor" />
      <path d="M827.3408 251.2512l-54.4-54.4c-19.2-19.2-50.56-19.2-70.4 0l-272.64 272.64c-1.92 1.92-3.84 4.48-4.48 7.04l-69.12 161.92c-3.84 8.96-1.28 17.92 4.48 24.32s15.36 8.32 24.32 4.48l161.92-68.48c2.56-1.28 5.12-2.56 7.04-4.48l273.28-273.28c19.2-19.2 19.2-50.56 0-69.76z m-304.64 304l-94.72 40.32 40.32-94.72 191.36-191.36 54.4 54.4-191.36 191.36z m269.44-269.44l-42.88 42.88-54.4-54.4 42.88-42.88 54.4 54.4z" fill="currentColor" />
    </svg>
  );
}
