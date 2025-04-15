import { Kafka, Producer, Admin, Consumer } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

// Define interfaces for type safety
export interface LcaImpact {
  gwp: number; // Global Warming Potential
  ubp: number; // UBP (Environmental Impact Points)
  penr: number; // Primary Energy Non-Renewable
}

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
  primaryKbobId?: string;
}

export interface LcaData {
  id: string;
  sequence: number;
  mat_kbob: string;
  gwp_relative: number;
  gwp_absolute: number;
  penr_relative: number;
  penr_absolute: number;
  upb_relative: number;
  upb_absolute: number;
}

// Interface for the metadata object expected by Kafka sending functions
export interface KafkaMetadata {
  project: string;
  filename: string;
  timestamp: string; // Should be the ISO string from fileProcessingTimestamp
  fileId: string;
}

// Updated IfcFileData interface to use KafkaMetadata type implicitly
export interface IfcFileData {
  project: string;
  filename: string;
  timestamp: string;
  fileId: string;
  data?: LcaData[];
}

class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;
  private consumer: Consumer | null = null;
  private isConnected: boolean = false;
  private isProducerConnected: boolean = false;
  private lcaTopicReady: boolean = false;

  // Configuration
  private config = {
    clientId: "plugin-lca-websocket",
    broker: process.env.KAFKA_BROKER || "broker:29092",
    qtoTopic: process.env.KAFKA_TOPIC_QTO || "qto-elements",
    lcaTopic: process.env.KAFKA_TOPIC_LCA || "lca-data",
    groupId: process.env.KAFKA_GROUP_ID || "lca-plugin-group",
  };

  constructor() {
    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: [this.config.broker],
      retry: {
        initialRetryTime: 1000,
        retries: 10,
      },
    });
    this.producer = this.kafka.producer();
    this.admin = this.kafka.admin();
  }

  /**
   * Initialize Kafka connection
   */
  async initialize(): Promise<boolean> {
    try {
      await this.admin.connect();
      console.log(`Connected to Kafka admin on broker: ${this.config.broker}`);
      await this.ensureTopicExists(this.config.qtoTopic);
      await this.ensureTopicExists(this.config.lcaTopic);
      this.lcaTopicReady = true;
      await this.admin.disconnect();
      await this.producer.connect();
      console.log(`Producer connected to Kafka broker: ${this.config.broker}`);
      this.isProducerConnected = true;
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize Kafka:", error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Create consumer to listen for QTO elements
   */
  async createConsumer(
    messageHandler: (message: any) => Promise<void>
  ): Promise<boolean> {
    try {
      this.consumer = this.kafka.consumer({ groupId: this.config.groupId });
      await this.consumer.connect();
      console.log(`Consumer connected to Kafka broker: ${this.config.broker}`);
      await this.consumer.subscribe({
        topic: this.config.qtoTopic,
        fromBeginning: false,
      });
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = message.value?.toString();
            if (messageValue) {
              console.log(
                `Received message from Kafka topic ${topic}:`,
                messageValue.substring(0, 200) + "..."
              );
              const messageData = JSON.parse(messageValue);
              await messageHandler(messageData);
            }
          } catch (err) {
            console.error("Error processing Kafka message:", err);
          }
        },
      });
      return true;
    } catch (error) {
      console.error("Failed to create Kafka consumer:", error);
      return false;
    }
  }

  /**
   * Batch send LCA data elements (now material instances), calculating relative values.
   * Accepts a kafkaMetadata object and totals object.
   */
  async sendLcaBatchToKafka(
    materialInstances: any[], // Changed parameter name and type (use a more specific type if defined)
    kafkaMetadata: KafkaMetadata,
    totals: { totalGwp: number; totalUbp: number; totalPenr: number }
  ): Promise<boolean> {
    try {
      if (!materialInstances || materialInstances.length === 0) {
        console.log("No LCA material instances to send in batch.");
        return false;
      }
      if (!kafkaMetadata || !totals) {
        console.error(
          "Incomplete metadata or totals provided to sendLcaBatchToKafka.",
          { kafkaMetadata, totals }
        );
        return false;
      }
      if (!this.lcaTopicReady) {
        await this.ensureTopicExists(this.config.lcaTopic);
        this.lcaTopicReady = true;
      }
      if (!this.isProducerConnected) {
        await this.producer.connect();
        this.isProducerConnected = true;
      }

      const BATCH_SIZE = 200; // Adjust batch size if needed
      const batches: any[][] = [];
      for (let i = 0; i < materialInstances.length; i += BATCH_SIZE) {
        batches.push(materialInstances.slice(i, i + BATCH_SIZE));
      }

      console.log(
        `Sending ${materialInstances.length} LCA material instances in ${batches.length} batches (Project: ${kafkaMetadata.project}, File: ${kafkaMetadata.filename})`
      );

      let allBatchesSentSuccessfully = true;
      const sentKeys = new Set<string>(); // Track sent (id::sequence) combinations for this fileId

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const kafkaLcaData: LcaData[] = []; // Build the filtered data for this batch

        // Map batch elements, filtering duplicates based on (id, sequence)
        batch.forEach((materialInstance, indexInBatch) => {
          // Use impacts directly from the material instance
          const gwpAbs = materialInstance.impact?.gwp || 0;
          const ubpAbs = materialInstance.impact?.ubp || 0;
          const penrAbs = materialInstance.impact?.penr || 0;

          // Calculate relative impacts based on overall totals
          const gwpRel = totals.totalGwp !== 0 ? gwpAbs / totals.totalGwp : 0;
          const ubpRel = totals.totalUbp !== 0 ? ubpAbs / totals.totalUbp : 0;
          const penrRel =
            totals.totalPenr !== 0 ? penrAbs / totals.totalPenr : 0;

          // Get the KBOB ID associated with this specific material instance
          const matKbobValue = materialInstance.kbob_id || "UNKNOWN_KBOB";

          // Determine ID and Sequence, including fallbacks
          const id =
            materialInstance.element_global_id ||
            `unknown_element_${indexInBatch}`; // Use batch index for fallback ID
          const sequence = materialInstance.sequence ?? indexInBatch; // Use batch index for fallback sequence

          const uniqueKey = `${id}::${sequence}`;

          if (sentKeys.has(uniqueKey)) {
            console.warn(
              `[Kafka Send] Skipping duplicate key for file ${kafkaMetadata.fileId}: id='${id}', sequence='${sequence}', KBOB='${matKbobValue}', Name='${materialInstance.material_name}'`
            );
            return; // Skip this item
          }

          // Add key to set and create LcaData object
          sentKeys.add(uniqueKey);

          // Log the mapping details (only for items being sent)
          console.log(
            `[Kafka Map - Material] ID: ${id}, KBOB: ${matKbobValue}, GWP_Abs: ${gwpAbs.toFixed(
              2
            )}, Name: ${materialInstance.material_name}, Seq: ${sequence}`
          );

          kafkaLcaData.push({
            id: id,
            sequence: sequence,
            mat_kbob: matKbobValue,
            gwp_relative: gwpRel,
            gwp_absolute: gwpAbs,
            penr_relative: penrRel,
            penr_absolute: penrAbs,
            upb_relative: ubpRel,
            upb_absolute: ubpAbs,
          });
        });

        // Only proceed if there's data left after filtering
        if (kafkaLcaData.length === 0) {
          console.log(
            `Batch ${i + 1}/${
              batches.length
            } is empty after filtering duplicates, skipping send.`
          );
          continue; // Skip sending this empty batch
        }

        // Create the IfcFileData message for this batch
        const lcaMessage: IfcFileData = {
          project: kafkaMetadata.project,
          filename: kafkaMetadata.filename,
          timestamp: kafkaMetadata.timestamp,
          fileId: kafkaMetadata.fileId,
          data: kafkaLcaData,
        };
        const messageKey = kafkaMetadata.fileId;

        try {
          console.log(
            `Attempting to send LCA batch ${i + 1}/${
              batches.length
            } message to Kafka topic ${this.config.lcaTopic}:`,
            JSON.stringify(lcaMessage, null, 2)
          );
          await this.producer.send({
            topic: this.config.lcaTopic,
            messages: [{ value: JSON.stringify(lcaMessage), key: messageKey }],
          });
          console.log(
            `LCA batch ${i + 1}/${batches.length} sent successfully.`
          );
        } catch (sendError) {
          console.error(
            `Error sending LCA batch ${i + 1}/${batches.length} to Kafka:`,
            sendError
          );
          this.isProducerConnected = false;
          allBatchesSentSuccessfully = false;
          break;
        }

        // Optional delay between batches
        if (batches.length > 1 && i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
      return allBatchesSentSuccessfully;
    } catch (error) {
      console.error("Error in sendLcaBatchToKafka:", error);
      return false;
    }
  }

  /**
   * Check if Kafka topic exists, create if not
   */
  async ensureTopicExists(topic: string): Promise<boolean> {
    try {
      try {
        await this.admin.listTopics();
      } catch (error) {
        await this.admin.connect();
      }
      const topics = await this.admin.listTopics();
      console.log(`Available Kafka topics: ${topics.join(", ")}`);
      if (!topics.includes(topic)) {
        console.log(`Topic '${topic}' does not exist. Creating it...`);
        await this.admin.createTopics({
          topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
        });
        console.log(`Created topic: ${topic}`);
      } else {
        console.log(`Topic '${topic}' already exists`);
      }
      return true;
    } catch (error) {
      console.error(`Error checking/creating Kafka topic ${topic}:`, error);
      return false;
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        console.log("Kafka consumer disconnected");
      }
      if (this.isProducerConnected) {
        await this.producer.disconnect();
        console.log("Kafka producer disconnected");
        this.isProducerConnected = false;
      }
      try {
        await this.admin.disconnect();
        console.log("Kafka admin disconnected");
      } catch (error) {
        /* Ignore */
      }
      this.isConnected = false;
    } catch (error) {
      console.error("Error disconnecting from Kafka:", error);
    }
  }

  /**
   * Check if Kafka is connected
   */
  isKafkaConnected(): boolean {
    return this.isConnected;
  }
}

// Export a singleton instance
export const kafkaService = new KafkaService();
