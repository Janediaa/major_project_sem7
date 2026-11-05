// Diagram of the planned multi-agent architecture. Only the RAG agent has a backend today.

const NODES = [
  { id: 'rag', label: 'Medical Knowledge', x: 230, y: 50, live: true },
  { id: 'doctor', label: 'Doctor', x: 378, y: 118, live: true },
  { id: 'hospital', label: 'Hospital', x: 378, y: 242, live: true },
  { id: 'insurance', label: 'Insurance', x: 230, y: 310, live: true },
  { id: 'triage', label: 'Triage', x: 82, y: 242, live: true },
  { id: 'appointment', label: 'Appointment', x: 82, y: 118, live: true },
];

const HUB = { x: 230, y: 180 };

export default function AgentMap() {
  return (
    <figure className="agent-map">
      <svg viewBox="0 0 460 360" role="img" aria-label="Orchestrator connected to six agents. Only the Medical Knowledge agent has a backend today.">
        {NODES.map((n) => (
          <line
            key={n.id}
            x1={HUB.x}
            y1={HUB.y}
            x2={n.x}
            y2={n.y}
            className={n.live ? 'agent-map__link agent-map__link--live' : 'agent-map__link'}
          />
        ))}
        <circle cx={HUB.x} cy={HUB.y} r="48" className="agent-map__hub" />
        <text x={HUB.x} y={HUB.y - 2} textAnchor="middle" className="agent-map__hub-title">Orchestrator</text>
        <text x={HUB.x} y={HUB.y + 14} textAnchor="middle" className="agent-map__hub-sub">planned</text>

        {NODES.map((n) => (
          <g key={n.id}>
            {n.live && <rect x={n.x - 68} y={n.y - 24} width="136" height="48" rx="16" className="agent-map__pulse" />}
            <rect
              x={n.x - 62}
              y={n.y - 19}
              width="124"
              height="38"
              rx="13"
              className={n.live ? 'agent-map__node agent-map__node--live' : 'agent-map__node'}
            />
            <text x={n.x} y={n.y + 4} textAnchor="middle" className={n.live ? 'agent-map__label agent-map__label--live' : 'agent-map__label'}>
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      
    </figure>
  );
}
