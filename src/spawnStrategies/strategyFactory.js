// factory to create a strategy instance based on the provided strategy name

import { DefaultStrategy } from './defaultSpawn.js';
import { SimpleStrategy } from './simpleSpawn.js';

export class StrategyFactory {
    static create(strategyName, context) {
        switch (strategyName.toLowerCase()) {
            case 'default':
                return new DefaultStrategy(context);
            case 'simple':
                return new SimpleStrategy(context);
            default:
                throw new Error(`Unknown strategy: ${strategyName}`);
        }
    }
}