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
            responseBotCount
        } = this.context;

        const botSpawnInterval = parseInt(process.env.BOT_SPAWN_INTERVAL) || 1000;

        let botMetricCount = responseBotCount;

        while (true) {
            const timestamp = Date.now();
            console.log(`[MASTER] ${timestamp} - Active bots: ${activeWorkers.size}`);
    
            if (activeWorkers.size < maxBotCount) {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} -> Spawning new bot!`);
                const botUsername = `b${timestamp}`;
                const isMetricBot = botMetricCount > 0;
                await initializeWorker(botUsername, isMetricBot);
                if (isMetricBot) {
                    botMetricCount--;
                    console.log(`[MASTER] Metric bot spawned: ${botUsername}`);
                }
                const remainingTime = Math.max(0, botSpawnInterval - (Date.now() - timestamp));
                await delay(remainingTime);
            } else {
                console.log(`[MASTER] Target bots: ${maxBotCount}, current bots: ${activeWorkers.size} --> Sufficient bots connected`);
                await delay(botCountCheckInterval);
            }
        }
    }
}
