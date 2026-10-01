import "./EventStage.css";

/** Reuses the introduction's spacious title + illuminated event board composition. */
export default function EventStage({ kicker, title, description, action, children }) {
    return (
        <header className="hx-event-stage">
            <div className="hx-event-stage-copy">
                <p className="hx-overline">{kicker}</p>
                <h1>{title}</h1>
                <p className="hx-event-stage-description">{description}</p>
                {action && <div className="hx-event-stage-action">{action}</div>}
            </div>
            <div className="hx-event-stage-panel">{children}</div>
        </header>
    );
}
