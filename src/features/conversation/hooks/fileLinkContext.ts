import { createContext, useContext } from "react";
import type { ParsedFileLocation } from "../../../utils/fileLinks";

export interface FileLinkActions {
  readonly openFileLink: (target: ParsedFileLocation) => void;
  readonly openExternalLink: (url: string) => void;
  readonly workspacePath: string | null;
}

const FileLinkContext = createContext<FileLinkActions | null>(null);

export const FileLinkProvider = FileLinkContext.Provider;

export function useFileLinkActions(): FileLinkActions | null {
  return useContext(FileLinkContext);
}
