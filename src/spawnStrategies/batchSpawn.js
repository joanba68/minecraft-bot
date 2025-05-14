export class BatchStrategy{
    constructor(context) {
        this.context = context;
        this.MAX_CONCURRENT_CONNECTIONS = 10;
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

        const safeSpawn = async (count, isFirst = false) => {
            const toSpawn = Math.min(count, this.MAX_CONCURRENT_CONNECTIONS);
            const promises = [];
            
            for (let i = 0; i < toSpawn; i++) {
                const botUsername = `b${Date.now()}_${i}`;
                promises.push(initializeWorker(botUsername, isFirst && i === 0));
            }
            
            await Promise.all(promises);
            console.log(`[MASTER] Spawned ${toSpawn} bots.`);
            
            if (count > toSpawn) {
                await delay(1000);
                await safeSpawn(count - toSpawn, false);
            }
        };

        while(true){
            const currentBotCount = activeWorkers.size;
            if (currentBotCount < maxBotCount) {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${currentBotCount} -> Spawning new batch of bots!`);
                const toSpawn = Math.min(maxBotCount - currentBotCount, spawnBatchSize);
                await safeSpawn(toSpawn, currentBotCount === 0);

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