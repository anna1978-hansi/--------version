import type { DashboardSessionCard } from "../dashboardData";

type StageTrailProps = {
  session: DashboardSessionCard;
};

export function StageTrail({ session }: StageTrailProps) {
  return (
    <div className="stage-list">
      {session.stageTrail.map((stage, index) => (
        <span
          className={[
            "stage-pill",
            index < session.currentStage ? "is-complete" : "",
            index === session.currentStage ? "is-current" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={`${session.sessionKey}-${stage}`}
        >
          {stage}
        </span>
      ))}
    </div>
  );
}
