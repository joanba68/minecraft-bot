import { createBot } from 'mineflayer';
class AbstractBot {
    constructor(parentPort, workerData) {
        this.parentPort = parentPort;
        this.username = workerData.username;
        this.host = workerData.host;
        this.port = workerData.port;
        this.version = workerData.version;
        
        this.playerServerMap = new Map();
        
        if (!this.username || !this.host || !this.port || !this.version) {
            console.log('Missing required parameters');
            process.exit(-1);
        }

        console.log(`[WORKER] Bot ${this.username} connecting to ${this.host}:${this.port} with version ${this.version}`);
        this.bot = createBot({
            host: this.host,
            port: this.port,
            username: this.username,
            version: this.version
        });

        this.bot.on('login', () => {
            console.log(`[WORKER] Bot ${this.username} logged in`);
            parentPort.postMessage({ type: 'login', status: 'success', username: this.username });
        });
        this.bot.on('end', (e) => {
            console.log(`[WORKER] Bot ${this.username} disconnected: ${e}`);
            process.exit(-1);
        });
        this.bot.on('kicked', (e) => {
            console.log(`[WORKER] Bot ${this.username} kicked: ${e}`);
            process.exit(-1);
        });
        this.bot.on('error', (e) => {
            console.log(`[WORKER] Bot ${this.username} error: ${e}`);
            process.exit(-1);
        });
    }

    onMessage(jsonMsg, position) {
        switch (position) {
            case 'chat':
                this.onChat(jsonMsg);
                break;
            case 'system':
                this.parseSlistMessage(jsonMsg);
                break;
            default:
                console.error(`Unknown message position: ${position}`);
                break;
        }
    }

    parseSlistMessage(msg) {
        if (!msg.extra || msg.extra.length < 3 || !msg.extra[0].text.startsWith('[')) return; // Ignore unrelated messages
        
        const serverName = msg.extra[0].text.replace(/\[|\]/g, ''); // Extract server name
        const playerListText = msg.extra[2].text; // Extract player names
        
        if (!playerListText) return; // Skip empty player lists
        
        const players = playerListText.split(', ').map(p => p.trim());
        players.forEach(player => {
            this.playerServerMap.set(player, serverName);
        });
    }

    async onChat(message) {
        const now = Date.now();

        const username = message.with[0].text;
        const timestamp = parseInt(message.with[1].text);
        
        const sourceServer = await this.lookupPlayer(username);
        const targetServer = await this.lookupPlayer(this.username);

        const latency = (now - timestamp) / 1000; // in seconds

        this.parentPort.postMessage({
            type: 'metric',
            sourceServer,
            targetServer,
            latency,
        });
    }

    async lookupPlayer(username, retries = 3) {
        let server = this.playerServerMap.get(username);
        let attempts = 0;
        while (!server) {
            console.warn(`Player ${username} not found in playerServerMap. Requesting slist...`);
            this.bot.chat('/slist');
            try {
                await asyncCallWithTimeout(this.bot.awaitMessage(/There are \d+ out of \d+ players online/), 3000);
            } catch {
                console.warn('Failed to receive slist message within 3 seconds.');
            }
            server = this.playerServerMap.get(username);
            attempts++;
            if (attempts >= retries) {
                console.error(`Failed to find player ${username} in playerServerMap after ${retries} attempts.`);
                break;
            }
        }
        return server;
    }
}

const asyncCallWithTimeout = async (asyncPromise, timeLimit) => {
    let timeoutHandle;

    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutHandle = setTimeout(
            () => reject(new Error('Async call timeout limit reached')),
            timeLimit
        );
    });

    return Promise.race([asyncPromise, timeoutPromise]).then(result => {
        clearTimeout(timeoutHandle);
        return result;
    })
}

export {
    AbstractBot
};
