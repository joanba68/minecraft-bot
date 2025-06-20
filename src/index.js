import vec3 from "vec3";
import { Worker } from "worker_threads";
import { register, Gauge } from "prom-client";
import express from "express";
import { StrategyFactory } from "./spawnStrategies/strategyFactory.js";
import { parse } from "path";

// Bot connection configuration
const botConfig = {
    host: process.env.BOT_HOST || "localhost",
    port: parseInt(process.env.BOT_PORT) || 25565,
    version: process.env.MC_VERSION || "1.20.1",
};

// Spawn settings
const spawnStrategyName = process.env.SPAWN_STRATEGY || "interval";
const botCountCheckInterval = parseInt(process.env.BOT_COUNT_INTERVAL) || 1000;
const maxBotCount = parseInt(process.env.BOT_COUNT) || 1000;
// Bot behavior settings
const movementBoxWidth = parseInt(process.env.BOX_WIDTH) || 10 * 16;
const boxCenterX = parseInt(process.env.BOX_CENTER_X) || NaN;
const boxCenterZ = parseInt(process.env.BOX_CENTER_Z) || NaN;
const walkUpdateInterval = parseInt(process.env.WALK_UPDATE_INTERVAL) || 2000; // simple-walk bot
const placeBlockInterval = parseInt(process.env.PLACE_BLOCK_INTERVAL) || 5000; // miner bot
const attackInterval = parseInt(process.env.ATTACK_INTERVAL) || 10000; // pvp bot
const attackCooldown = parseInt(process.env.ATTACK_COOLDOWN) || 10000; // pvp bot
const prometheusPort = parseInt(process.env.PROMETHEUS_PORT) || 9090;
const enableResponseMetric = process.env.RESPONSE_METRIC === "true"; // latency metric
const responseInterval = parseInt(process.env.RESPONSE_INTERVAL) || 1000; // latency metric
const responseBotCount = parseInt(process.env.RESPONSE_BOT_COUNT) || 5; // latency metric

// Worker script selection
const workerScript = process.env.WORKER_TO_RUN || "idle";

// Set to store active bot workers
const activeWorkers = new Set();

// Helper function to create a delay
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

process.on("SIGTERM", () => {
    console.log("[MASTER] Received SIGTERM, shutting down...");
    for (const worker of activeWorkers) {
        worker.terminate();
    }
    process.exit(0);
});

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
        attack_interval: attackInterval,
        attack_cooldown: attackCooldown,
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
            activeWorkers.delete(worker);
            reject(error);
        });
        worker.on("exit", (exitCode) => {
            console.error(`[MASTER] Worker stopped with exit code ${exitCode}`);
            activeWorkers.delete(worker);
            reject(exitCode);
        });

        if (first) {
            // master worker
            worker.postMessage({ type: "master" });
        }
    });
}

// Manage bot spawning (create strategy and start it)
const strategyConfig = {
    botCountCheckInterval,
    maxBotCount,
    activeWorkers,
    delay,
    initializeWorker,
    responseBotCount
};

// Create and run strategy
const strategy = StrategyFactory.create(spawnStrategyName, strategyConfig);
strategy.start();