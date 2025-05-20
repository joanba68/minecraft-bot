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
            responseBotCount
        } = this.context;

        let botMetricCount = responseBotCount;

        const spawnBatch = async (count, isFirst = false) => {
            const promises = [];
            const batchSize = Math.min(count, this.MAX_CONCURRENT_CONNECTIONS);
            
            for (let i = 0; i < batchSize; i++) {
                const botUsername = `b${Date.now()}_${i}`;
                const isMetricBot = botMetricCount > 0;
                promises.push(initializeWorker(botUsername, isMetricBot));
                if (isMetricBot) {
                    botMetricCount--;
                    console.log(`[MASTER] Metric bot spawned: ${botUsername}`);
                }
            }
            
            await Promise.all(promises);
            console.log(`[MASTER] Spawned ${batchSize} bots.`);
            
            if (count > batchSize) {
                await delay(1000);
                await spawnBatch(count - batchSize);
            }
        };

        await spawnBatch(maxBotCount, true);

        while(true){
            // check if all bots are connected and spawn new ones if not
            if (activeWorkers.size < maxBotCount) {
                const missingBots = maxBotCount - activeWorkers.size;
                console.log(`[MASTER] Missing bots: ${missingBots}. Spawning new bots...`);
                await spawnBatch(missingBots);
            } else {
                await delay(botCountCheckInterval);
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
            }
        }
    }
}