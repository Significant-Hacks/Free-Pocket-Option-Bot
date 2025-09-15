/**
 * Trading Strategies - Enhanced version of original bot strategies
 * Extracted and refactored from original bot with AI integration capabilities
 */

class TradingStrategies {
    constructor(config = {}) {
        this.config = {
            defaultPeriod: 20,
            cciPeriod: 20,
            candleCount: 4,
            pinBarMultiplier: 4,
            signalThresholds: [2, 2, 1, 0, 0, 0],
            ...config
        };
        
        this.performanceMetrics = {
            totalSignals: 0,
            successfulSignals: 0,
            failedSignals: 0,
            averageConfidence: 0,
            strategyPerformance: {}
        };
        
        this.initialize();
    }

    /**
     * Initialize strategies
     */
    initialize() {
        console.log('Trading Strategies initialized');
        this.resetStrategyMetrics();
    }

    /**
     * Reset strategy performance metrics
     */
    resetStrategyMetrics() {
        this.performanceMetrics.strategyPerformance = {
            cci: { signals: 0, wins: 0, losses: 0 },
            candles: { signals: 0, wins: 0, losses: 0 },
            pinBar: { signals: 0, wins: 0, losses: 0 },
            signals: { signals: 0, wins: 0, losses: 0 }
        };
    }

    /**
     * CCI (Commodity Channel Index) Strategy
     * Enhanced version of original CCI strategy
     */
    cciStrategy(marketData, timestamp, period = null) {
        period = period || this.config.cciPeriod;
        
        try {
            if (!marketData || Object.keys(marketData).length < period) {
                return {
                    strategy: 'cci',
                    signal: null,
                    confidence: 0,
                    reasoning: 'Insufficient market data'
                };
            }

            // Calculate CCI
            const cciValue = this.calculateCCI(marketData, timestamp, period);
            
            let signal = null;
            let confidence = 0;
            let reasoning = '';

            // CCI overbought/oversold analysis
            if (cciValue > 100) {
                signal = 'PUT'; // Overbought - sell signal
                confidence = Math.min(95, Math.abs(cciValue - 100) * 0.5);
                reasoning = `CCI overbought at ${cciValue.toFixed(2)}`;
            } else if (cciValue < -100) {
                signal = 'CALL'; // Oversold - buy signal
                confidence = Math.min(95, Math.abs(cciValue + 100) * 0.5);
                reasoning = `CCI oversold at ${cciValue.toFixed(2)}`;
            }

            // Enhanced analysis with trend confirmation
            const trendConfirmation = this.confirmTrend(marketData, timestamp);
            if (trendConfirmation.trend === signal) {
                confidence += 10;
                reasoning += `, confirmed by ${trendConfirmation.trend} trend`;
            }

            return {
                strategy: 'cci',
                signal: signal,
                confidence: Math.min(100, confidence),
                reasoning: reasoning,
                indicators: {
                    cci: cciValue,
                    trend: trendConfirmation.trend,
                    trendStrength: trendConfirmation.strength
                }
            };

        } catch (error) {
            console.error('CCI Strategy error:', error);
            return {
                strategy: 'cci',
                signal: null,
                confidence: 0,
                reasoning: `Error: ${error.message}`
            };
        }
    }

    /**
     * Calculate CCI value
     */
    calculateCCI(marketData, timestamp, period) {
        const interval = 60; // 1 minute intervals
        const baseTime = interval * Math.floor(timestamp / interval);
        
        // Collect price data for the period
        const prices = [];
        for (let i = 0; i < period; i++) {
            const time = baseTime - (i * interval);
            const candle = marketData[time];
            
            if (candle) {
                prices.push(candle);
            }
        }

        if (prices.length < period) {
            throw new Error('Insufficient data for CCI calculation');
        }

        // Calculate Typical Price
        const typicalPrices = prices.map(candle => (candle[0] + candle[2] + candle[3]) / 3);
        
        // Calculate Simple Moving Average
        const sma = typicalPrices.reduce((sum, price) => sum + price, 0) / typicalPrices.length;
        
        // Calculate Mean Deviation
        const meanDeviation = typicalPrices.reduce((sum, price) => {
            return sum + Math.abs(price - sma);
        }, 0) / typicalPrices.length;
        
        // Calculate CCI
        const cci = (typicalPrices[typicalPrices.length - 1] - sma) / (0.015 * meanDeviation);
        
        return cci;
    }

    /**
     * Candlestick Pattern Strategy
     * Enhanced version of original candles strategy
     */
    candlesStrategy(marketData, timestamp, candleCount = null) {
        candleCount = candleCount || this.config.candleCount;
        
        try {
            if (!marketData || Object.keys(marketData).length < candleCount) {
                return {
                    strategy: 'candles',
                    signal: null,
                    confidence: 0,
                    reasoning: 'Insufficient market data'
                };
            }

            const pattern = this.analyzeCandlePattern(marketData, timestamp, candleCount);
            
            if (!pattern) {
                return {
                    strategy: 'candles',
                    signal: null,
                    confidence: 0,
                    reasoning: 'No clear pattern detected'
                };
            }

            return {
                strategy: 'candles',
                signal: pattern.signal,
                confidence: pattern.confidence,
                reasoning: pattern.reasoning,
                pattern: pattern.pattern,
                reliability: pattern.reliability
            };

        } catch (error) {
            console.error('Candles Strategy error:', error);
            return {
                strategy: 'candles',
                signal: null,
                confidence: 0,
                reasoning: `Error: ${error.message}`
            };
        }
    }

    /**
     * Analyze candlestick pattern
     */
    analyzeCandlePattern(marketData, timestamp, candleCount) {
        const interval = 60;
        const baseTime = interval * Math.floor(timestamp / interval);
        
        let currentTrend = null;
        let trendChanges = 0;
        const candles = [];
        
        // Collect candle data
        for (let i = 0; i < candleCount; i++) {
            const time = baseTime - (i * interval);
            const candle = marketData[time];
            
            if (!candle) {
                return null;
            }
            
            candles.unshift(candle); // Add to beginning for chronological order
            
            // Determine candle direction
            const isGreen = candle[0] < candle[1];
            const candleTrend = isGreen ? 'up' : 'down';
            
            // Check for trend change
            if (currentTrend && currentTrend !== candleTrend) {
                trendChanges++;
            }
            
            currentTrend = candleTrend;
        }

        // Pattern analysis
        if (trendChanges === 0) {
            // Strong trend - no signal
            return null;
        }

        // Look for reversal patterns
        const lastCandle = candles[candles.length - 1];
        const secondLastCandle = candles[candles.length - 2];
        
        let signal = null;
        let confidence = 0;
        let reasoning = '';
        let reliability = 'medium';

        // Check for reversal patterns
        if (trendChanges === 1) {
            const firstTrend = candles[0][0] < candles[0][1] ? 'up' : 'down';
            const lastTrend = lastCandle[0] < lastCandle[1] ? 'up' : 'down';
            
            if (firstTrend !== lastTrend) {
                signal = lastTrend;
                confidence = 70;
                reasoning = `Reversal pattern detected from ${firstTrend} to ${lastTrend}`;
                
                // Check reversal strength
                const reversalStrength = this.calculateReversalStrength(candles);
                confidence += reversalStrength * 10;
                
                if (reversalStrength > 0.7) {
                    reliability = 'high';
                }
            }
        }

        // Check for specific patterns (doji, hammer, etc.)
        const specialPattern = this.identifySpecialPattern(candles);
        if (specialPattern) {
            signal = specialPattern.signal;
            confidence = Math.max(confidence, specialPattern.confidence);
            reasoning += `, ${specialPattern.pattern} detected`;
            reliability = specialPattern.reliability;
        }

        if (signal) {
            return {
                signal,
                confidence: Math.min(100, confidence),
                reasoning,
                pattern: this.getPatternName(candles),
                reliability
            };
        }

        return null;
    }

    /**
     * Pin Bar Strategy
     * Enhanced version of original pinBar strategy
     */
    pinBarStrategy(marketData, timestamp, multiplier = null) {
        multiplier = multiplier || this.config.pinBarMultiplier;
        
        try {
            if (!marketData) {
                return {
                    strategy: 'pinBar',
                    signal: null,
                    confidence: 0,
                    reasoning: 'No market data available'
                };
            }

            const pinBar = this.identifyPinBar(marketData, timestamp);
            
            if (!pinBar) {
                return {
                    strategy: 'pinBar',
                    signal: null,
                    confidence: 0,
                    reasoning: 'No pin bar pattern detected'
                };
            }

            return {
                strategy: 'pinBar',
                signal: pinBar.signal,
                confidence: pinBar.confidence,
                reasoning: pinBar.reasoning,
                pinBarType: pinBar.type,
                reliability: pinBar.reliability
            };

        } catch (error) {
            console.error('Pin Bar Strategy error:', error);
            return {
                strategy: 'pinBar',
                signal: null,
                confidence: 0,
                reasoning: `Error: ${error.message}`
            };
        }
    }

    /**
     * Identify pin bar pattern
     */
    identifyPinBar(marketData, timestamp) {
        const interval = 60;
        const time = interval * Math.floor(timestamp / interval);
        const candle = marketData[time];
        
        if (!candle) {
            return null;
        }

        const [open, high, low, close] = candle;
        const body = Math.abs(close - open);
        const upperWick = high - Math.max(open, close);
        const lowerWick = Math.min(open, close) - low;
        const totalRange = high - low;

        // Check if it's a valid pin bar (small body, long wick)
        if (body > totalRange * 0.3) {
            return null; // Body too large for pin bar
        }

        const date = new Date(timestamp * 1000);
        const seconds = date.getSeconds();
        
        // Pin bars are more reliable near the end of the period
        if (seconds < 40) {
            return null;
        }

        let signal = null;
        let confidence = 0;
        let reasoning = '';
        let type = '';
        let reliability = 'medium';

        // Bullish pin bar (long lower wick)
        if (lowerWick > upperWick && lowerWick > body * multiplier) {
            signal = 'CALL';
            confidence = 75;
            reasoning = `Bullish pin bar with lower wick ${lowerWick.toFixed(4)}`;
            type = 'bullish';
            
            // Additional confirmation
            if (lowerWick > totalRange * 0.6) {
                confidence += 10;
                reliability = 'high';
            }
        }

        // Bearish pin bar (long upper wick)
        else if (upperWick > lowerWick && upperWick > body * multiplier) {
            signal = 'PUT';
            confidence = 75;
            reasoning = `Bearish pin bar with upper wick ${upperWick.toFixed(4)}`;
            type = 'bearish';
            
            // Additional confirmation
            if (upperWick > totalRange * 0.6) {
                confidence += 10;
                reliability = 'high';
            }
        }

        if (signal) {
            // Check for support/resistance confirmation
            const srConfirmation = this.checkSupportResistance(marketData, timestamp, signal);
            if (srConfirmation) {
                confidence += 15;
                reasoning += `, confirmed by ${srConfirmation}`;
                reliability = 'high';
            }

            return {
                signal,
                confidence: Math.min(100, confidence),
                reasoning,
                type,
                reliability,
                metrics: {
                    body: body,
                    upperWick: upperWick,
                    lowerWick: lowerWick,
                    totalRange: totalRange,
                    ratio: Math.max(upperWick, lowerWick) / body
                }
            };
        }

        return null;
    }

    /**
     * Signals Strategy
     * Enhanced version of original signals strategy
     */
    signalsStrategy(signalData, thresholds = null) {
        thresholds = thresholds || this.config.signalThresholds;
        
        try {
            if (!signalData || !signalData.signals) {
                return {
                    strategy: 'signals',
                    signal: null,
                    confidence: 0,
                    reasoning: 'No signal data available'
                };
            }

            const result = this.analyzeSignalPattern(signalData.signals, thresholds);
            
            return {
                strategy: 'signals',
                signal: result.signal,
                confidence: result.confidence,
                reasoning: result.reasoning,
                signalStrength: result.strength,
                pattern: result.pattern
            };

        } catch (error) {
            console.error('Signals Strategy error:', error);
            return {
                strategy: 'signals',
                signal: null,
                confidence: 0,
                reasoning: `Error: ${error.message}`
            };
        }
    }

    /**
     * Analyze signal pattern
     */
    analyzeSignalPattern(signals, thresholds) {
        // Extract signal values at different timeframes
        const signalValues = [
            signals[1] || 0,  // 1m
            signals[2] || 0,  // 2m
            signals[3] || 0,  // 3m
            signals[5] || 0,  // 5m
            signals[10] || 0, // 10m
            signals[15] || 0  // 15m
        ];

        let signal = null;
        let confidence = 0;
        let reasoning = '';
        let strength = 0;
        let pattern = '';

        // Analyze signal pattern
        for (let i = 0; i < signalValues.length; i++) {
            const threshold = thresholds[i] || 0;
            const value = signalValues[i];

            if (threshold > 0 && value > 0) {
                if (value > 2) {
                    // Strong signal
                    if (signal === 'up') {
                        return { signal: null, confidence: 0, reasoning: 'Conflicting signals detected', strength: 0, pattern: 'conflict' };
                    }
                    signal = 'down';
                    strength += (value - 2);
                    confidence += 15;
                } else {
                    // Normal signal
                    if (signal === 'down') {
                        return { signal: null, confidence: 0, reasoning: 'Conflicting signals detected', strength: 0, pattern: 'conflict' };
                    }
                    signal = 'up';
                    strength += value;
                    confidence += 10;
                }

                // Check if signal meets threshold
                if (value < threshold) {
                    return { signal: null, confidence: 0, reasoning: `Signal below threshold (${value} < ${threshold})`, strength: 0, pattern: 'weak' };
                }
            }
        }

        if (signal) {
            reasoning = `${signal.toUpperCase()} signal detected with strength ${strength.toFixed(1)}`;
            pattern = this.getSignalPatternName(signalValues);
            confidence = Math.min(100, confidence);
        }

        return {
            signal,
            confidence,
            reasoning,
            strength,
            pattern
        };
    }

    /**
     * AI-Enhanced Strategy (New)
     * Combines multiple strategies with AI analysis
     */
    aiEnhancedStrategy(marketData, timestamp, aiAnalysis, strategyWeights = null) {
        strategyWeights = strategyWeights || {
            cci: 0.25,
            candles: 0.25,
            pinBar: 0.25,
            signals: 0.25
        };

        try {
            // Run all strategies
            const strategies = [
                this.cciStrategy(marketData, timestamp),
                this.candlesStrategy(marketData, timestamp),
                this.pinBarStrategy(marketData, timestamp),
                this.signalsStrategy(aiAnalysis.signalData || {})
            ];

            // Filter out null signals
            const validStrategies = strategies.filter(s => s.signal !== null);
            
            if (validStrategies.length === 0) {
                return {
                    strategy: 'ai_enhanced',
                    signal: null,
                    confidence: 0,
                    reasoning: 'No valid signals from any strategy',
                    components: strategies
                };
            }

            // Calculate weighted confidence
            let totalWeight = 0;
            let weightedConfidence = 0;
            const signals = [];

            for (const strategy of validStrategies) {
                const weight = strategyWeights[strategy.strategy] || 0.2;
                totalWeight += weight;
                weightedConfidence += strategy.confidence * weight;
                signals.push(strategy.signal);
            }

            // Check for consensus
            const uniqueSignals = [...new Set(signals)];
            const consensus = uniqueSignals.length === 1;

            // Final signal determination
            let finalSignal = null;
            let finalConfidence = 0;
            let reasoning = '';

            if (consensus) {
                finalSignal = uniqueSignals[0];
                finalConfidence = weightedConfidence / totalWeight;
                reasoning = `Consensus signal (${finalSignal}) from ${validStrategies.length} strategies`;
                
                // Boost confidence for consensus
                finalConfidence *= 1.1;
            } else {
                // No consensus - use AI analysis as tiebreaker
                if (aiAnalysis && aiAnalysis.confidence > 70) {
                    finalSignal = aiAnalysis.tradingParams.action;
                    finalConfidence = Math.min(100, weightedConfidence / totalWeight);
                    reasoning = `AI tiebreaker signal (${finalSignal}) with ${finalConfidence.toFixed(1)}% confidence`;
                } else {
                    return {
                        strategy: 'ai_enhanced',
                        signal: null,
                        confidence: 0,
                        reasoning: 'No consensus among strategies and low AI confidence',
                        components: strategies
                    };
                }
            }

            // Apply AI enhancement
            if (aiAnalysis && aiAnalysis.confidence > 60) {
                finalConfidence *= (1 + (aiAnalysis.confidence - 60) / 100);
                reasoning += `, enhanced by AI analysis (${aiAnalysis.confidence}% confidence)`;
            }

            return {
                strategy: 'ai_enhanced',
                signal: finalSignal,
                confidence: Math.min(100, finalConfidence),
                reasoning,
                consensus,
                components: strategies,
                aiAnalysis: aiAnalysis
            };

        } catch (error) {
            console.error('AI Enhanced Strategy error:', error);
            return {
                strategy: 'ai_enhanced',
                signal: null,
                confidence: 0,
                reasoning: `Error: ${error.message}`
            };
        }
    }

    /**
     * Helper methods
     */
    confirmTrend(marketData, timestamp) {
        // Simple trend confirmation logic
        const interval = 60;
        const baseTime = interval * Math.floor(timestamp / interval);
        
        let upCount = 0;
        let downCount = 0;
        
        for (let i = 0; i < 5; i++) {
            const time = baseTime - (i * interval);
            const candle = marketData[time];
            
            if (candle) {
                if (candle[1] > candle[0]) upCount++;
                else downCount++;
            }
        }
        
        return {
            trend: upCount > downCount ? 'up' : 'down',
            strength: Math.abs(upCount - downCount) / 5
        };
    }

    calculateReversalStrength(candles) {
        // Calculate reversal pattern strength
        const firstCandle = candles[0];
        const lastCandle = candles[candles.length - 1];
        
        const firstBody = Math.abs(firstCandle[1] - firstCandle[0]);
        const lastBody = Math.abs(lastCandle[1] - lastCandle[0]);
        
        return Math.min(1, lastBody / (firstBody || 1));
    }

    identifySpecialPattern(candles) {
        // Identify special candlestick patterns
        const lastCandle = candles[candles.length - 1];
        const [open, high, low, close] = lastCandle;
        const body = Math.abs(close - open);
        const range = high - low;
        
        // Doji pattern
        if (body < range * 0.1) {
            return {
                signal: close > open ? 'CALL' : 'PUT',
                confidence: 65,
                pattern: 'doji',
                reliability: 'medium'
            };
        }
        
        // Hammer pattern
        if (close > open && (open - low) > body * 2 && (high - close) < body * 0.5) {
            return {
                signal: 'CALL',
                confidence: 75,
                pattern: 'hammer',
                reliability: 'high'
            };
        }
        
        // Shooting star pattern
        if (close < open && (high - open) > body * 2 && (close - low) < body * 0.5) {
            return {
                signal: 'PUT',
                confidence: 75,
                pattern: 'shooting_star',
                reliability: 'high'
            };
        }
        
        return null;
    }

    getPatternName(candles) {
        const trends = candles.map(candle => candle[1] > candle[0] ? 'up' : 'down');
        const uniqueTrends = [...new Set(trends)];
        
        if (uniqueTrends.length === 1) {
            return `strong_${uniqueTrends[0]}_trend`;
        } else {
            return `reversal_pattern`;
        }
    }

    checkSupportResistance(marketData, timestamp, signal) {
        // Simple support/resistance check
        const interval = 60;
        const time = interval * Math.floor(timestamp / interval);
        const candle = marketData[time];
        
        if (!candle) return null;
        
        const [open, high, low, close] = candle;
        
        if (signal === 'CALL' && low < open * 0.999) {
            return 'support';
        } else if (signal === 'PUT' && high > open * 1.001) {
            return 'resistance';
        }
        
        return null;
    }

    getSignalPatternName(signalValues) {
        const maxIndex = signalValues.indexOf(Math.max(...signalValues));
        const patterns = ['very_short_term', 'short_term', 'medium_term', 'standard', 'long_term', 'very_long_term'];
        return patterns[maxIndex] || 'mixed';
    }

    updateStrategyPerformance(strategy, success) {
        if (!this.performanceMetrics.strategyPerformance[strategy]) {
            return;
        }

        const perf = this.performanceMetrics.strategyPerformance[strategy];
        perf.signals++;
        
        if (success) {
            perf.wins++;
        } else {
            perf.losses++;
        }
    }

    getStrategyPerformance() {
        return {
            ...this.performanceMetrics.strategyPerformance,
            overall: {
                signals: this.performanceMetrics.totalSignals,
                wins: this.performanceMetrics.successfulSignals,
                losses: this.performanceMetrics.failedSignals,
                winRate: this.performanceMetrics.totalSignals > 0 
                    ? (this.performanceMetrics.successfulSignals / this.performanceMetrics.totalSignals) * 100 
                    : 0
            }
        };
    }

    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            strategyPerformance: this.getStrategyPerformance()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TradingStrategies;
} else if (typeof window !== 'undefined') {
    window.TradingStrategies = TradingStrategies;
}