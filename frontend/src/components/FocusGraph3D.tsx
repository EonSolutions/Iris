import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'https://esm.sh/three/examples/jsm/renderers/CSS2DRenderer.js';
import { hashString } from 'react-hash-string';
import Popup from './FocusPopup';

// Firebase imports
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Adjust the path as needed

// Helper function to generate random edges between nodes.
const generateRandomEdges = (nodes: any[]) => {
  console.log("Generating random edges for nodes:", nodes);
  const edges: any[] = [];
  nodes.forEach(node => {
    if (nodes.length < 2) return;
    
    let numEdges = 1;
    if (Math.random() > 0.7) { 
      numEdges++;
    }
    if (Math.random() > 0.9) { 
      numEdges++;
    }
    
    const usedTargets = new Set();
    for (let i = 0; i < numEdges; i++) {
      let attempts = 0;
      let target;
      do {
        target = nodes[Math.floor(Math.random() * nodes.length)];
        attempts++;
      } while ((target.id === node.id || usedTargets.has(target.id)) && attempts < 10);
      
      if (target && target.id !== node.id && !usedTargets.has(target.id)) {
        usedTargets.add(target.id);
        const value = Math.floor(Math.random() * 10) + 1;
        edges.push({ source: node.id, target: target.id, value });
      }
    }
  });
  console.log("Generated edges:", edges);
  return edges;
};

const FocusGraph3D: React.FC = () => {
  console.log("Rendering FocusGraph3D component");
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupOpacity, setPopupOpacity] = useState(0);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Subscribe to the "agents" collection in Firebase.
  useEffect(() => {
    console.log("Setting up Firebase subscription for agents collection.");
    const agentsCollectionRef = collection(db, "agents");
    const unsubscribe = onSnapshot(agentsCollectionRef, (snapshot) => {
      console.log("Received Firebase snapshot:", snapshot);
      const nodes = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Fetched document:", doc.id, "with data:", data);
        return {
          firebaseId: doc.id,  // Save the Firestore doc ID
          id: data.name || doc.id, // Use agent name if available; otherwise, fallback to the doc ID
          group: data.group || 1,
          ...data
        };
      });
      console.log("Nodes constructed:", nodes);
      const links = generateRandomEdges(nodes);
      const newGraphData = { nodes, links };
      console.log("New graph data:", newGraphData);
      setGraphData(newGraphData);
    });
    return () => {
      console.log("Cleaning up Firebase subscription.");
      unsubscribe();
    };
  }, []);

  // Mouse & touch interaction handlers.
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      console.log("Mouse down event:", event);
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
      isRotatingRef.current = event.button === 0;
    };

    const handleMouseUp = (event: MouseEvent) => {
      console.log("Mouse up event:", event);
      isDraggingRef.current = false;
      isRotatingRef.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      console.log("Mouse move event:", event);
      const dx = Math.abs(event.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(event.clientY - lastMousePosRef.current.y);
      if ((dx > 3 || dy > 3) && !isRotatingRef.current) {
        console.log("Panning detected due to mouse movement.");
        handlePanInteraction();
      }
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        console.log("Touch move event:", event);
        const touch = event.touches[0];
        const dx = Math.abs(touch.clientX - lastMousePosRef.current.x);
        const dy = Math.abs(touch.clientY - lastMousePosRef.current.y);
        if (dx > 3 || dy > 3) {
          console.log("Panning detected due to touch movement.");
          handlePanInteraction();
        }
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        console.log("Touch start event:", event);
        const touch = event.touches[0];
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchstart', handleTouchStart);
    
    return () => {
      console.log("Removing mouse and touch event listeners.");
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  const handlePanInteraction = useCallback(() => {
    console.log("Pan interaction handled.");
    setPopupOpacity(0);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => {
      console.log("Hiding popup after pan interaction.");
      setShowPopup(false);
    }, 300);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
  }, []);

  const handleClick = useCallback((node: any) => {
    console.log("Node clicked:", node);
    const distance = 40;
    const nodeX = node.x ?? 0;
    const nodeY = node.y ?? 0;
    const nodeZ = node.z ?? 0;
    const nodeDistance = Math.hypot(nodeX, nodeY, nodeZ);
    const distRatio = 1 + distance / nodeDistance;
    if (fgRef.current && nodeX !== undefined && nodeY !== undefined && nodeZ !== undefined) {
      console.log("Positioning camera to node with distRatio:", distRatio);
      fgRef.current.cameraPosition(
        { x: nodeX * distRatio, y: nodeY * distRatio, z: nodeZ * distRatio },
        node,
        1200
      );
    }
    console.log("Setting selected agent:", node);
    setSelectedAgent(node);
    if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    setShowPopup(false);
    setPopupOpacity(0);
    popupTimeoutRef.current = setTimeout(() => {
      console.log("Showing popup after delay.");
      setShowPopup(true);
      setTimeout(() => {
        console.log("Setting popup opacity to 1.");
        setPopupOpacity(1);
      }, 10);
    }, 3000);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    console.log("Background clicked.");
    if (!isRotatingRef.current) {
      handlePanInteraction();
    }
  }, [handlePanInteraction]);

  useEffect(() => {
    return () => {
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  if (!graphData) return <div>Loading...</div>;

  // Extra renderer for node labels via CSS2D.
  const GROUPS = 2;
  const extraRenderers = [new CSS2DRenderer()];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showPopup && selectedAgent && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none',
            opacity: popupOpacity,
            transition: 'opacity 300ms ease-in-out'
          }}
        >
          {console.log("Rendering Popup with selectedAgent:", selectedAgent)}
          {/* Pass a valid agentId (the Firestore document ID) to Popup */}
          <Popup agentId={selectedAgent.firebaseId} />
        </div>
      )}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        extraRenderers={extraRenderers}
        nodeLabel="id"
        linkWidth={0.5}
        linkColor={() => 'rgba(255, 255, 255, 0.15)'}
        linkDirectionalParticles={link => Math.floor(2 + Math.random() * 1)}
        linkDirectionalParticleSpeed={() => 0.002 + Math.random() * 0.005}
        linkDirectionalParticleWidth={0.5}
        linkDirectionalParticleColor={() => 'rgba(0,255,255,0.8)'}
        nodeAutoColorBy={d => `${hashString(`${d.id}`) % GROUPS}`}
        linkAutoColorBy={d => `${hashString(`${d.source}`) % GROUPS}`}
        onNodeClick={handleClick}
        onBackgroundClick={handleBackgroundClick}
        onNodeDragEnd={handlePanInteraction}
        backgroundColor="rgba(0,0,0,0)"
        nodeThreeObject={node => {
          const nodeEl = document.createElement('div');
          nodeEl.textContent = node.id;
          nodeEl.style.color = node.color;
          nodeEl.style.fontSize = '12px';
          nodeEl.style.padding = '1px 4px';
          nodeEl.style.borderRadius = '4px';
          nodeEl.style.backgroundColor = 'rgba(0,0,0,0.5)';
          nodeEl.style.userSelect = 'none';
          return new CSS2DObject(nodeEl);
        }}
        nodeColor={node => {
          if (node.group === 1) return '#8434ed';
          if (node.group === 2) return '#30c933';
          return '#b150f2';
        }}
        nodeThreeObjectExtend={true}
      />
    </div>
  );
};

export default FocusGraph3D;