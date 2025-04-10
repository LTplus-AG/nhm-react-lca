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
}

export interface LcaMessage {
  project: string;
  filename: string;
  timestamp: string;
  data: LcaElementData[];
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
    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: [this.config.broker],
      retry: {
        initialRetryTime: 1000,
        retries: 10,
      },
    });

    // Create producer for sending messages
    this.producer = this.kafka.producer();

    // Create admin for managing topics
    this.admin = this.kafka.admin();
  }

  /**
   * Initialize Kafka connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Connect to admin to manage topics
      await this.admin.connect();
      console.log(`Connected to Kafka admin on broker: ${this.config.broker}`);

      // Ensure topics exist
      await this.ensureTopicExists(this.config.qtoTopic);
      await this.ensureTopicExists(this.config.lcaTopic);
      this.lcaTopicReady = true;

      // Disconnect admin after topic verification
      await this.admin.disconnect();

      // Connect producer for sending messages
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
      // Create consumer
      this.consumer = this.kafka.consumer({ groupId: this.config.groupId });

      // Connect consumer
      await this.consumer.connect();
      console.log(`Consumer connected to Kafka broker: ${this.config.broker}`);

      // Subscribe to QTO topic
      await this.consumer.subscribe({
        topic: this.config.qtoTopic,
        fromBeginning: false,
      });

      // Set up message handling
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = message.value?.toString();
            if (messageValue) {
              console.log(
                `Received message from Kafka topic ${topic}:`,
                messageValue.substring(0, 200) + "..."
              );

              // Parse the message
              const messageData = JSON.parse(messageValue);

              // Process the message with the provided handler
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
   * Send LCA data to Kafka
   */
  async sendLcaDataToKafka(
    lcaData: LcaElementData | LcaElementData[],
    projectName: string,
    filename: string
  ): Promise<boolean> {
    try {
      // Ensure topic exists
      if (!this.lcaTopicReady) {
        console.log(`Ensuring LCA topic exists: ${this.config.lcaTopic}`);
        this.lcaTopicReady = await this.ensureTopicExists(this.config.lcaTopic);
      }

      // Ensure producer is connected
      if (!this.isProducerConnected) {
        console.log("Connecting producer to Kafka...");
        await this.producer.connect();
        this.isProducerConnected = true;
      }

      // Format as array if single item
      const dataArray = Array.isArray(lcaData) ? lcaData : [lcaData];

      // Create message format
      const lcaMessage: LcaMessage = {
        project: projectName,
        filename: filename,
        timestamp: new Date().toISOString(),
        data: dataArray,
      };

      // Create fileID for use as message key
      const fileID = `${projectName}/${filename}`;

      // Log what we're sending
      console.log(
        `Sending LCA message to Kafka topic ${this.config.lcaTopic}:`,
        {
          project: lcaMessage.project,
          dataCount: lcaMessage.data.length,
          timestamp: lcaMessage.timestamp,
        }
      );

      // Send the message
      await this.producer.send({
        topic: this.config.lcaTopic,
        messages: [
          {
            value: JSON.stringify(lcaMessage),
            key: fileID,
          },
        ],
      });

      console.log(`LCA message sent to Kafka topic ${this.config.lcaTopic}`);
      return true;
    } catch (error) {
      console.error("Error sending LCA data to Kafka:", error);
      return false;
    }
  }

  /**
   * Batch send multiple LCA data elements
   */
  async sendLcaBatchToKafka(
    lcaElements: LcaElementData[],
    projectName: string,
    filename: string
  ): Promise<boolean> {
    try {
      if (!lcaElements || lcaElements.length === 0) {
        console.log("No LCA elements to send to Kafka");
        return false;
      }

      const BATCH_SIZE = 100; // Maximum elements per batch
      const batches = [];

      // Create batches of elements
      for (let i = 0; i < lcaElements.length; i += BATCH_SIZE) {
        batches.push(lcaElements.slice(i, i + BATCH_SIZE));
      }

      console.log(
        `Sending ${lcaElements.length} LCA elements in ${batches.length} batches`
      );

      let successCount = 0;

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const result = await this.sendLcaDataToKafka(
          batch,
          projectName,
          filename
        );

        if (result) {
          successCount += batch.length;
          console.log(
            `Successfully sent batch ${i + 1}/${batches.length} (${
              batch.length
            } elements)`
          );
        } else {
          console.error(`Failed to send batch ${i + 1}/${batches.length}`);
        }

        // Add a small delay between batches to avoid overwhelming Kafka
        if (batches.length > 1 && i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return successCount > 0;
    } catch (error) {
      console.error("Error sending LCA batch to Kafka:", error);
      return false;
    }
  }

  /**
   * Check if Kafka topic exists, create if not
   */
  async ensureTopicExists(topic: string): Promise<boolean> {
    try {
      // Connect admin client if needed (check if connect method has been called)
      try {
        // Try to list topics - if it fails, we need to connect
        await this.admin.listTopics();
      } catch (error) {
        // If error, we need to connect
        await this.admin.connect();
      }

      // List existing topics
      const topics = await this.admin.listTopics();
      console.log(`Available Kafka topics: ${topics.join(", ")}`);

      // Create topic if it doesn't exist
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
        // Ignore if admin is already disconnected
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
