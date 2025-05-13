# Minecraft Bot

Different types of bots have been designed, each with different behaviors that can be modified through environment variables. Likewise, different strategies have been defined to determine how the bots connect to the server. The behavior of these strategies can also be adjusted using environment variables.

## Environment Variables

### Bot Connection

- ```BOT_HOST``` - Minecraft server address the bots should connect to
- ```BOT_PORT``` - Port to connect to the Minecraft server

### BOT WORKERS

- ```WORKER_TO_RUN``` - Type of bot to run [simple-walk|miner|pvp]
- ```BOT_COUNT``` - Number of bots to spawn

### Bounding Box

- ```BOX_WIDTH``` - Width of the bounding box the bot will move within
- ```BOX_CENTER_X``` - X coordinate of the bounding box center
- ```BOX_CENTER_Z``` - Z coordinate of the bounding box center

### Metrics

- ```PROMETHEUS_PORT```
- ```RESPONSE_METRIC``` - [true|false] enable or disable the latency metric (bots will or will not send messages in the chat)
- ```RESPONSE_INTERVAL``` - Time interval that must pass between sending one chat message and the next

### SPAWN BEHAVIOR

- ```SPAWN_STRATEGY``` - Spawn strategy to follow for connecting bots to the server [interval|burst|batch]
- ```SPAWN_BATCH_SIZE``` - (batch strategy) number of bots in the batch
- ```SPAWN_BATCH_DELAY``` - (batch strategy) time interval between the connection of one batch of bots and the next
- ```BOT_SPAWN_INTERVAL``` - (interval strategy) waiting time interval between the connection of one bot and the next
- ```BOT_COUNT_INTERVAL``` - How often the bots' connection to the server should be checked (to verify if all are still connected)

### BOT BEHAVIOR

- ```WALK_UPDATE_INTERVAL``` - (simple-walk bot) how often the bot should check its position to move toward the assigned point
- ```PLACE_BLOCK_INTERVAL``` - (miner bot) time interval between placing one block and the next
- ```ATTACK_INTERVAL``` - (pvp bot) duration the bot should continuously attack
- ```ATTACK_COOLDOWN``` - (pvp bot) time that must pass between the end of one attack round and the start of the next

## Types of bots

### Simple-walk Bot

This bot moves randomly within a box.

### Miner Bot

This bot moves randomly within a box, just like the simple-walk bot. Additionally, at regular intervals, the bot places a block and then immediately destroys it. This behavior is repeated over time. 

### PVP Bot

This bot moves randomly within a box, just like the simple-walk bot. Additionally, when another bot is within 8 blocks or less, it will start attacking the other bot for a set amount of time. Once the attack time is over, there will be a cooldown period during which the bot continues moving randomly until the cooldown ends and it encounters another nearby bot.

## Spawn Strategies

### Interval Strategy (default)

Bots connect one by one in an orderly manner. After one bot connects, there is a waiting interval before the next one connects.

### Batch Strategy

Bots connect in batches. All bots in a batch connect simultaneously in parallel. Once a batch has connected, there is a waiting interval before launching the next batch of bots to connect.

### Burst Strategy

All bots connect to the server at once in parallel. There are no delays between one connection and the next.