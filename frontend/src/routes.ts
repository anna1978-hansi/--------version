import { useNavigate } from "react-router-dom";

export type PrimaryRouteKey = "home" | "detail" | "memo";

export const routePaths = {
  home: "/",
  detail: "/detail",
  workspace: "/workspace",
  memo: "/memo",
} as const;

export const primaryRouteItems: Array<{
  key: PrimaryRouteKey;
  label: string;
  description: string;
  path: string;
}> = [
  {
    key: "home",
    label: "首页",
    description: "岗位流程",
    path: routePaths.home,
  },
  {
    key: "detail",
    label: "详情页",
    description: "面试记录",
    path: routePaths.detail,
  },
  {
    key: "memo",
    label: "Memo",
    description: "任务备忘",
    path: routePaths.memo,
  },
];

function encodeSegment(value: string) {
  return encodeURIComponent(value);
}

function isRoutePrefix(pathname: string, routePath: string) {
  return pathname === routePath || pathname.startsWith(`${routePath}/`);
}

export function getPrimaryRouteKey(pathname: string): PrimaryRouteKey {
  if (isRoutePrefix(pathname, routePaths.memo)) {
    return "memo";
  }

  if (
    isRoutePrefix(pathname, routePaths.detail) ||
    isRoutePrefix(pathname, routePaths.workspace)
  ) {
    return "detail";
  }

  return "home";
}

export function getDetailPath() {
  return routePaths.detail;
}

export function getWorkspacePath(sessionKey?: string) {
  return sessionKey ? `${routePaths.workspace}/${encodeSegment(sessionKey)}` : routePaths.detail;
}

export function useAppNavigate() {
  const navigate = useNavigate();

  return {
    openHome() {
      navigate(routePaths.home);
    },
    openDetail() {
      navigate(getDetailPath());
    },
    openWorkspace(sessionKey?: string) {
      navigate(getWorkspacePath(sessionKey));
    },
    openMemo() {
      navigate(routePaths.memo);
    },
  };
}
