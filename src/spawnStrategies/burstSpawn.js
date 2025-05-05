export class BurstStrategy{
    constructor(context) {
        this.context = context;
        this.spawnBatchSize = 5;
    }

    async start(){
        const {
            maxBotCount,
            botCountCheckInterval,
            activeWorkers,
            delay,
            initializeWorker,
        } = this.context;

        const promises = [];
        for (let i = 0; i < maxBotCount; i++) {
            const botUsername = `b${Date.now()}_${i}`;
            promises.push(initializeWorker(botUsername, i===0));
        }
        await Promise.all(promises);
        console.log(`[MASTER] Spawned ${maxBotCount} bots.`);

        while(true){
            // check if all bots are connected and spawn new ones if not
            if (activeWorkers.size < maxBotCount) {
                const missingBots = maxBotCount - activeWorkers.size;
                console.log(`[MASTER] Missing bots: ${missingBots}. Spawning new bots...`);

                for (let i = 0; i < missingBots; i++) {
                    const botUsername = `b${Date.now()}_${i}`;
                    initializeWorker(botUsername, false);
                }
            } else {
                await delay(botCountCheckInterval);
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size}`);
            }
        }
    }
}