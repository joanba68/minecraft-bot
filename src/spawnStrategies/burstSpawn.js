export class BurstStrategy{
    constructor(context) {
        this.context = context;
        this.MAX_CONCURRENT_CONNECTIONS = 10;
    }

    async start(){
        const {
            maxBotCount,
            botCountCheckInterval,
            activeWorkers,
            delay,
            initializeWorker,
        } = this.context;

        const spawnBatch = async (count, isFirst = false) => {
            const promises = [];
            const batchSize = Math.min(count, this.MAX_CONCURRENT_CONNECTIONS);
            
            for (let i = 0; i < batchSize; i++) {
                const botUsername = `b${Date.now()}_${i}`;
                promises.push(initializeWorker(botUsername, isFirst && i === 0));
            }
            
            await Promise.all(promises);
            console.log(`[MASTER] Spawned ${batchSize} bots.`);
            
            if (count > batchSize) {
                await delay(1000);
                await spawnBatch(count - batchSize, false);
            }
        };

        await spawnBatch(maxBotCount, true);

        while(true){
            // check if all bots are connected and spawn new ones if not
            if (activeWorkers.size < maxBotCount) {
                const missingBots = maxBotCount - activeWorkers.size;
                console.log(`[MASTER] Missing bots: ${missingBots}. Spawning new bots...`);
                await spawnBatch(missingBots, false);
            } else {
                await delay(botCountCheckInterval);
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
            }
        }
    }
}