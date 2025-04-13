import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { BarChart, List, ArrowLeft, Home, Plus, X } from "lucide-react";
import FocusGraph3D from "../components/FocusGraph3D";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig"; // Adjust the path as needed
import { data } from "react-router-dom";

// -------------------- ANIMATION & BACKGROUND EFFECTS -------------------- //

const fadeInUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(40px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const starryBackground = `
  radial-gradient(white 1px, transparent 1px),
  radial-gradient(white 1px, transparent 1px)
`;

const StarField = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;
  height: 200%;
  background-image: ${starryBackground};
  background-size: 40px 40px, 80px 80px;
  opacity: 0.2;
  animation: moveStars 60s linear infinite;
  pointer-events: none;

  @keyframes moveStars {
    from {
      transform: translate3d(0, 0, 0);
    }
    to {
      transform: translate3d(-50px, -50px, 0);
    }
  }
`;

// -------------------- PAGE & CONTAINER STYLES -------------------- //

const Container = styled.div`
  background-color: #18181b;
  min-height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// -------------------- FIXED HEADER WITH CONTROLS -------------------- //

const Header = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 12;
`;

const CenteredTitle = styled.h1`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  margin: 0;
  font-size: 1.5rem;
`;

const ControlButton = styled.button`
  background: rgba(25, 25, 25, 0.95);
  border: 1px solid rgba(127, 86, 217, 0.3);
  color: #fff;
  padding: 0.5rem 1rem;
  border-radius: 25px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.3s ease, transform 0.2s ease;

  &:hover {
    background: rgba(25, 25, 25, 1);
    transform: translateY(-2px);
  }
`;

// -------------------- AGENT LIST STYLES -------------------- //

const AgentListContainer = styled.div`
  width: 80%;
  margin-top: 140px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  padding-bottom: 2rem;
`;

const AgentCard = styled.div<{ isExpanded: boolean }>`
  background-color: #27272a;
  border-radius: 10px;
  border: 2px solid ${(props) => (props.isExpanded ? "#d8b4fe" : "transparent")};
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem 1.5rem 0 1.5rem;
  cursor: pointer;
  transition: transform 0.4s ease, box-shadow 0.3s ease, border 0.3s ease;
  position: relative;
  overflow: hidden;
  aspect-ratio: 1/1;

  &:hover {
    transform: ${(props) => (props.isExpanded ? "scale(1.05)" : "scale(1.03)")};
    border: 2px solid #d8b4fe;
  }

  transform: ${(props) => (props.isExpanded ? "scale(1.05)" : "scale(1)")};
`;

const CreateAgentCard = styled.div`
  background-color: #27272a;
  border-radius: 10px;
  border: 2px dotted rgba(127, 86, 217, 0.5);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  padding: 1.5rem 1.5rem 0 1.5rem;
  cursor: pointer;
  transition: transform 0.3s ease, box-shadow 0.3s ease, border 0.3s ease;
  aspect-ratio: 1/1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: scale(1.05);
    border: 2px dotted #d8b4fe;
  }
`;

const PlusIconContainer = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: rgba(127, 86, 217, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const CreateAgentText = styled.p`
  color: #d8b4fe;
  font-size: 1.1rem;
  margin: 0;
`;

const AgentTitle = styled.h3<{ isExpanded: boolean }>`
  font-size: 1.2rem;
  margin-bottom: 1rem;
  color: #d8b4fe;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: ${(props) => (props.isExpanded ? 0 : 1)};
  transform: translateY(${(props) => (props.isExpanded ? -20 : 0)}px);
  height: ${(props) => (props.isExpanded ? 0 : "auto")};
  margin: ${(props) => (props.isExpanded ? 0 : "0 0 1rem 0")};
  overflow: hidden;
`;

const AgentDescription = styled.p<{ isExpanded: boolean }>`
  font-size: 0.9rem;
  margin-bottom: 1rem;
  color: #fff;
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: ${(props) => (props.isExpanded ? 0 : 1)};
  transform: translateY(${(props) => (props.isExpanded ? -15 : 0)}px);
  height: ${(props) => (props.isExpanded ? 0 : "auto")};
  margin: ${(props) => (props.isExpanded ? 0 : "0 0 1rem 0")};
  overflow: hidden;
`;

const PerformanceMetrics = styled.div`
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 1rem;
`;

// Add the radar chart container styled component
const RadarChartContainer = styled.div<{ isExpanded: boolean }>`
  height: 180px;
  width: 180px; /* Ensure the radar chart has a fixed width */
  margin: 10px auto auto auto; /* Center the radar chart horizontally */
  opacity: ${(props) => (props.isExpanded ? 1 : 0)}; /* Fade in/out */
  transition: opacity 0.6s ease; /* Smooth fade transition */
  display: flex;
  align-items: center; /* Center vertically */
  justify-content: center; /* Center horizontally */
`;

const SparklineContainer = styled.div<{ isExpanded: boolean }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  width: 100%;
  opacity: ${(props) => (props.isExpanded ? 0 : 1)};
  transition: opacity 0.3s ease;
`;

// -------------------- DIALOG STYLES -------------------- //

const fadeIn = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const DialogOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
  animation: ${fadeIn} 0.3s ease;
`;

const DialogContent = styled.div`
  background: #27272a;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  animation: ${fadeIn} 0.4s ease;
`;

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const DialogTitle = styled.h2`
  color: #d8b4fe;
  margin: 0;
  font-size: 1.5rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: #fff;
  font-size: 0.9rem;
`;

const Input = styled.input`
  background: #3f3f46;
  border: 1px solid #52525b;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #7f56d9;
  }
`;

const TextArea = styled.textarea`
  background: #3f3f46;
  border: 1px solid #52525b;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: #7f56d9;
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid #52525b;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;

  &:hover {
    background: #3f3f46;
  }
`;

const SubmitButton = styled.button`
  background: #7f56d9;
  border: none;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.3s ease;

  &:hover {
    background: #6941c6;
  }
`;

// -------------------- FULL-PAGE GRAPH OVERLAY -------------------- //

const GraphOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at bottom,
    rgb(51, 42, 59) 0%,
    #090a0f 100%
  );
  animation: ${fadeInUp} 0.6s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ToggleSwitch = styled.div`
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  height: 50px;
  background-color: #44444a;
  border-radius: 999px;
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  z-index: 11;
`;

const ToggleOption = styled.div<{ active: boolean }>`
  flex: 1;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: ${({ active }) => (active ? "#fff" : "#bbb")};
  transition: color 0.6s ease;

  svg {
    stroke: ${({ active }) => (active ? "#fff" : "#bbb")};
    margin-right: 0.5rem;
    transition: stroke 0.6s ease;
  }
`;

const SwitchCircle = styled.div<{ active: boolean }>`
  position: absolute;
  width: 50%;
  height: 100%;
  border-radius: 999px;
  background-color: #7f56d9;
  top: 0;
  left: ${({ active }) => (active ? "50%" : "0%")};
  transition: left 0.6s ease;
  z-index: 1;
`;

// -------------------- RADAR CHART COMPONENT -------------------- //

const RadarChart = ({
  metrics,
  values,
}: {
  metrics: string[];
  values: number[];
}) => {
  const size = 180;
  const radius = size * 0.4;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate points for each metric on the radar
  const calculatePoint = (value: number, index: number) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2; // Start at top
    const x = centerX + radius * value * Math.cos(angle);
    const y = centerY + radius * value * Math.sin(angle);
    return { x, y };
  };

  // Calculate points for the radar axes (from center to max)
  const axisPoints = metrics.map((_, index) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  });

  // Calculate points for the data values
  const dataPoints = values.map((value, index) => calculatePoint(value, index));

  // Create path for the data polygon
  let dataPath = "";
  dataPoints.forEach((point, index) => {
    dataPath +=
      index === 0 ? `M${point.x},${point.y}` : ` L${point.x},${point.y}`;
  });
  dataPath += " Z"; // Close the path

  // Create background circles for scale reference
  const circles = [0.2, 0.4, 0.6, 0.8, 1].map((scale) => ({
    cx: centerX,
    cy: centerY,
    r: radius * scale,
  }));

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
      {/* Background circles */}
      {circles.map((circle, i) => (
        <circle
          key={i}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill="none"
          stroke="#52525b"
          strokeWidth="0.5"
          opacity={0.3}
        />
      ))}

      {/* Axis lines */}
      {axisPoints.map((point, i) => (
        <line
          key={i}
          x1={centerX}
          y1={centerY}
          x2={point.x}
          y2={point.y}
          stroke="#52525b"
          strokeWidth="0.5"
          opacity={0.5}
        />
      ))}

      {/* Data polygon */}
      <path
        d={dataPath}
        fill="#7f56d9"
        fillOpacity="0.3"
        stroke="#7f56d9"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((point, i) => (
        <circle key={i} cx={point.x} cy={point.y} r={3} fill="#d8b4fe" />
      ))}

      {/* Metric labels */}
      {axisPoints.map((point, i) => {
        // Adjust label position based on quadrant
        const labelRadius = radius * 1.15;
        const angle = (Math.PI * 2 * i) / metrics.length - Math.PI / 2;
        const labelX = centerX + labelRadius * Math.cos(angle);
        const labelY = centerY + labelRadius * Math.sin(angle);

        // Adjust text-anchor based on position
        let textAnchor = "middle";
        if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.25)
          textAnchor = "start";
        else if (angle > Math.PI * 0.75 || angle < -Math.PI * 0.75)
          textAnchor = "end";

        return (
          <text
            key={i}
            x={labelX}
            y={labelY}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill="#d8b4fe"
            fontSize="8"
          >
            {metrics[i]}
          </text>
        );
      })}
    </svg>
  );
};

// -------------------- SPARKLINE COMPONENT -------------------- //

const Sparkline = ({ data, color }) => {
  const width = 100;
  const height = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height * 0.4 + ((value - min) / range) * (height * 0.1);
    return `${x},${y}`;
  });

  const fillPathD = `M0,${height} L0,${points[0].split(",")[1]} L${points.join(
    " L"
  )} L${width},${
    points[points.length - 1].split(",")[1]
  } L${width},${height} Z`;
  const strokePathD = `M${points.join(" L")}`;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`gradient-${color.replace("#", "")}`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="40%" stopColor={color} stopOpacity="0.5" />
          <stop offset="70%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={fillPathD}
        fill={`url(#gradient-${color.replace("#", "")})`}
        stroke="none"
      />
      <path d={strokePathD} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
};

// -------------------- SUCCESS NOTIFICATION -------------------- //

const fadeInOut = keyframes`
  0% { opacity: 0; transform: translateX(20px); }
  10% { opacity: 1; transform: translateX(0); }
  90% { opacity: 1; transform: translateX(0); }
  100% { opacity: 0; transform: translateX(20px); }
`;

const SuccessNotification = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: #7f56d9;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  animation: ${fadeInOut} 3s ease forwards;
`;

// -------------------- MAIN COMPONENT -------------------- //

const Agents: React.FC = () => {
  // Toggle between List view (false) and Graph view (true)
  const [isDetailView, setIsDetailView] = useState(false);
  const [expandedAgentIndex, setExpandedAgentIndex] = useState<number | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDescription, setNewAgentDescription] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Replace hardcoded agentsData with state that syncs with Firestore
  const [agentsData, setAgentsData] = useState<any[]>([]);

  // Fetch agents realtime from Firestore
  useEffect(() => {
    const agentsCollection = collection(db, "agents");
    const unsubscribe = onSnapshot(agentsCollection, (snapshot) => {
      const agents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Add default performance metrics if not available
        performance: doc.data().performance || {
          speed: doc.data().speed,
          accuracy: doc.data().accuracy,
          reliability: doc.data().reliability,
          efficiency: doc.data().efficiency,
          learning: doc.data().learning
        },
        // Add default sparkline data if not available
        sparklineData: doc.data().sparklineData || [
          10, 12, 15, 13, 17, 14, 15, 16, 18, 17,
        ],
        sparklineColor: doc.data().sparklineColor || "#7f56d9",
      }));
      setAgentsData(agents);
    });
    return unsubscribe;
  }, []);

  const toggleView = () => {
    setIsDetailView((prev) => !prev);
  };

  const handleBack = () => {
    window.history.back();
  };

  const goToDashboard = () => {
    window.location.href = "/dashboard";
  };

  const toggleAgentExpanded = (index: number) => {
    setExpandedAgentIndex(expandedAgentIndex === index ? null : index);
  };

  const openDialog = () => {
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewAgentName("");
    setNewAgentDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newAgent = {
      name: newAgentName,
      description: newAgentDescription,
      owner: "CurrentUser", // Replace with the actual user information if available
      timeCreated: new Date().toISOString(),
      // Add default performance metrics and sparkline data for new agents
      performance: {
        speed: "70%",
        accuracy: "75%",
        reliability: "80%",
        efficiency: "65%",
        learning: "60%",
      },
      sparklineData: [5, 8, 10, 12, 15, 13, 14, 16, 15, 17],
      sparklineColor: "#7f56d9",
    };

    try {
      await addDoc(collection(db, "agents"), newAgent);
      closeDialog();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  return (
    <Container>
      <Header>
        <ControlButton onClick={handleBack}>
          <ArrowLeft size={18} /> Back
        </ControlButton>
        <CenteredTitle>
          {isDetailView ? "Universe" : "Available Agents"}
        </CenteredTitle>
        <ControlButton onClick={goToDashboard}>
          <Home size={18} /> Dashboard
        </ControlButton>
      </Header>

      <ToggleSwitch onClick={toggleView}>
        <SwitchCircle active={isDetailView} />
        <ToggleOption active={!isDetailView}>
          <List size={20} /> List
        </ToggleOption>
        <ToggleOption active={isDetailView}>
          <BarChart size={20} /> Graph
        </ToggleOption>
      </ToggleSwitch>

      {/* List View */}
      {!isDetailView && (
        <AgentListContainer>
          <CreateAgentCard onClick={openDialog}>
            <PlusIconContainer>
              <Plus size={30} color="#d8b4fe" />
            </PlusIconContainer>
            <CreateAgentText>Create New Agent</CreateAgentText>
          </CreateAgentCard>

          {agentsData.map((agent, index) => (
            <AgentCard
              key={agent.id}
              isExpanded={expandedAgentIndex === index}
              onClick={() => toggleAgentExpanded(index)}
            >
              <AgentTitle isExpanded={expandedAgentIndex === index}>
                {agent.name}
              </AgentTitle>
              <AgentDescription isExpanded={expandedAgentIndex === index}>
                {agent.description}
              </AgentDescription>

              {/* Add Radar Chart */}
              <RadarChartContainer isExpanded={expandedAgentIndex === index}>
                <RadarChart
                  metrics={[
                    "Speed",
                    "Accuracy",
                    "Reliability",
                    "Efficiency",
                    "Learning",
                  ]}
                  values={[
                    agent.performance.speed / 100,
                    agent.performance.accuracy / 100,
                    agent.performance.reliability / 100,
                    agent.performance.efficiency / 100,
                    agent.performance.learning / 100
                  ]}
                />
              </RadarChartContainer>

              {agent.sparklineData && agent.sparklineColor && (
                <SparklineContainer isExpanded={expandedAgentIndex === index}>
                  <Sparkline
                    data={agent.sparklineData}
                    color={agent.sparklineColor}
                  />
                </SparklineContainer>
              )}
            </AgentCard>
          ))}
        </AgentListContainer>
      )}

      {/* Graph (3D Universe) View */}
      {isDetailView && (
        <GraphOverlay>
          <StarField />
          <FocusGraph3D />
        </GraphOverlay>
      )}

      {/* Create New Agent Dialog */}
      {isDialogOpen && (
        <DialogOverlay>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <CloseButton onClick={closeDialog}>
                <X size={24} />
              </CloseButton>
            </DialogHeader>
            <Form onSubmit={handleSubmit}>
              <FormGroup>
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Enter agent name"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="agentDescription">Description</Label>
                <TextArea
                  id="agentDescription"
                  value={newAgentDescription}
                  onChange={(e) => setNewAgentDescription(e.target.value)}
                  placeholder="Describe what this agent does"
                  required
                />
              </FormGroup>
              <ButtonContainer>
                <CancelButton type="button" onClick={closeDialog}>
                  Cancel
                </CancelButton>
                <SubmitButton type="submit">Create Agent</SubmitButton>
              </ButtonContainer>
            </Form>
          </DialogContent>
        </DialogOverlay>
      )}

      {showSuccess && (
        <SuccessNotification>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z"
              fill="white"
            />
          </svg>
          Agent created successfully!
        </SuccessNotification>
      )}
    </Container>
  );
};

export default Agents;
