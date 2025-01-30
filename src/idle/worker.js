import { createBot } from 'mineflayer';

import { workerData, parentPort } from "worker_threads";

import { onChat } from '../common.js';

class MCBot {
    // constructor
    constructor() {
        this.username = workerData.username;
        this.host = workerData.host;
        this.port = workerData.port;
        this.version = workerData.version;

        this.initBot();
    }

    // Initialize bot instance
    initBot() {
        console.log(`[WORKER] Bot ${this.username} connecting to ${this.host}:${this.port} with version ${this.version}`);
        this.bot = createBot({
            host: this.host,
            port: this.port,
            username: this.username,
            version: this.version
        });

        this.initEvents();
    }

    // Initialize bot events
    initEvents() {
        this.bot.on('login', () => {
            console.log(`[WORKER] Bot ${this.bot.username} logged in`);
            parentPort.postMessage({ type: 'login', status: 'success', username: this.bot.username });
        });
        this.bot.on('end', (e) => {
            console.log(`[WORKER] Bot ${this.bot.username} disconnected: ${e}`);
            process.exit(-1);
        });
        this.bot.on('kicked', (e) => {
            console.log(`[WORKER] Bot ${this.bot.username} kicked: ${e}`);
            process.exit(-1);
        });
        this.bot.on('error', (e) => {
            console.log(`[WORKER] Bot ${this.bot.username} error: ${e}`);
            process.exit(-1);
        });
        this.bot.on('chat', (username, message) => onChat(parentPort, username, message));
    }
}

// Create bot instance
const bot = new MCBot();
