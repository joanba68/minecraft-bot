import { plugin as movement } from 'mineflayer-movement';
import { Vec3 } from 'vec3';
import v from "vec3";

import { workerData, parentPort } from "worker_threads";

import { AbstractBot } from '../common.js';

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

class MCBot extends AbstractBot {
    // constructor
    constructor() {
        super(parentPort, workerData);

        this.box_width = workerData.box_width;
        this.box_center = workerData.box_center;
        this.walk_update_interval = workerData.walk_update_interval;

        this.initEvents();
    }

    newTarget() {
        let x = this.box_center.x + getRandomInt(this.box_width) - (this.box_width / 2);
        let z = this.box_center.z + getRandomInt(this.box_width) - (this.box_width / 2);
        let ts = Date.now() / 1000;
        console.log(`[WORKER] ${ts} - bot ${this.username} should walk from ${this.bot.entity.position} to ${v(x, this.bot.entity.position.y, z)}`)
        return new Vec3(x, this.bot.entity.position.y, z);
    }

    initEvents() {
        // Movement
        this.bot.once("spawn", async () => {
            console.log(`[WORKER] Bot ${this.username} spawned`);

            this.bot.loadPlugin(movement);
            const { Default } = this.bot.movement.goals // default movement goal
            this.bot.movement.setGoal(Default)
            this.bot.setControlState("forward", true) // bot can move forward
            this.bot.setControlState("sprint", true) // bot can sprint
            this.bot.setControlState("jump", true) // bot can jump

            if (this.box_center == null) {
                this.box_center = this.bot.entity.position;
            }
            
            try{
                let target_reached = false;
                let target = this.newTarget();
                this.bot.movement.heuristic.get('proximity').target(target);
                setInterval(async () => {
                    if (target_reached) { // new target when the current one is reached
                        target_reached = false;
                        target = this.newTarget();
                        this.bot.movement.heuristic.get('proximity').target(target);
                    }
        
                    if (!target_reached) { // move towards the target
                        const yaw = this.bot.movement.getYaw(240, 15, 1);
                        this.bot.movement.steer(yaw);
        
                        // Check if the bot has reached the target
                        const botPosXZ = new Vec3(this.bot.entity.position.x, this.bot.entity.position.y, this.bot.entity.position.z);
                        const targetXZ = new Vec3(target.x, this.bot.entity.position.y, target.z);
        
                        if (botPosXZ.distanceTo(targetXZ) < 8) {
                            target_reached = true;
                        }
                    }
                }, this.walk_update_interval); // Check the bot position every {update_interval} milliseconds
            } catch (e) {
                throw e;
            }
        });
    }    
}

// Create bot instance
const bot = new MCBot();
