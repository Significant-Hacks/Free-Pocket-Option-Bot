/**
 * Trading Engine - Main trading execution engine
 * Integrates strategies, brokers, and risk management
 */

class TradingEngine {
    constructor(config = {}) {
        this.config = {
            enabled: true,
            autoExecute: true,
            maxExecutionTime: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
            defaultStrategy: 'ai_enhanced',
            defaultBroker: 'pocket_option',
            confidenceThreshold: 70,
            ...config
        };
        
        this.strategies = null;
        this.brokerInterface = null;
        this.riskManager = null;
        this.aiController = null;
        
        this.isInitialized = false;
        this.isActive = false;
        this.executionQueue = [];
        this.isProcessing = false;
        
        this.performanceMetrics = {
            totalSignals: 0,
            executedTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            averageExecutionTime: 0,
            averageConfidence: 0,
            strategyPerformance: {},
            brokerPerformance: {}
        };
        
        this.eventHandlers = new Map();
        
        this.initialize();
    }

    /**
     * Initialize trading engine
     */
    async initialize() {
        try {
            console.log('Initializing Trading Engine...');
            
            // Initialize components
            await this.initializeStrategies();
            await this.initializeBrokerInterface();
            await this.initializeRiskManager();
            
            this.isInitialized = true;
            console.log('Trading Engine initialized successfully');
            
            this.emitEvent('initialized', { success: true });
            
        } catch (error) {
            console.error('Failed to initialize Trading Engine:', error);
            this.emitEvent('initialized', { success: false, error: error.message });
            throw error;
        }
    }

    /**
     * Initialize trading strategies
     */
    async initializeStrategies() {
        try {
            const TradingStrategies = require('../strategies/trading-strategies.js');
            this.strategies = new TradingStrategies(this.config.strategies || {});
            console.log('Trading strategies initialized');
        } catch (error) {
            console.error('Failed to initialize trading strategies:', error);
            throw error;
        }
    }

    /**
     * Initialize broker interface
     */
    async initializeBrokerInterface() {
        try {
            const { BrokerInterface } = require('../brokers/broker-interface.js');
            this.brokerInterface = new BrokerInterface(this.config.brokers || {});
            console.log('Broker interface initialized');
        } catch (error) {
            console.error('Failed to initialize broker interface:', error);
            throw error;
        }
    }

    /**
     * Initialize risk manager
     */
    async initializeRiskManager() {
        try {
            const RiskManager = require('../risk/risk-manager.js');
            this.riskManager = new RiskManager(this.config.risk || {});
            console.log('Risk manager initialized');
        } catch (error) {
            console.error('Failed to initialize risk manager:', error);
            throw error;
        }
    }

    /**
     * Set AI controller
     */
    setAIController(aiController) {
        this.aiController = aiController;
        
        // Set up event listeners
        if (this.aiController) {
            this.aiController.addEventHandler('tradingSignal', (data) => {
                this.handleTradingSignal(data);
            });
        }
    }

    /**
     * Start trading engine
     */
    async start() {
        if (!this.isInitialized) {
            throw new Error('Trading Engine not initialized');
        }
        
        if (this.isActive) {
            console.log('Trading Engine is already active');
            return;
        }
        
        this.isActive = true;
        console.log('Trading Engine started');
        
        this.emitEvent('started', { success: true });
        
        // Start processing execution queue
        this.processExecutionQueue();
    }

    /**
     * Stop trading engine
     */
    async stop() {
        if (!this.isActive) {
            console.log('Trading Engine is not active');
            return;
        }
        
        this.isActive = false;
        console.log('Trading Engine stopped');
        
        this.emitEvent('stopped', { success: true });
    }

    /**
     * Handle trading signal from AI controller
     */
    async handleTradingSignal(data) {
        if (!this.isActive || !this.config.enabled) {
            console.log('Trading Engine is not active - ignoring signal');
            return;
        }

        try {
            console.log('Received trading signal:', data.tradingParams.asset, data.tradingParams.action);
            
            // Create execution request
            const executionRequest = {
                id: this.generateExecutionId(),
                signal: data.signal,
                analysis: data.analysis,
                tradingParams: data.tradingParams,
                timestamp: Date.now(),
                status: 'pending'
            };

            // Add to execution queue
            this.executionQueue.push(executionRequest);
            
            // Update metrics
            this.performanceMetrics.totalSignals++;
            
            // Emit event
            this.emitEvent('signalReceived', executionRequest);
            
            // Process queue if not already processing
            if (!this.isProcessing) {
                this.processExecutionQueue();
            }
            
        } catch (error) {
            console.error('Failed to handle trading signal:', error);
            this.emitEvent('signalError', { error: error.message });
        }
    }

    /**
     * Process execution queue
     */
    async processExecutionQueue() {
        if (this.isProcessing || this.executionQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.executionQueue.length > 0 && this.isActive) {
            const request = this.executionQueue.shift();
            
            try {
                await this.executeTradingSignal(request);
            } catch (error) {
                console.error('Failed to execute trading signal:', error);
                this.emitEvent('executionError', { request, error: error.message });
            }
        }

        this.isProcessing = false;
    }

    /**
     * Execute trading signal
     */
    async executeTradingSignal(request) {
        const startTime = Date.now();
        
        try {
            console.log(`Executing trading signal: ${request.id}`);
            
            // Update request status
            request.status = 'processing';
            this.emitEvent('executionStarted', request);
            
            // Validate trading parameters
            const validation = this.validateTradingParams(request.tradingParams);
            if (!validation.valid) {
                throw new Error(`Invalid trading parameters: ${validation.reason}`);
            }

            // Apply risk management
            const riskAssessment = await this.riskManager.assessTradeRisk(
                request.tradingParams,
                {
                    confidence: request.tradingParams.confidence,
                    volatility: request.analysis.volatility
                }
            );
            
            if (!riskAssessment.approved) {
                throw new Error(`Trade rejected by risk management: ${riskAssessment.reason}`);
            }

            // Apply position sizing
            const positionSize = riskAssessment.positionSize;
            const finalTradeParams = {
                ...request.tradingParams,
                amount: positionSize
            };

            // Generate trading signals using strategies
            const strategySignals = await this.generateStrategySignals(request);
            
            // Determine final trading decision
            const tradingDecision = this.makeTradingDecision(strategySignals, request);
            
            if (!tradingDecision.execute) {
                throw new Error(`Trading decision: ${tradingDecision.reason}`);
            }

            // Execute trade if auto-execute is enabled
            let tradeResult = null;
            if (this.config.autoExecute) {
                tradeResult = await this.executeTrade(finalTradeParams, tradingDecision);
            } else {
                // Manual execution mode - just prepare the trade
                tradeResult = {
                    success: true,
                    manual: true,
                    preparedParams: finalTradeParams,
                    decision: tradingDecision
                };
            }

            // Calculate execution time
            const executionTime = Date.now() - startTime;
            
            // Update performance metrics
            this.updatePerformanceMetrics(true, executionTime, tradingDecision.confidence);
            
            // Create execution result
            const executionResult = {
                id: request.id,
                signal: request.signal,
                tradingParams: finalTradeParams,
                strategySignals: strategySignals,
                tradingDecision: tradingDecision,
                tradeResult: tradeResult,
                riskAssessment: riskAssessment,
                executionTime: executionTime,
                timestamp: Date.now(),
                status: 'completed'
            };

            // Record trade
            this.recordTrade(executionResult);
            
            // Emit events
            this.emitEvent('executionCompleted', executionResult);
            
            console.log(`Trading signal executed successfully: ${request.id} in ${executionTime}ms`);
            return executionResult;
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            // Update performance metrics
            this.updatePerformanceMetrics(false, executionTime, 0);
            
            // Create error result
            const errorResult = {
                id: request.id,
                error: error.message,
                executionTime: executionTime,
                timestamp: Date.now(),
                status: 'failed'
            };

            // Emit events
            this.emitEvent('executionFailed', errorResult);
            
            console.error(`Trading signal execution failed: ${request.id} - ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate trading parameters
     */
    validateTradingParams(params) {
        const required = ['action', 'asset', 'amount', 'expiration'];
        const missing = required.filter(field => !params[field]);
        
        if (missing.length > 0) {
            return {
                valid: false,
                reason: `Missing required parameters: ${missing.join(', ')}`
            };
        }

        // Validate confidence threshold
        if (params.confidence < this.config.confidenceThreshold) {
            return {
                valid: false,
                reason: `Confidence ${params.confidence}% below threshold ${this.config.confidenceThreshold}%`
            };
        }

        return {
            valid: true
        };
    }

    /**
     * Generate strategy signals
     */
    async generateStrategySignals(request) {
        const signals = {};
        const marketData = await this.getMarketData(request.tradingParams.asset);
        
        // Run individual strategies
        signals.cci = this.strategies.cciStrategy(marketData, request.timestamp);
        signals.candles = this.strategies.candlesStrategy(marketData, request.timestamp);
        signals.pinBar = this.strategies.pinBarStrategy(marketData, request.timestamp);
        
        // Run AI-enhanced strategy
        signals.aiEnhanced = this.strategies.aiEnhancedStrategy(
            marketData,
            request.timestamp,
            request.analysis
        );

        return signals;
    }

    /**
     * Get market data (placeholder)
     */
    async getMarketData(asset) {
        // This would fetch real market data from a data provider
        // For now, return empty object
        return {};
    }

    /**
     * Make trading decision
     */
    makeTradingDecision(strategySignals, request) {
        const signals = Object.values(strategySignals).filter(s => s.signal !== null);
        
        if (signals.length === 0) {
            return {
                execute: false,
                reason: 'No trading signals generated',
                confidence: 0
            };
        }

        // Check for consensus
        const uniqueSignals = [...new Set(signals.map(s => s.signal))];
        const consensus = uniqueSignals.length === 1;
        
        let finalSignal = null;
        let confidence = 0;
        let reasoning = '';

        if (consensus) {
            finalSignal = uniqueSignals[0];
            confidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
            reasoning = `Consensus signal (${finalSignal}) from ${signals.length} strategies`;
        } else {
            // No consensus - use AI-enhanced strategy if available
            const aiSignal = strategySignals.aiEnhanced;
            if (aiSignal && aiSignal.signal) {
                finalSignal = aiSignal.signal;
                confidence = aiSignal.confidence;
                reasoning = 'AI-enhanced strategy decision';
            } else {
                return {
                    execute: false,
                    reason: 'No consensus among strategies and no AI decision',
                    confidence: 0
                };
            }
        }

        // Apply confidence threshold
        if (confidence < this.config.confidenceThreshold) {
            return {
                execute: false,
                reason: `Confidence ${confidence.toFixed(1)}% below threshold ${this.config.confidenceThreshold}%`,
                confidence: confidence
            };
        }

        return {
            execute: true,
            signal: finalSignal,
            confidence: confidence,
            reasoning: reasoning,
            strategyCount: signals.length,
            consensus: consensus
        };
    }

    /**
     * Execute trade
     */
    async executeTrade(tradeParams, tradingDecision) {
        const broker = tradeParams.broker || this.config.defaultBroker;
        
        try {
            const tradeResult = await this.brokerInterface.executeTrade(broker, tradeParams);
            
            // Record trade in risk manager
            this.riskManager.recordTrade({
                id: tradeResult.tradeId || this.generateTradeId(),
                params: tradeParams,
                timestamp: Date.now()
            });

            return tradeResult;
            
        } catch (error) {
            console.error(`Trade execution failed on ${broker}:`, error);
            throw error;
        }
    }

    /**
     * Record trade
     */
    recordTrade(executionResult) {
        // Update strategy performance
        if (executionResult.strategySignals) {
            for (const [strategyName, signal] of Object.entries(executionResult.strategySignals)) {
                if (signal.signal !== null) {
                    const success = executionResult.tradeResult && executionResult.tradeResult.success;
                    this.strategies.updateStrategyPerformance(strategyName, success);
                }
            }
        }

        // Update broker performance
        const broker = executionResult.tradingParams.broker || this.config.defaultBroker;
        if (!this.performanceMetrics.brokerPerformance[broker]) {
            this.performanceMetrics.brokerPerformance[broker] = {
                total: 0,
                successful: 0,
                failed: 0
            };
        }
        
        const brokerPerf = this.performanceMetrics.brokerPerformance[broker];
        brokerPerf.total++;
        
        if (executionResult.tradeResult && executionResult.tradeResult.success) {
            brokerPerf.successful++;
        } else {
            brokerPerf.failed++;
        }

        // Record in risk manager
        if (executionResult.tradeResult && executionResult.tradeResult.tradeId) {
            this.riskManager.updateTradeResult(
                executionResult.tradeResult.tradeId,
                executionResult.tradeResult
            );
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(success, executionTime, confidence) {
        this.performanceMetrics.executedTrades++;
        
        if (success) {
            this.performanceMetrics.successfulTrades++;
        } else {
            this.performanceMetrics.failedTrades++;
        }

        // Update average execution time
        const total = this.performanceMetrics.executedTrades;
        const avgTime = (this.performanceMetrics.averageExecutionTime * (total - 1) + executionTime) / total;
        this.performanceMetrics.averageExecutionTime = avgTime;

        // Update average confidence
        if (confidence > 0) {
            const avgConfidence = (this.performanceMetrics.averageConfidence * (total - 1) + confidence) / total;
            this.performanceMetrics.averageConfidence = avgConfidence;
        }
    }

    /**
     * Execute trade manually
     */
    async executeManualTrade(tradeParams) {
        if (!this.isInitialized) {
            throw new Error('Trading Engine not initialized');
        }

        try {
            const riskAssessment = await this.riskManager.assessTradeRisk(tradeParams);
            
            if (!riskAssessment.approved) {
                throw new Error(`Trade rejected by risk management: ${riskAssessment.reason}`);
            }

            const positionSize = riskAssessment.positionSize;
            const finalTradeParams = {
                ...tradeParams,
                amount: positionSize
            };

            const tradeResult = await this.brokerInterface.executeTrade(
                finalTradeParams.broker || this.config.defaultBroker,
                finalTradeParams
            );

            return {
                success: true,
                tradeResult: tradeResult,
                riskAssessment: riskAssessment
            };

        } catch (error) {
            console.error('Manual trade execution failed:', error);
            throw error;
        }
    }

    /**
     * Get active trades
     */
    getActiveTrades() {
        return this.brokerInterface ? this.brokerInterface.getActiveTrades() : [];
    }

    /**
     * Get trade history
     */
    getTradeHistory(limit = 100) {
        return this.brokerInterface ? this.brokerInterface.getTradeHistory(limit) : [];
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const strategyPerf = this.strategies ? this.strategies.getStrategyPerformance() : {};
        
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.executedTrades > 0 
                ? (this.performanceMetrics.successfulTrades / this.performanceMetrics.executedTrades) * 100 
                : 0,
            strategyPerformance: strategyPerf,
            riskStatus: this.riskManager ? this.riskManager.getRiskStatus() : null,
            brokerStatus: this.brokerInterface ? this.brokerInterface.getAllBrokerStatuses() : null
        };
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            active: this.isActive,
            enabled: this.config.enabled,
            autoExecute: this.config.autoExecute,
            queueSize: this.executionQueue.length,
            isProcessing: this.isProcessing,
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
        for (const { handler } of handlers) {
            try {
                handler(data);
            } catch (error) {
                console.error(`Event handler failed for event ${event}:`, error);
            }
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update component configurations
        if (this.strategies) {
            this.strategies.updateConfig(newConfig.strategies || {});
        }
        
        if (this.brokerInterface) {
            this.brokerInterface.updateConfig(newConfig.brokers || {});
        }
        
        if (this.riskManager) {
            this.riskManager.updateConfig(newConfig.risk || {});
        }
        
        this.emitEvent('configUpdated', { config: this.config });
    }

    /**
     * Generate execution ID
     */
    generateExecutionId() {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate trade ID
     */
    generateTradeId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate handler ID
     */
    generateHandlerId() {
        return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Destroy trading engine
     */
    async destroy() {
        console.log('Destroying Trading Engine...');
        
        // Stop processing
        await this.stop();
        
        // Destroy components
        if (this.strategies) {
            this.strategies.destroy();
        }
        
        if (this.brokerInterface) {
            this.brokerInterface.destroy();
        }
        
        if (this.riskManager) {
            this.riskManager.destroy();
        }
        
        // Clear queues
        this.executionQueue = [];
        this.eventHandlers.clear();
        
        this.isInitialized = false;
        console.log('Trading Engine destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradingEngine;
} else if (typeof window !== 'undefined') {
    window.TradingEngine = TradingEngine;
}