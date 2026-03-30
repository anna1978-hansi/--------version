type StatePanelProps = {
  badge: string;
  title: string;
  description: string;
  compact?: boolean;
};

export function StatePanel({
  badge,
  title,
  description,
  compact = false,
}: StatePanelProps) {
  return (
    <div className={`state-panel${compact ? " state-panel--compact" : ""}`}>
      <span className="badge">{badge}</span>
      {!compact ? <h2 className="serif-title">{title}</h2> : null}
      <p>{description}</p>
    </div>
  );
}
