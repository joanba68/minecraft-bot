export class BatchStrategy{
    constructor(context) {
        this.context = context;
        this.spawnBatchSize = 5;
    }

    async start() {
        const {
            maxBotCount,
            botCountCheckInterval,
            activeWorkers,
            delay,
            initializeWorker,
        } = this.context;

        const spawnBatchSize = parseInt(process.env.SPAWN_BATCH_SIZE) || 10;
        const spawnBatchDelay = parseInt(process.env.SPAWN_BATCH_DELAY) || 40000;

        while(true){
            const currentBotCount = activeWorkers.size;
            if (currentBotCount < maxBotCount) {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${currentBotCount} -> Spawning new batch of bots!`);
                const toSpawn = Math.min(maxBotCount - currentBotCount, spawnBatchSize);

                const promises = [];
                for (let i = 0; i < toSpawn; i++) {
                    const botUsername = `b${Date.now()}_${i}`;
                    promises.push(initializeWorker(botUsername, i === 0));
                }
                await Promise.all(promises);
                console.log(`[MASTER] Spawned ${toSpawn} bots.`);

                if (activeWorkers.size < maxBotCount) {
                    console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} -> Waiting for next batch...`);
                    await delay(spawnBatchDelay);
                }
            } else {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
                await delay(botCountCheckInterval);
            }
        }
    }
}