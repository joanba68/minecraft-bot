import { workerData, parentPort } from "worker_threads";

import { AbstractBot } from '../common.js';

class MCBot extends AbstractBot {
    // constructor
    constructor() {
        super(parentPort, workerData);
    }
}

// Create bot instance
const bot = new MCBot();
