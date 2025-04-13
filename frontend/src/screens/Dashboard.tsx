import React, { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import {
  BarChart,
  LineChart,
  PieChart,
  AreaChart,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

/* -------------------------------------------------------------------------- */
/*                              Keyframe Animations                           */
/* -------------------------------------------------------------------------- */

// Glow effect for success
const glow = keyframes`
  0% { box-shadow: 0 0 6px rgba(40, 167, 69, 0.4); }
  50% { box-shadow: 0 0 16px rgba(40, 167, 69, 0.8); }
  100% { box-shadow: 0 0 6px rgba(40, 167, 69, 0.4); }
`;

// Pulsing ring for inProgress
const pulseRing = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255,165,0, 0.6); }
  50% { box-shadow: 0 0 0 10px rgba(255,165,0, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255,165,0, 0); }
`;

// Slight shake for failure
const flicker = keyframes`
  0% { transform: translateX(0); }
  10% { transform: translateX(-1px); }
  20% { transform: translateX(1px); }
  30% { transform: translateX(-1px); }
  40% { transform: translateX(1px); }
  50% { transform: translateX(-1px); }
  60% { transform: translateX(1px); }
  70% { transform: translateX(-1px); }
  80% { transform: translateX(1px); }
  90% { transform: translateX(-1px); }
  100% { transform: translateX(0); }
`;

/* -------------------------------------------------------------------------- */
/*                              Dashboard Styles                              */
/* -------------------------------------------------------------------------- */

const DashboardContainer = styled.div`
  display: flex;
  width: 100vw;
  min-height: 100vh;
  background-color: #0f0f0f;
  background-image: radial-gradient(circle, #1a1a1a 1px, transparent 1px);
  background-size: 20px 20px;
`;

/* -------------------------------------------------------------------------- */
/*                            Sidebar Components                            */
/* -------------------------------------------------------------------------- */
interface SidebarProps {
  expanded: boolean;
}

const Sidebar = styled.div<SidebarProps>`
  width: ${(props) => (props.expanded ? "240px" : "80px")};
  background: rgba(25, 25, 25, 0.95);
  backdrop-filter: blur(12px);
  border-right: 1px solid rgba(127, 86, 217, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  transition: width 0.3s ease;
`;

const Branding = styled.div<SidebarProps>`
  display: flex;
  align-self: center;
  justify-content: center;
  width: 100%;
  margin-bottom: 2rem;

  img {
    width: 40px;
    height: 40px;
  }

  span {
    margin-left: ${(props) => (props.expanded ? "0.5rem" : "0")};
    margin-top: ${(props) => (props.expanded ? "0.2rem" : "0")};
    font-size: 1.5rem;
    font-weight: 600;
    white-space: nowrap;
    display: ${(props) => (props.expanded ? "block" : "none")};
    line-height: 40px;
  }
  font-family: "kugile", sans-serif;
`;

const IconsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
  align-items: center;
`;

const IconItem = styled.div<SidebarProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(127, 86, 217, 0.15);
  }

  svg {
    stroke: #fff;
    transition: stroke 0.2s ease;
  }
`;

const IconLabel = styled.span`
  margin-left: 0.5rem;
  font-size: 1rem;
  white-space: nowrap;
`;

const ExitButton = styled.button<SidebarProps>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => (props.expanded ? "100%" : "40px")};
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem;
  margin-top: 2rem;
  transition: all 0.2s ease;

  &:hover {
    color: #a288f4;
  }

  span {
    margin-left: 0.5rem;
    white-space: nowrap;
    display: ${(props) => (props.expanded ? "inline" : "none")};
  }
`;

const ToggleContainer = styled.div<SidebarProps>`
  margin-top: auto;
  width: 100%;
  display: flex;
  justify-content: center;
  cursor: pointer;
  padding: 0.5rem;
`;

/* -------------------------------------------------------------------------- */
/*                   FirebaseLogs Component (Logs Panel)                    */
/* -------------------------------------------------------------------------- */
const ContentPanel = styled.div`
  background-color: #1a1a1a;
  border: 1px solid rgba(127, 86, 217, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  animation: ${keyframes`
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
  `} 0.3s ease-out;
`;

const FirebaseLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch logs in realtime from the Firestore "logs" collection
  useEffect(() => {
    const logsCollection = collection(db, "logs");
    const unsubscribe = onSnapshot(logsCollection, (snapshot) => {
      const fetchedLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("[FirebaseLogs] Fetched logs:", fetchedLogs); // Log the data
      setLogs(fetchedLogs);
      setLoading(false);
    });

    return () => {
      console.log("[FirebaseLogs] Unsubscribing from Firestore snapshot.");
      unsubscribe();
    };
  }, []);

  if (loading) {
    console.log("[FirebaseLogs] Loading logs...");
    return (
      <ContentPanel>
        <h2>Loading Logs...</h2>
      </ContentPanel>
    );
  }

  return (
    <ContentPanel>
      <h2>Firebase Logs</h2>
      {logs.length === 0 ? (
        <p>No logs available.</p>
      ) : (
        logs.map((log, index) => {
          // Log each log item when rendering
          console.log(`[FirebaseLogs] Render log ${index + 1}:`, log);
          return (
            <div
              key={log.id}
              style={{
                marginBottom: "1rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid #52525b",
              }}
              onClick={() => console.log("[FirebaseLogs] Clicked log:", log)}
            >
              <h3 style={{ margin: "0 0 0.3rem 0" }}>
                {log.title || `Log ${index + 1}`}
              </h3>
              <p style={{ margin: "0 0 0.3rem 0" }}>
                {log.message || "No message provided."}
              </p>
              {log.timestamp && (
                <small style={{ color: "#ccc" }}>
                  {new Date(log.timestamp).toLocaleString()}
                </small>
              )}
            </div>
          );
        })
      )}
    </ContentPanel>
  );
};

/* -------------------------------------------------------------------------- */
/*                           Main Content Area                                */
/* -------------------------------------------------------------------------- */
interface ContentAreaProps {
  expanded: boolean;
}

const ContentArea = styled.div<ContentAreaProps>`
  margin-left: ${(props) => (props.expanded ? "260px" : "100px")};
  padding: 2rem;
  flex-grow: 1;
  color: #fff;
  transition: margin-left 0.3s ease;
`;

/* -------------------------------------------------------------------------- */
/*                      InfoPanel for Other Sections                        */
/* -------------------------------------------------------------------------- */
const InfoPanel: React.FC<{ title: string; content: string }> = ({
  title,
  content,
}) => (
  <ContentPanel>
    <h2>{title}</h2>
    <p>{content}</p>
  </ContentPanel>
);

/* -------------------------------------------------------------------------- */
/*                           Main Dashboard Component                         */
/* -------------------------------------------------------------------------- */
const Dashboard: React.FC = () => {
  // activePanel values are now "logs", "line", "pie", or "area"
  const [activePanel, setActivePanel] = useState<
    "logs" | "line" | "pie" | "area" | null
  >(null);
  const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const navigate = useNavigate();

  const handlePanelChange = (panel: "logs" | "line" | "pie" | "area") => {
    console.log(`[Dashboard] Changing active panel to: ${panel}`);
    setActivePanel(panel);
  };

  const handleToggleSidebar = () => {
    setSidebarExpanded((prev) => {
      const newState = !prev;
      console.log(`[Dashboard] Sidebar expanded state: ${newState}`);
      return newState;
    });
  };

  return (
    <DashboardContainer>
      <Sidebar expanded={isSidebarExpanded}>
        <Branding expanded={isSidebarExpanded}>
          <img src="logo.svg" alt="Logo" />
          <span>Iris</span>
        </Branding>
        <IconsWrapper>
          {/* First Icon: Firebase Logs */}
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => handlePanelChange("logs")}
          >
            <BarChart size={30} />
            {isSidebarExpanded && <IconLabel>Logs</IconLabel>}
          </IconItem>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => handlePanelChange("line")}
          >
            <LineChart size={30} />
            {isSidebarExpanded && <IconLabel>Line Chart</IconLabel>}
          </IconItem>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => handlePanelChange("pie")}
          >
            <PieChart size={30} />
            {isSidebarExpanded && <IconLabel>Pie Chart</IconLabel>}
          </IconItem>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => handlePanelChange("area")}
          >
            <AreaChart size={30} />
            {isSidebarExpanded && <IconLabel>Area Chart</IconLabel>}
          </IconItem>
        </IconsWrapper>
        <ExitButton expanded={isSidebarExpanded} onClick={() => {
          console.log("[Dashboard] Exiting dashboard, navigating to root.");
          navigate("/");
        }}>
          <LogOut size={20} />
          <span>Exit</span>
        </ExitButton>
        <ToggleContainer expanded={isSidebarExpanded} onClick={handleToggleSidebar}>
          {isSidebarExpanded ? (
            <ChevronLeft size={20} />
          ) : (
            <ChevronRight size={20} />
          )}
        </ToggleContainer>
      </Sidebar>
      <ContentArea expanded={isSidebarExpanded}>
        {activePanel === "logs" && <FirebaseLogs />}
        {activePanel === "line" && (
          <InfoPanel
            title="Line Chart Details"
            content="This section provides details and settings for the Line Chart."
          />
        )}
        {activePanel === "pie" && (
          <InfoPanel
            title="Pie Chart Details"
            content="This section provides details and settings for the Pie Chart."
          />
        )}
        {activePanel === "area" && (
          <InfoPanel
            title="Area Chart Details"
            content="This section provides details and settings for the Area Chart."
          />
        )}
      </ContentArea>
    </DashboardContainer>
  );
};

export default Dashboard;