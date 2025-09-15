/**
 * AI Integration Test - Test file for AI components
 * This file demonstrates how to use the AI integration components
 */

// Import required modules
const AIController = require('./ai-controller.js');

class AIIntegrationTest {
    constructor() {
        this.aiController = null;
        this.testResults = [];
    }

    /**
     * Run all tests
     */
    async runTests() {
        console.log('🚀 Starting AI Integration Tests...');
        
        try {
            // Test 1: Initialize AI Controller
            await this.testInitialization();
            
            // Test 2: Configuration Management
            await this.testConfiguration();
            
            // Test 3: Signal Analysis (Mock)
            await this.testSignalAnalysis();
            
            // Test 4: Event Handling
            await this.testEventHandling();
            
            // Test 5: Performance Metrics
            await this.testPerformanceMetrics();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    /**
     * Test 1: Initialize AI Controller
     */
    async testInitialization() {
        console.log('\n📋 Test 1: AI Controller Initialization');
        
        try {
            // Create AI Controller with mock configuration
            this.aiController = new AIController({
                ai: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: 'test-key', // Mock key for testing
                    timeout: 10000
                },
                telegram: {
                    apiToken: 'test-token', // Mock token for testing
                    updateInterval: 10000
                },
                analysis: {
                    confidenceThreshold: 70,
                    maxAnalysisTime: 5000
                }
            });

            // Test initialization (this will work with mock keys)
            await this.aiController.initialize();
            
            this.addTestResult('Initialization', true, 'AI Controller initialized successfully');
            
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
            if (!this.aiController) {
                throw new Error('AI Controller not initialized');
            }

            // Get current configuration
            const config = this.aiController.getConfig();
            
            // Test configuration structure
            if (!config.ai || !config.telegram || !config.analysis) {
                throw new Error('Configuration structure is invalid');
            }

            // Update configuration
            this.aiController.updateConfig({
                analysis: {
                    confidenceThreshold: 80
                }
            });

            const updatedConfig = this.aiController.getConfig();
            
            if (updatedConfig.analysis.confidenceThreshold !== 80) {
                throw new Error('Configuration update failed');
            }

            this.addTestResult('Configuration Management', true, 'Configuration management works correctly');
            
        } catch (error) {
            this.addTestResult('Configuration Management', false, `Configuration test failed: ${error.message}`);
        }
    }

    /**
     * Test 3: Signal Analysis (Mock)
     */
    async testSignalAnalysis() {
        console.log('\n📋 Test 3: Signal Analysis');
        
        try {
            if (!this.aiController) {
                throw new Error('AI Controller not initialized');
            }

            // Create mock signal
            const mockSignal = {
                id: 'test_signal_1',
                channelId: 'test_channel',
                channelName: 'Test Channel',
                messageId: 123,
                text: 'EUR/USD CALL 5 minutes - 85% confidence',
                timestamp: Date.now(),
                processed: false
            };

            // Set up event handler for signal analysis
            let analysisReceived = false;
            
            this.aiController.addEventHandler('signalAnalyzed', (data) => {
                analysisReceived = true;
                console.log('✓ Signal analysis event received:', data.analysis.confidence + '% confidence');
            });

            // Handle trading signal (this will work even without real AI)
            await this.aiController.handleTradingSignal(mockSignal);

            // Wait a bit for async processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (analysisReceived) {
                this.addTestResult('Signal Analysis', true, 'Signal analysis works correctly');
            } else {
                this.addTestResult('Signal Analysis', false, 'Signal analysis event not received');
            }
            
        } catch (error) {
            this.addTestResult('Signal Analysis', false, `Signal analysis test failed: ${error.message}`);
        }
    }

    /**
     * Test 4: Event Handling
     */
    async testEventHandling() {
        console.log('\n📋 Test 4: Event Handling');
        
        try {
            if (!this.aiController) {
                throw new Error('AI Controller not initialized');
            }

            let eventReceived = false;
            let eventData = null;

            // Add event handler
            const handlerId = this.aiController.addEventHandler('testEvent', (data) => {
                eventReceived = true;
                eventData = data;
            });

            // Emit test event
            this.aiController.emitEvent('testEvent', { message: 'Test data' });

            // Remove event handler
            this.aiController.removeEventHandler('testEvent', handlerId);

            if (eventReceived && eventData.message === 'Test data') {
                this.addTestResult('Event Handling', true, 'Event handling works correctly');
            } else {
                this.addTestResult('Event Handling', false, 'Event handling failed');
            }
            
        } catch (error) {
            this.addTestResult('Event Handling', false, `Event handling test failed: ${error.message}`);
        }
    }

    /**
     * Test 5: Performance Metrics
     */
    async testPerformanceMetrics() {
        console.log('\n📋 Test 5: Performance Metrics');
        
        try {
            if (!this.aiController) {
                throw new Error('AI Controller not initialized');
            }

            // Get performance metrics
            const metrics = this.aiController.getPerformanceMetrics();

            // Test metrics structure
            if (!metrics.uptime || !metrics.totalSignalsProcessed) {
                throw new Error('Performance metrics structure is invalid');
            }

            // Test status
            const status = this.aiController.getStatus();
            
            if (!status.initialized || typeof status.aiModelReady !== 'boolean') {
                throw new Error('Status structure is invalid');
            }

            this.addTestResult('Performance Metrics', true, 'Performance metrics work correctly');
            
        } catch (error) {
            this.addTestResult('Performance Metrics', false, `Performance metrics test failed: ${error.message}`);
        }
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
        console.log('\n🎯 Test Results Summary:');
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
        
        console.log('\n🏁 AI Integration Tests Complete!');
    }

    /**
     * Cleanup
     */
    async cleanup() {
        if (this.aiController) {
            await this.aiController.destroy();
        }
    }
}

// Example usage
async function runExample() {
    const test = new AIIntegrationTest();
    
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
    module.exports = { AIIntegrationTest, runExample };
} else if (typeof window !== 'undefined') {
    window.AIIntegrationTest = AIIntegrationTest;
    window.runAIIntegrationTest = runExample;
}

// Auto-run if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runExample().catch(console.error);
}