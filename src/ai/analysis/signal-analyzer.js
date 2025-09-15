/**
 * Signal Analyzer - AI-powered signal analysis component
 * Processes trading signals and extracts actionable trading parameters
 */

class SignalAnalyzer {
    constructor(config = {}) {
        this.config = {
            confidenceThreshold: config.confidenceThreshold || 70,
            minHistoricalSignals: config.minHistoricalSignals || 10,
            maxAnalysisTime: config.maxAnalysisTime || 10000,
            signalKeywords: config.signalKeywords || [
                'call', 'put', 'buy', 'sell', 'entry', 'trade',
                'up', 'down', 'high', 'low', 'strike'
            ],
            timeframes: config.timeframes || [
                '1m', '5m', '15m', '30m', '1h', '4h', '1d'
            ],
            assets: config.assets || [
                'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF',
                'BTC/USD', 'ETH/USD', 'LTC/USD', 'XRP/USD'
            ],
            brokers: config.brokers || [
                'pocket_option', 'quotex', 'binomo', 'iq_option'
            ],
            ...config
        };
        
        this.aiModel = null;
        this.historicalData = new Map();
        this.analysisCache = new Map();
        this.performanceMetrics = {
            totalSignals: 0,
            successfulAnalyses: 0,
            failedAnalyses: 0,
            averageAnalysisTime: 0,
            averageConfidence: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize signal analyzer
     */
    async initialize() {
        try {
            // Validate configuration
            this.validateConfig();
            
            // Load historical data
            await this.loadHistoricalData();
            
            console.log('Signal Analyzer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Signal Analyzer:', error);
            throw error;
        }
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        if (!this.config.confidenceThreshold || this.config.confidenceThreshold < 0 || this.config.confidenceThreshold > 100) {
            throw new Error('Confidence threshold must be between 0 and 100');
        }

        if (!this.config.signalKeywords || this.config.signalKeywords.length === 0) {
            throw new Error('Signal keywords are required');
        }
    }

    /**
     * Load historical data
     */
    async loadHistoricalData() {
        // This would load historical signal data from storage
        // For now, initialize with empty data
        console.log('Historical data loaded');
    }

    /**
     * Set AI model for analysis
     */
    setAIModel(aiModel) {
        this.aiModel = aiModel;
    }

    /**
     * Analyze trading signal
     */
    async analyzeSignal(signal) {
        const startTime = Date.now();
        
        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(signal);
            if (this.analysisCache.has(cacheKey)) {
                const cached = this.analysisCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                    return cached.analysis;
                }
            }

            // Preprocess signal
            const processedSignal = this.preprocessSignal(signal);
            
            // Extract signal parameters
            const signalParams = await this.extractSignalParameters(processedSignal);
            
            // Calculate confidence
            const confidence = await this.calculateConfidence(signal, signalParams);
            
            // Generate trading parameters
            const tradingParams = this.generateTradingParameters(signalParams, confidence);
            
            // Create analysis result
            const analysis = {
                id: this.generateAnalysisId(),
                signalId: signal.id,
                timestamp: Date.now(),
                isSignal: signalParams.isSignal,
                confidence: confidence,
                signalParams: signalParams,
                tradingParams: tradingParams,
                analysisTime: Date.now() - startTime,
                recommendations: this.generateRecommendations(signalParams, confidence)
            };

            // Cache result
            this.analysisCache.set(cacheKey, {
                analysis,
                timestamp: Date.now()
            });

            // Update performance metrics
            this.updatePerformanceMetrics(true, Date.now() - startTime, confidence);

            // Store in historical data
            this.storeHistoricalSignal(signal, analysis);

            console.log(`Signal analyzed in ${analysis.analysisTime}ms with ${confidence}% confidence`);
            return analysis;
            
        } catch (error) {
            console.error('Signal analysis failed:', error);
            this.updatePerformanceMetrics(false, Date.now() - startTime, 0);
            throw error;
        }
    }

    /**
     * Preprocess signal text
     */
    preprocessSignal(signal) {
        let text = signal.text;
        
        // Clean up text
        text = text.replace(/\s+/g, ' ').trim();
        text = text.replace(/[^\w\s\-\.\:\(\)\/\%\$\€\£\¥]/g, ' ');
        
        // Convert to lowercase for analysis
        const lowerText = text.toLowerCase();
        
        return {
            originalText: signal.text,
            cleanedText: text,
            lowerText: lowerText,
            words: lowerText.split(' ').filter(word => word.length > 0),
            sentences: text.split(/[.!?]+/).filter(s => s.trim().length > 0)
        };
    }

    /**
     * Extract signal parameters using AI
     */
    async extractSignalParameters(processedSignal) {
        if (!this.aiModel) {
            throw new Error('AI model not set');
        }

        const prompt = `
            Analyze this trading signal message and extract the following parameters:
            
            Message: "${processedSignal.originalText}"
            
            Please extract and return a JSON object with these fields:
            - isSignal: boolean (true if this is a trading signal, false otherwise)
            - action: string ("CALL", "PUT", or null if not clear)
            - asset: string (trading pair like "EUR/USD", "BTC/USD", etc.)
            - timeframe: string (timeframe like "1m", "5m", "15m", etc.)
            - expiration: number (expiration time in seconds, or null if not specified)
            - confidence: number (0-100, how confident you are this is a valid signal)
            - broker: string ("pocket_option", "quotex", etc., or null if not specified)
            - constraints: object (any special constraints mentioned)
            - reasoning: string (brief explanation of your analysis)
            
            If any parameter cannot be determined, use null.
            
            Respond only with valid JSON.
        `;

        try {
            const response = await this.aiModel.generateCompletion(prompt, {
                maxTokens: 500,
                temperature: 0.3
            });

            if (!response.content) {
                throw new Error('No response from AI model');
            }

            // Parse JSON response
            const params = JSON.parse(response.content);
            
            // Validate parameters
            return this.validateSignalParameters(params);
            
        } catch (error) {
            console.error('AI parameter extraction failed:', error);
            
            // Fallback to basic extraction
            return this.fallbackParameterExtraction(processedSignal);
        }
    }

    /**
     * Validate signal parameters
     */
    validateSignalParameters(params) {
        const validated = {
            isSignal: Boolean(params.isSignal),
            action: params.action && ['CALL', 'PUT'].includes(params.action) ? params.action : null,
            asset: params.asset && this.config.assets.includes(params.asset) ? params.asset : null,
            timeframe: params.timeframe && this.config.timeframes.includes(params.timeframe) ? params.timeframe : null,
            expiration: params.expiration && typeof params.expiration === 'number' ? params.expiration : null,
            confidence: params.confidence && typeof params.confidence === 'number' ? Math.max(0, Math.min(100, params.confidence)) : 0,
            broker: params.broker && this.config.brokers.includes(params.broker) ? params.broker : null,
            constraints: params.constraints || {},
            reasoning: params.reasoning || ''
        };

        // If it's not a signal, set most fields to null
        if (!validated.isSignal) {
            validated.action = null;
            validated.asset = null;
            validated.timeframe = null;
            validated.expiration = null;
            validated.confidence = 0;
        }

        return validated;
    }

    /**
     * Fallback parameter extraction when AI fails
     */
    fallbackParameterExtraction(processedSignal) {
        const words = processedSignal.words;
        const text = processedSignal.lowerText;
        
        // Basic keyword detection
        const isSignal = this.config.signalKeywords.some(keyword => text.includes(keyword));
        
        if (!isSignal) {
            return {
                isSignal: false,
                action: null,
                asset: null,
                timeframe: null,
                expiration: null,
                confidence: 0,
                broker: null,
                constraints: {},
                reasoning: 'No signal keywords detected'
            };
        }

        // Extract action
        let action = null;
        if (text.includes('call') || text.includes('buy') || text.includes('up')) {
            action = 'CALL';
        } else if (text.includes('put') || text.includes('sell') || text.includes('down')) {
            action = 'PUT';
        }

        // Extract asset
        let asset = null;
        for (const supportedAsset of this.config.assets) {
            if (text.includes(supportedAsset.toLowerCase())) {
                asset = supportedAsset;
                break;
            }
        }

        // Extract timeframe
        let timeframe = null;
        for (const supportedTimeframe of this.config.timeframes) {
            if (text.includes(supportedTimeframe)) {
                timeframe = supportedTimeframe;
                break;
            }
        }

        // Extract expiration (basic)
        let expiration = null;
        const timeMatches = text.match(/(\d+)\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h)/);
        if (timeMatches) {
            const value = parseInt(timeMatches[1]);
            const unit = timeMatches[2].toLowerCase();
            
            if (unit.startsWith('s')) {
                expiration = value;
            } else if (unit.startsWith('m')) {
                expiration = value * 60;
            } else if (unit.startsWith('h')) {
                expiration = value * 3600;
            }
        }

        return {
            isSignal: true,
            action,
            asset,
            timeframe,
            expiration,
            confidence: 50, // Lower confidence for fallback
            broker: null,
            constraints: {},
            reasoning: 'Fallback parameter extraction due to AI failure'
        };
    }

    /**
     * Calculate confidence score
     */
    async calculateConfidence(signal, signalParams) {
        if (!signalParams.isSignal) {
            return 0;
        }

        let confidence = signalParams.confidence || 50;

        // Adjust based on parameter completeness
        const completeness = this.calculateParameterCompleteness(signalParams);
        confidence += completeness * 20;

        // Adjust based on historical performance
        const historicalBonus = await this.getHistoricalPerformanceBonus(signal.channelId);
        confidence += historicalBonus;

        // Adjust based on signal clarity
        const clarityBonus = this.calculateSignalClarity(signal.text);
        confidence += clarityBonus;

        // Ensure confidence is within bounds
        confidence = Math.max(0, Math.min(100, confidence));

        return Math.round(confidence);
    }

    /**
     * Calculate parameter completeness
     */
    calculateParameterCompleteness(params) {
        const requiredParams = ['action', 'asset'];
        const optionalParams = ['timeframe', 'expiration', 'broker'];
        
        let completeness = 0;
        
        // Required parameters
        const requiredCount = requiredParams.filter(param => params[param] !== null).length;
        completeness += (requiredCount / requiredParams.length) * 0.6;
        
        // Optional parameters
        const optionalCount = optionalParams.filter(param => params[param] !== null).length;
        completeness += (optionalCount / optionalParams.length) * 0.4;
        
        return completeness;
    }

    /**
     * Get historical performance bonus
     */
    async getHistoricalPerformanceBonus(channelId) {
        if (!channelId) {
            return 0;
        }

        const historical = this.historicalData.get(channelId);
        if (!historical || historical.signalsCount < this.config.minHistoricalSignals) {
            return 0;
        }

        const winRate = historical.successfulSignals / historical.signalsCount;
        return (winRate - 0.5) * 20; // Bonus between -10 and +10
    }

    /**
     * Calculate signal clarity
     */
    calculateSignalClarity(text) {
        const words = text.split(' ').length;
        const sentences = text.split(/[.!?]+/).length;
        
        // Prefer shorter, clearer messages
        if (words < 10) {
            return 10;
        } else if (words < 20) {
            return 5;
        } else if (words < 30) {
            return 0;
        } else {
            return -5;
        }
    }

    /**
     * Generate trading parameters
     */
    generateTradingParameters(signalParams, confidence) {
        if (!signalParams.isSignal) {
            return null;
        }

        const tradingParams = {
            action: signalParams.action,
            asset: signalParams.asset,
            amount: this.calculatePositionSize(confidence),
            expiration: signalParams.expiration || this.getDefaultExpiration(signalParams.timeframe),
            timeframe: signalParams.timeframe,
            broker: signalParams.broker || 'pocket_option',
            confidence: confidence,
            constraints: signalParams.constraints,
            riskLevel: this.calculateRiskLevel(confidence)
        };

        return tradingParams;
    }

    /**
     * Calculate position size based on confidence
     */
    calculatePositionSize(confidence) {
        // Simple position sizing based on confidence
        if (confidence >= 90) {
            return 25;
        } else if (confidence >= 80) {
            return 20;
        } else if (confidence >= 70) {
            return 15;
        } else if (confidence >= 60) {
            return 10;
        } else {
            return 5;
        }
    }

    /**
     * Get default expiration time
     */
    getDefaultExpiration(timeframe) {
        const timeframeMap = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '30m': 1800,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400
        };

        return timeframeMap[timeframe] || 300; // Default 5 minutes
    }

    /**
     * Calculate risk level
     */
    calculateRiskLevel(confidence) {
        if (confidence >= 85) {
            return 'low';
        } else if (confidence >= 70) {
            return 'medium';
        } else {
            return 'high';
        }
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(signalParams, confidence) {
        const recommendations = [];

        if (!signalParams.isSignal) {
            recommendations.push('This message does not appear to be a trading signal');
            return recommendations;
        }

        if (confidence >= 80) {
            recommendations.push('High confidence signal - consider executing');
        } else if (confidence >= 60) {
            recommendations.push('Medium confidence signal - exercise caution');
        } else {
            recommendations.push('Low confidence signal - avoid trading');
        }

        if (!signalParams.asset) {
            recommendations.push('Asset not clearly identified');
        }

        if (!signalParams.timeframe) {
            recommendations.push('Timeframe not specified');
        }

        if (!signalParams.expiration) {
            recommendations.push('Expiration time not specified');
        }

        return recommendations;
    }

    /**
     * Store historical signal
     */
    storeHistoricalSignal(signal, analysis) {
        if (!signal.channelId) {
            return;
        }

        if (!this.historicalData.has(signal.channelId)) {
            this.historicalData.set(signal.channelId, {
                signalsCount: 0,
                successfulSignals: 0,
                totalConfidence: 0,
                lastUpdate: Date.now()
            });
        }

        const historical = this.historicalData.get(signal.channelId);
        historical.signalsCount++;
        historical.totalConfidence += analysis.confidence;
        historical.lastUpdate = Date.now();

        if (analysis.confidence >= this.config.confidenceThreshold) {
            historical.successfulSignals++;
        }
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(success, analysisTime, confidence) {
        this.performanceMetrics.totalSignals++;
        
        if (success) {
            this.performanceMetrics.successfulAnalyses++;
        } else {
            this.performanceMetrics.failedAnalyses++;
        }

        // Update average analysis time
        const total = this.performanceMetrics.successfulAnalyses + this.performanceMetrics.failedAnalyses;
        const avgTime = (this.performanceMetrics.averageAnalysisTime * (total - 1) + analysisTime) / total;
        this.performanceMetrics.averageAnalysisTime = avgTime;

        // Update average confidence
        const avgConfidence = (this.performanceMetrics.averageConfidence * (total - 1) + confidence) / total;
        this.performanceMetrics.averageConfidence = avgConfidence;
    }

    /**
     * Generate cache key
     */
    generateCacheKey(signal) {
        const keyString = `${signal.text}_${signal.channelId}_${signal.timestamp}`;
        return this.hashString(keyString);
    }

    /**
     * Simple hash function
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    /**
     * Generate analysis ID
     */
    generateAnalysisId() {
        return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalSignals > 0 
                ? (this.performanceMetrics.successfulAnalyses / this.performanceMetrics.totalSignals) * 100 
                : 0,
            cacheSize: this.analysisCache.size,
            historicalChannels: this.historicalData.size
        };
    }

    /**
     * Get historical data for channel
     */
    getHistoricalData(channelId) {
        return this.historicalData.get(channelId);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.analysisCache.clear();
    }

    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.validateConfig();
    }

    /**
     * Destroy analyzer
     */
    destroy() {
        this.historicalData.clear();
        this.analysisCache.clear();
        console.log('Signal Analyzer destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignalAnalyzer;
} else if (typeof window !== 'undefined') {
    window.SignalAnalyzer = SignalAnalyzer;
}