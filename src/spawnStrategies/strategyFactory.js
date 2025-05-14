// factory to create a strategy instance based on the provided strategy name

import { IntervalStrategy } from './intervalSpawn.js';
import { BurstStrategy } from './burstSpawn.js';
import { BatchStrategy } from './batchSpawn.js';

export class StrategyFactory {
    static create(strategyName, context) {
        switch (strategyName.toLowerCase()) {
            case 'interval':
                return new IntervalStrategy(context);
            case 'burst':
                return new BurstStrategy(context);
            case 'batch':
                return new BatchStrategy(context);
            default:
                throw new Error(`Unknown strategy: ${strategyName}`);
        }
    }
}