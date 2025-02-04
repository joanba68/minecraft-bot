import { createBot } from 'mineflayer';
import { plugin } from 'mineflayer-movement';
import pkg from 'mineflayer-movement';
const { movement } = pkg;
import { Vec3 } from 'vec3';
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

    newTarget() {
        let x = this.box_center.x + getRandomInt(this.box_width) - (this.box_width / 2);
        let z = this.box_center.z + getRandomInt(this.box_width) - (this.box_width / 2);
        let ts = Date.now() / 1000;
        console.log(`[WORKER] ${ts} - bot ${this.bot.username} should walk from ${this.bot.entity.position} to ${v(x, this.bot.entity.position.y, z)}`)
        return new Vec3(x, this.bot.entity.position, z);
    }

    initEvents() {
        this.bot.on('login', () => {
            this.bot.loadPlugin(plugin);
            const { Default } = this.bot.movement.goals // default movement goal
            this.bot.movement.setGoal(Default)
            this.bot.setControlState("forward", true) // bot can move forward
            this.bot.setControlState("sprint", true) // bot can sprint
            this.bot.setControlState("jump", true) // bot can jump
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

        // Movement
        this.bot.once("spawn", async () => {
            console.log(`[WORKER] Bot ${this.bot.username} spawned`);
            if (this.box_center == null) {
                this.box_center = this.bot.entity.position;
            }
            try{
                let target_reached = false;
                let target = this.newTarget();
                this.bot.movement.heuristic.get('proximity').target(target);
                this.bot.on("physicsTick", async () => { 
                    
                    if (target_reached) { // new target when the current one is reached
                        target_reached = false;
                        target = this.newTarget();
                        this.bot.movement.heuristic.get('proximity').target(target);
                    }
                    if (!target_reached) { // move towards the target
                        const yaw = this.bot.movement.getYaw(240, 15, 1)
                        this.bot.movement.steer(yaw)
                        // check if the bot has reached the target
                        const botPosXZ = new Vec3(this.bot.entity.position.x, 0, this.bot.entity.position.z);
                        const targetXZ = new Vec3(target.x, 0, target.z);
                        if (botPosXZ.distanceTo(targetXZ) < 1) {
                            target_reached = true;
                        }
                    }
                    const yaw = this.bot.movement.getYaw(240, 15, 1)
                    this.bot.movement.steer(yaw)
                });
            } catch (e) {
                throw e;
            }
        });
        
        this.bot.on('chat', (username, message) => onChat(parentPort, username, message));
    }    
}

// Create bot instance
const bot = new MCBot();