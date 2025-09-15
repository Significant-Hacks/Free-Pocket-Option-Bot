# Trading Engine Module

This module provides the enhanced trading execution engine for the AI-powered trading bot, including multi-broker support, advanced risk management, and intelligent trading strategies.

## 📁 File Structure

```
src/trading/
├── trading-controller.js        # Main trading system controller
├── execution/
│   └── trading-engine.js       # Core trading execution engine
├── strategies/
│   └── trading-strategies.js   # Enhanced trading strategies
├── brokers/
│   └── broker-interface.js     # Multi-broker support
├── risk/
│   └── risk-manager.js         # Advanced risk management
├── test-trading-engine.js      # Integration tests
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Basic Setup

```javascript
// Import the Trading Controller
const TradingController = require('./trading-controller.js');

// Create Trading Controller instance
const tradingController = new TradingController({
    enabled: true,
    autoExecute: false, // Start with manual execution for testing
    defaultStrategy: 'ai_enhanced',
    defaultBroker: 'pocket_option',
    ai: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'your-openai-api-key',
        timeout: 30000
    },
    telegram: {
        apiToken: 'your-telegram-bot-token',
        updateInterval: 5000
    },
    trading: {
        maxTradeAmount: 25,
        maxConcurrentTrades: 5,
        riskPerTrade: 2
    }
});

// Initialize the controller
await tradingController.initialize();
```

### 2. Set Up API Keys

```javascript
// Set AI API key
tradingController.setAIApiKey('your-openai-api-key');

// Set Telegram API token
tradingController.setTelegramApiToken('your-telegram-bot-token');

// Set broker API keys
tradingController.setBrokerApiKeys({
    pocket_option: 'your-pocket-option-api-key',
    quotex: 'your-quotex-api-key'
});
```

### 3. Add Telegram Channels

```javascript
// Add a Telegram channel to monitor
const channel = await tradingController.addTelegramChannel('channel_id_or_username', {
    name: 'VIP Trading Signals',
    vip: true,
    broker: 'pocket_option',
    minConfidence: 80
});

console.log(`Added channel: ${channel.title}`);
```

### 4. Start Trading

```javascript
// Start the trading controller
await tradingController.start();

// Enable auto-execution when ready
tradingController.setAutoExecute(true);

console.log('Trading Controller started successfully');
```

## 🔧 Configuration

### Trading Controller Configuration

```javascript
const config = {
    enabled: true,                    // Enable/disable trading
    autoExecute: true,                // Enable automatic trade execution
    defaultStrategy: 'ai_enhanced',    // Default trading strategy
    defaultBroker: 'pocket_option',    // Default broker
    updateInterval: 1000,             // Update interval in milliseconds
    maxConcurrentAnalysis: 5,        // Maximum concurrent analysis tasks
    
    // AI Configuration
    ai: {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'your-api-key',
        timeout: 30000
    },
    
    // Telegram Configuration
    telegram: {
        apiToken: 'your-bot-token',
        updateInterval: 5000,
        maxChannels: 50
    },
    
    // Trading Configuration
    trading: {
        maxTradeAmount: 25,
        maxConcurrentTrades: 5,
        maxExecutionTime: 10000,
        executionRetryAttempts: 3
    },
    
    // Risk Configuration
    risk: {
        maxDailyLoss: 100,
        maxTradeAmount: 25,
        maxConcurrentTrades: 5,
        riskPerTrade: 2,
        confidenceThreshold: 70
    }
};
```

### Risk Management Configuration

```javascript
const riskConfig = {
    maxDailyLoss: 100,              // Maximum daily loss limit
    maxTradeAmount: 25,             // Maximum amount per trade
    maxConcurrentTrades: 5,        // Maximum concurrent trades
    maxDailyTrades: 20,             // Maximum trades per day
    riskPerTrade: 2,                // Risk percentage per trade (2%)
    stopLossEnabled: true,          // Enable stop-loss
    takeProfitEnabled: true,        // Enable take-profit
    riskRewardRatio: 2,             // Risk-reward ratio (1:2)
    martingaleEnabled: true,        // Enable martingale strategy
    maxMartingaleLevels: 5,        // Maximum martingale levels
    martingaleMultiplier: 2.0,      // Martingale multiplier
    accountRiskLimit: 10,           // Account risk limit (10%)
    confidenceThreshold: 70         // Minimum confidence threshold
};
```

## 📊 Trading Strategies

### Available Strategies

#### 1. CCI Strategy
```javascript
// Execute CCI strategy
const result = await tradingController.tradingEngine.executeStrategy(
    'cci', 
    marketData, 
    timestamp, 
    { period: 20 }
);
```

#### 2. Candles Strategy
```javascript
// Execute candles strategy
const result = await tradingController.tradingEngine.executeStrategy(
    'candles', 
    marketData, 
    timestamp, 
    { candleCount: 4 }
);
```

#### 3. Pin Bar Strategy
```javascript
// Execute pin bar strategy
const result = await tradingController.tradingEngine.executeStrategy(
    'pinBar', 
    marketData, 
    timestamp, 
    { multiplier: 4 }
);
```

#### 4. Signals Strategy
```javascript
// Execute signals strategy
const result = await tradingController.tradingEngine.executeStrategy(
    'signals', 
    marketData, 
    timestamp, 
    {
        signalData: { signals: [2, 2, 1, 0, 0, 0] },
        thresholds: [2, 2, 1, 0, 0, 0]
    }
);
```

#### 5. AI-Enhanced Strategy
```javascript
// Execute AI-enhanced strategy (combines all strategies)
const result = await tradingController.tradingEngine.executeStrategy(
    'ai_enhanced', 
    marketData, 
    timestamp, 
    {
        aiAnalysis: aiAnalysisResult,
        strategyWeights: {
            cci: 0.25,
            candles: 0.25,
            pinBar: 0.25,
            signals: 0.25
        }
    }
);
```

## 🏦 Broker Integration

### Supported Brokers

#### 1. Pocket Option
```javascript
// Set up Pocket Option
tradingController.setBrokerApiKeys({
    pocket_option: 'your-pocket-option-api-key'
});

// Execute trade on Pocket Option
const result = await tradingController.tradingEngine.executeManualTrade({
    action: 'CALL',
    asset: 'EUR/USD',
    amount: 10,
    expiration: 300,
    broker: 'pocket_option',
    isDemo: true
});
```

#### 2. Quotex
```javascript
// Set up Quotex
tradingController.setBrokerApiKeys({
    quotex: 'your-quotex-api-key'
});

// Execute trade on Quotex
const result = await tradingController.tradingEngine.executeManualTrade({
    action: 'PUT',
    asset: 'BTC/USD',
    amount: 15,
    expiration: 600,
    broker: 'quotex',
    isDemo: false
});
```

### Broker Capabilities

```javascript
// Get broker information
const brokerInfo = tradingController.tradingEngine.brokerInterface.getBrokerInfo('pocket_option');
console.log('Broker capabilities:', brokerInfo.capabilities);

// Get all supported brokers
const supportedBrokers = tradingController.tradingEngine.brokerInterface.getSupportedBrokers();
console.log('Supported brokers:', supportedBrokers.length);

// Test broker connection
const connectionStatus = await tradingController.tradingEngine.brokerInterface.testBrokerConnection('pocket_option');
console.log('Connection status:', connectionStatus);
```

## 🛡️ Risk Management

### Risk Assessment

```javascript
// Assess trade risk
const tradeParams = {
    action: 'CALL',
    asset: 'EUR/USD',
    amount: 10,
    expiration: 300,
    confidence: 75
};

const riskAssessment = await tradingController.tradingEngine.riskManager.assessTradeRisk(tradeParams);

if (riskAssessment.approved) {
    console.log('Trade approved with amount:', riskAssessment.finalPositionSize);
    console.log('Risk level:', riskAssessment.riskLevel);
    console.log('Risk score:', riskAssessment.riskScore);
} else {
    console.log('Trade rejected:', riskAssessment.reason);
}
```

### Position Sizing

```javascript
// Calculate optimal position size
const optimalSize = tradingController.tradingEngine.riskManager.calculateOptimalPositionSize(tradeParams);
console.log('Optimal position size:', optimalSize);

// Calculate martingale position size
const martingaleSize = tradingController.tradingEngine.riskManager.calculateMartingalePositionSize(
    10, // base amount
    2   // loss streak
);
console.log('Martingale position size:', martingaleSize);
```

### Performance Tracking

```javascript
// Get risk metrics
const riskMetrics = tradingController.tradingEngine.riskManager.getRiskMetrics();
console.log('Risk metrics:', riskMetrics);

// Get performance metrics
const performanceMetrics = tradingController.tradingEngine.riskManager.getPerformanceMetrics();
console.log('Performance metrics:', performanceMetrics);
```

## 📈 Event Handling

### Available Events

```javascript
// System events
tradingController.addEventHandler('initialized', (data) => {
    console.log('Trading Controller initialized:', data.success);
});

tradingController.addEventHandler('started', (data) => {
    console.log('Trading Controller started:', data.success);
});

tradingController.addEventHandler('stopped', (data) => {
    console.log('Trading Controller stopped:', data.success);
});

// Trading events
tradingController.addEventHandler('signalProcessed', (data) => {
    console.log('Signal processed:', data.result.success);
});

tradingController.addEventHandler('enhancedTradeExecuted', (data) => {
    console.log('Enhanced trade executed:', data.executionResult.success);
});

tradingController.addEventHandler('tradeClosed', (data) => {
    console.log('Trade closed:', data.tradeId, 'Profit:', data.trade.profit);
});

tradingController.addEventHandler('tradeExpired', (data) => {
    console.log('Trade expired:', data.tradeId);
});

tradingController.addEventHandler('tradeCancelled', (data) => {
    console.log('Trade cancelled:', data.tradeId);
});

// Error events
tradingController.addEventHandler('signalError', (data) => {
    console.error('Signal error:', data.error);
});

tradingController.addEventHandler('analysisError', (data) => {
    console.error('Analysis error:', data.error);
});

// Configuration events
tradingController.addEventHandler('configUpdated', (data) => {
    console.log('Configuration updated');
});

tradingController.addEventHandler('enabledChanged', (data) => {
    console.log('Trading enabled:', data.enabled);
});

tradingController.addEventHandler('autoExecuteChanged', (data) => {
    console.log('Auto-execute:', data.autoExecute);
});
```

## 📊 Monitoring and Metrics

### Performance Metrics

```javascript
// Get comprehensive performance metrics
const metrics = tradingController.getPerformanceMetrics();
console.log('Performance Metrics:', {
    uptime: metrics.uptimeFormatted,
    totalAnalysis: metrics.totalAnalysis,
    successfulAnalysis: metrics.successfulAnalysis,
    successRate: metrics.successRate.toFixed(1) + '%',
    queueSize: metrics.queueSize,
    isProcessing: metrics.isProcessing
});
```

### System Status

```javascript
// Get system status
const status = tradingController.getStatus();
console.log('System Status:', {
    initialized: status.initialized,
    running: status.running,
    enabled: status.enabled,
    autoExecute: status.autoExecute,
    queueSize: status.queue.size,
    isProcessing: status.queue.processing
});
```

### Active Trades

```javascript
// Get active trades
const activeTrades = tradingController.getActiveTrades();
console.log('Active trades:', activeTrades.length);

// Get specific trade
const trade = tradingController.getTrade('trade_id');
if (trade) {
    console.log('Trade details:', trade);
}
```

### Trade History

```javascript
// Get trade history
const tradeHistory = tradingController.getTradeHistory(100);
console.log('Recent trades:', tradeHistory.length);

// Calculate win rate
const winningTrades = tradeHistory.filter(t => t.profit > 0);
const winRate = (winningTrades.length / tradeHistory.length) * 100;
console.log('Win rate:', winRate.toFixed(1) + '%');
```

## 🧪 Testing

Run the integration tests:

```javascript
const { runExample } = require('./test-trading-engine.js');
runExample();
```

The test suite will verify:
- Trading controller initialization
- Configuration management
- Strategy execution
- Risk management
- Broker integration
- Trade execution flow
- Performance metrics

## 🛠️ Advanced Usage

### Custom Strategy Implementation

```javascript
// Create custom strategy
class CustomStrategy {
    analyze(marketData, timestamp, options) {
        // Your custom strategy logic here
        return {
            strategy: 'custom',
            signal: 'CALL', // or 'PUT'
            confidence: 75,
            reasoning: 'Custom strategy analysis'
        };
    }
}

// Add to trading engine
tradingController.tradingEngine.strategies.custom = new CustomStrategy();
```

### Manual Trade Execution

```javascript
// Execute manual trade with enhanced analysis
const tradeParams = {
    action: 'CALL',
    asset: 'EUR/USD',
    amount: 10,
    expiration: 300,
    confidence: 80
};

const result = await tradingController.tradingEngine.executeManualTrade(tradeParams);
console.log('Manual trade result:', result);
```

### Trade Management

```javascript
// Cancel active trade
const cancelResult = await tradingController.tradingEngine.cancelTrade('trade_id');
console.log('Cancel result:', cancelResult.success);

// Get trade details
const tradeDetails = tradingController.tradingEngine.getTrade('trade_id');
console.log('Trade details:', tradeDetails);
```

### Configuration Updates

```javascript
// Update trading configuration
tradingController.updateConfig({
    enabled: true,
    autoExecute: true,
    trading: {
        maxTradeAmount: 50,
        maxConcurrentTrades: 10
    }
});

// Update risk configuration
tradingController.updateConfig({
    risk: {
        maxDailyLoss: 200,
        riskPerTrade: 1.5,
        confidenceThreshold: 75
    }
});
```

## 🔄 Integration with AI System

### AI-Enhanced Trading

```javascript
// The trading controller automatically integrates with the AI system
// When a trading signal is received from Telegram, it:

// 1. Analyzes the signal with AI
tradingController.aiController.analyzeSignal(signal);

// 2. Runs multiple trading strategies
const strategyResults = await Promise.all([
    tradingController.tradingEngine.executeStrategy('cci', marketData, timestamp),
    tradingController.tradingEngine.executeStrategy('candles', marketData, timestamp),
    tradingController.tradingEngine.executeStrategy('pinBar', marketData, timestamp)
]);

// 3. Selects the best strategy
const bestStrategy = tradingController.selectBestStrategy(strategyResults);

// 4. Assesses risk
const riskAssessment = await tradingController.tradingEngine.riskManager.assessTradeRisk(tradeParams);

// 5. Executes trade if conditions are met
if (riskAssessment.approved && tradingController.config.autoExecute) {
    const result = await tradingController.tradingEngine.executeTrade(tradeParams);
}
```

## 📝 API Reference

### TradingController

#### Constructor
```javascript
new TradingController(config)
```

#### Methods
- `initialize()` - Initialize the trading controller
- `start()` - Start trading operations
- `stop()` - Stop trading operations
- `addTelegramChannel(channelId, channelInfo)` - Add Telegram channel
- `removeTelegramChannel(channelId)` - Remove Telegram channel
- `setAIApiKey(apiKey)` - Set AI API key
- `setTelegramApiToken(apiToken)` - Set Telegram API token
- `setBrokerApiKeys(brokerKeys)` - Set broker API keys
- `getActiveTrades()` - Get active trades
- `getTradeHistory(limit)` - Get trade history
- `getPerformanceMetrics()` - Get performance metrics
- `getStatus()` - Get system status
- `addEventHandler(event, handler)` - Add event handler
- `removeEventHandler(event, handlerId)` - Remove event handler
- `updateConfig(newConfig)` - Update configuration
- `setEnabled(enabled)` - Enable/disable trading
- `setAutoExecute(autoExecute)` - Enable/disable auto-execution
- `reset()` - Reset trading controller
- `destroy()` - Cleanup and destroy

#### Events
- `initialized` - Trading controller initialized
- `started` - Trading controller started
- `stopped` - Trading controller stopped
- `signalProcessed` - Signal processed
- `enhancedTradeExecuted` - Enhanced trade executed
- `tradeClosed` - Trade closed
- `tradeExpired` - Trade expired
- `tradeCancelled` - Trade cancelled
- `signalError` - Signal error
- `analysisError` - Analysis error
- `configUpdated` - Configuration updated
- `enabledChanged` - Trading enabled changed
- `autoExecuteChanged` - Auto-execute changed

## 🛡️ Troubleshooting

### Common Issues

#### 1. Trading Controller Not Initializing
```javascript
// Check if all required configurations are set
if (!config.ai.apiKey) {
    console.log('Please set your AI API key');
    tradingController.setAIApiKey('your-api-key');
}

if (!config.telegram.apiToken) {
    console.log('Please set your Telegram API token');
    tradingController.setTelegramApiToken('your-telegram-token');
}
```

#### 2. Trades Not Executing
```javascript
// Check if trading is enabled and auto-execution is on
const status = tradingController.getStatus();
if (!status.enabled) {
    console.log('Trading is disabled');
    tradingController.setEnabled(true);
}

if (!status.autoExecute) {
    console.log('Auto-execution is disabled');
    tradingController.setAutoExecute(true);
}
```

#### 3. Risk Management Blocking Trades
```javascript
// Check risk assessment
const riskMetrics = tradingController.tradingEngine.riskManager.getRiskMetrics();
console.log('Risk metrics:', riskMetrics);

// Check if daily loss limit reached
if (riskMetrics.accountData.dailyPnL <= -riskMetrics.accountData.maxDrawdown) {
    console.log('Daily loss limit reached');
}
```

#### 4. Broker Connection Issues
```javascript
// Test broker connections
const brokers = ['pocket_option', 'quotex'];
for (const broker of brokers) {
    const connectionStatus = await tradingController.tradingEngine.brokerInterface.testBrokerConnection(broker);
    console.log(`${broker} connection:`, connectionStatus);
}
```

## 📄 License

This module is part of the AI Trading Bot project. See the main project license for details.

## 🤝 Contributing

When contributing to this module:
1. Follow the existing code style
2. Add comprehensive tests for new features
3. Update documentation
4. Ensure all existing tests pass

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Run the test suite to identify problems
3. Review the event handling documentation
4. Check performance metrics for optimization opportunities