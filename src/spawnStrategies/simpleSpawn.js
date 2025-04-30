export class DefaultStrategy{
    constructor(context) {
        this.context = context;
        this.spawnBatchSize = 5;
    }

    async start() {
        let first = true;
        let numBotsBatch = 0;
        const {
            maxBotCount,
            botSpawnInterval,
            botCountCheckInterval,
            activeWorkers,
            delay,
            initializeWorker,
        } = this.context;

        while (true) {
            const timestamp = Date.now();
            console.log(`[MASTER] ${timestamp} - Active bots: ${activeWorkers.size}`);
    
            if (activeWorkers.size < maxBotCount) {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} -> Spawning new bot!`);
                const botUsername = `b${timestamp}`;
                if (numBotsBatch < this.spawnBatchSize) {
                    await initializeWorker(botUsername, first);
                    first = false;
                    const remainingTime = Math.max(0, botSpawnInterval - (Date.now() - timestamp));
                    await delay(remainingTime);
                    numBotsBatch++;
                } else {
                    numBotsBatch = 0;
                }
            } else {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
                await delay(botCountCheckInterval);
            }
        }
    }
}