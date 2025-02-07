import { createBot } from 'mineflayer';

class AbstractBot {
    constructor(parentPort, workerData) {
        this.parentPort = parentPort;
        this.username = workerData.username;
        this.host = workerData.host;
        this.port = workerData.port;
        this.version = workerData.version;

        this.response_interval = workerData.response_interval;
        
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

            // Start the response interval
            setInterval(() => {
                const timestamp = Date.now();
                this.bot.chat(`${timestamp}`);
            }, this.response_interval);
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

        // this.bot.on('chat', (username, message, translate, jsonMsg, matches) => {
        //     console.log(`[WORKER] Bot ${this.bot.username} received message from ${username}: ${jsonMsg}`);
        // });
        this.bot.on('message', (jsonMsg, position, sender, verified) => {
            //console.log(`[WORKER] Bot ${this.username} received message at ${position} from ${sender}: ${jsonMsg}`);
            this.onMessage(jsonMsg, position);
        });

        this.parentPort.on('message', (msg) => {
            // master worker
            if (msg.type === 'master') {
                setInterval(() => {
                    this.bot.chat('/slist');
                }, this.response_interval);
            } else if (msg.type === 'slist') {
                const { playerServerMap } = msg;
                for (const [player, server] of playerServerMap)
                    this.playerServerMap.set(player, server);
            }
        });
    }

    onMessage(jsonMsg, position) {
        switch (position) {
            case 'system':
                this.parseSlistMessage(jsonMsg);
                break;
            case 'chat':
                this.onChat(jsonMsg);
                break;
            default:
                console.error(`Unknown message position: ${position}`);
                break;
        }
    }

    parseSlistMessage(msg) {
        if (!msg.extra || msg.extra.length < 3 || !msg.extra[0].text.startsWith('[')) return; // Ignore unrelated messages
        
        const server = msg.extra[0].text.replace(/\[|\]/g, ''); // Extract server name
        const playerListText = msg.extra[2].text; // Extract player names
        
        if (!playerListText) return; // Skip empty player lists
        
        const players = playerListText.split(', ').map(p => p.trim());
        players.forEach(player => {
            this.playerServerMap.set(player, server);
        });

        this.parentPort.postMessage({
            type: 'slist',
            server,
            players,
        });
    }

    onChat(message) {
        const now = Date.now();

        const username = message.with[0].text;
        const timestamp = parseInt(message.with[1].text);
        
        const sourceServer = this.playerServerMap.get(username);
        const targetServer = this.playerServerMap.get(this.username);

        if (!sourceServer || !targetServer) {
            console.log(`[WORKER] Bot ${this.username} could not find server for ${username}`);
            return;
        }

        const latency = (now - timestamp) / 1000; // in seconds

        this.parentPort.postMessage({
            type: 'metric',
            sourceServer,
            targetServer,
            latency,
        });
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
