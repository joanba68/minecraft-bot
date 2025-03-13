import { plugin as movement} from 'mineflayer-movement';
import { Vec3 } from 'vec3';
import v from "vec3";
import { workerData, parentPort, threadId } from "worker_threads";
import { AbstractBot } from '../common.js';
import { setUncaughtExceptionCaptureCallback } from 'process';

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
        this.place_block_interval = workerData.place_block_interval;
        this.inventarySlot = 44; // most right slot in the inventory
        this.start = true;

        this.initEvents();
    }

    newTarget() {
        let x = this.box_center.x + getRandomInt(this.box_width) - (this.box_width / 2);
        let z = this.box_center.z + getRandomInt(this.box_width) - (this.box_width / 2);
        let ts = Date.now() / 1000;
        console.log(`[WORKER] ${ts} - bot ${this.username} should walk from ${this.bot.entity.position} to ${v(x, this.bot.entity.position.y, z)}`)
        return new Vec3(x, this.bot.entity.position.y, z);
    }

    async waitForBotToStop() {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                const velocity = this.bot.entity.velocity;
                //console.log(`[WORKER] Bot ${this.username} current velocity: x=${velocity.x}, y=${velocity.y}, z=${velocity.z}`);
                if (velocity.x === 0 && velocity.z === 0) {
                    clearInterval(interval);
                    //console.log(`[WORKER] Bot ${this.username} has stopped moving.`);
                    resolve();
                }
            }, 100); // Check every 100ms
        });
    }


    async build() {
        // Wait for the bot to stop moving
        this.bot.clearControlStates();
        await this.waitForBotToStop();
    
        const referenceBlock = this.bot.blockAt(this.bot.entity.position.offset(0, -1, 2));
        try {
            await this.bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
            await this.bot.look(this.bot.entity.yaw, 0); // Reset pitch to 0 (neutral position)
        } catch (e) {
            if (e instanceof Error && e.message === "must be holding an item to place") {
                console.error(`[WORKER] Bot ${this.username} is not holding any block to place.`);
            } else {
                throw(e);
            }
        }
    }

    async dig() {
        // targets block to dig
        const targetBlock = this.bot.blockAt(this.bot.entity.position.offset(0, 0, 2))
        if (targetBlock && this.bot.canDigBlock(targetBlock)) {
            //console.log(`[WORKER] Bot ${this.username} started digging ${target.name}`);
            try {
                await this.bot.dig(targetBlock, "ignore"); // Dig the block
                //console.log(`[WORKER] Bot ${this.username} successfully dug ${target.name}.`);
            } catch (e) {
                console.error(`[WORKER] Bot ${this.username} failed to dig ${targetBlock.name}:`, e);
            }
        }
    }

    async move() {
        let target_reached = false;
        let target = this.newTarget();
        this.bot.movement.heuristic.get('proximity').target(target);

        const startMoving = () => {
            this.bot.setControlState("forward", true);
            this.bot.setControlState("sprint", true);
            this.bot.setControlState("jump", true);
        };

        startMoving();
        
        // Interval for placing blocks every 5 seconds
        const placeBlockInterval = setInterval(async () => {
            try {
                await this.build();
                this.bot.waitForTicks(40);
                await this.dig();
                this.bot.waitForTicks(40);
                startMoving();
            } catch (e) {
                console.error("Error placing block:", e);
            }
        }, this.place_block_interval);

        try{
            const moveInterval = setInterval(async () => {
                // Check if the bot has reached the current target
                if (this.bot.entity.position.distanceTo(target) < 8) {
                    target = this.newTarget(); // Generate a new random target
                    this.bot.movement.heuristic.get('proximity').target(target);
                } else {
                    // Steer towards the current target
                    const yaw = this.bot.movement.getYaw(240, 15, 1);
                    this.bot.movement.steer(yaw);
                }
                if (this.inventarySlot <= 36) { // if no blocks available in the inventory, stop placing/digging blocks
                    clearInterval(placeBlockInterval);
                }
            }, this.walk_update_interval); // Check the bot position every {update_interval} milliseconds
        } catch (e) {
            clearInterval(moveInterval);
            clearInterval(placeBlockInterval);
            throw e;
        }
    }

    initEvents() {
        this.bot.once("spawn", async () => {
            console.log(`[WORKER] Bot ${this.username} spawned`);
            if (this.box_center == null) {
                this.box_center = this.bot.entity.position;
            }

            this.bot.loadPlugin(movement);
            const { Default } = this.bot.movement.goals // default movement goal
            this.bot.movement.setGoal(Default)

            this.bot.inventory.on('updateSlot:36', async (oldItem, newItem) => {
                try {
                    //console.log(`[WORKER] updated slot 36 from ${JSON.stringify(oldItem)} to ${JSON.stringify(newItem)}`);
                    if (newItem.name === "grass_block") {
                        if (this.start) {
                            console.log(`[WORKER] ${this.username} recieved ${JSON.stringify(newItem.name)}`);
                            this.start = false;
                            await this.move();
                        }
                    }
                } catch (e) {
                    if (this.inventarySlot > 36) {
                        console.log(`[WORKER] ${this.username} waiting for bot to change item from slot ${this.inventarySlot} to slot 36`);
                        await this.bot.moveSlotItem(this.inventarySlot, 36); // Move the block from the inventory to the hand
                        this.inventarySlot--;
                    } else {
                        console.log(`[WORKER] ${this.username} failed to change item from slot ${this.inventarySlot} to slot 36`);
                    }
                }
            });
        });
    }
}

// Create bot instance
const bot = new MCBot();