import { workerData, parentPort } from "worker_threads";

import { AbstractBot } from '../common.js';

class MCBot extends AbstractBot {
    // constructor
    constructor() {
        super(parentPort, workerData);

        this.initEvents();
    }


    // Initialize bot events
    initEvents() {
        // this.bot.on('chat', (username, message, translate, jsonMsg, matches) => {
        //     console.log(`[WORKER] Bot ${this.bot.username} received message from ${username}: ${jsonMsg}`);
        // });
        this.bot.on('message', async (jsonMsg, position, sender, verified) => {
            console.log(`[WORKER] Bot ${this.username} received message at ${position} from ${sender}: ${jsonMsg}`);
            await super.onMessage(jsonMsg, position);
        });
    }
}

// Create bot instance
const bot = new MCBot();
