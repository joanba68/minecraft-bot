import { pathfinder } from 'mineflayer-pathfinder';
import { Movements } from 'mineflayer-pathfinder';
import pkg from 'mineflayer-pathfinder';
const { goals } = pkg;
const { GoalXZ } = goals;
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

        this.initEvents();
    }

    nextGoal() {
        let x = this.box_center.x + getRandomInt(this.box_width) - (this.box_width / 2);
        let z = this.box_center.z + getRandomInt(this.box_width) - (this.box_width / 2);
        let ts = Date.now() / 1000;
        console.log(`[WORKER] ${ts} - bot ${this.username} should walk from ${this.bot.entity.position} to ${v(x, this.bot.entity.position.y, z)}`)
        return new GoalXZ(x, z);
    }

    // Initialize bot events
    initEvents() {
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
    }
}

// Create bot instance
const bot = new MCBot();
