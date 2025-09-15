/**
 * Trading Engine Test - Test file for trading components
 * This file demonstrates how to use the trading engine components
 */

// Import required modules
const TradingController = require('./trading-controller.js');

class TradingEngineTest {
    constructor() {
        this.tradingController = null;
        this.testResults = [];
    }

    /**
     * Run all tests
     */
    async runTests() {
        console.log('🚀 Starting Trading Engine Tests...');
        
        try {
            // Test 1: Initialize Trading Controller
            await this.testInitialization();
            
            // Test 2: Configuration Management
            await this.testConfiguration();
            
            // Test 3: Strategy Execution
            await this.testStrategyExecution();
            
            // Test 4: Risk Management
            await this.testRiskManagement();
            
            // Test 5: Broker Integration
            await this.testBrokerIntegration();
            
            // Test 6: Trade Execution Flow
            await this.testTradeExecutionFlow();
            
            // Test 7: Performance Metrics
            await this.testPerformanceMetrics();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    /**
     * Test 1: Initialize Trading Controller
     */
    async testInitialization() {
        console.log('\n📋 Test 1: Trading Controller Initialization');
        
        try {
            // Create Trading Controller with mock configuration
            this.tradingController = new TradingController({
                enabled: true,
                autoExecute: false, // Disable auto-execution for testing
                defaultStrategy: 'ai_enhanced',
                defaultBroker: 'pocket_option',
                ai: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: 'test-key',
                    timeout: 10000
                },
                telegram: {
                    apiToken: 'test-token',
                    updateInterval: 10000
                },
                trading: {
                    maxTradeAmount: 25,
                    maxConcurrentTrades: 3
                }
            });

            // Test initialization
            await this.tradingController.initialize();
            
            this.addTestResult('Initialization', true, 'Trading Controller initialized successfully');
            
        } catch (error) {
            this.addTestResult('Initialization', false, `Initialization failed: ${error.message}`);
        }
    }

    /**
     * Test 2: Configuration Management
     */
    async testConfiguration() {
        console.log('\n📋 Test 2: Configuration Management');
        
        try {
            if (!this.tradingController) {
                throw new Error('Trading Controller not initialized');
            }

            // Get current configuration
            const config = this.tradingController.getConfig();
            
            // Test configuration structure
            if (!config.enabled || !config.autoExecute) {
                throw new Error('Configuration structure is invalid');
            }

            // Update configuration
            this.tradingController.updateConfig({
                enabled: false,
                autoExecute: false
            });

            const updatedConfig = this.tradingController.getConfig();
            
            if (updatedConfig.enabled !== false || updatedConfig.autoExecute !== false) {
                throw new Error('Configuration update failed');
            }

            // Test enabling/disabling
            this.tradingController.setEnabled(true);
            this.tradingController.setAutoExecute(true);

            const finalConfig = this.tradingController.getConfig();
            
            if (finalConfig.enabled !== true || finalConfig.autoExecute !== true) {
                throw new Error('Enable/disable functionality failed');
            }

            this.addTestResult('Configuration Management', true, 'Configuration management works correctly');
            
        } catch (error) {
            this.addTestResult('Configuration Management', false, `Configuration test failed: ${error.message}`);
        }
    }

    /**
     * Test 3: Strategy Execution
     */
    async testStrategyExecution() {
        console.log('\n📋 Test 3: Strategy Execution');
        
        try {
            if (!this.tradingController || !this.tradingController.tradingEngine) {
                throw new Error('Trading Controller or Trading Engine not initialized');
            }

            // Mock market data
            const marketData = this.generateMockMarketData();
            const timestamp = Date.now();

            // Test CCI strategy
            const cciResult = await this.tradingController.tradingEngine.executeStrategy(
                'cci', marketData, timestamp, { period: 20 }
            );

            // Test candles strategy
            const candlesResult = await this.tradingController.tradingEngine.executeStrategy(
                'candles', marketData, timestamp, { candleCount: 4 }
            );

            // Test pin bar strategy
            const pinBarResult = await this.tradingController.tradingEngine.executeStrategy(
                'pinBar', marketData, timestamp, { multiplier: 4 }
            );

            // Test signals strategy
            const signalsResult = await this.tradingController.tradingEngine.executeStrategy(
                'signals', marketData, timestamp, {
                    signalData: { signals: [2, 2, 1, 0, 0, 0] },
                    thresholds: [2, 2, 1, 0, 0, 0]
                }
            );

            // Validate strategy results
            const strategies = [cciResult, candlesResult, pinBarResult, signalsResult];
            const validStrategies = strategies.filter(s => s.strategy && s.confidence !== undefined);
            
            if (validStrategies.length < 3) {
                throw new Error('Strategy execution failed for multiple strategies');
            }

            this.addTestResult('Strategy Execution', true, `Successfully executed ${validStrategies.length} strategies`);
            
        } catch (error) {
            this.addTestResult('Strategy Execution', false, `Strategy execution test failed: ${error.message}`);
        }
    }

    /**
     * Test 4: Risk Management
     */
    async testRiskManagement() {
        console.log('\n📋 Test 4: Risk Management');
        
        try {
            if (!this.tradingController || !this.tradingController.tradingEngine) {
                throw new Error('Trading Controller or Trading Engine not initialized');
            }

            const riskManager = this.tradingController.tradingEngine.riskManager;
            
            // Test trade risk assessment
            const tradeParams = {
                action: 'CALL',
                asset: 'EUR/USD',
                amount: 10,
                expiration: 300,
                confidence: 75
            };

            const riskAssessment = await riskManager.assessTradeRisk(tradeParams);
            
            if (!riskAssessment.approved) {
                throw new Error('Risk assessment should approve this trade');
            }

            // Test high amount rejection
            const highAmountParams = {
                ...tradeParams,
                amount: 1000 // Exceeds default max
            };

            const highAmountAssessment = await riskManager.assessTradeRisk(highAmountParams);
            
            if (highAmountAssessment.approved) {
                throw new Error('Risk assessment should reject high amount trade');
            }

            // Test low confidence rejection
            const lowConfidenceParams = {
                ...tradeParams,
                confidence: 30 // Very low confidence
            };

            const lowConfidenceAssessment = await riskManager.assessTradeRisk(lowConfidenceParams);
            
            if (lowConfidenceAssessment.approved) {
                throw new Error('Risk assessment should reject low confidence trade');
            }

            this.addTestResult('Risk Management', true, 'Risk management works correctly');
            
        } catch (error) {
            this.addTestResult('Risk Management', false, `Risk management test failed: ${error.message}`);
        }
    }

    /**
     * Test 5: Broker Integration
     */
    async testBrokerIntegration() {
        console.log('\n📋 Test 5: Broker Integration');
        
        try {
            if (!this.tradingController || !this.tradingController.tradingEngine) {
                throw new Error('Trading Controller or Trading Engine not initialized');
            }

            const brokerInterface = this.tradingController.tradingEngine.brokerInterface;
            
            // Test getting supported brokers
            const supportedBrokers = brokerInterface.getSupportedBrokers();
            
            if (!Array.isArray(supportedBrokers) || supportedBrokers.length === 0) {
                throw new Error('No supported brokers found');
            }

            // Test broker info retrieval
            const pocketOptionInfo = brokerInterface.getBrokerInfo('pocket_option');
            
            if (!pocketOptionInfo || !pocketOptionInfo.capabilities) {
                throw new Error('Broker info retrieval failed');
            }

            // Test broker performance metrics
            const performanceMetrics = brokerInterface.getPerformanceMetrics();
            
            if (!performanceMetrics || typeof performanceMetrics.totalTrades !== 'number') {
                throw new Error('Broker performance metrics invalid');
            }

            this.addTestResult('Broker Integration', true, `Successfully integrated ${supportedBrokers.length} brokers`);
            
        } catch (error) {
            this.addTestResult('Broker Integration', false, `Broker integration test failed: ${error.message}`);
        }
    }

    /**
     * Test 6: Trade Execution Flow
     */
    async testTradeExecutionFlow() {
        console.log('\n📋 Test 6: Trade Execution Flow');
        
        try {
            if (!this.tradingController) {
                throw new Error('Trading Controller not initialized');
            }

            // Create mock trading signal
            const mockSignal = {
                signal: {
                    id: 'test_signal_1',
                    channelId: 'test_channel',
                    channelName: 'Test Channel',
                    messageId: 123,
                    text: 'EUR/USD CALL 5 minutes - 85% confidence',
                    timestamp: Date.now()
                },
                analysis: {
                    isSignal: true,
                    confidence: 85,
                    tradingParams: {
                        action: 'CALL',
                        asset: 'EUR/USD',
                        amount: 10,
                        expiration: 300,
                        timeframe: '5m',
                        broker: 'pocket_option'
                    }
                },
                tradingParams: {
                    action: 'CALL',
                    asset: 'EUR/USD',
                    amount: 10,
                    expiration: 300,
                    timeframe: '5m',
                    broker: 'pocket_option',
                    confidence: 85
                }
            };

            // Set up event handler
            let signalProcessed = false;
            let enhancedTradeExecuted = false;
            
            this.tradingController.addEventHandler('signalProcessed', (data) => {
                signalProcessed = true;
                console.log('✓ Signal processed event received');
            });
            
            this.tradingController.addEventHandler('enhancedTradeExecuted', (data) => {
                enhancedTradeExecuted = true;
                console.log('✓ Enhanced trade executed event received');
            });

            // Handle trading signal
            await this.tradingController.handleTradingSignal(mockSignal);

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (signalProcessed && enhancedTradeExecuted) {
                this.addTestResult('Trade Execution Flow', true, 'Trade execution flow works correctly');
            } else {
                this.addTestResult('Trade Execution Flow', false, 'Trade execution flow events not received');
            }
            
        } catch (error) {
            this.addTestResult('Trade Execution Flow', false, `Trade execution flow test failed: ${error.message}`);
        }
    }

    /**
     * Test 7: Performance Metrics
     */
    async testPerformanceMetrics() {
        console.log('\n📋 Test 7: Performance Metrics');
        
        try {
            if (!this.tradingController) {
                throw new Error('Trading Controller not initialized');
            }

            // Get performance metrics
            const metrics = this.tradingController.getPerformanceMetrics();
            
            // Test metrics structure
            if (!metrics.uptime || !metrics.totalAnalysis || !metrics.successRate) {
                throw new Error('Performance metrics structure is invalid');
            }

            // Test status
            const status = this.tradingController.getStatus();
            
            if (!status.initialized || !status.components || typeof status.running !== 'boolean') {
                throw new Error('Status structure is invalid');
            }

            // Test individual component metrics
            if (status.components.aiController && !status.components.aiController.initialized) {
                throw new Error('AI Controller should be initialized');
            }

            if (status.components.tradingEngine && !status.components.tradingEngine.componentsReady) {
                throw new Error('Trading Engine components should be ready');
            }

            this.addTestResult('Performance Metrics', true, 'Performance metrics work correctly');
            
        } catch (error) {
            this.addTestResult('Performance Metrics', false, `Performance metrics test failed: ${error.message}`);
        }
    }

    /**
     * Generate mock market data
     */
    generateMockMarketData() {
        const marketData = {};
        const now = Date.now();
        
        // Generate mock candle data for the last 2 hours
        for (let i = 0; i < 120; i++) {
            const timestamp = now - (i * 60000); // 1 minute intervals
            const basePrice = 1.1000 + Math.sin(i * 0.1) * 0.0050;
            const volatility = 0.0020;
            
            marketData[timestamp] = [
                basePrice, // open
                basePrice + Math.random() * volatility, // high
                basePrice - Math.random() * volatility, // low
                basePrice + (Math.random() - 0.5) * volatility // close
            ];
        }
        
        return marketData;
    }

    /**
     * Add test result
     */
    addTestResult(testName, passed, message) {
        this.testResults.push({
            test: testName,
            passed: passed,
            message: message,
            timestamp: Date.now()
        });

        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n🎯 Trading Engine Test Results Summary:');
        console.log('='.repeat(50));
        
        const passed = this.testResults.filter(r => r.passed).length;
        const failed = this.testResults.filter(r => !r.passed).length;
        const total = this.testResults.length;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        console.log('='.repeat(50));
        
        // Print individual results
        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });
        
        console.log('\n🏁 Trading Engine Tests Complete!');
    }

    /**
     * Cleanup
     */
    async cleanup() {
        if (this.tradingController) {
            await this.tradingController.destroy();
        }
    }
}

// Example usage
async function runExample() {
    const test = new TradingEngineTest();
    
    try {
        await test.runTests();
    } catch (error) {
        console.error('Example failed:', error);
    } finally {
        await test.cleanup();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TradingEngineTest, runExample };
} else if (typeof window !== 'undefined') {
    window.TradingEngineTest = TradingEngineTest;
    window.runTradingEngineTest = runExample;
}

// Auto-run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runExample().catch(console.error);
}