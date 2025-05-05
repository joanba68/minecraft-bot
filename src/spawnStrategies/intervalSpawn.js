export class IntervalStrategy{
    constructor(context) {
        this.context = context;
    }

    async start() {
        let first = true;
        const {
            maxBotCount,
            botCountCheckInterval,
            activeWorkers,
            delay,
            initializeWorker,
        } = this.context;

        const botSpawnInterval = parseInt(process.env.BOT_SPAWN_INTERVAL) || 1000;

        while (true) {
            const timestamp = Date.now();
            console.log(`[MASTER] ${timestamp} - Active bots: ${activeWorkers.size}`);
    
            if (activeWorkers.size < maxBotCount) {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} -> Spawning new bot!`);
                const botUsername = `b${timestamp}`;
                await initializeWorker(botUsername, first);
                first = false;
                const remainingTime = Math.max(0, botSpawnInterval - (Date.now() - timestamp));
                await delay(remainingTime);
            } else {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
                await delay(botCountCheckInterval);
            }
        }
    }
}
