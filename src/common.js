
function onChat(parentPort, username, message) {
    const now = Date.now();
    const [sourceServer, targetServer, timestamp] = parseMessage(message);
    const latency = (now - timestamp) / 1000; // in seconds

    parentPort.postMessage({
        type: 'metric',
        sourceServer,
        targetServer,
        latency,
    });
}

function parseMessage(message) {
    //TODO: implement
    return ['source', 'target', 2];
}

export {
    onChat
};
