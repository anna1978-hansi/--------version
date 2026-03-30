import { useNavigate } from "react-router-dom";

export const routePaths = {
  home: "/",
  detail: "/detail",
  workspace: "/workspace",
  memo: "/memo",
} as const;

function encodeSegment(value: string) {
  return encodeURIComponent(value);
}

export function getDetailPath(sessionKey?: string) {
  return sessionKey ? `${routePaths.detail}/${encodeSegment(sessionKey)}` : routePaths.detail;
}

export function getWorkspacePath(sessionKey?: string) {
  return sessionKey ? `${routePaths.workspace}/${encodeSegment(sessionKey)}` : routePaths.workspace;
}

export function useAppNavigate() {
  const navigate = useNavigate();

  return {
    openHome() {
      navigate(routePaths.home);
    },
    openDetail(sessionKey?: string) {
      navigate(getDetailPath(sessionKey));
    },
    openWorkspace(sessionKey?: string) {
      navigate(getWorkspacePath(sessionKey));
    },
    openMemo() {
      navigate(routePaths.memo);
    },
  };
}
