/**
 * AI Controller - Main AI integration controller
 * Coordinates all AI components and provides unified interface
 */

class AIController {
    constructor(config = {}) {
        this.config = {
            ...config,
            aiConfigPath: config.aiConfigPath || '/src/ai/config/ai-config.json'
        };
        
        this.aiModel = null;
        this.telegramIntegration = null;
        this.signalAnalyzer = null;
        this.isInitialized = false;
        this.eventHandlers = new Map();
        
        this.performanceMetrics = {
            startTime: Date.now(),
            totalSignalsProcessed: 0,
            successfulSignals: 0,
            failedSignals: 0,
            averageProcessingTime: 0,
            averageConfidence: 0,
            uptime: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize AI controller
     */
    async initialize() {
        try {
            console.log('Initializing AI Controller...');
            
            // Load configuration
            await this.loadConfiguration();
            
            // Initialize AI model
            await this.initializeAIModel();
            
            // Initialize Telegram integration
            await this.initializeTelegramIntegration();
            
            // Initialize signal analyzer
            await this.initializeSignalAnalyzer();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.isInitialized = true;
            this.performanceMetrics.startTime = Date.now();
            
            console.log('AI Controller initialized successfully');
            this.emitEvent('initialized', { success: true });
            
        } catch (error) {
            console.error('Failed to initialize AI Controller:', error);
            this.emitEvent('initialized', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Load configuration
     */
    async loadConfiguration() {
        try {
            // In a real implementation, this would load from the config file
            // For now, we'll use default configuration
            this.config.ai = {
                provider: 'openai',
                model: 'gpt-4',
                apiKey: '', // Will be set by user
                apiEndpoint: 'https://api.openai.com/v1/chat/completions',
                maxTokens: 1000,
                temperature: 0.7,
                timeout: 30000,
                retryAttempts: 3,
                retryDelay: 1000
            };
            
            this.config.telegram = {
                apiToken: '', // Will be set by user
                apiEndpoint: 'https://api.telegram.org',
                messageRetention: 1000,
                updateInterval: 5000,
                maxChannels: 50
            };
            
            this.config.analysis = {
                confidenceThreshold: 70,
                minHistoricalSignals: 10,
                maxAnalysisTime: 10000,
                signalKeywords: [
                    'call', 'put', 'buy', 'sell', 'entry', 'trade',
                    'up', 'down', 'high', 'low', 'strike'
                ],
                timeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d'],
                assets: [
                    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
                    'BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD'
                ],
                brokers: ['pocket_option', 'quotex', 'binomo', 'iq_option']
            };
            
            console.log('Configuration loaded successfully');
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
            throw error;
        }
    }

    /**
     * Initialize AI model
     */
    async initializeAIModel() {
        try {
            // Import AI Model Interface
            const AIModelInterface = require('./models/ai-model-interface.js');
            
            this.aiModel = new AIModelInterface(this.config.ai);
            
            // Note: API key needs to be set by user
            if (!this.config.ai.apiKey) {
                console.warn('AI API key not set. AI functionality will be limited.');
                return;
            }
            
            await this.aiModel.initialize();
            console.log('AI Model initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize AI Model:', error);
            throw error;
        }
    }

    /**
     * Initialize Telegram integration
     */
    async initializeTelegramIntegration() {
        try {
            // Import Telegram Integration
            const TelegramIntegration = require('./telegram/telegram-integration.js');
            
            this.telegramIntegration = new TelegramIntegration(this.config.telegram);
            
            // Note: API token needs to be set by user
            if (!this.config.telegram.apiToken) {
                console.warn('Telegram API token not set. Telegram functionality will be limited.');
                return;
            }
            
            await this.telegramIntegration.initialize();
            console.log('Telegram Integration initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Telegram Integration:', error);
            throw error;
        }
    }

    /**
     * Initialize signal analyzer
     */
    async initializeSignalAnalyzer() {
        try {
            // Import Signal Analyzer
            const SignalAnalyzer = require('./analysis/signal-analyzer.js');
            
            this.signalAnalyzer = new SignalAnalyzer(this.config.analysis);
            
            // Set AI model if available
            if (this.aiModel) {
                this.signalAnalyzer.setAIModel(this.aiModel);
            }
            
            await this.signalAnalyzer.initialize();
            console.log('Signal Analyzer initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Signal Analyzer:', error);
            throw error;
        }
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        if (this.telegramIntegration) {
            // Handle trading signals from Telegram
            this.telegramIntegration.addSignalHandler((signal) => {
                this.handleTradingSignal(signal);
            });
            
            // Handle general messages
            this.telegramIntegration.addMessageHandler((channelId, message) => {
                this.handleTelegramMessage(channelId, message);
            });
        }
    }

    /**
     * Handle trading signal
     */
    async handleTradingSignal(signal) {
        try {
            console.log(`Processing trading signal from channel ${signal.channelId}`);
            
            // Analyze signal
            const analysis = await this.analyzeSignal(signal);
            
            // Update metrics
            this.updateSignalMetrics(true, analysis);
            
            // Emit event
            this.emitEvent('signalAnalyzed', { signal, analysis });
            
            // If signal is good enough, emit trading event
            if (analysis.isSignal && analysis.confidence >= this.config.analysis.confidenceThreshold) {
                this.emitEvent('tradingSignal', {
                    signal: signal,
                    analysis: analysis,
                    tradingParams: analysis.tradingParams
                });
            }
            
        } catch (error) {
            console.error('Failed to handle trading signal:', error);
            this.updateSignalMetrics(false, null);
            this.emitEvent('signalError', { signal, error: error.message });
        }
    }

    /**
     * Handle Telegram message
     */
    handleTelegramMessage(channelId, message) {
        // Emit message event for general message handling
        this.emitEvent('telegramMessage', { channelId, message });
    }

    /**
     * Analyze signal
     */
    async analyzeSignal(signal) {
        if (!this.signalAnalyzer) {
            throw new Error('Signal analyzer not initialized');
        }
        
        return await this.signalAnalyzer.analyzeSignal(signal);
    }

    /**
     * Add Telegram channel
     */
    async addTelegramChannel(channelId, channelInfo = {}) {
        if (!this.telegramIntegration) {
            throw new Error('Telegram integration not initialized');
        }
        
        const channel = await this.telegramIntegration.addChannel(channelId, channelInfo);
        this.emitEvent('channelAdded', { channel });
        return channel;
    }

    /**
     * Remove Telegram channel
     */
    removeTelegramChannel(channelId) {
        if (!this.telegramIntegration) {
            throw new Error('Telegram integration not initialized');
        }
        
        const success = this.telegramIntegration.removeChannel(channelId);
        if (success) {
            this.emitEvent('channelRemoved', { channelId });
        }
        return success;
    }

    /**
     * Get all Telegram channels
     */
    getTelegramChannels() {
        if (!this.telegramIntegration) {
            return [];
        }
        
        return this.telegramIntegration.getAllChannels();
    }

    /**
     * Get channel information
     */
    getChannelInfo(channelId) {
        if (!this.telegramIntegration) {
            return null;
        }
        
        return this.telegramIntegration.getChannel(channelId);
    }

    /**
     * Set AI API key
     */
    setAIApiKey(apiKey) {
        if (!this.aiModel) {
            throw new Error('AI model not initialized');
        }
        
        this.config.ai.apiKey = apiKey;
        this.aiModel.updateConfig({ apiKey });
        
        // Reinitialize if needed
        if (apiKey && !this.aiModel.isReady()) {
            this.aiModel.initialize().catch(error => {
                console.error('Failed to reinitialize AI model with new API key:', error);
            });
        }
        
        this.emitEvent('aiApiKeySet', { success: true });
    }

    /**
     * Set Telegram API token
     */
    setTelegramApiToken(apiToken) {
        if (!this.telegramIntegration) {
            throw new Error('Telegram integration not initialized');
        }
        
        this.config.telegram.apiToken = apiToken;
        this.telegramIntegration.updateConfig({ apiToken: apiToken });
        
        // Reinitialize if needed
        if (apiToken && !this.telegramIntegration.isReady()) {
            this.telegramIntegration.initialize().catch(error => {
                console.error('Failed to reinitialize Telegram integration with new API token:', error);
            });
        }
        
        this.emitEvent('telegramApiTokenSet', { success: true });
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update component configurations
        if (this.aiModel && newConfig.ai) {
            this.aiModel.updateConfig(newConfig.ai);
        }
        
        if (this.telegramIntegration && newConfig.telegram) {
            this.telegramIntegration.updateConfig(newConfig.telegram);
        }
        
        if (this.signalAnalyzer && newConfig.analysis) {
            this.signalAnalyzer.updateConfig(newConfig.analysis);
        }
        
        this.emitEvent('configUpdated', { config: this.config });
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const now = Date.now();
        const uptime = now - this.performanceMetrics.startTime;
        
        return {
            ...this.performanceMetrics,
            uptime: uptime,
            uptimeFormatted: this.formatUptime(uptime),
            aiModelMetrics: this.aiModel ? this.aiModel.getPerformanceMetrics() : null,
            telegramMetrics: this.telegramIntegration ? this.telegramIntegration.getPerformanceMetrics() : null,
            analyzerMetrics: this.signalAnalyzer ? this.signalAnalyzer.getPerformanceMetrics() : null
        };
    }

    /**
     * Format uptime
     */
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Update signal metrics
     */
    updateSignalMetrics(success, analysis) {
        this.performanceMetrics.totalSignalsProcessed++;
        
        if (success) {
            this.performanceMetrics.successfulSignals++;
            
            if (analysis && analysis.confidence) {
                const total = this.performanceMetrics.successfulSignals;
                const avgConfidence = (this.performanceMetrics.averageConfidence * (total - 1) + analysis.confidence) / total;
                this.performanceMetrics.averageConfidence = avgConfidence;
            }
        } else {
            this.performanceMetrics.failedSignals++;
        }
    }

    /**
     * Add event handler
     */
    addEventHandler(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        
        const handlers = this.eventHandlers.get(event);
        const id = this.generateHandlerId();
        handlers.push({ id, handler });
        
        return id;
    }

    /**
     * Remove event handler
     */
    removeEventHandler(event, handlerId) {
        if (!this.eventHandlers.has(event)) {
            return false;
        }
        
        const handlers = this.eventHandlers.get(event);
        const index = handlers.findIndex(h => h.id === handlerId);
        
        if (index !== -1) {
            handlers.splice(index, 1);
            return true;
        }
        
        return false;
    }

    /**
     * Emit event
     */
    emitEvent(event, data) {
        if (!this.eventHandlers.has(event)) {
            return;
        }
        
        const handlers = this.eventHandlers.get(event);
        handlers.forEach(({ handler }) => {
            try {
                handler(data);
            } catch (error) {
                console.error(`Event handler failed for event ${event}:`, error);
            }
        });
    }

    /**
     * Generate handler ID
     */
    generateHandlerId() {
        return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            aiModelReady: this.aiModel ? this.aiModel.isReady() : false,
            telegramReady: this.telegramIntegration ? this.telegramIntegration.isReady() : false,
            analyzerReady: this.signalAnalyzer ? true : false,
            config: this.getConfig(),
            metrics: this.getPerformanceMetrics()
        };
    }

    /**
     * Get configuration
     */
    getConfig() {
        return {
            ai: { ...this.config.ai, apiKey: this.config.ai.apiKey ? '***' : '' },
            telegram: { ...this.config.telegram, apiToken: this.config.telegram.apiToken ? '***' : '' },
            analysis: { ...this.config.analysis }
        };
    }

    /**
     * Check if controller is ready
     */
    isReady() {
        return this.isInitialized &&
               (!this.aiModel || this.aiModel.isReady()) &&
               (!this.telegramIntegration || this.telegramIntegration.isReady()) &&
               this.signalAnalyzer;
    }

    /**
     * Start processing
     */
    async start() {
        if (!this.isReady()) {
            throw new Error('AI Controller is not ready');
        }
        
        console.log('Starting AI Controller...');
        this.emitEvent('started', { success: true });
    }

    /**
     * Stop processing
     */
    async stop() {
        console.log('Stopping AI Controller...');
        
        // Stop Telegram integration
        if (this.telegramIntegration) {
            this.telegramIntegration.stopUpdatePolling();
        }
        
        this.emitEvent('stopped', { success: true });
    }

    /**
     * Destroy controller and cleanup
     */
    async destroy() {
        console.log('Destroying AI Controller...');
        
        // Stop processing
        await this.stop();
        
        // Destroy components
        if (this.aiModel) {
            this.aiModel.destroy();
        }
        
        if (this.telegramIntegration) {
            this.telegramIntegration.destroy();
        }
        
        if (this.signalAnalyzer) {
            this.signalAnalyzer.destroy();
        }
        
        // Clear event handlers
        this.eventHandlers.clear();
        
        this.isInitialized = false;
        console.log('AI Controller destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIController;
} else if (typeof window !== 'undefined') {
    window.AIController = AIController;
}