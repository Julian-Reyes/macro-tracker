const TAB_CONFIG = [
  {
    id: "capture",
    label: "Scan",
    icon: (color) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  {
    id: "daily",
    label: "Log",
    icon: (color) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    id: "weekly",
    label: "Stats",
    icon: (color) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Goals",
    icon: (color) => (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

export default function BottomTabBar({ view, dailyLogCount, onTabChange }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        background: "#0C0C0E",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingTop: "8px",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const isActive =
          tab.id === view ||
          (tab.id === "capture" && (view === "result" || view === "manual"));
        const color = isActive ? "#E8C872" : "rgba(255,255,255,0.45)";
        const label =
          tab.id === "daily" && dailyLogCount > 0
            ? `Log (${dailyLogCount})`
            : tab.label;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: 0,
              minHeight: "44px",
              background: "none",
              border: "none",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {tab.icon(color)}
            <span
              style={{
                fontSize: "10px",
                fontWeight: isActive ? 600 : 400,
                fontFamily: "'DM Sans',sans-serif",
                color,
                letterSpacing: "0.2px",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
