const duckdb = require("duckdb");
const nodeFetch = require("node-fetch");
require("dotenv").config();

interface KbobMaterial {
  id: string;
  uuid: string;
  nameDE: string;
  nameFR: string;
  density: string;
  unit: string;
  gwpTotal: number;
  gwpProduction: number;
  gwpDisposal: number;
  ubp21Total: number;
  ubpProduction: number;
  ubpDisposal: number;
  primaryEnergyNonRenewableTotal: number;
  biogenicCarbon: number;
}

interface KbobResponse {
  materials: KbobMaterial[];
}

interface QueryResult {
  count: number;
}

const db = new duckdb.Database("kbob_materials.db");

async function populateDatabase() {
  try {
    if (!process.env.KBOB_API_KEY) {
      throw new Error("KBOB_API_KEY environment variable is not set");
    }

    console.log("Fetching materials from KBOB API...");
    const response = await nodeFetch(
      "https://www.lcadata.ch/api/kbob/materials?pageSize=all",
      {
        headers: {
          "x-api-key": process.env.KBOB_API_KEY,
        },
      }
    );

    const data = (await response.json()) as KbobResponse;
    console.log(`Fetched ${data.materials.length} materials from API`);

    // Drop and recreate table
    console.log("Creating materials table...");
    db.exec(`DROP TABLE IF EXISTS materials;`);
    db.exec(`
      CREATE TABLE materials (
        id VARCHAR,
        uuid VARCHAR,
        nameDE VARCHAR,
        nameFR VARCHAR,
        density VARCHAR,
        unit VARCHAR,
        gwpTotal DOUBLE,
        gwpProduction DOUBLE,
        gwpDisposal DOUBLE,
        ubp21Total DOUBLE,
        ubpProduction DOUBLE,
        ubpDisposal DOUBLE,
        primaryEnergyNonRenewableTotal DOUBLE,
        biogenicCarbon DOUBLE
      )
    `);

    // Insert data
    console.log("Inserting materials...");
    for (const material of data.materials) {
      db.exec(`
        INSERT INTO materials VALUES (
          '${material.id}',
          '${material.uuid}',
          '${material.nameDE?.replace(/'/g, "''")}',
          '${material.nameFR?.replace(/'/g, "''")}',
          '${material.density}',
          '${material.unit}',
          ${material.gwpTotal || 0},
          ${material.gwpProduction || 0},
          ${material.gwpDisposal || 0},
          ${material.ubp21Total || 0},
          ${material.ubpProduction || 0},
          ${material.ubpDisposal || 0},
          ${material.primaryEnergyNonRenewableTotal || 0},
          ${material.biogenicCarbon || 0}
        )
      `);
    }

    // Verify data using a Promise wrapper
    const count = await new Promise<number>((resolve, reject) => {
      db.all(
        "SELECT COUNT(*) as count FROM materials",
        (err: Error | null, rows: QueryResult[]) => {
          if (err) reject(err);
          else resolve(rows[0].count);
        }
      );
    });

    console.log(`Successfully populated database with ${count} materials`);
  } catch (error) {
    console.error("Error populating database:", error);
    process.exit(1);
  } finally {
    db.close();
  }
}

populateDatabase();
