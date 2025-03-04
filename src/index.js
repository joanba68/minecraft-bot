import vec3 from "vec3";
import { Worker } from "worker_threads";
import { register, Gauge } from "prom-client";
import express from "express";

// Bot connection configuration
const botConfig = {
    host: process.env.BOT_HOST || "localhost",
    port: parseInt(process.env.BOT_PORT) || 25565,
    version: process.env.MC_VERSION || "1.20.1",
};

// Bot behavior and spawning settings
const botSpawnInterval = parseInt(process.env.BOT_JOIN_INTERVAL) || 100;
const botCountCheckInterval = parseInt(process.env.BOT_COUNT_INTERVAL) || 1000;
const maxBotCount = parseInt(process.env.BOT_COUNT) || 1;
const movementBoxWidth = parseInt(process.env.BOX_WIDTH) || 10 * 16;
const boxCenterX = parseInt(process.env.BOX_CENTER_X) || NaN;
const boxCenterZ = parseInt(process.env.BOX_CENTER_Z) || NaN;
const walkUpdateInterval = parseInt(process.env.WALK_UPDATE_INTERVAL) || 2000;
const placeBlockInterval = parseInt(process.env.PLACE_BLOCK_INTERVAL) || 5000;
const responseInterval = parseInt(process.env.RESPONSE_INTERVAL) || 1000;
const prometheusPort = parseInt(process.env.PROMETHEUS_PORT) || 9090;
const enableResponseMetric = process.env.RESPONSE_METRIC === "true";

// Worker script selection
const workerScript = process.env.WORKER_TO_RUN || "idle";

// Set to store active bot workers
const activeWorkers = new Set();

// Helper function to create a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const app = express();

const metric = new Gauge({
    name: "server_latency",
    help: "Latency between servers",
    labelNames: ["source", "target"],
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
});
    
app.listen(prometheusPort, () => {
    console.log(`Prometheus metrics available at http://localhost:${prometheusPort}/metrics`);
});

const playerServerMap = new Map();

// Function to initialize and start a bot worker
function initializeWorker(botUsername, first) {
    let boxCenter = null;

    if (!isNaN(boxCenterX) && !isNaN(boxCenterZ)) {
        boxCenter = vec3(boxCenterX, 0, boxCenterZ);
    }

    const workerData = {
        host: botConfig.host,
        port: botConfig.port,
        version: botConfig.version,
        username: botUsername,
        box_width: movementBoxWidth,
        box_center: boxCenter,
        walk_update_interval: walkUpdateInterval,
        place_block_interval: placeBlockInterval,
        response_interval: responseInterval,
        enable_response_metric: enableResponseMetric,
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker(`./src/${workerScript}/worker.js`, { workerData });
        activeWorkers.add(worker);

        worker.on("message", (message) => {
            if (message.type === "login" && message.status === "success" && message.username === botUsername) {
                console.log(`[MASTER] Bot ${botUsername} is ready!`);
                resolve();
            } else if (message.type === "metric") {
                const { sourceServer, targetServer, latency } = message;
                //console.log(`[MASTER] Bot ${botUsername} - Latency from ${sourceServer} to ${targetServer}: ${latency} s`);
                metric.labels(sourceServer, targetServer).set(latency);
            } else if (message.type === "slist") {
                const { server, players } = message;

                for (const player of players) {
                    playerServerMap.set(player, server);
                }

                for (const w of activeWorkers) {
                    w.postMessage({ type: "slist", playerServerMap });
                }
            }
        });
        worker.on("error", (error) => {
            console.error(`[MASTER] Worker error: ${error}`);
            activeWorkers.delete(botUsername);
            reject(error);
        });
        worker.on("exit", (exitCode) => {
            console.error(`[MASTER] Worker stopped with exit code ${exitCode}`);
            activeWorkers.delete(botUsername);
            reject(exitCode);
        });

        if (first) {
            // master worker
            worker.postMessage({ type: "master" });
        }
    });
}

// Main function to manage bot spawning
async function manageBotSpawning() {
    let first = true;
    while (true) {
        const timestamp = Date.now();
        console.log(`[MASTER] ${timestamp} - Active bots: ${activeWorkers.size}`);

        if (activeWorkers.size < maxBotCount) {
            console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} -> Spawning new bot!`);
            const botUsername = `b${timestamp}`;
            await initializeWorker(botUsername, first);
            first = false;
            const remainingTime = Math.max(0, botSpawnInterval - (Date.now() - timestamp));
            await delay(remainingTime);
        } else {
            console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
            await delay(botCountCheckInterval);
        }
    }
}

// Start the bot management loop
manageBotSpawning();
