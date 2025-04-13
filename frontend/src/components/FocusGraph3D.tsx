import React, { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'https://esm.sh/three/examples/jsm/renderers/CSS2DRenderer.js';
import { hashString } from 'react-hash-string';
import Popup from './FocusPopup';

// Firebase imports
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Adjust the path as needed

// Updated helper function:
// Every node gets at least 1 edge.
// With ~30% chance it gets a second edge, and with ~10% chance it gets a third.
const generateRandomEdges = (nodes) => {
  const edges = [];
  nodes.forEach(node => {
    if (nodes.length < 2) return; // Only one node available; no edge possible.
    
    let numEdges = 1; // Every node gets at least one edge.
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
  return edges;
};

const FocusGraph3D: React.FC = () => {
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<any>(null);
  const [showImage, setShowImage] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(0);
  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // Subscribe to the "agents" collection in Firebase to build the graph data
  useEffect(() => {
    const agentsCollectionRef = collection(db, "agents");
    const unsubscribe = onSnapshot(agentsCollectionRef, (snapshot) => {
      const nodes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.name || doc.id, // use agent name if available; otherwise fall back to the document id
          group: data.group || 1,    // use agent group if provided; default to 1 otherwise
          ...data
        };
      });
      const links = generateRandomEdges(nodes);
      setGraphData({ nodes, links });
    });
    return () => unsubscribe();
  }, []);

  // Mouse & touch interaction handlers for panning/rotation
  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
      isRotatingRef.current = event.button === 0;
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isRotatingRef.current = false;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = Math.abs(event.clientX - lastMousePosRef.current.x);
      const dy = Math.abs(event.clientY - lastMousePosRef.current.y);
      if ((dx > 3 || dy > 3) && !isRotatingRef.current) {
        handlePanInteraction();
      }
      lastMousePosRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        const dx = Math.abs(touch.clientX - lastMousePosRef.current.x);
        const dy = Math.abs(touch.clientY - lastMousePosRef.current.y);
        if (dx > 3 || dy > 3) {
          handlePanInteraction();
        }
        lastMousePosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
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
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  const handlePanInteraction = useCallback(() => {
    setImageOpacity(0);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => setShowImage(false), 300);
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
  }, []);

  const handleClick = useCallback((node: any) => {
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
    if (fgRef.current && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      fgRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1200
      );
    }
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    setShowImage(false);
    setImageOpacity(0);
    imageTimeoutRef.current = setTimeout(() => {
      setShowImage(true);
      setTimeout(() => setImageOpacity(1), 10);
    }, 3000);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    if (!isRotatingRef.current) {
      handlePanInteraction();
    }
  }, [handlePanInteraction]);

  useEffect(() => {
    return () => {
      if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  if (!graphData) return <div>Loading...</div>;

  // Extra renderer for node labels via CSS2D
  const GROUPS = 2;
  const extraRenderers = [new CSS2DRenderer()];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {showImage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            pointerEvents: 'none',
            opacity: imageOpacity,
            transition: 'opacity 300ms ease-in-out'
          }}
        >
          <Popup />
        </div>
      )}
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        extraRenderers={extraRenderers}
        nodeLabel="id"
        // Link styling: thin and faint base line
        linkWidth={0.5}
        linkColor={() => 'rgba(255, 255, 255, 0.15)'}
        // Directional particles simulate data pulses along the edge.
        // Here we use a random count (2 or 3) per link to desynchronize the pulses.
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
