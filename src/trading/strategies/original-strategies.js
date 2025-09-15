/**
 * Original Trading Strategies - Extracted and Enhanced from Original Bot
 * Contains the proven trading strategies from the original Pocket Option Bot
 */

class OriginalStrategies {
    constructor() {
        this.name = 'Original Trading Strategies';
        this.version = '2.0';
        this.description = 'Enhanced versions of the original trading strategies';
        
        // Strategy configurations
        this.configs = {
            cci: {
                period: 20,
                overbought: 115,
                oversold: -105,
                enabled: true
            },
            candles: {
                lookback: 4,
                enabled: true
            },
            pinBar: {
                minSeconds: 40,
                multiplier: 4,
                enabled: true
            },
            signals: {
                timeframes: [1, 2, 3, 5, 10, 15],
                enabled: true
            }
        };
        
        // Performance tracking
        this.performance = {
            totalSignals: 0,
            successfulSignals: 0,
            winRate: 0,
            averageConfidence: 0,
            strategyPerformance: {
                cci: { total: 0, wins: 0, winRate: 0 },
                candles: { total: 0, wins: 0, winRate: 0 },
                pinBar: { total: 0, wins: 0, winRate: 0 },
                signals: { total: 0, wins: 0, winRate: 0 }
            }
        };
    }

    /**
     * CCI (Commodity Channel Index) Strategy
     * Enhanced version of the original CCI strategy
     */
    cciStrategy(rates, currentTime, period = 20) {
        try {
            if (!rates || Object.keys(rates).length < period) {
                return { signal: null, confidence: 0, reasoning: 'Insufficient data for CCI analysis' };
            }

            // Get time-aligned data points
            const dataPoints = this.getTimeAlignedData(rates, currentTime, period);
            if (dataPoints.length < period) {
                return { signal: null, confidence: 0, reasoning: 'Insufficient aligned data points' };
            }

            // Calculate typical prices
            const typicalPrices = dataPoints.map(point => 
                (point[0] + point[1] + point[2] + point[3]) / 4
            );

            // Calculate SMA (Simple Moving Average)
            const sma = typicalPrices.reduce((sum, price) => sum + price, 0) / period;

            // Calculate Mean Deviation
            const meanDeviation = typicalPrices.reduce((sum, price) => 
                sum + Math.abs(price - sma), 0
            ) / period;

            // Calculate CCI
            const cci = meanDeviation === 0 ? 0 : (typicalPrices[period - 1] - sma) / (0.015 * meanDeviation);

            // Generate signal based on CCI values
            let signal = null;
            let confidence = 0;
            let reasoning = '';

            const overbought = this.configs.cci.overbought;
            const oversold = this.configs.cci.oversold;

            // Check for overbought to oversold transition (PUT signal)
            if (cci < overbought && this.lastCCI && this.lastCCI >= overbought) {
                signal = 'PUT';
                confidence = Math.min(95, 60 + Math.abs(cci - overbought) * 2);
                reasoning = `CCI overbought reversal: ${cci.toFixed(2)}`;
            }
            // Check for oversold to overbought transition (CALL signal)
            else if (cci > oversold && this.lastCCI && this.lastCCI <= oversold) {
                signal = 'CALL';
                confidence = Math.min(95, 60 + Math.abs(cci - oversold) * 2);
                reasoning = `CCI oversold reversal: ${cci.toFixed(2)}`;
            }

            // Store last CCI for next comparison
            this.lastCCI = cci;

            // Update performance tracking
            this.updateStrategyPerformance('cci', signal !== null);

            return {
                signal,
                confidence: Math.round(confidence),
                reasoning,
                indicators: {
                    cci: cci.toFixed(2),
                    overbought: overbought,
                    oversold: oversold
                }
            };

        } catch (error) {
            console.error('CCI Strategy error:', error);
            return { signal: null, confidence: 0, reasoning: `Error: ${error.message}` };
        }
    }

    /**
     * Candles Strategy - Enhanced candlestick pattern recognition
     */
    candlesStrategy(rates, currentTime, lookback = 4) {
        try {
            if (!rates || Object.keys(rates).length < lookback) {
                return { signal: null, confidence: 0, reasoning: 'Insufficient data for candle analysis' };
            }

            // Get time-aligned candle data
            const candles = this.getTimeAlignedData(rates, currentTime, lookback);
            if (candles.length < lookback) {
                return { signal: null, confidence: 0, reasoning: 'Insufficient candle data' };
            }

            // Analyze candle patterns
            let pattern = null;
            let confidence = 0;
            let reasoning = '';

            // Check for consistent bullish pattern (CALL signal)
            if (this.isBullishPattern(candles)) {
                pattern = 'CALL';
                confidence = this.calculatePatternConfidence(candles, 'bullish');
                reasoning = 'Bullish candle pattern detected';
            }
            // Check for consistent bearish pattern (PUT signal)
            else if (this.isBearishPattern(candles)) {
                pattern = 'PUT';
                confidence = this.calculatePatternConfidence(candles, 'bearish');
                reasoning = 'Bearish candle pattern detected';
            }

            // Update performance tracking
            this.updateStrategyPerformance('candles', pattern !== null);

            return {
                signal: pattern,
                confidence: Math.round(confidence),
                reasoning,
                pattern: this.getPatternDescription(candles),
                candles: candles.map(candle => ({
                    open: candle[0],
                    close: candle[1],
                    high: candle[2],
                    low: candle[3]
                }))
            };

        } catch (error) {
            console.error('Candles Strategy error:', error);
            return { signal: null, confidence: 0, reasoning: `Error: ${error.message}` };
        }
    }

    /**
     * Pin Bar Strategy - Enhanced pin bar detection
     */
    pinBarStrategy(rates, currentTime, multiplier = 4) {
        try {
            if (!rates || Object.keys(rates).length < 1) {
                return { signal: null, confidence: 0, reasoning: 'No data for pin bar analysis' };
            }

            // Get current candle data
            const currentCandle = this.getCurrentCandle(rates, currentTime);
            if (!currentCandle) {
                return { signal: null, confidence: 0, reasoning: 'No current candle data' };
            }

            // Check if enough time has passed in the candle
            const seconds = new Date(currentTime * 1000).getSeconds();
            if (seconds < this.configs.pinBar.minSeconds) {
                return { signal: null, confidence: 0, reasoning: 'Candle too early for pin bar analysis' };
            }

            const [open, close, high, low] = currentCandle;
            const body = Math.abs(close - open);
            const upperWick = high - Math.max(open, close);
            const lowerWick = Math.min(open, close) - low;
            const totalRange = high - low;

            // Check for pin bar patterns
            let signal = null;
            let confidence = 0;
            let reasoning = '';

            // Bearish pin bar (PUT signal) - long upper wick, small body
            if (upperWick > lowerWick && upperWick > body * multiplier && upperWick > totalRange * 0.6) {
                signal = 'PUT';
                confidence = Math.min(90, 50 + (upperWick / totalRange) * 100);
                reasoning = `Bearish pin bar: upper wick ${(upperWick / totalRange * 100).toFixed(1)}% of range`;
            }
            // Bullish pin bar (CALL signal) - long lower wick, small body
            else if (lowerWick > upperWick && lowerWick > body * multiplier && lowerWick > totalRange * 0.6) {
                signal = 'CALL';
                confidence = Math.min(90, 50 + (lowerWick / totalRange) * 100);
                reasoning = `Bullish pin bar: lower wick ${(lowerWick / totalRange * 100).toFixed(1)}% of range`;
            }

            // Update performance tracking
            this.updateStrategyPerformance('pinBar', signal !== null);

            return {
                signal,
                confidence: Math.round(confidence),
                reasoning,
                pattern: signal ? `${signal} pin bar` : 'No pin bar pattern',
                indicators: {
                    upperWick: upperWick.toFixed(4),
                    lowerWick: lowerWick.toFixed(4),
                    body: body.toFixed(4),
                    totalRange: totalRange.toFixed(4),
                    wickRatio: signal === 'PUT' ? 
                        (upperWick / totalRange).toFixed(3) : 
                        (lowerWick / totalRange).toFixed(3)
                }
            };

        } catch (error) {
            console.error('Pin Bar Strategy error:', error);
            return { signal: null, confidence: 0, reasoning: `Error: ${error.message}` };
        }
    }

    /**
     * Signals Strategy - Enhanced multi-timeframe signal analysis
     */
    signalsStrategy(signals, signalConfig = [2, 2, 1, 0, 0, 0]) {
        try {
            if (!signals || Object.keys(signals).length === 0) {
                return { signal: null, confidence: 0, reasoning: 'No signals data available' };
            }

            // Extract signals for different timeframes
            const timeframes = this.configs.signals.timeframes;
            const timeframeSignals = timeframes.map(tf => signals[tf] || 0);

            let signal = null;
            let confidence = 0;
            let reasoning = '';
            let signalStrength = 0;

            // Analyze signal patterns across timeframes
            for (let i = 0; i < timeframeSignals.length; i++) {
                const signalValue = timeframeSignals[i];
                const configValue = signalConfig[i] || 0;

                if (configValue === 0) continue; // Skip disabled timeframes

                if (signalValue > 0) {
                    // Bullish signal
                    if (signalValue > 2) {
                        // Strong signal
                        if (signal === 'CALL') {
                            reasoning += `Strong CALL confirmation on timeframe ${timeframes[i]}. `;
                            signalStrength += 2;
                        } else if (signal === null) {
                            signal = 'CALL';
                            reasoning += `Strong CALL signal on timeframe ${timeframes[i]}. `;
                            signalStrength += 3;
                        } else {
                            // Conflicting signals
                            reasoning += `Conflicting signal on timeframe ${timeframes[i]}. `;
                            signalStrength -= 1;
                        }
                    } else {
                        // Regular signal
                        if (signal === 'PUT') {
                            // Conflicting signals
                            reasoning += `Conflicting signal on timeframe ${timeframes[i]}. `;
                            signalStrength -= 1;
                        } else if (signal === null) {
                            signal = 'CALL';
                            reasoning += `CALL signal on timeframe ${timeframes[i]}. `;
                            signalStrength += 1;
                        } else {
                            reasoning += `Additional CALL confirmation on timeframe ${timeframes[i]}. `;
                            signalStrength += 1;
                        }
                    }
                } else if (signalValue < 0) {
                    // Bearish signal
                    if (signalValue < -2) {
                        // Strong signal
                        if (signal === 'PUT') {
                            reasoning += `Strong PUT confirmation on timeframe ${timeframes[i]}. `;
                            signalStrength += 2;
                        } else if (signal === null) {
                            signal = 'PUT';
                            reasoning += `Strong PUT signal on timeframe ${timeframes[i]}. `;
                            signalStrength += 3;
                        } else {
                            // Conflicting signals
                            reasoning += `Conflicting signal on timeframe ${timeframes[i]}. `;
                            signalStrength -= 1;
                        }
                    } else {
                        // Regular signal
                        if (signal === 'CALL') {
                            // Conflicting signals
                            reasoning += `Conflicting signal on timeframe ${timeframes[i]}. `;
                            signalStrength -= 1;
                        } else if (signal === null) {
                            signal = 'PUT';
                            reasoning += `PUT signal on timeframe ${timeframes[i]}. `;
                            signalStrength += 1;
                        } else {
                            reasoning += `Additional PUT confirmation on timeframe ${timeframes[i]}. `;
                            signalStrength += 1;
                        }
                    }
                }

                // Check if signal meets minimum requirement
                if (configValue > 0 && Math.abs(signalValue) < configValue) {
                    reasoning += `Signal strength ${Math.abs(signalValue)} below threshold ${configValue} on timeframe ${timeframes[i]}. `;
                    signalStrength -= 0.5;
                }
            }

            // Calculate confidence based on signal strength
            if (signal && signalStrength > 0) {
                confidence = Math.min(95, 40 + (signalStrength * 15));
                reasoning += `Overall signal strength: ${signalStrength.toFixed(1)}.`;
            } else if (signal && signalStrength <= 0) {
                signal = null; // Nullify signal due to conflicts
                confidence = 0;
                reasoning = 'Conflicting signals across timeframes.';
            }

            // Update performance tracking
            this.updateStrategyPerformance('signals', signal !== null);

            return {
                signal,
                confidence: Math.round(confidence),
                reasoning,
                signalStrength: signalStrength.toFixed(1),
                timeframeSignals: timeframeSignals.map((value, index) => ({
                    timeframe: timeframes[index],
                    value: value,
                    threshold: signalConfig[index] || 0
                }))
            };

        } catch (error) {
            console.error('Signals Strategy error:', error);
            return { signal: null, confidence: 0, reasoning: `Error: ${error.message}` };
        }
    }

    /**
     * Helper method to get time-aligned data points
     */
    getTimeAlignedData(rates, currentTime, period) {
        const aligned = [];
        const currentMinute = Math.floor(currentTime / 60) * 60;
        
        for (let i = 0; i < period; i++) {
            const timestamp = currentMinute - (i * 60);
            const candle = rates[timestamp];
            
            if (candle) {
                aligned.unshift(candle); // Add to beginning for chronological order
            } else {
                // Fill with previous candle if available
                if (aligned.length > 0) {
                    aligned.unshift(aligned[0]);
                } else {
                    return []; // Not enough data
                }
            }
        }
        
        return aligned;
    }

    /**
     * Helper method to get current candle
     */
    getCurrentCandle(rates, currentTime) {
        const currentMinute = Math.floor(currentTime / 60) * 60;
        return rates[currentMinute];
    }

    /**
     * Check for bullish candle pattern
     */
    isBullishPattern(candles) {
        if (candles.length < 2) return false;
        
        let consecutiveBullish = 0;
        
        for (let i = candles.length - 1; i >= 0; i--) {
            const [open, close] = candles[i];
            if (close > open) {
                consecutiveBullish++;
            } else {
                break;
            }
        }
        
        return consecutiveBullish >= Math.floor(candles.length / 2);
    }

    /**
     * Check for bearish candle pattern
     */
    isBearishPattern(candles) {
        if (candles.length < 2) return false;
        
        let consecutiveBearish = 0;
        
        for (let i = candles.length - 1; i >= 0; i--) {
            const [open, close] = candles[i];
            if (close < open) {
                consecutiveBearish++;
            } else {
                break;
            }
        }
        
        return consecutiveBearish >= Math.floor(candles.length / 2);
    }

    /**
     * Calculate pattern confidence
     */
    calculatePatternConfidence(candles, patternType) {
        let confidence = 50; // Base confidence
        
        const consecutiveCandles = patternType === 'bullish' ? 
            this.countConsecutiveBullish(candles) : 
            this.countConsecutiveBearish(candles);
        
        // Increase confidence for consecutive candles
        confidence += consecutiveCandles * 10;
        
        // Check for strong closes
        const lastCandle = candles[candles.length - 1];
        const [open, close, high, low] = lastCandle;
        const body = Math.abs(close - open);
        const range = high - low;
        
        if (body / range > 0.6) { // Strong body
            confidence += 15;
        }
        
        return Math.min(95, confidence);
    }

    /**
     * Count consecutive bullish candles
     */
    countConsecutiveBullish(candles) {
        let count = 0;
        for (let i = candles.length - 1; i >= 0; i--) {
            if (candles[i][1] > candles[i][0]) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    /**
     * Count consecutive bearish candles
     */
    countConsecutiveBearish(candles) {
        let count = 0;
        for (let i = candles.length - 1; i >= 0; i--) {
            if (candles[i][1] < candles[i][0]) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    /**
     * Get pattern description
     */
    getPatternDescription(candles) {
        const descriptions = [];
        
        for (let i = 0; i < candles.length; i++) {
            const [open, close] = candles[i];
            const type = close > open ? 'bullish' : 'bearish';
            descriptions.push(`Candle ${i + 1}: ${type}`);
        }
        
        return descriptions.join(', ');
    }

    /**
     * Update strategy performance tracking
     */
    updateStrategyPerformance(strategyName, wasSuccessful) {
        if (!this.performance.strategyPerformance[strategyName]) {
            return;
        }
        
        const perf = this.performance.strategyPerformance[strategyName];
        perf.total++;
        
        if (wasSuccessful) {
            perf.wins++;
        }
        
        perf.winRate = perf.total > 0 ? (perf.wins / perf.total) * 100 : 0;
    }

    /**
     * Get strategy performance metrics
     */
    getStrategyPerformance() {
        return {
            ...this.performance,
            overallWinRate: this.performance.totalSignals > 0 ? 
                (this.performance.successfulSignals / this.performance.totalSignals) * 100 : 0
        };
    }

    /**
     * Update strategy configuration
     */
    updateConfig(strategyName, config) {
        if (this.configs[strategyName]) {
            this.configs[strategyName] = { ...this.configs[strategyName], ...config };
        }
    }

    /**
     * Get strategy configuration
     */
    getConfig() {
        return { ...this.configs };
    }

    /**
     * Reset performance tracking
     */
    resetPerformance() {
        this.performance = {
            totalSignals: 0,
            successfulSignals: 0,
            winRate: 0,
            averageConfidence: 0,
            strategyPerformance: {
                cci: { total: 0, wins: 0, winRate: 0 },
                candles: { total: 0, wins: 0, winRate: 0 },
                pinBar: { total: 0, wins: 0, winRate: 0 },
                signals: { total: 0, wins: 0, winRate: 0 }
            }
        };
    }

    /**
     * Get strategy info
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            enabledStrategies: Object.keys(this.configs).filter(key => this.configs[key].enabled),
            performance: this.getStrategyPerformance()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OriginalStrategies;
} else if (typeof window !== 'undefined') {
    window.OriginalStrategies = OriginalStrategies;
}