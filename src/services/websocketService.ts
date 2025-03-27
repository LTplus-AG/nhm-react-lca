import { Material } from "../types/lca.types";

// WebSocket connection options
const WS_OPTIONS = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  pingInterval: 30000,
  messageTimeout: 10000,
};

// Connection status enum
export enum ConnectionStatus {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  ERROR = "ERROR",
}

// Project data interface
export interface ProjectData {
  projectId: string;
  name: string;
  ifcData: {
    materials: {
      name: string;
      volume: number;
    }[];
  };
  materialMappings: Record<string, string>;
}

// Global WebSocket instance
let ws: WebSocket | null = null;
let connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
let reconnectAttempts = 0;
let pingInterval: NodeJS.Timeout | null = null;

// Event handlers
const messageHandlers: ((data: any) => void)[] = [];
const statusChangeHandlers: ((status: ConnectionStatus) => void)[] = [];

// Get WebSocket URL from environment or use default
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || "ws://localhost:8002";

/**
 * Initialize WebSocket connection
 */
export async function initWebSocket(): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected");
    return;
  }

  if (ws && ws.readyState === WebSocket.CONNECTING) {
    console.log("WebSocket already connecting");
    return;
  }

  try {
    console.log(`Initializing WebSocket connection to ${WS_URL}`);
    ws = new WebSocket(WS_URL);
    connectionStatus = ConnectionStatus.CONNECTING;
    notifyStatusChange(connectionStatus);

    ws.onopen = () => {
      console.log("WebSocket connected");
      connectionStatus = ConnectionStatus.CONNECTED;
      notifyStatusChange(connectionStatus);
      reconnectAttempts = 0;
      startPingInterval();
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      connectionStatus = ConnectionStatus.DISCONNECTED;
      notifyStatusChange(connectionStatus);
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      attemptReconnect();
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      connectionStatus = ConnectionStatus.ERROR;
      notifyStatusChange(connectionStatus);
    };

    ws.onmessage = handleMessage;
  } catch (error) {
    console.error("Failed to initialize WebSocket:", error);
    connectionStatus = ConnectionStatus.ERROR;
    notifyStatusChange(connectionStatus);
    attemptReconnect();
  }
}

/**
 * Attempt to reconnect to WebSocket
 */
function attemptReconnect() {
  if (reconnectAttempts >= WS_OPTIONS.maxReconnectAttempts) {
    console.error("Max reconnection attempts reached");
    return;
  }

  reconnectAttempts++;
  setTimeout(() => {
    console.log(
      `Attempting to reconnect (${reconnectAttempts}/${WS_OPTIONS.maxReconnectAttempts})`
    );
    initWebSocket();
  }, WS_OPTIONS.reconnectInterval);
}

/**
 * Start ping interval to keep connection alive
 */
function startPingInterval() {
  if (pingInterval) {
    clearInterval(pingInterval);
  }

  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, WS_OPTIONS.pingInterval);
}

/**
 * Stop ping interval
 */
function stopPingInterval() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

/**
 * Set connection status and notify handlers
 */
function setConnectionStatus(status: ConnectionStatus) {
  connectionStatus = status;
  notifyStatusChangeHandlers();
}

/**
 * Notify all message handlers
 */
function notifyMessageHandlers(data: any) {
  messageHandlers.forEach((handler) => {
    try {
      handler(data);
    } catch (error) {
      console.error("Error in message handler:", error);
    }
  });
}

/**
 * Notify all status change handlers
 */
function notifyStatusChangeHandlers() {
  statusChangeHandlers.forEach((handler) => {
    try {
      handler(connectionStatus);
    } catch (error) {
      console.error("Error in status change handler:", error);
    }
  });
}

/**
 * Register a message handler
 */
export function onMessage(handler: (data: any) => void) {
  messageHandlers.push(handler);
  return () => {
    const index = messageHandlers.indexOf(handler);
    if (index !== -1) {
      messageHandlers.splice(index, 1);
    }
  };
}

/**
 * Register a status change handler
 */
export function onStatusChange(handler: (status: ConnectionStatus) => void) {
  statusChangeHandlers.push(handler);
  handler(connectionStatus);
  return () => {
    const index = statusChangeHandlers.indexOf(handler);
    if (index !== -1) {
      statusChangeHandlers.splice(index, 1);
    }
  };
}

/**
 * Send a request to the server and wait for response
 */
function sendRequest(
  type: string,
  data: any,
  timeout = WS_OPTIONS.messageTimeout
): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject(new Error("WebSocket not connected"));
      return;
    }

    const messageId = `${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2)}`;
    const message = { type, messageId, ...data };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Request timeout"));
    }, timeout);

    function handleResponse(response: any) {
      if (response.messageId === messageId) {
        cleanup();
        resolve(response);
      }
    }

    function cleanup() {
      clearTimeout(timeoutId);
      messageHandlers.splice(messageHandlers.indexOf(handleResponse), 1);
    }

    messageHandlers.push(handleResponse);
    ws.send(JSON.stringify(message));
  });
}

/**
 * Handle incoming messages
 */
function handleMessage(event: MessageEvent) {
  try {
    const data = JSON.parse(event.data);
    console.log("Received message:", data);
    notifyMessageHandlers(data);
  } catch (error) {
    console.error("Error parsing WebSocket message:", error);
  }
}

/**
 * Notify all status change handlers
 */
function notifyStatusChange(status: ConnectionStatus) {
  statusChangeHandlers.forEach((handler) => {
    try {
      handler(status);
    } catch (error) {
      console.error("Error in status change handler:", error);
    }
  });
}

/**
 * Get project materials from the server
 */
export async function getProjectMaterials(
  projectId: string
): Promise<ProjectData> {
  try {
    // Auto-connect if not connected
    if (!isConnected()) {
      await initWebSocket();
      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!isConnected()) {
        throw new Error("WebSocket not connected");
      }
    }

    const response = await sendRequest("get_project_materials", { projectId });
    return response;
  } catch (error) {
    console.error(`Error getting project materials for ${projectId}:`, error);
    throw error;
  }
}

/**
 * Save project materials to the server
 */
export async function saveProjectMaterials(
  projectId: string,
  data: {
    ifcData: ProjectData["ifcData"];
    materialMappings: Record<string, string>;
  }
): Promise<void> {
  try {
    // Auto-connect if not connected
    if (!isConnected()) {
      await initWebSocket();
      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!isConnected()) {
        throw new Error("WebSocket not connected");
      }
    }

    await sendRequest("save_project_materials", { projectId, ...data });
  } catch (error) {
    console.error(`Error saving project materials for ${projectId}:`, error);
    throw error;
  }
}

/**
 * Get available projects from the server
 */
export async function getProjects(): Promise<{ id: string; name: string }[]> {
  try {
    // Auto-connect if not connected
    if (!isConnected()) {
      await initWebSocket();
      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!isConnected()) {
        throw new Error("WebSocket not connected");
      }
    }

    const response = await sendRequest("get_projects", {});
    return response.projects || [];
  } catch (error) {
    console.error("Error getting projects:", error);
    throw error;
  }
}

/**
 * Check if WebSocket is connected
 */
export function isConnected(): boolean {
  return ws !== null && ws.readyState === WebSocket.OPEN;
}

/**
 * Get the current connection status
 */
export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}
