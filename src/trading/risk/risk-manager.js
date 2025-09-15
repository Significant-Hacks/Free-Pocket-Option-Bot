/**
 * Risk Manager - Advanced risk management system
 * Handles position sizing, stop-loss, and risk assessment
 */

class RiskManager {
    constructor(config = {}) {
        this.config = {
            maxDailyLoss: 100,           // Maximum daily loss percentage
            maxTradeAmount: 50,          // Maximum single trade amount
            maxConcurrentTrades: 5,      // Maximum concurrent trades
            maxRiskPerTrade: 2,          // Maximum risk per trade (percentage)
            stopLossEnabled: true,        // Enable stop-loss
            takeProfitEnabled: true,      // Enable take-profit
            riskRewardRatio: 2,          // Risk/reward ratio
            accountRiskLimit: 10,         // Maximum account risk percentage
            martingaleEnabled: true,     // Enable martingale
            maxMartingaleLevels: 5,      // Maximum martingale levels
            martingaleMultiplier: 2,     // Martingale multiplier
            confidenceThreshold: 70,      // Minimum confidence for trading
            ...config
        };
        
        this.accountData = {
            balance: 0,
            dailyPL: 0,
            dailyTrades: 0,
            maxDailyBalance: 0,
            lastReset: Date.now()
        };
        
        this.activeTrades = new Map();
        this.tradeHistory = [];
        this.riskMetrics = {
            totalRisk: 0,
            currentRisk: 0,
            riskLevel: 'low',
            dailyRisk: 0,
            accountRisk: 0
        };
        
        this.performanceMetrics = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            averageWin: 0,
            averageLoss: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize risk manager
     */
    initialize() {
        console.log('Risk Manager initialized');
        this.resetDailyMetrics();
    }

    /**
     * Reset daily metrics
     */
    resetDailyMetrics() {
        const now = Date.now();
        const lastReset = new Date(this.accountData.lastReset);
        const isNewDay = now - lastReset.getTime() > 24 * 60 * 60 * 1000;

        if (isNewDay) {
            this.accountData.dailyPL = 0;
            this.accountData.dailyTrades = 0;
            this.accountData.lastReset = now;
            console.log('Daily risk metrics reset');
        }
    }

    /**
     * Assess trade risk
     */
    async assessTradeRisk(tradeParams, additionalContext = {}) {
        try {
            this.resetDailyMetrics();
            
            // Validate basic parameters
            const validation = this.validateTradeParams(tradeParams);
            if (!validation.valid) {
                return {
                    approved: false,
                    reason: validation.reason,
                    riskLevel: 'high',
                    recommendations: [validation.reason]
                };
            }

            // Calculate position size
            const positionSize = this.calculatePositionSize(tradeParams, additionalContext);
            
            // Check account limits
            const accountCheck = this.checkAccountLimits(tradeParams, positionSize);
            if (!accountCheck.approved) {
                return accountCheck;
            }

            // Check daily limits
            const dailyCheck = this.checkDailyLimits(tradeParams, positionSize);
            if (!dailyCheck.approved) {
                return dailyCheck;
            }

            // Check concurrent trades limit
            const concurrentCheck = this.checkConcurrentTrades();
            if (!concurrentCheck.approved) {
                return concurrentCheck;
            }

            // Calculate risk metrics
            const riskMetrics = this.calculateRiskMetrics(tradeParams, positionSize);
            
            // Check overall risk
            const overallRiskCheck = this.checkOverallRisk(riskMetrics);
            if (!overallRiskCheck.approved) {
                return overallRiskCheck;
            }

            // Generate recommendations
            const recommendations = this.generateRecommendations(tradeParams, riskMetrics);

            return {
                approved: true,
                positionSize: positionSize,
                riskMetrics: riskMetrics,
                riskLevel: riskMetrics.riskLevel,
                recommendations: recommendations,
                confidence: this.calculateTradeConfidence(tradeParams, additionalContext)
            };

        } catch (error) {
            console.error('Risk assessment error:', error);
            return {
                approved: false,
                reason: `Risk assessment error: ${error.message}`,
                riskLevel: 'high',
                recommendations: ['Retry risk assessment later']
            };
        }
    }

    /**
     * Validate trade parameters
     */
    validateTradeParams(tradeParams) {
        if (!tradeParams.action || !['CALL', 'PUT'].includes(tradeParams.action)) {
            return {
                valid: false,
                reason: 'Invalid or missing action parameter'
            };
        }

        if (!tradeParams.asset) {
            return {
                valid: false,
                reason: 'Missing asset parameter'
            };
        }

        if (!tradeParams.amount || tradeParams.amount <= 0) {
            return {
                valid: false,
                reason: 'Invalid or missing amount parameter'
            };
        }

        if (tradeParams.amount > this.config.maxTradeAmount) {
            return {
                valid: false,
                reason: `Trade amount exceeds maximum of ${this.config.maxTradeAmount}`
            };
        }

        return {
            valid: true
        };
    }

    /**
     * Calculate optimal position size
     */
    calculatePositionSize(tradeParams, additionalContext = {}) {
        let positionSize = tradeParams.amount;
        
        // Adjust based on confidence
        if (additionalContext.confidence) {
            const confidenceMultiplier = Math.max(0.5, Math.min(1.5, additionalContext.confidence / 100));
            positionSize *= confidenceMultiplier;
        }

        // Adjust based on risk per trade
        const maxRiskAmount = (this.config.maxRiskPerTrade / 100) * this.accountData.balance;
        if (positionSize > maxRiskAmount) {
            positionSize = maxRiskAmount;
        }

        // Adjust based on account risk
        const accountRiskAmount = (this.config.accountRiskLimit / 100) * this.accountData.balance;
        if (positionSize > accountRiskAmount) {
            positionSize = accountRiskAmount;
        }

        // Adjust based on volatility (if available)
        if (additionalContext.volatility) {
            const volatilityMultiplier = 1 / (1 + additionalContext.volatility);
            positionSize *= volatilityMultiplier;
        }

        // Round to nearest 0.01
        positionSize = Math.round(positionSize * 100) / 100;

        // Ensure minimum position size
        positionSize = Math.max(1, positionSize);

        return positionSize;
    }

    /**
     * Check account limits
     */
    checkAccountLimits(tradeParams, positionSize) {
        if (this.accountData.balance <= 0) {
            return {
                approved: false,
                reason: 'Insufficient account balance',
                riskLevel: 'high',
                recommendations: ['Deposit funds to continue trading']
            };
        }

        if (positionSize > this.accountData.balance) {
            return {
                approved: false,
                reason: 'Position size exceeds account balance',
                riskLevel: 'high',
                recommendations: ['Reduce position size or add funds']
            };
        }

        return {
            approved: true
        };
    }

    /**
     * Check daily limits
     */
    checkDailyLimits(tradeParams, positionSize) {
        // Check daily loss limit
        const dailyLossLimit = (this.config.maxDailyLoss / 100) * this.accountData.maxDailyBalance;
        
        if (this.accountData.dailyPL < -dailyLossLimit) {
            return {
                approved: false,
                reason: 'Daily loss limit reached',
                riskLevel: 'high',
                recommendations: ['Stop trading for the day', 'Review trading strategy']
            };
        }

        // Check daily trade count limit
        if (this.accountData.dailyTrades >= 50) {
            return {
                approved: false,
                reason: 'Daily trade limit reached',
                riskLevel: 'medium',
                recommendations: ['Reduce trading frequency', 'Focus on quality trades']
            };
        }

        return {
            approved: true
        };
    }

    /**
     * Check concurrent trades limit
     */
    checkConcurrentTrades() {
        const activeTradeCount = this.activeTrades.size;
        
        if (activeTradeCount >= this.config.maxConcurrentTrades) {
            return {
                approved: false,
                reason: `Maximum concurrent trades (${this.config.maxConcurrentTrades}) reached`,
                riskLevel: 'medium',
                recommendations: ['Wait for existing trades to close', 'Reduce concurrent positions']
            };
        }

        return {
            approved: true
        };
    }

    /**
     * Calculate risk metrics
     */
    calculateRiskMetrics(tradeParams, positionSize) {
        const riskAmount = positionSize; // For binary options, risk = position size
        const potentialReward = positionSize * 0.8; // Typical 80% payout
        
        const riskPercentage = (riskAmount / this.accountData.balance) * 100;
        const dailyRiskPercentage = (riskAmount / this.accountData.maxDailyBalance) * 100;
        
        // Calculate risk level
        let riskLevel = 'low';
        if (riskPercentage > 5 || dailyRiskPercentage > 15) {
            riskLevel = 'high';
        } else if (riskPercentage > 2 || dailyRiskPercentage > 8) {
            riskLevel = 'medium';
        }

        return {
            riskAmount: riskAmount,
            potentialReward: potentialReward,
            riskPercentage: riskPercentage,
            dailyRiskPercentage: dailyRiskPercentage,
            riskLevel: riskLevel,
            riskRewardRatio: potentialReward / riskAmount,
            maxDrawdown: this.calculateMaxDrawdown()
        };
    }

    /**
     * Check overall risk
     */
    checkOverallRisk(riskMetrics) {
        // Check if risk level is acceptable
        if (riskMetrics.riskLevel === 'high') {
            return {
                approved: false,
                reason: 'Overall risk level too high',
                riskLevel: 'high',
                recommendations: ['Reduce position size', 'Wait for better opportunities']
            };
        }

        // Check account risk concentration
        if (riskMetrics.dailyRiskPercentage > 20) {
            return {
                approved: false,
                reason: 'Account risk concentration too high',
                riskLevel: 'high',
                recommendations: ['Diversify trades', 'Reduce position size']
            };
        }

        return {
            approved: true
        };
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(tradeParams, riskMetrics) {
        const recommendations = [];
        
        // Position size recommendations
        if (riskMetrics.riskPercentage > 3) {
            recommendations.push('Consider reducing position size to manage risk');
        }

        // Risk level recommendations
        if (riskMetrics.riskLevel === 'high') {
            recommendations.push('High risk detected - exercise caution');
        }

        // Account balance recommendations
        if (this.accountData.balance < 100) {
            recommendations.push('Low account balance - consider depositing more funds');
        }

        // Performance-based recommendations
        if (this.performanceMetrics.profitFactor < 1) {
            recommendations.push('Review trading strategy - current performance is negative');
        }

        // Confidence-based recommendations
        if (tradeParams.confidence && tradeParams.confidence < this.config.confidenceThreshold) {
            recommendations.push('Low confidence signal - consider skipping this trade');
        }

        return recommendations;
    }

    /**
     * Calculate trade confidence
     */
    calculateTradeConfidence(tradeParams, additionalContext = {}) {
        let confidence = 50; // Base confidence
        
        // Adjust based on signal confidence
        if (additionalContext.confidence) {
            confidence = additionalContext.confidence;
        }

        // Adjust based on risk metrics
        if (additionalContext.riskMetrics) {
            const riskMetrics = additionalContext.riskMetrics;
            
            if (riskMetrics.riskLevel === 'low') {
                confidence += 10;
            } else if (riskMetrics.riskLevel === 'high') {
                confidence -= 15;
            }
        }

        // Adjust based on account performance
        if (this.performanceMetrics.profitFactor > 1.5) {
            confidence += 5;
        } else if (this.performanceMetrics.profitFactor < 0.8) {
            confidence -= 10;
        }

        // Adjust based on daily performance
        if (this.accountData.dailyPL > 0) {
            confidence += 5;
        } else if (this.accountData.dailyPL < -50) {
            confidence -= 15;
        }

        return Math.max(0, Math.min(100, confidence));
    }

    /**
     * Calculate martingale step
     */
    calculateMartingaleStep(originalAmount, currentStep, lossHistory = []) {
        if (!this.config.martingaleEnabled) {
            return originalAmount;
        }

        if (currentStep >= this.config.maxMartingaleLevels) {
            return originalAmount; // Reset to original after max levels
        }

        // Calculate martingale amount
        let martingaleAmount = originalAmount;
        
        for (let i = 0; i < currentStep; i++) {
            martingaleAmount *= this.config.martingaleMultiplier;
        }

        // Apply risk limits
        const maxMartingaleAmount = originalAmount * 10; // Max 10x original
        martingaleAmount = Math.min(martingaleAmount, maxMartingaleAmount);

        // Check account balance
        if (martingaleAmount > this.accountData.balance * 0.5) {
            martingaleAmount = this.accountData.balance * 0.5;
        }

        return Math.round(martingaleAmount * 100) / 100;
    }

    /**
     * Record trade execution
     */
    recordTrade(tradeRecord) {
        // Add to active trades
        this.activeTrades.set(tradeRecord.id, tradeRecord);
        
        // Update account data
        this.accountData.dailyTrades++;
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        console.log(`Trade recorded: ${tradeRecord.id}`);
    }

    /**
     * Update trade result
     */
    updateTradeResult(tradeId, result) {
        const trade = this.activeTrades.get(tradeId);
        if (!trade) {
            console.warn(`Trade not found: ${tradeId}`);
            return;
        }

        // Update trade record
        trade.result = result;
        trade.closedAt = Date.now();
        
        // Update account P&L
        this.accountData.dailyPL += result.profit || 0;
        
        // Update max daily balance
        const currentBalance = this.accountData.balance + this.accountData.dailyPL;
        this.accountData.maxDailyBalance = Math.max(this.accountData.maxDailyBalance, currentBalance);
        
        // Move to history
        this.tradeHistory.push(trade);
        this.activeTrades.delete(tradeId);
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        console.log(`Trade result updated: ${tradeId}, P&L: ${result.profit || 0}`);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const trades = this.tradeHistory.slice(-100); // Last 100 trades
        
        if (trades.length === 0) {
            return;
        }

        const winningTrades = trades.filter(t => t.result && t.result.profit > 0);
        const losingTrades = trades.filter(t => t.result && t.result.profit < 0);
        
        this.performanceMetrics.totalTrades = trades.length;
        this.performanceMetrics.winningTrades = winningTrades.length;
        this.performanceMetrics.losingTrades = losingTrades.length;
        
        // Calculate average win/loss
        this.performanceMetrics.averageWin = winningTrades.length > 0 
            ? winningTrades.reduce((sum, t) => sum + t.result.profit, 0) / winningTrades.length 
            : 0;
        
        this.performanceMetrics.averageLoss = losingTrades.length > 0 
            ? Math.abs(losingTrades.reduce((sum, t) => sum + t.result.profit, 0) / losingTrades.length) 
            : 0;
        
        // Calculate profit factor
        const totalWins = winningTrades.reduce((sum, t) => sum + t.result.profit, 0);
        const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.result.profit, 0));
        this.performanceMetrics.profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
        
        // Calculate max drawdown
        this.performanceMetrics.maxDrawdown = this.calculateMaxDrawdown();
    }

    /**
     * Calculate maximum drawdown
     */
    calculateMaxDrawdown() {
        if (this.tradeHistory.length < 2) {
            return 0;
        }

        let maxBalance = this.accountData.balance;
        let maxDrawdown = 0;
        let currentBalance = this.accountData.balance;

        for (const trade of this.tradeHistory) {
            if (trade.result && trade.result.profit !== undefined) {
                currentBalance += trade.result.profit;
                
                if (currentBalance > maxBalance) {
                    maxBalance = currentBalance;
                }
                
                const drawdown = ((maxBalance - currentBalance) / maxBalance) * 100;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        return maxDrawdown;
    }

    /**
     * Get current risk status
     */
    getRiskStatus() {
        this.resetDailyMetrics();
        
        const activeRisk = Array.from(this.activeTrades.values())
            .reduce((sum, trade) => sum + trade.params.amount, 0);
        
        const accountRiskPercentage = (activeRisk / this.accountData.balance) * 100;
        
        return {
            accountBalance: this.accountData.balance,
            dailyPL: this.accountData.dailyPL,
            dailyTrades: this.accountData.dailyTrades,
            activeTrades: this.activeTrades.size,
            activeRisk: activeRisk,
            accountRiskPercentage: accountRiskPercentage,
            riskLevel: accountRiskPercentage > 10 ? 'high' : accountRiskPercentage > 5 ? 'medium' : 'low',
            maxDailyBalance: this.accountData.maxDailyBalance,
            performance: this.performanceMetrics
        };
    }

    /**
     * Update account balance
     */
    updateAccountBalance(newBalance) {
        this.accountData.balance = newBalance;
        this.accountData.maxDailyBalance = Math.max(this.accountData.maxDailyBalance, newBalance);
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            winRate: this.performanceMetrics.totalTrades > 0 
                ? (this.performanceMetrics.winningTrades / this.performanceMetrics.totalTrades) * 100 
                : 0
        };
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
        console.log('Risk manager configuration updated');
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        this.accountData = {
            balance: 0,
            dailyPL: 0,
            dailyTrades: 0,
            maxDailyBalance: 0,
            lastReset: Date.now()
        };
        
        this.activeTrades.clear();
        this.tradeHistory = [];
        
        this.performanceMetrics = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            averageWin: 0,
            averageLoss: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0
        };
        
        console.log('Risk manager metrics reset');
    }

    /**
     * Destroy risk manager
     */
    destroy() {
        this.activeTrades.clear();
        this.tradeHistory = [];
        console.log('Risk Manager destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RiskManager;
} else if (typeof window !== 'undefined') {
    window.RiskManager = RiskManager;
}