/**
 * AI Model Interface - Core AI Integration Component
 * Handles communication with AI providers and model management
 */

class AIModelInterface {
    constructor(config = {}) {
        this.config = {
            provider: config.provider || 'openai',
            model: config.model || 'gpt-4',
            apiKey: config.apiKey || '',
            apiEndpoint: config.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
            maxTokens: config.maxTokens || 1000,
            temperature: config.temperature || 0.7,
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            ...config
        };
        
        this.isInitialized = false;
        this.requestQueue = [];
        this.isProcessing = false;
        this.cache = new Map();
        this.performanceMetrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastRequestTime: 0
        };
        
        this.initialize();
    }

    /**
     * Initialize the AI model interface
     */
    async initialize() {
        try {
            // Validate configuration
            this.validateConfig();
            
            // Test connection
            await this.testConnection();
            
            this.isInitialized = true;
            console.log('AI Model Interface initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AI Model Interface:', error);
            throw error;
        }
    }

    /**
     * Validate configuration parameters
     */
    validateConfig() {
        const required = ['provider', 'apiKey', 'apiEndpoint'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        // Validate provider
        const supportedProviders = ['openai', 'anthropic', 'local'];
        if (!supportedProviders.includes(this.config.provider)) {
            throw new Error(`Unsupported provider: ${this.config.provider}`);
        }
    }

    /**
     * Test AI model connection
     */
    async testConnection() {
        const testPrompt = "Hello, this is a connection test. Please respond with 'Connection successful'.";
        
        try {
            const response = await this.generateCompletion(testPrompt);
            
            if (!response || !response.content) {
                throw new Error('Invalid response from AI model');
            }
            
            console.log('AI model connection test successful');
            return true;
        } catch (error) {
            console.error('AI model connection test failed:', error);
            throw error;
        }
    }

    /**
     * Generate completion using AI model
     */
    async generateCompletion(prompt, options = {}) {
        if (!this.isInitialized) {
            throw new Error('AI Model Interface not initialized');
        }

        const requestKey = this.generateCacheKey(prompt, options);
        
        // Check cache first
        if (this.cache.has(requestKey)) {
            const cached = this.cache.get(requestKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                return cached.response;
            }
        }

        // Add to queue
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                prompt,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });
            
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process request queue
     */
    async processQueue() {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            
            try {
                const response = await this.executeRequest(request.prompt, request.options);
                request.resolve(response);
                
                // Cache successful response
                const cacheKey = this.generateCacheKey(request.prompt, request.options);
                this.cache.set(cacheKey, {
                    response,
                    timestamp: Date.now()
                });
                
                // Update performance metrics
                this.updatePerformanceMetrics(true);
                
            } catch (error) {
                request.reject(error);
                this.updatePerformanceMetrics(false);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Execute single request
     */
    async executeRequest(prompt, options = {}) {
        const startTime = Date.now();
        
        try {
            let response;
            
            switch (this.config.provider) {
                case 'openai':
                    response = await this.executeOpenAIRequest(prompt, options);
                    break;
                case 'anthropic':
                    response = await this.executeAnthropicRequest(prompt, options);
                    break;
                case 'local':
                    response = await this.executeLocalRequest(prompt, options);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${this.config.provider}`);
            }
            
            const responseTime = Date.now() - startTime;
            this.performanceMetrics.lastRequestTime = responseTime;
            
            return response;
            
        } catch (error) {
            // Implement retry logic
            if (options.retryAttempt !== undefined && options.retryAttempt >= this.config.retryAttempts) {
                throw error;
            }
            
            console.warn(`Request failed, retrying... (${options.retryAttempt || 0 + 1}/${this.config.retryAttempts})`);
            
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
            
            return this.executeRequest(prompt, {
                ...options,
                retryAttempt: (options.retryAttempt || 0) + 1
            });
        }
    }

    /**
     * Execute OpenAI request
     */
    async executeOpenAIRequest(prompt, options = {}) {
        const requestBody = {
            model: this.config.model,
            messages: [
                {
                    role: 'system',
                    content: options.systemPrompt || 'You are a helpful AI assistant.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: options.maxTokens || this.config.maxTokens,
            temperature: options.temperature || this.config.temperature,
            timeout: options.timeout || this.config.timeout
        };

        const response = await fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        return {
            content: data.choices[0]?.message?.content || '',
            usage: data.usage,
            model: data.model,
            timestamp: Date.now()
        };
    }

    /**
     * Execute Anthropic request (placeholder for future implementation)
     */
    async executeAnthropicRequest(prompt, options = {}) {
        // Placeholder for Anthropic API integration
        throw new Error('Anthropic integration not yet implemented');
    }

    /**
     * Execute local model request (placeholder for future implementation)
     */
    async executeLocalRequest(prompt, options = {}) {
        // Placeholder for local model integration
        throw new Error('Local model integration not yet implemented');
    }

    /**
     * Generate cache key for requests
     */
    generateCacheKey(prompt, options) {
        const keyString = `${prompt}_${JSON.stringify(options)}`;
        return this.hashString(keyString);
    }

    /**
     * Simple hash function for cache keys
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(success) {
        this.performanceMetrics.totalRequests++;
        
        if (success) {
            this.performanceMetrics.successfulRequests++;
        } else {
            this.performanceMetrics.failedRequests++;
        }
        
        // Calculate average response time
        const total = this.performanceMetrics.totalRequests;
        const avgTime = (this.performanceMetrics.averageResponseTime * (total - 1) + this.performanceMetrics.lastRequestTime) / total;
        this.performanceMetrics.averageResponseTime = avgTime;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalRequests > 0 
                ? (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests) * 100 
                : 0
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.validateConfig();
    }

    /**
     * Check if interface is initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Destroy interface and cleanup
     */
    destroy() {
        this.isInitialized = false;
        this.requestQueue = [];
        this.cache.clear();
        console.log('AI Model Interface destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIModelInterface;
} else if (typeof window !== 'undefined') {
    window.AIModelInterface = AIModelInterface;
}