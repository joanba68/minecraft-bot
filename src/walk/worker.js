import { createBot } from 'mineflayer';
import { pathfinder } from 'mineflayer-pathfinder';
import { Movements } from 'mineflayer-pathfinder';
import pkg from 'mineflayer-pathfinder';
const { goals } = pkg;
const { GoalXZ } = goals;
import v from "vec3";

import { workerData, parentPort } from "worker_threads";

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

class MCBot {
    // constructor
    constructor() {
        this.username = workerData.username;
        this.host = workerData.host;
        this.port = workerData.port;
        this.version = workerData.version;
        this.box_width = workerData.box_width;
        this.box_center = workerData.box_center;

        if (!this.username || !this.host || !this.port || !this.version) {
            console.log('Missing required parameters');
            process.exit(-1);
        }

        this.initBot();
    }

    // Initialize bot instance
    initBot() {
        console.log(`Bot ${this.username} connecting to ${this.host}:${this.port} with version ${this.version}`);
        this.bot = createBot({
            host: this.host,
            port: this.port,
            username: this.username,
            version: this.version
        });

        this.initEvents();
    }

    nextGoal() {
        let x = this.box_center.x + getRandomInt(this.box_width) - (this.box_width / 2);
        let z = this.box_center.z + getRandomInt(this.box_width) - (this.box_width / 2);
        let ts = Date.now() / 1000;
        console.log(`[WORKER] ${ts} - bot ${this.bot.username} should walk from ${this.bot.entity.position} to ${v(x, this.bot.entity.position.y, z)}`)
        return new GoalXZ(x, z);
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

        // action to perform when bot is spawned
        this.bot.once("spawn", async () => {
            if (this.box_center == null) {
                this.box_center = this.bot.entity.position;
            }

            let defaultMove = new Movements(this.bot)
            defaultMove.allowSprinting = true
            defaultMove.allowFreeMotion = true
            //defaultMove.canDig = false
            // load the pathfinder plugin
            this.bot.loadPlugin(pathfinder)
            this.bot.pathfinder.setMovements(defaultMove)
            // this.bot.pathfinder.thinkTimeout = 60000 // max 60 seconds to find path from start to finish
            while (true) {
                let goal = this.nextGoal();
                try {
                    await this.bot.pathfinder.goto(goal)
                } catch (e) {
                    // if the bot cannot find a path, carry on and let it try to move somewhere else
                    if (e.name != "NoPath" && e.name != "Timeout") {
                        throw e
                    }
                }
            }
        });

        this.bot.on('chat', (username, message) => onChat(parentPort, username, message));
    }
}

// Create bot instance
const bot = new MCBot();
