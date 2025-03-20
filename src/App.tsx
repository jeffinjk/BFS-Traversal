import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Node {
  id: string;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
}

// Initialize Gemini AI using the environment variable
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API);

// Background music URL - peaceful ambient music
const BACKGROUND_MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/02/22/audio_d1718ab41b.mp3';

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [visitedNodes, setVisitedNodes] = useState<string[]>([]);
  const [currentQueue, setCurrentQueue] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [startNode, setStartNode] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Initialize audio
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
      audioRef.current.loop = true;
    }
  }, []);

  useEffect(() => {
    // Update document class for dark mode
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

  const generateExplanation = async () => {
    if (!visitedNodes.length) return;

    const prompt = `
      Explain this BFS traversal step by step:
      
      Graph Structure:
      Nodes: ${nodes.map(n => n.id).join(', ')}
      Edges: ${edges.map(e => `${e.from}->${e.to}`).join(', ')}
      
      BFS Progress:
      Current Queue: ${currentQueue.map(id => `Node ${id}`).join(', ')}
      Visited Nodes: ${visitedNodes.map(id => `Node ${id}`).join(', ')}
      
      Please explain:
      1. What has happened so far in the traversal
      2. What nodes are currently being considered
      3. What will likely happen in the next step
      Keep it concise and clear.
    `;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      setExplanation(response.text());
    } catch (error) {
      console.error('Error generating explanation:', error);
      setExplanation('Unable to generate explanation at this time.');
    }
  };

  useEffect(() => {
    if (visitedNodes.length > 0) {
      generateExplanation();
    }
  }, [visitedNodes, currentQueue]);

  const resetVisualization = () => {
    setVisitedNodes([]);
    setCurrentQueue([]);
    setIsRunning(false);
    setStartNode(null);
    setExplanation('');
  };

  const addNode = (e: React.MouseEvent) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newNode = {
        id: `${nodes.length + 1}`,
        x,
        y,
      };
      setNodes([...nodes, newNode]);
    }
  };

  const handleNodeClick = (nodeId: string) => {
    if (!isRunning) {
      if (selectedNode === null) {
        setSelectedNode(nodeId);
      } else if (selectedNode !== nodeId) {
        setEdges([...edges, { from: selectedNode, to: nodeId }]);
        setSelectedNode(null);
      } else {
        setSelectedNode(null);
      }
    } else if (!startNode) {
      setStartNode(nodeId);
      setVisitedNodes([nodeId]);
      setCurrentQueue([nodeId]);
    }
  };

  const getNeighbors = (nodeId: string): string[] => {
    return edges
      .filter(edge => edge.from === nodeId || edge.to === nodeId)
      .map(edge => edge.from === nodeId ? edge.to : edge.from);
  };

  const performBFSStep = () => {
    if (currentQueue.length === 0 || !startNode) return;

    const currentNode = currentQueue[0];
    const newQueue = currentQueue.slice(1);
    const neighbors = getNeighbors(currentNode);

    const unvisitedNeighbors = neighbors.filter(
      neighbor => !visitedNodes.includes(neighbor)
    );

    setCurrentQueue([...newQueue, ...unvisitedNeighbors]);
    setVisitedNodes([...visitedNodes, ...unvisitedNeighbors]);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && currentQueue.length > 0) {
      interval = setInterval(performBFSStep, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentQueue]);

  const getNodeLabel = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? `Node ${node.id}` : '';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-dark-gradient text-white' : 'bg-gray-100 text-gray-800'
    }`}>
      <audio ref={audioRef} src={BACKGROUND_MUSIC_URL} />
      
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <div className={`rounded-lg shadow-lg p-4 sm:p-6 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>
                BFS Visualization
              </h1>
              <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Click anywhere to add nodes. Click two nodes to connect them.
                {isRunning && !startNode && " Click a node to start BFS."}
              </p>
            </div>
            <div className="flex gap-4 self-end sm:self-auto">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
              </button>
              <button
                onClick={toggleMute}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle music"
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                isRunning
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-green-500 hover:bg-green-600'
              } text-white transition-colors`}
            >
              {isRunning ? (
                <>
                  <Pause size={20} /> Pause
                </>
              ) : (
                <>
                  <Play size={20} /> Start
                </>
              )}
            </button>
            <button
              onClick={resetVisualization}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition-colors"
            >
              <RotateCcw size={20} /> Reset
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,300px] gap-6">
            <div>
              <div
                ref={canvasRef}
                onClick={addNode}
                className={`relative w-full h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] border-2 rounded-lg mb-4 ${
                  isDarkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-200 bg-white'
                }`}
              >
                {/* Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {edges.map((edge, index) => {
                    const fromNode = nodes.find(n => n.id === edge.from);
                    const toNode = nodes.find(n => n.id === edge.to);
                    if (!fromNode || !toNode) return null;

                    const isVisited =
                      visitedNodes.includes(edge.from) &&
                      visitedNodes.includes(edge.to);

                    return (
                      <line
                        key={index}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke={isVisited ? '#22c55e' : isDarkMode ? '#4b5563' : '#94a3b8'}
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>

                {/* Nodes */}
                {nodes.map(node => {
                  const isVisited = visitedNodes.includes(node.id);
                  const isInQueue = currentQueue.includes(node.id);
                  const isSelected = selectedNode === node.id;

                  return (
                    <div
                      key={node.id}
                      onClick={e => {
                        e.stopPropagation();
                        handleNodeClick(node.id);
                      }}
                      className={`absolute w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 -translate-x-4 sm:-translate-x-5 md:-translate-x-6 -translate-y-4 sm:-translate-y-5 md:-translate-y-6 rounded-full flex items-center justify-center cursor-pointer transition-colors text-sm sm:text-base md:text-lg ${
                        isVisited
                          ? 'bg-green-500 text-white'
                          : isInQueue
                          ? 'bg-yellow-500 text-white'
                          : isSelected
                          ? 'bg-blue-500 text-white'
                          : isDarkMode
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      style={{ left: node.x, top: node.y }}
                    >
                      {node.id}
                    </div>
                  );
                })}
              </div>

              {/* AI Explanation */}
              {explanation && (
                <div className={`p-4 rounded-lg border ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-700 text-gray-300' 
                    : 'bg-blue-50 border-blue-200 text-blue-900'
                }`}>
                  <h3 className={`text-lg font-semibold mb-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-blue-800'
                  }`}>
                    BFS Explanation
                  </h3>
                  <p className="whitespace-pre-line text-sm sm:text-base">{explanation}</p>
                </div>
              )}
            </div>

            {/* Queue Information Panel */}
            <div className="space-y-6">
              {/* Current Queue */}
              <div className={`rounded-lg border p-4 ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Current Queue
                </h3>
                <div className="space-y-2">
                  {currentQueue.length === 0 ? (
                    <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Queue is empty
                    </p>
                  ) : (
                    currentQueue.map((nodeId, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded ${
                          isDarkMode ? 'bg-gray-800' : 'bg-yellow-50'
                        }`}
                      >
                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                        <span className="text-sm sm:text-base">{getNodeLabel(nodeId)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Visited Nodes */}
              <div className={`rounded-lg border p-4 ${
                isDarkMode 
                  ? 'bg-gray-900 border-gray-700' 
                  : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-800'
                }`}>
                  Visited Nodes
                </h3>
                <div className="space-y-2">
                  {visitedNodes.length === 0 ? (
                    <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No nodes visited yet
                    </p>
                  ) : (
                    visitedNodes.map((nodeId, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-2 p-2 rounded ${
                          isDarkMode ? 'bg-gray-800' : 'bg-green-50'
                        }`}
                      >
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        <span className="text-sm sm:text-base">{getNodeLabel(nodeId)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-4 text-xs sm:text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}></div>
                <span>Unvisited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full"></div>
                <span>Visited</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full"></div>
                <span>In Queue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full"></div>
                <span>Selected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;