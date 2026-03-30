import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { routePaths } from "./routes";

export default function App() {
  const location = useLocation();
  const isMemoRoute = location.pathname === routePaths.memo;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.toggle("memo-theme", isMemoRoute);

    return () => {
      document.body.classList.remove("memo-theme");
    };
  }, [isMemoRoute]);

  return (
    <div className={`app-shell${isMemoRoute ? " app-shell--memo" : ""}`}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <Outlet />
    </div>
  );
}
