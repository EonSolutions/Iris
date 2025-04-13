import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

// -------------------- OVERLAY & CONTAINER -------------------- //

const Overlay = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const PopupContainer = styled.div`
  position: relative;
  width: 600px;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
`;

// -------------------- SCI-FI CARD & SVG -------------------- //

const AnimatedSVG = styled.svg`
  .circle-element {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
`;

const SciFiCardSVG = () => {
  const [rotationOffset, setRotationOffset] = useState({ x: 0, y: 0 });
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const rotX = (y / window.innerHeight - 0.5) * -300;
      const rotY = (x / window.innerWidth - 0.5) * 300;
      setRotationOffset({ x: rotX, y: rotY });
      console.log("SciFiCardSVG mouse move", { x, y, rotX, rotY });
    };

    const handleMouseDown = () => {
      setIsMouseDown(true);
      console.log("SciFiCardSVG mouse down");
    };
    const handleMouseUp = () => {
      setIsMouseDown(false);
      console.log("SciFiCardSVG mouse up");
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const topArcRotation = `rotate(${rotationOffset.y * 0.5} 300 300)`;
  const bottomArcRotation = `rotate(${rotationOffset.y * -0.5} 300 300)`;
  const shrinkScale = isMouseDown ? "scale(0.75)" : "scale(0.8)";

  return (
    <AnimatedSVG width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="ringGradient" r="1" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#88d2c2f0" stopOpacity="0" />
          <stop offset="100%" stopColor="#88d2c2f0" stopOpacity="0.3" />
        </radialGradient>
      </defs>

      <g
        className="circle-element"
        transform={`translate(300 300) ${shrinkScale} translate(-300 -300)`}
      >
        <circle
          cx="300"
          cy="300"
          r="285"
          fill="none"
          stroke="#88d2c2f0"
          strokeWidth="2"
          strokeDasharray="10 5"
          filter="url(#glow)"
        />
        <circle
          cx="300"
          cy="300"
          r="255"
          fill="none"
          stroke="#88d2c2f0"
          strokeWidth="2"
          strokeDasharray="2 4"
        />

        <g transform={topArcRotation}>
          <path
            d="M 90 300 A 210 210 0 0 1 300 90"
            stroke="#88d2c2f0"
            strokeWidth="2"
            fill="none"
            filter="url(#glow)"
          />
        </g>

        <g transform={bottomArcRotation}>
          <path
            d="M 510 300 A 210 210 0 0 1 300 510"
            stroke="#88d2c2f0"
            strokeWidth="2"
            fill="none"
            filter="url(#glow)"
          />
        </g>

        <g
          stroke="#88d2c2f0"
          strokeWidth="2"
          transform={`rotate(${(rotationOffset.y + rotationOffset.x) * 0.2} 300 300)`}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <g key={i} transform={`rotate(${i * 30} 300 300)`}>
              <line x1="300" y1="30" x2="300" y2="45" />
            </g>
          ))}
        </g>
      </g>
    </AnimatedSVG>
  );
};

const RadarChartContainer = styled.svg`
  width: 100%;
  height: 200px;
  margin-top: 1rem;
  overflow: visible;
`;

interface StatsRadarChartProps {
  data: {
    label: string;
    value: number;
    maxValue: number;
  }[];
}

const StatsRadarChart: React.FC<StatsRadarChartProps> = ({ data }) => {
  const numAxes = data.length;
  const centerX = 150;
  const centerY = 150;
  const maxRadius = 120;

  // Calculate polygon points for the radar polygon.
  const points = data
    .map((d, i) => {
      const angle = (2 * Math.PI * i) / numAxes;
      const r = (d.value / d.maxValue) * maxRadius;
      const x = centerX + r * Math.sin(angle);
      const y = centerY - r * Math.cos(angle);
      return `${x},${y}`;
    })
    .join(" ");

  // Create concentric rings for reference.
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => {
    return data
      .map((_, i) => {
        const angle = (2 * Math.PI * i) / numAxes;
        const r = scale * maxRadius;
        const x = centerX + r * Math.sin(angle);
        const y = centerY - r * Math.cos(angle);
        return `${x},${y}`;
      })
      .join(" ");
  });

  return (
    <RadarChartContainer viewBox="0 0 300 300">
      {rings.map((ring, index) => (
        <polygon
          key={index}
          points={ring}
          fill="none"
          stroke="#555"
          strokeWidth="0.5"
        />
      ))}
      {data.map((_, i) => {
        const angle = (2 * Math.PI * i) / numAxes;
        const x = centerX + maxRadius * Math.sin(angle);
        const y = centerY - maxRadius * Math.cos(angle);
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="#d8b4fe"
            strokeWidth="0.5"
          />
        );
      })}
      <polygon
        points={points}
        fill="rgba(216, 180, 254, 0.4)"
        stroke="#d8b4fe"
        strokeWidth="2"
      />
      {data.map((d, i) => {
        const angle = (2 * Math.PI * i) / numAxes;
        const labelRadius = maxRadius + 20;
        const x = centerX + labelRadius * Math.sin(angle);
        const y = centerY - labelRadius * Math.cos(angle);
        return (
          <text
            key={i}
            x={x}
            y={y}
            fill="#ffffff"
            fontSize="12"
            textAnchor="middle"
          >
            {d.label}
          </text>
        );
      })}
    </RadarChartContainer>
  );
};

const CardDetailOverlay = styled.div`
  position: absolute;
  top: 50%;
  right: 600px;
  transform: translateY(-50%);
  min-width: 300px;
  background-color: #1c1c1e;
  border: 1px solid #ffffff;
  border-radius: 8px;
  padding: 1.5rem;
  z-index: 9999;
  text-align: left;
`;

const DetailTitle = styled.h4`
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
  color: #d8b4fe;
  font-weight: 600;
  white-space: nowrap;
`;

const StatItem = styled.div`
  font-size: 1.2rem;
  color: #fff;
  margin: 0.5rem 0;
`;

const Description = styled.p`
  color: #ccc;
  font-size: 0.9rem;
  margin: 0.5rem 0 1rem;
  line-height: 1.4;
`;

const SciFiTagCard = styled.div`
  position: relative;
  width: 600px;
  height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;

  & > svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
  }
`;

interface AgentData {
  address: string;
  description: string;
  efficiency: number;
  latency: number;
  learning: number;
  name: string;
  relations: number;
  reliability?: number;
}

interface PopupProps {
  agentId: string;
}

const Popup: React.FC<PopupProps> = ({ agentId }) => {
  console.log("Popup component rendering with agentId:", agentId);

  if (!agentId || typeof agentId !== "string") {
    console.error("Popup: Invalid agentId provided!", agentId);
    return (
      <Overlay>
        <PopupContainer>
          <SciFiTagCard>
            <SciFiCardSVG />
            <CardDetailOverlay>
              <DetailTitle>Error: No valid agentId.</DetailTitle>
            </CardDetailOverlay>
          </SciFiTagCard>
        </PopupContainer>
      </Overlay>
    );
  }

  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [radarData, setRadarData] = useState<
    { label: string; value: number; maxValue: number }[]
  >([]);

  useEffect(() => {
    console.log("Popup useEffect triggered for agentId:", agentId);
    const agentDocRef = doc(db, "agents", agentId);
    console.log("Created Firestore doc reference for agentId:", agentId);
    const unsubscribe = onSnapshot(
      agentDocRef,
      (docSnap) => {
        console.log(
          "onSnapshot triggered for agentId:",
          agentId,
          "exists:",
          docSnap.exists(),
          "data:",
          docSnap.data()
        );
        if (docSnap.exists()) {
          const data = docSnap.data() as AgentData;
          console.log("Document snapshot data:", data);
          setAgentData(data);
          setRadarData([
            { label: "Relations", value: data.relations || 0, maxValue: 10 },
            { label: "Efficiency", value: data.efficiency || 0, maxValue: 100 },
            { label: "Learning", value: data.learning || 0, maxValue: 100 },
            { label: "Latency", value: 200 - (data.latency || 0), maxValue: 200 },
          ]);
        } else {
          console.log("No document found for agentId:", agentId);
        }
      },
      (error) => {
        console.error("Error fetching document for agentId:", agentId, error);
      }
    );

    return () => {
      console.log("Cleaning up onSnapshot listener for agentId:", agentId);
      unsubscribe();
    };
  }, [agentId]);

  if (!agentData) {
    console.log("agentData is null, rendering loading state.");
    return (
      <Overlay>
        <PopupContainer>
          <SciFiTagCard>
            <SciFiCardSVG />
            <CardDetailOverlay>
              <DetailTitle>Loading...</DetailTitle>
            </CardDetailOverlay>
          </SciFiTagCard>
        </PopupContainer>
      </Overlay>
    );
  }

  console.log("agentData fetched successfully, rendering popup content.");
  return (
    <Overlay>
      <PopupContainer>
        <SciFiTagCard>
          <SciFiCardSVG />
          <CardDetailOverlay>
            <DetailTitle>{agentData.name}</DetailTitle>
            <Description>{agentData.description}</Description>
            <StatItem>Address: {agentData.address}...</StatItem>
            <StatItem>Relations: {agentData.relations}</StatItem>
            <StatItem>Efficiency: {agentData.efficiency}%</StatItem>
            <StatItem>Learning: {agentData.learning}%</StatItem>
            <StatItem>Latency: {agentData.latency}ms</StatItem>
            <StatsRadarChart data={radarData} />
          </CardDetailOverlay>
        </SciFiTagCard>
      </PopupContainer>
    </Overlay>
  );
};

export default Popup;