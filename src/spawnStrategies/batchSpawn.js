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
            responseBotCount
        } = this.context;

        const spawnBatchSize = parseInt(process.env.SPAWN_BATCH_SIZE) || 10;
        const spawnBatchDelay = parseInt(process.env.SPAWN_BATCH_DELAY) || 40000;

        let botMetricCount = responseBotCount;

        const safeSpawn = async (count) => {
            const toSpawn = Math.min(count, this.MAX_CONCURRENT_CONNECTIONS);
            const promises = [];
            
            for (let i = 0; i < toSpawn; i++) {
                const botUsername = `b${Date.now()}_${i}`;
                const isMetricBot = botMetricCount > 0;
                promises.push(initializeWorker(botUsername, isMetricBot));
                if (isMetricBot) {
                    botMetricCount--;
                    console.log(`[MASTER] Metric bot spawned: ${botUsername}`);
                }
            }
            
            await Promise.all(promises);
            console.log(`[MASTER] Spawned ${toSpawn} bots.`);
            
            if (count > toSpawn) {
                await delay(1000);
                await safeSpawn(count - toSpawn);
            }
        };

        while(true){
            const currentBotCount = activeWorkers.size;
            if (currentBotCount < maxBotCount) {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${currentBotCount} -> Spawning new batch of bots!`);
                const toSpawn = Math.min(maxBotCount - currentBotCount, spawnBatchSize);
                await safeSpawn(toSpawn);

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