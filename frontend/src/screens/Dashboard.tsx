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
      setLogs(fetchedLogs);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
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
        logs.map((log, index) => (
          <div
            key={log.id}
            style={{
              marginBottom: "1rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid #52525b",
            }}
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
        ))
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
/*                      Workflow Heading Banner (Optional)                  */
/* -------------------------------------------------------------------------- */
const WorkflowHeadingBanner = styled.div`
  background-color: rgba(127, 86, 217, 0.15);
  border: 1px solid rgba(127, 86, 217, 0.5);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  font-size: 1.1rem;
  text-align: center;
`;

/* -------------------------------------------------------------------------- */
/*                    New Vertical Timeline (Without Line)                  */
/* -------------------------------------------------------------------------- */

// Container for timeline items
const VerticalTimelineContainer = styled.div`
  position: relative;
  margin: 2rem 0;
`;

// Each timeline item is a flex row with a circle on the left and content on the right.
const TimelineItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 2.5rem;
`;

// The animated circle for each item
const TimelineDot = styled.div<{ status: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
  font-weight: bold;
  color: #000;

  background-color: ${({ status }) => {
    switch (status) {
      case "success":
        return "#28a745";
      case "inProgress":
        return "#ffa500";
      case "failure":
        return "#dc3545";
      default:
        return "#777";
    }
  }};

  animation: ${({ status }) => {
    switch (status) {
      case "success":
        return css`
          ${glow} 2s infinite
        `;
      case "inProgress":
        return css`
          ${pulseRing} 2s infinite
        `;
      case "failure":
        return css`
          ${flicker} 0.7s infinite
        `;
      default:
        return "none";
    }
  }};

  &:hover {
    transform: scale(1.15);
  }
`;

// The content card for each timeline item
const TimelineContent = styled.div`
  background-color: #1a1a1a;
  border: 1px solid rgba(127, 86, 217, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-left: 1rem;
  flex: 1;
`;

const TimelineTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: bold;
`;

const TimelineDetail = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #ccc;
`;

/* -------------------------------------------------------------------------- */
/*                      Dummy Workflow Data                                 */
/* -------------------------------------------------------------------------- */
const dummyWorkflows = [
  {
    id: "KPD-136",
    title: "Add text block with background",
    detail: "CI #227: Pull request #236 by fsylum",
    status: "success",
  },
  {
    id: "KAP-23",
    title: "Initial code for the hero full width block",
    detail: "CI #242 ready_for_review by ridimova",
    status: "inProgress",
  },
  {
    id: "KPD-141",
    title: "Main navigation",
    detail: "CI #225 synchronize by joleenk",
    status: "failure",
  },
  {
    id: "AG-999",
    title: "Additional agent check",
    detail: "Not started or waiting for resources",
    status: "pending",
  },
];

/* -------------------------------------------------------------------------- */
/*                        WorkflowTimeline Component                          */
/* -------------------------------------------------------------------------- */
const WorkflowTimeline: React.FC = () => {
  return (
    <>
      <WorkflowHeadingBanner>
        This workflow has a <strong>workflow_dispatch</strong> event trigger
      </WorkflowHeadingBanner>
      <VerticalTimelineContainer>
        {dummyWorkflows.map((wf, index) => (
          <TimelineItem key={index}>
            <TimelineDot
              status={wf.status}
              title={`${wf.id} - ${wf.title}\n${wf.detail}`}
            >
              {index + 1}
            </TimelineDot>
            <TimelineContent>
              <TimelineTitle>{`${wf.id} - ${wf.title}`}</TimelineTitle>
              <TimelineDetail>{wf.detail}</TimelineDetail>
            </TimelineContent>
          </TimelineItem>
        ))}
      </VerticalTimelineContainer>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*                          Content Panel & InfoPanel                         */
/* -------------------------------------------------------------------------- */
const panelFadeIn = keyframes`
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const ContentPanel = styled.div`
  background-color: #1a1a1a;
  border: 1px solid rgba(127, 86, 217, 0.3);
  border-radius: 8px;
  padding: 1.5rem;
  animation: ${panelFadeIn} 0.3s ease-out;
`;

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
  const [activePanel, setActivePanel] = useState<
    "workflow" | "line" | "pie" | "area" | null
  >(null);
  const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const navigate = useNavigate();

  return (
    <DashboardContainer>
      <Sidebar expanded={isSidebarExpanded}>
        <Branding expanded={isSidebarExpanded}>
          <img src="logo.svg" alt="Logo" />
          <span>Iris</span>
        </Branding>
        <IconsWrapper>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => setActivePanel("workflow")}
          >
            <BarChart size={30} />
            {isSidebarExpanded && <IconLabel>Logs</IconLabel>}
          </IconItem>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => setActivePanel("line")}
          >
            <LineChart size={30} />
            {isSidebarExpanded && <IconLabel>Line Chart</IconLabel>}
          </IconItem>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => setActivePanel("pie")}
          >
            <PieChart size={30} />
            {isSidebarExpanded && <IconLabel>Pie Chart</IconLabel>}
          </IconItem>
          <IconItem
            expanded={isSidebarExpanded}
            onClick={() => setActivePanel("area")}
          >
            <AreaChart size={30} />
            {isSidebarExpanded && <IconLabel>Area Chart</IconLabel>}
          </IconItem>
        </IconsWrapper>
        <ExitButton expanded={isSidebarExpanded} onClick={() => navigate("/")}>
          <LogOut size={20} />
          <span>Exit</span>
        </ExitButton>
        <ToggleContainer
          expanded={isSidebarExpanded}
          onClick={() => setSidebarExpanded((prev) => !prev)}
        >
          {isSidebarExpanded ? (
            <ChevronLeft size={20} />
          ) : (
            <ChevronRight size={20} />
          )}
        </ToggleContainer>
      </Sidebar>
      <ContentArea expanded={isSidebarExpanded}>
        {activePanel === "workflow" && <FirebaseLogs />}
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
