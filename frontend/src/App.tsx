import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPrimaryRouteKey, primaryRouteItems } from "./routes";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePrimaryRoute = getPrimaryRouteKey(location.pathname);
  const isMemoRoute = activePrimaryRoute === "memo";

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

      <nav aria-label="一级导航" className="primary-tabs glass-card">
        {primaryRouteItems.map((item) => (
          <button
            aria-current={activePrimaryRoute === item.key ? "page" : undefined}
            className={`primary-tab${activePrimaryRoute === item.key ? " is-active" : ""}`}
            key={item.key}
            type="button"
            onClick={() => navigate(item.path)}
          >
            <span className="primary-tab__label">{item.label}</span>
            <span className="primary-tab__description">{item.description}</span>
          </button>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
