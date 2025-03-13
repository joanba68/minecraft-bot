import { plugin as movement} from 'mineflayer-movement';
import { Vec3 } from 'vec3';
import v from "vec3";
import { workerData, parentPort, threadId } from "worker_threads";
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
        this.attack_interval = workerData.attack_interval;
        this.attack_cooldown = workerData.attack_cooldown

        this.initEvents();
    }

    newTarget() {
        let x = this.box_center.x + getRandomInt(this.box_width) - (this.box_width / 2);
        let z = this.box_center.z + getRandomInt(this.box_width) - (this.box_width / 2);
        let ts = Date.now() / 1000;
        console.log(`[WORKER] ${ts} - bot ${this.username} should walk from ${this.bot.entity.position} to ${v(x, this.bot.entity.position.y, z)}`)
        return new Vec3(x, this.bot.entity.position.y, z);
    }

    async move() {
        let target = this.newTarget();

        this.bot.setControlState("forward", true);
        this.bot.setControlState("sprint", true);
        this.bot.setControlState("jump", true);

        this.bot.movement.heuristic.get('proximity').target(target);

        let attackTimeout = null;
        let attackInterval = null;
        let isOnCooldown = false;
        let cooldownTimeout = null;

        // Function to start attacking a player
        const startAttacking = (nearPlayer) => {
            if (!attackInterval && !isOnCooldown) {
                attackInterval = setInterval(() => {
                    this.bot.movement.heuristic.get('proximity').target(nearPlayer.position); // Move towards the player
                    this.bot.lookAt(nearPlayer.position.offset(0, nearPlayer.height, 0)); // Look at the player
                    this.bot.attack(nearPlayer); // Attack the player every 100ms
                }, 50);

                // Stop attacking and resume random movement after 10 seconds
                if (attackTimeout) clearTimeout(attackTimeout);
                attackTimeout = setTimeout(() => {
                    console.log(`[WORKER] Bot ${this.username} is resuming random movement`);
                    stopAttacking();
                    target = this.newTarget(); // Generate a new random target
                    this.bot.movement.heuristic.get('proximity').target(target);

                    // Start cooldown period (20 seconds)
                    isOnCooldown = true;
                    if (cooldownTimeout) clearTimeout(cooldownTimeout);
                    cooldownTimeout = setTimeout(() => {
                        isOnCooldown = false; // End cooldown period
                        console.log(`[WORKER] Bot ${this.username} is ready to attack again`);
                    }, this.attack_cooldown); // 20 seconds cooldown
                }, this.attack_interval); // 10 seconds attack duration
            }
        };

        // Stop attacking and resume random movement
        const stopAttacking = () => {
            if (attackInterval) {
                clearInterval(attackInterval); // Stop the attack interval
                attackInterval = null; // Reset attack interval
            }
        };

        // Controls the bot's movement
        const handleMovement = () => {
            // Check if the bot has reached the current target
            if (this.bot.entity.position.distanceTo(target) < 8) {
                target = this.newTarget(); // Generate a new random target
                this.bot.movement.heuristic.get('proximity').target(target);
            } else {
                // Steer towards the current target
                const yaw = this.bot.movement.getYaw(240, 15, 1);
                this.bot.movement.steer(yaw);

                // Check if the bot is near a player
                const nearPlayer = this.bot.nearestEntity((entity) => entity.type === "player");
                if (nearPlayer && !isOnCooldown) { // Only attack if not on cooldown
                    if (this.bot.entity.position.distanceTo(nearPlayer.position) < 8) {
                        startAttacking(nearPlayer); // Start attacking the player
                    }
                }
            }
        };
        
        // Start the movement interval
        const moveInterval = setInterval(handleMovement, this.walk_update_interval);
    }

    
    initEvents() {
        this.bot.once("spawn", async () => {
            console.log(`[WORKER] Bot ${this.username} spawned`);
            if (this.box_center == null) {
                this.box_center = this.bot.entity.position;
            }
            this.bot.loadPlugin(movement);
            const { Default } = this.bot.movement.goals; // default movement goal
            this.bot.movement.setGoal(Default);

            // Start moving bot
            await this.move();
        });
    }
}

// Create bot instance
const bot = new MCBot();
