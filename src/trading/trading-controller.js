/**
 * Trading Controller - Main trading system controller
 * Integrates AI analysis, trading strategies, and execution engine
 */

class TradingController {
    constructor(config = {}) {
        this.config = {
            enabled: true,
            autoExecute: true,
            defaultStrategy: 'ai_enhanced',
            defaultBroker: 'pocket_option',
            updateInterval: 1000,
            maxConcurrentAnalysis: 5,
            ...config
        };
        
        this.aiController = null;
        this.tradingEngine = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        this.eventHandlers = new Map();
        this.analysisQueue = [];
        this.isProcessingAnalysis = false;
        
        this.performanceMetrics = {
            startTime: Date.now(),
            totalAnalysis: 0,
            successfulAnalysis: 0,
            failedAnalysis: 0,
            averageAnalysisTime: 0,
            uptime: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize trading controller
     */
    async initialize() {
        try {
            console.log('Initializing Trading Controller...');
            
            // Initialize AI controller
            await this.initializeAIController();
            
            // Initialize trading engine
            await this.initializeTradingEngine();
            
            // Set up integrations
            this.setupIntegrations();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.isInitialized = true;
            this.performanceMetrics.startTime = Date.now();
            
            console.log('Trading Controller initialized successfully');
            this.emitEvent('initialized', { success: true });
            
        } catch (error) {
            console.error('Failed to initialize Trading Controller:', error);
            this.emitEvent('initialized', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Initialize AI controller
     */
    async initializeAIController() {
        try {
            const AIController = require('../ai/ai-controller.js');
            
            this.aiController = new AIController(this.config.ai || {});
            await this.aiController.initialize();
            
            console.log('AI Controller initialized');
            
        } catch (error) {
            console.error('Failed to initialize AI Controller:', error);
            throw error;
        }
    }

    /**
     * Initialize trading engine
     */
    async initializeTradingEngine() {
        try {
            const TradingEngine = require('./execution/trading-engine.js');
            
            this.tradingEngine = new TradingEngine(this.config.trading || {});
            await this.tradingEngine.initialize();
            
            console.log('Trading Engine initialized');
            
        } catch (error) {
            console.error('Failed to initialize Trading Engine:', error);
            throw error;
        }
    }

    /**
     * Set up integrations
     */
    setupIntegrations() {
        // Connect AI controller to trading engine
        if (this.aiController && this.tradingEngine) {
            this.tradingEngine.setAIController(this.aiController);
        }
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // Handle trading signals from AI controller
        if (this.aiController) {
            this.aiController.addEventHandler('tradingSignal', (data) => {
                this.handleTradingSignal(data);
            });
        }
        
        // Handle trade events from trading engine
        if (this.tradingEngine) {
            this.tradingEngine.addEventHandler('tradeClosed', (data) => {
                this.handleTradeClosed(data);
            });
            
            this.tradingEngine.addEventHandler('tradeExpired', (data) => {
                this.handleTradeExpired(data);
            });
            
            this.tradingEngine.addEventHandler('tradeCancelled', (data) => {
                this.handleTradeCancelled(data);
            });
        }
    }

    /**
     * Start trading controller
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('Trading Controller not initialized');
        }
        
        if (this.isRunning) {
            console.log('Trading Controller is already running');
            return;
        }
        
        try {
            console.log('Starting Trading Controller...');
            
            // Start AI controller
            if (this.aiController) {
                await this.aiController.start();
            }
            
            // Start processing analysis queue
            this.startAnalysisProcessing();
            
            this.isRunning = true;
            
            console.log('Trading Controller started successfully');
            this.emitEvent('started', { success: true });
            
        } catch (error) {
            console.error('Failed to start Trading Controller:', error);
            this.emitEvent('started', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Stop trading controller
     */
    async stop() {
        if (!this.isRunning) {
            console.log('Trading Controller is not running');
            return;
        }
        
        try {
            console.log('Stopping Trading Controller...');
            
            // Stop AI controller
            if (this.aiController) {
                await this.aiController.stop();
            }
            
            // Stop processing analysis queue
            this.stopAnalysisProcessing();
            
            this.isRunning = false;
            
            console.log('Trading Controller stopped successfully');
            this.emitEvent('stopped', { success: true });
            
        } catch (error) {
            console.error('Failed to stop Trading Controller:', error);
            this.emitEvent('stopped', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Handle trading signal
     */
    async handleTradingSignal(data) {
        try {
            console.log('🎯 Trading signal received in controller');
            
            // Add to analysis queue
            this.addToAnalysisQueue(data);
            
        } catch (error) {
            console.error('Failed to handle trading signal:', error);
            this.emitEvent('signalError', { signal: data.signal, error: error.message });
        }
    }

    /**
     * Add to analysis queue
     */
    addToAnalysisQueue(data) {
        this.analysisQueue.push({
            data: data,
            timestamp: Date.now(),
            priority: this.calculatePriority(data)
        });
        
        // Sort queue by priority
        this.analysisQueue.sort((a, b) => b.priority - a.priority);
        
        // Limit queue size
        if (this.analysisQueue.length > 100) {
            this.analysisQueue = this.analysisQueue.slice(0, 100);
        }
    }

    /**
     * Calculate priority for analysis
     */
    calculatePriority(data) {
        let priority = 50; // Base priority
        
        // Confidence-based priority
        if (data.analysis && data.analysis.confidence) {
            priority += data.analysis.confidence * 0.3;
        }
        
        // Time-based priority (newer signals get higher priority)
        const age = Date.now() - (data.signal.timestamp || Date.now());
        priority += Math.max(0, 50 - age / 1000); // Reduce priority for older signals
        
        // Asset-based priority (certain assets get higher priority)
        const highPriorityAssets = ['EUR/USD', 'GBP/USD', 'BTC/USD'];
        if (highPriorityAssets.includes(data.tradingParams.asset)) {
            priority += 10;
        }
        
        return Math.min(100, Math.max(0, priority));
    }

    /**
     * Start analysis processing
     */
    startAnalysisProcessing() {
        if (this.isProcessingAnalysis) {
            return;
        }
        
        this.isProcessingAnalysis = true;
        this.processAnalysisQueue();
    }

    /**
     * Stop analysis processing
     */
    stopAnalysisProcessing() {
        this.isProcessingAnalysis = false;
    }

    /**
     * Process analysis queue
     */
    async processAnalysisQueue() {
        while (this.isProcessingAnalysis && this.analysisQueue.length > 0) {
            const item = this.analysisQueue.shift();
            
            try {
                await this.processAnalysisItem(item);
            } catch (error) {
                console.error('Failed to process analysis item:', error);
            }
            
            // Small delay to prevent blocking
            if (this.analysisQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        this.isProcessingAnalysis = false;
    }

    /**
     * Process analysis item
     */
    async processAnalysisItem(item) {
        const startTime = Date.now();
        
        try {
            this.performanceMetrics.totalAnalysis++;
            
            // Enhanced analysis with trading strategies
            const enhancedAnalysis = await this.performEnhancedAnalysis(item.data);
            
            // Execute trade if conditions are met
            if (enhancedAnalysis.shouldExecute) {
                const executionResult = await this.executeEnhancedTrade(enhancedAnalysis);
                
                this.emitEvent('enhancedTradeExecuted', {
                    originalSignal: item.data,
                    enhancedAnalysis: enhancedAnalysis,
                    executionResult: executionResult
                });
            }
            
            // Update metrics
            const analysisTime = Date.now() - startTime;
            this.updateAnalysisMetrics(true, analysisTime);
            
        } catch (error) {
            const analysisTime = Date.now() - startTime;
            this.updateAnalysisMetrics(false, analysisTime);
            
            console.error('Analysis processing failed:', error);
            this.emitEvent('analysisError', { 
                item: item, 
                error: error.message 
            });
        }
    }

    /**
     * Perform enhanced analysis
     */
    async performEnhancedAnalysis(data) {
        const { signal, analysis, tradingParams } = data;
        
        // Get additional market data (in a real implementation, this would come from a market data feed)
        const marketData = await this.getMarketData(tradingParams.asset);
        const timestamp = Date.now();
        
        // Run multiple trading strategies
        const strategyResults = {};
        
        if (this.tradingEngine && this.tradingEngine.strategies) {
            // Run CCI strategy
            strategyResults.cci = await this.tradingEngine.executeStrategy(
                'cci', marketData, timestamp, { period: 20 }
            );
            
            // Run candles strategy
            strategyResults.candles = await this.tradingEngine.executeStrategy(
                'candles', marketData, timestamp, { candleCount: 4 }
            );
            
            // Run pin bar strategy
            strategyResults.pinBar = await this.tradingEngine.executeStrategy(
                'pinBar', marketData, timestamp, { multiplier: 4 }
            );
            
            // Run AI-enhanced strategy
            strategyResults.aiEnhanced = await this.tradingEngine.executeStrategy(
                'ai_enhanced', marketData, timestamp, {
                    aiAnalysis: analysis,
                    strategyWeights: {
                        cci: 0.2,
                        candles: 0.2,
                        pinBar: 0.2,
                        signals: 0.4
                    }
                }
            );
        }
        
        // Determine best strategy result
        const bestStrategy = this.selectBestStrategy(strategyResults);
        
        // Calculate final confidence
        const finalConfidence = this.calculateFinalConfidence(analysis, strategyResults, bestStrategy);
        
        // Determine if trade should be executed
        const shouldExecute = this.shouldExecuteTrade(finalConfidence, bestStrategy, tradingParams);
        
        // Generate enhanced trading parameters
        const enhancedParams = this.generateEnhancedTradingParams(
            tradingParams, 
            analysis, 
            bestStrategy, 
            finalConfidence
        );
        
        return {
            originalSignal: data,
            marketData: marketData,
            strategyResults: strategyResults,
            bestStrategy: bestStrategy,
            finalConfidence: finalConfidence,
            shouldExecute: shouldExecute,
            enhancedParams: enhancedParams,
            reasoning: this.generateAnalysisReasoning(analysis, strategyResults, bestStrategy),
            timestamp: Date.now()
        };
    }

    /**
     * Get market data (mock implementation)
     */
    async getMarketData(asset) {
        // In a real implementation, this would fetch actual market data
        // For now, return mock data
        const now = Date.now();
        const marketData = {};
        
        // Generate mock candle data for the last hour
        for (let i = 0; i < 60; i++) {
            const timestamp = now - (i * 60000); // 1 minute intervals
            const basePrice = 1.1000 + Math.random() * 0.0100;
            const volatility = 0.0010;
            
            marketData[timestamp] = [
                basePrice, // open
                basePrice + (Math.random() - 0.5) * volatility, // high
                basePrice + (Math.random() - 0.5) * volatility, // low
                basePrice + (Math.random() - 0.5) * volatility  // close
            ];
        }
        
        return marketData;
    }

    /**
     * Select best strategy result
     */
    selectBestStrategy(strategyResults) {
        let bestStrategy = null;
        let bestScore = 0;
        
        for (const [strategyName, result] of Object.entries(strategyResults)) {
            if (result.signal && result.confidence > bestScore) {
                bestScore = result.confidence;
                bestStrategy = {
                    name: strategyName,
                    result: result
                };
            }
        }
        
        return bestStrategy;
    }

    /**
     * Calculate final confidence
     */
    calculateFinalConfidence(analysis, strategyResults, bestStrategy) {
        let confidence = analysis.confidence || 50;
        
        // Boost confidence if strategies agree
        if (bestStrategy) {
            confidence = (confidence + bestStrategy.result.confidence) / 2;
            
            // Additional boost for AI-enhanced strategy
            if (bestStrategy.name === 'aiEnhanced') {
                confidence *= 1.1;
            }
        }
        
        // Consider consensus among strategies
        const validStrategies = Object.values(strategyResults).filter(s => s.signal);
        if (validStrategies.length > 1) {
            const consensus = validStrategies.filter(s => s.signal === bestStrategy.result.signal).length;
            confidence *= (consensus / validStrategies.length);
        }
        
        return Math.min(100, Math.max(0, confidence));
    }

    /**
     * Determine if trade should be executed
     */
    shouldExecuteTrade(confidence, bestStrategy, tradingParams) {
        // Check minimum confidence threshold
        if (confidence < 70) {
            return false;
        }
        
        // Check if we have a valid strategy result
        if (!bestStrategy) {
            return false;
        }
        
        // Check if trading is enabled
        if (!this.config.enabled) {
            return false;
        }
        
        // Check if auto-execution is enabled
        if (!this.config.autoExecute) {
            return false;
        }
        
        return true;
    }

    /**
     * Generate enhanced trading parameters
     */
    generateEnhancedTradingParams(originalParams, analysis, bestStrategy, finalConfidence) {
        const enhancedParams = { ...originalParams };
        
        // Adjust amount based on confidence
        const confidenceMultiplier = Math.max(0.5, Math.min(1.5, finalConfidence / 100));
        enhancedParams.amount = Math.max(1, Math.round(originalParams.amount * confidenceMultiplier * 100) / 100);
        
        // Use best strategy's action if available
        if (bestStrategy && bestStrategy.result.signal) {
            enhancedParams.action = bestStrategy.result.signal;
        }
        
        // Add strategy information
        enhancedParams.strategy = bestStrategy ? bestStrategy.name : 'unknown';
        enhancedParams.confidence = finalConfidence;
        enhancedParams.enhanced = true;
        
        return enhancedParams;
    }

    /**
     * Generate analysis reasoning
     */
    generateAnalysisReasoning(analysis, strategyResults, bestStrategy) {
        const reasons = [];
        
        reasons.push(`AI confidence: ${analysis.confidence}%`);
        
        if (bestStrategy) {
            reasons.push(`Best strategy: ${bestStrategy.name} (${bestStrategy.result.confidence}% confidence)`);
            reasons.push(`Strategy signal: ${bestStrategy.result.signal}`);
        }
        
        // Add strategy consensus information
        const validStrategies = Object.values(strategyResults).filter(s => s.signal);
        if (validStrategies.length > 1) {
            const consensus = validStrategies.filter(s => s.signal === bestStrategy.result.signal).length;
            reasons.push(`Strategy consensus: ${consensus}/${validStrategies.length}`);
        }
        
        return reasons.join('; ');
    }

    /**
     * Execute enhanced trade
     */
    async executeEnhancedTrade(enhancedAnalysis) {
        try {
            if (!this.tradingEngine) {
                throw new Error('Trading engine not available');
            }
            
            const result = await this.tradingEngine.executeManualTrade(enhancedAnalysis.enhancedParams);
            
            return {
                success: result.success,
                tradeId: result.tradeId,
                executionTime: result.executionTime,
                enhancedAnalysis: enhancedAnalysis
            };
            
        } catch (error) {
            console.error('Enhanced trade execution failed:', error);
            return {
                success: false,
                error: error.message,
                enhancedAnalysis: enhancedAnalysis
            };
        }
    }

    /**
     * Handle trade closed
     */
    handleTradeClosed(data) {
        console.log('📊 Trade closed:', data.tradeId);
        
        // Update AI learning with trade result
        if (this.aiController) {
            this.updateAILearning(data.trade, 'closed');
        }
        
        this.emitEvent('tradeClosed', data);
    }

    /**
     * Handle trade expired
     */
    handleTradeExpired(data) {
        console.log('⏰ Trade expired:', data.tradeId);
        
        // Update AI learning with trade result
        if (this.aiController) {
            this.updateAILearning(data.trade, 'expired');
        }
        
        this.emitEvent('tradeExpired', data);
    }

    /**
     * Handle trade cancelled
     */
    handleTradeCancelled(data) {
        console.log('❌ Trade cancelled:', data.tradeId);
        
        this.emitEvent('tradeCancelled', data);
    }

    /**
     * Update AI learning
     */
    updateAILearning(trade, outcome) {
        // This would update the AI model with trade results
        // to improve future signal analysis
        console.log(`Updating AI learning with trade ${outcome}: ${trade.id}`);
    }

    /**
     * Update analysis metrics
     */
    updateAnalysisMetrics(success, analysisTime) {
        if (success) {
            this.performanceMetrics.successfulAnalysis++;
        } else {
            this.performanceMetrics.failedAnalysis++;
        }
        
        // Update average analysis time
        const total = this.performanceMetrics.totalAnalysis;
        this.performanceMetrics.averageAnalysisTime = 
            (this.performanceMetrics.averageAnalysisTime * (total - 1) + analysisTime) / total;
    }

    /**
     * Add Telegram channel
     */
    async addTelegramChannel(channelId, channelInfo = {}) {
        if (!this.aiController) {
            throw new Error('AI Controller not available');
        }
        
        return await this.aiController.addTelegramChannel(channelId, channelInfo);
    }

    /**
     * Remove Telegram channel
     */
    removeTelegramChannel(channelId) {
        if (!this.aiController) {
            throw new Error('AI Controller not available');
        }
        
        return this.aiController.removeTelegramChannel(channelId);
    }

    /**
     * Get Telegram channels
     */
    getTelegramChannels() {
        if (!this.aiController) {
            return [];
        }
        
        return this.aiController.getTelegramChannels();
    }

    /**
     * Set AI API key
     */
    setAIApiKey(apiKey) {
        if (!this.aiController) {
            throw new Error('AI Controller not available');
        }
        
        this.aiController.setAIApiKey(apiKey);
    }

    /**
     * Set Telegram API token
     */
    setTelegramApiToken(apiToken) {
        if (!this.aiController) {
            throw new Error('AI Controller not available');
        }
        
        this.aiController.setTelegramApiToken(apiToken);
    }

    /**
     * Set broker API keys
     */
    setBrokerApiKeys(brokerKeys) {
        if (!this.tradingEngine) {
            throw new Error('Trading Engine not available');
        }
        
        this.tradingEngine.setBrokerApiKeys(brokerKeys);
    }

    /**
     * Get active trades
     */
    getActiveTrades() {
        if (!this.tradingEngine) {
            return [];
        }
        
        return this.tradingEngine.getActiveTrades();
    }

    /**
     * Get trade history
     */
    getTradeHistory(limit = 100) {
        if (!this.tradingEngine) {
            return [];
        }
        
        return this.tradingEngine.getTradeHistory(limit);
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
            successRate: this.performanceMetrics.totalAnalysis > 0 
                ? (this.performanceMetrics.successfulAnalysis / this.performanceMetrics.totalAnalysis) * 100 
                : 0,
            aiMetrics: this.aiController ? this.aiController.getPerformanceMetrics() : null,
            tradingMetrics: this.tradingEngine ? this.tradingEngine.getPerformanceMetrics() : null,
            queueSize: this.analysisQueue.length,
            isProcessing: this.isProcessingAnalysis
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
     * Get status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            enabled: this.config.enabled,
            autoExecute: this.config.autoExecute,
            components: {
                aiController: this.aiController ? this.aiController.getStatus() : null,
                tradingEngine: this.tradingEngine ? this.tradingEngine.getStatus() : null
            },
            queue: {
                size: this.analysisQueue.length,
                processing: this.isProcessingAnalysis
            },
            metrics: this.getPerformanceMetrics()
        };
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
     * Get configuration
     */
    getConfig() {
        return {
            ...this.config,
            ai: this.aiController ? this.aiController.getConfig() : null,
            trading: this.tradingEngine ? this.tradingEngine.getConfig() : null
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        if (this.aiController) {
            this.aiController.updateConfig(newConfig.ai || {});
        }
        
        if (this.tradingEngine) {
            this.tradingEngine.updateConfig(newConfig.trading || {});
        }
        
        this.emitEvent('configUpdated', { config: this.config });
    }

    /**
     * Enable/disable trading
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (this.tradingEngine) {
            this.tradingEngine.setEnabled(enabled);
        }
        
        this.emitEvent('enabledChanged', { enabled });
    }

    /**
     * Enable/disable auto-execution
     */
    setAutoExecute(autoExecute) {
        this.config.autoExecute = autoExecute;
        
        if (this.tradingEngine) {
            this.tradingEngine.setAutoExecute(autoExecute);
        }
        
        this.emitEvent('autoExecuteChanged', { autoExecute });
    }

    /**
     * Reset trading controller
     */
    reset() {
        // Clear analysis queue
        this.analysisQueue = [];
        
        // Reset trading engine
        if (this.tradingEngine) {
            this.tradingEngine.reset();
        }
        
        // Reset metrics
        this.performanceMetrics = {
            startTime: Date.now(),
            totalAnalysis: 0,
            successfulAnalysis: 0,
            failedAnalysis: 0,
            averageAnalysisTime: 0,
            uptime: 0
        };
        
        console.log('Trading Controller reset');
        this.emitEvent('reset', { success: true });
    }

    /**
     * Destroy trading controller
     */
    async destroy() {
        try {
            console.log('Destroying Trading Controller...');
            
            // Stop processing
            await this.stop();
            
            // Destroy components
            if (this.aiController) {
                await this.aiController.destroy();
                this.aiController = null;
            }
            
            if (this.tradingEngine) {
                this.tradingEngine.destroy();
                this.tradingEngine = null;
            }
            
            // Clear event handlers
            this.eventHandlers.clear();
            
            // Clear analysis queue
            this.analysisQueue = [];
            
            this.isInitialized = false;
            
            console.log('Trading Controller destroyed');
            
        } catch (error) {
            console.error('Failed to destroy Trading Controller:', error);
            throw error;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradingController;
} else if (typeof window !== 'undefined') {
    window.TradingController = TradingController;
}