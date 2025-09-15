# AI Integration Module

This module provides the core AI-powered functionality for the trading bot, including Telegram signal analysis, AI model integration, and signal processing.

## 📁 File Structure

```
src/ai/
├── ai-config.json              # AI configuration file
├── ai-controller.js            # Main AI controller
├── models/
│   └── ai-model-interface.js   # AI model interface
├── telegram/
│   └── telegram-integration.js # Telegram integration
├── analysis/
│   └── signal-analyzer.js      # Signal analysis engine
├── test-ai-integration.js      # Integration tests
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Basic Setup

```javascript
// Import the AI Controller
const AIController = require('./ai-controller.js');

// Create AI Controller instance
const aiController = new AIController({
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
    analysis: {
        confidenceThreshold: 70,
        maxAnalysisTime: 10000
    }
});

// Initialize the controller
await aiController.initialize();
```

### 2. Add Telegram Channels

```javascript
// Add a Telegram channel to monitor
const channel = await aiController.addTelegramChannel('channel_id_or_username', {
    name: 'VIP Trading Signals',
    vip: true,
    broker: 'pocket_option',
    minConfidence: 80
});

console.log(`Added channel: ${channel.title}`);
```

### 3. Handle Trading Signals

```javascript
// Set up event handler for trading signals
aiController.addEventHandler('tradingSignal', (data) => {
    console.log('🎯 Trading Signal Received:');
    console.log(`   Asset: ${data.tradingParams.asset}`);
    console.log(`   Action: ${data.tradingParams.action}`);
    console.log(`   Confidence: ${data.tradingParams.confidence}%`);
    console.log(`   Amount: $${data.tradingParams.amount}`);
    
    // Execute trade logic here
    if (data.tradingParams.confidence >= 80) {
        executeTrade(data.tradingParams);
    }
});
```

### 4. Start Processing

```javascript
// Start the AI processing
await aiController.start();
console.log('AI Controller started successfully');
```

## 🔧 Configuration

### AI Configuration

```javascript
const aiConfig = {
    provider: 'openai',           // AI provider (openai, anthropic, local)
    model: 'gpt-4',               // AI model to use
    apiKey: 'your-api-key',       // API key for the AI service
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    maxTokens: 1000,              // Maximum tokens for AI responses
    temperature: 0.7,             // AI response randomness (0-1)
    timeout: 30000,               // Request timeout in milliseconds
    retryAttempts: 3,             // Number of retry attempts
    retryDelay: 1000              // Delay between retries in milliseconds
};
```

### Telegram Configuration

```javascript
const telegramConfig = {
    apiToken: 'your-bot-token',   // Telegram bot API token
    apiEndpoint: 'https://api.telegram.org',
    messageRetention: 1000,        // Number of messages to retain
    updateInterval: 5000,         // Polling interval in milliseconds
    maxChannels: 50               // Maximum number of channels to monitor
};
```

### Analysis Configuration

```javascript
const analysisConfig = {
    confidenceThreshold: 70,       // Minimum confidence for valid signals
    minHistoricalSignals: 10,     // Minimum signals for historical analysis
    maxAnalysisTime: 10000,       // Maximum time for signal analysis
    signalKeywords: [              // Keywords to identify trading signals
        'call', 'put', 'buy', 'sell', 'entry', 'trade',
        'up', 'down', 'high', 'low', 'strike'
    ],
    timeframes: [                 // Supported timeframes
        '1m', '5m', '15m', '30m', '1h', '4h', '1d'
    ],
    assets: [                     // Supported trading assets
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
        'BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD'
    ],
    brokers: [                    // Supported brokers
        'pocket_option', 'quotex', 'binomo', 'iq_option'
    ]
};
```

## 📊 Event Handling

The AI Controller emits various events that you can listen to:

### Available Events

```javascript
// System events
aiController.addEventHandler('initialized', (data) => {
    console.log('AI Controller initialized:', data.success);
});

aiController.addEventHandler('started', (data) => {
    console.log('AI Controller started:', data.success);
});

aiController.addEventHandler('stopped', (data) => {
    console.log('AI Controller stopped:', data.success);
});

// Signal events
aiController.addEventHandler('signalAnalyzed', (data) => {
    console.log('Signal analyzed:', data.analysis.confidence + '% confidence');
});

aiController.addEventHandler('tradingSignal', (data) => {
    console.log('Trading signal ready for execution');
    // Execute trade here
});

aiController.addEventHandler('signalError', (data) => {
    console.error('Signal analysis error:', data.error);
});

// Telegram events
aiController.addEventHandler('telegramMessage', (data) => {
    console.log('Telegram message received:', data.channelId);
});

aiController.addEventHandler('channelAdded', (data) => {
    console.log('Channel added:', data.channel.title);
});

aiController.addEventHandler('channelRemoved', (data) => {
    console.log('Channel removed:', data.channelId);
});

// Configuration events
aiController.addEventHandler('configUpdated', (data) => {
    console.log('Configuration updated');
});

aiController.addEventHandler('aiApiKeySet', (data) => {
    console.log('AI API key set:', data.success);
});

aiController.addEventHandler('telegramApiTokenSet', (data) => {
    console.log('Telegram API token set:', data.success);
});
```

## 📈 Performance Monitoring

### Get Performance Metrics

```javascript
const metrics = aiController.getPerformanceMetrics();
console.log('Performance Metrics:', {
    uptime: metrics.uptimeFormatted,
    totalSignalsProcessed: metrics.totalSignalsProcessed,
    successfulSignals: metrics.successfulSignals,
    failedSignals: metrics.failedSignals,
    averageConfidence: metrics.averageConfidence.toFixed(1) + '%',
    successRate: metrics.successRate.toFixed(1) + '%'
});
```

### Get System Status

```javascript
const status = aiController.getStatus();
console.log('System Status:', {
    initialized: status.initialized,
    aiModelReady: status.aiModelReady,
    telegramReady: status.telegramReady,
    analyzerReady: status.analyzerReady
});
```

## 🔍 Advanced Usage

### Dynamic Configuration Updates

```javascript
// Update AI API key
aiController.setAIApiKey('new-api-key');

// Update Telegram token
aiController.setTelegramApiToken('new-telegram-token');

// Update analysis configuration
aiController.updateConfig({
    analysis: {
        confidenceThreshold: 75,
        maxAnalysisTime: 15000
    }
});
```

### Channel Management

```javascript
// Get all channels
const channels = aiController.getTelegramChannels();
console.log('Monitored channels:', channels.length);

// Get specific channel info
const channelInfo = aiController.getChannelInfo('channel_id');
console.log('Channel info:', channelInfo);

// Remove channel
aiController.removeTelegramChannel('channel_id');
```

### Custom Signal Processing

```javascript
// Add custom signal handler
aiController.addEventHandler('signalAnalyzed', (data) => {
    const analysis = data.analysis;
    
    // Custom logic based on analysis
    if (analysis.isSignal && analysis.confidence > 85) {
        console.log('High-confidence signal detected!');
        
        // Additional processing
        const customParams = {
            ...analysis.tradingParams,
            customRiskLevel: calculateCustomRisk(analysis),
            customNotes: generateCustomNotes(analysis)
        };
        
        // Execute with custom parameters
        executeCustomTrade(customParams);
    }
});
```

## 🧪 Testing

Run the integration tests:

```javascript
const { runExample } = require('./test-ai-integration.js');
runExample();
```

The test suite will verify:
- AI Controller initialization
- Configuration management
- Signal analysis functionality
- Event handling
- Performance metrics

## 🛠️ Troubleshooting

### Common Issues

#### 1. AI Model Not Initializing
```javascript
// Check if API key is set
if (!aiController.getConfig().ai.apiKey) {
    console.log('Please set your AI API key:');
    aiController.setAIApiKey('your-api-key');
}
```

#### 2. Telegram Integration Not Working
```javascript
// Check if Telegram token is set
if (!aiController.getConfig().telegram.apiToken) {
    console.log('Please set your Telegram API token:');
    aiController.setTelegramApiToken('your-telegram-token');
}
```

#### 3. Signal Analysis Failing
```javascript
// Check signal analyzer status
const status = aiController.getStatus();
if (!status.analyzerReady) {
    console.log('Signal analyzer not ready');
}
```

#### 4. Performance Issues
```javascript
// Check performance metrics
const metrics = aiController.getPerformanceMetrics();
console.log('Average processing time:', metrics.averageProcessingTime + 'ms');

// If processing time is high, consider:
// - Reducing maxAnalysisTime
// - Increasing confidenceThreshold
// - Optimizing AI model parameters
```

## 📝 API Reference

### AIController

#### Constructor
```javascript
new AIController(config)
```

#### Methods
- `initialize()` - Initialize the AI controller
- `start()` - Start processing signals
- `stop()` - Stop processing
- `destroy()` - Cleanup and destroy
- `addTelegramChannel(channelId, channelInfo)` - Add Telegram channel
- `removeTelegramChannel(channelId)` - Remove Telegram channel
- `setAIApiKey(apiKey)` - Set AI API key
- `setTelegramApiToken(apiToken)` - Set Telegram API token
- `updateConfig(newConfig)` - Update configuration
- `getPerformanceMetrics()` - Get performance metrics
- `getStatus()` - Get system status
- `addEventHandler(event, handler)` - Add event handler
- `removeEventHandler(event, handlerId)` - Remove event handler

#### Events
- `initialized` - AI controller initialized
- `started` - AI controller started
- `stopped` - AI controller stopped
- `signalAnalyzed` - Signal analyzed
- `tradingSignal` - Trading signal ready
- `signalError` - Signal analysis error
- `telegramMessage` - Telegram message received
- `channelAdded` - Channel added
- `channelRemoved` - Channel removed
- `configUpdated` - Configuration updated
- `aiApiKeySet` - AI API key set
- `telegramApiTokenSet` - Telegram API token set

## 🔄 Migration Guide

### From v1 to v2
1. Configuration structure has changed - update your config objects
2. Event handling has been improved - update your event listeners
3. Performance metrics have been enhanced - check new metrics available
4. Added support for multiple AI providers - explore new provider options

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