import * as WebSocketService from "./websocketService";

/**
 * Interface for LCA impact values
 */
export interface LcaImpact {
  gwp: number; // Global Warming Potential
  ubp: number; // UBP (Environmental Impact Points)
  penr: number; // Primary Energy Non-Renewable
}

/**
 * Interface for LCA element data
 */
export interface LcaElementData {
  id: string;
  category: string;
  level: string;
  is_structural: boolean;
  materials: {
    name: string;
    volume: number;
    impact?: LcaImpact;
  }[];
  impact: LcaImpact;
  sequence?: number;
}

/**
 * Send LCA data to the server, which will forward it to Kafka
 * @param projectId The project ID to send data for
 * @param elements The elements with LCA data to send
 * @returns Promise that resolves when data is sent
 */
export async function sendLcaData(
  projectId: string,
  elements: LcaElementData[]
): Promise<boolean> {
  try {
    if (!elements || elements.length === 0) {
      console.log("No LCA elements to send");
      return false;
    }

    console.log(`Sending ${elements.length} elements with LCA data`);

    // Make sure WebSocket is connected
    if (!WebSocketService.isConnected()) {
      await WebSocketService.initWebSocket();
      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!WebSocketService.isConnected()) {
        throw new Error("WebSocket not connected");
      }
    }

    // Use the sendRequest function that handles all of this for us
    const response = await WebSocketService.sendRequest("send_lca_data", {
      projectId,
      elements,
    });

    return response.status === "success";
  } catch (error) {
    console.error("Error sending LCA data:", error);
    return false;
  }
}
