/**
 * Telegram Integration - Handles communication with Telegram API
 * Manages channel connections and message retrieval
 */

class TelegramIntegration {
    constructor(config = {}) {
        this.config = {
            apiToken: config.apiToken || '',
            apiEndpoint: config.apiEndpoint || 'https://api.telegram.org',
            messageRetention: config.messageRetention || 1000,
            updateInterval: config.updateInterval || 5000,
            maxChannels: config.maxChannels || 50,
            ...config
        };
        
        this.channels = new Map();
        this.messageHandlers = new Map();
        this.updateHandlers = [];
        this.isInitialized = false;
        this.updateIntervalId = null;
        this.lastUpdateId = 0;
        
        this.performanceMetrics = {
            totalMessages: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastUpdateTime: 0
        };
    }

    /**
     * Initialize Telegram integration
     */
    async initialize() {
        try {
            // Validate configuration
            this.validateConfig();
            
            // Test connection
            await this.testConnection();
            
            // Start update polling
            this.startUpdatePolling();
            
            this.isInitialized = true;
            console.log('Telegram Integration initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Telegram Integration:', error);
            throw error;
        }
    }

    /**
     * Validate configuration
     */
    validateConfig() {
        if (!this.config.apiToken) {
            throw new Error('Telegram API token is required');
        }

        if (!this.config.apiEndpoint) {
            throw new Error('Telegram API endpoint is required');
        }
    }

    /**
     * Test Telegram connection
     */
    async testConnection() {
        try {
            const response = await this.makeRequest('getMe');
            
            if (!response.ok) {
                throw new Error('Failed to get bot information');
            }
            
            const botInfo = await response.json();
            
            if (!botInfo.ok || !botInfo.result) {
                throw new Error('Invalid bot information received');
            }
            
            console.log(`Telegram bot connected: ${botInfo.result.username}`);
            return true;
        } catch (error) {
            console.error('Telegram connection test failed:', error);
            throw error;
        }
    }

    /**
     * Add a channel to monitor
     */
    async addChannel(channelId, channelInfo = {}) {
        if (this.channels.size >= this.config.maxChannels) {
            throw new Error(`Maximum channels (${this.config.maxChannels}) reached`);
        }

        try {
            // Get channel information
            const chatInfo = await this.getChatInfo(channelId);
            
            const channel = {
                id: channelId,
                username: chatInfo.username || channelId,
                title: chatInfo.title || channelInfo.name || 'Unknown Channel',
                type: chatInfo.type || 'channel',
                isPrivate: chatInfo.type === 'private',
                addedAt: Date.now(),
                lastMessageId: 0,
                messageCount: 0,
                isActive: true,
                settings: {
                    vip: channelInfo.vip || false,
                    broker: channelInfo.broker || 'pocket_option',
                    minConfidence: channelInfo.minConfidence || 70,
                    enabled: channelInfo.enabled !== false,
                    ...channelInfo.settings
                },
                performance: {
                    totalSignals: 0,
                    successfulSignals: 0,
                    winRate: 0,
                    averageConfidence: 0,
                    lastSignalTime: null
                }
            };

            this.channels.set(channelId, channel);
            
            // Get recent messages
            await this.getRecentMessages(channelId);
            
            console.log(`Channel added: ${channel.title} (${channelId})`);
            return channel;
            
        } catch (error) {
            console.error(`Failed to add channel ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a channel from monitoring
     */
    removeChannel(channelId) {
        if (this.channels.has(channelId)) {
            this.channels.delete(channelId);
            console.log(`Channel removed: ${channelId}`);
            return true;
        }
        return false;
    }

    /**
     * Get channel information
     */
    async getChatInfo(chatId) {
        const response = await this.makeRequest('getChat', { chat_id: chatId });
        
        if (!response.ok) {
            throw new Error(`Failed to get chat info for ${chatId}`);
        }
        
        const data = await response.json();
        
        if (!data.ok || !data.result) {
            throw new Error(`Invalid chat info received for ${chatId}`);
        }
        
        return data.result;
    }

    /**
     * Get recent messages from channel
     */
    async getRecentMessages(channelId, limit = 100) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error(`Channel ${channelId} not found`);
        }

        try {
            const response = await this.makeRequest('getChatHistory', {
                chat_id: channelId,
                limit: limit,
                offset: -limit
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get messages for channel ${channelId}`);
            }
            
            const data = await response.json();
            
            if (data.ok && data.result) {
                const messages = data.result.filter(msg => msg.text);
                
                // Process messages
                for (const message of messages) {
                    await this.processMessage(channelId, message);
                }
                
                // Update last message ID
                if (messages.length > 0) {
                    channel.lastMessageId = Math.max(...messages.map(m => m.message_id));
                }
                
                console.log(`Retrieved ${messages.length} messages from channel ${channelId}`);
                return messages;
            }
            
            return [];
            
        } catch (error) {
            console.error(`Failed to get recent messages for channel ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * Process incoming message
     */
    async processMessage(channelId, message) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            return;
        }

        // Skip messages without text
        if (!message.text) {
            return;
        }

        // Update channel metrics
        channel.messageCount++;
        this.performanceMetrics.totalMessages++;

        // Check if message is a trading signal
        if (this.isTradingSignal(message.text)) {
            await this.handleTradingSignal(channelId, message);
        }

        // Notify message handlers
        this.notifyMessageHandlers(channelId, message);
    }

    /**
     * Check if message contains trading signals
     */
    isTradingSignal(text) {
        const signalKeywords = [
            'call', 'put', 'buy', 'sell', 'entry', 'trade',
            'up', 'down', 'high', 'low', 'strike',
            'eur/usd', 'gbp/usd', 'btc/usd', 'eth/usd',
            '1m', '5m', '15m', '30m', '1h'
        ];
        
        const lowerText = text.toLowerCase();
        return signalKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Handle trading signal message
     */
    async handleTradingSignal(channelId, message) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            return;
        }

        // Update channel performance metrics
        channel.performance.totalSignals++;
        channel.performance.lastSignalTime = Date.now();

        // Create signal object
        const signal = {
            id: this.generateSignalId(),
            channelId: channelId,
            channelName: channel.title,
            messageId: message.message_id,
            text: message.text,
            timestamp: message.date * 1000, // Convert to milliseconds
            processed: false,
            analysis: null,
            confidence: 0,
            executed: false
        };

        // Send to AI for analysis
        try {
            const analysis = await this.analyzeSignal(signal);
            signal.analysis = analysis;
            signal.confidence = analysis.confidence || 0;
            signal.processed = true;

            // Update channel performance
            if (signal.confidence >= channel.settings.minConfidence) {
                channel.performance.successfulSignals++;
                channel.performance.averageConfidence = 
                    ((channel.performance.averageConfidence * (channel.performance.successfulSignals - 1)) + signal.confidence) / 
                    channel.performance.successfulSignals;
            }

            // Calculate win rate
            channel.performance.winRate = 
                (channel.performance.successfulSignals / channel.performance.totalSignals) * 100;

        } catch (error) {
            console.error(`Failed to analyze signal from channel ${channelId}:`, error);
            signal.error = error.message;
        }

        // Notify handlers
        this.notifySignalHandlers(signal);
    }

    /**
     * Analyze signal using AI
     */
    async analyzeSignal(signal) {
        // This will be implemented when we create the signal analysis component
        // For now, return a placeholder
        return {
            isSignal: true,
            action: 'CALL', // or 'PUT'
            asset: 'EUR/USD',
            timeframe: '5m',
            expiration: 300,
            confidence: 75,
            broker: 'pocket_option',
            constraints: {
                martingale: false,
                timezone: 'UTC'
            }
        };
    }

    /**
     * Start update polling
     */
    startUpdatePolling() {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
        }

        this.updateIntervalId = setInterval(async () => {
            await this.checkForUpdates();
        }, this.config.updateInterval);

        console.log('Update polling started');
    }

    /**
     * Stop update polling
     */
    stopUpdatePolling() {
        if (this.updateIntervalId) {
            clearInterval(this.updateIntervalId);
            this.updateIntervalId = null;
            console.log('Update polling stopped');
        }
    }

    /**
     * Check for updates
     */
    async checkForUpdates() {
        try {
            const response = await this.makeRequest('getUpdates', {
                offset: this.lastUpdateId + 1,
                timeout: 30,
                allowed_updates: ['message', 'channel_post', 'edited_message', 'edited_channel_post']
            });

            if (!response.ok) {
                throw new Error('Failed to get updates');
            }

            const data = await response.json();
            
            if (data.ok && data.result) {
                for (const update of data.result) {
                    await this.processUpdate(update);
                    this.lastUpdateId = update.update_id;
                }
            }

        } catch (error) {
            console.error('Failed to check for updates:', error);
        }
    }

    /**
     * Process Telegram update
     */
    async processUpdate(update) {
        if (update.message) {
            const chatId = update.message.chat.id;
            
            // Only process messages from monitored channels
            if (this.channels.has(chatId)) {
                await this.processMessage(chatId, update.message);
            }
        }

        if (update.channel_post) {
            const chatId = update.channel_post.chat.id;
            
            // Only process channel posts from monitored channels
            if (this.channels.has(chatId)) {
                await this.processMessage(chatId, update.channel_post);
            }
        }

        // Notify update handlers
        this.notifyUpdateHandlers(update);
    }

    /**
     * Make HTTP request to Telegram API
     */
    async makeRequest(method, params = {}) {
        const startTime = Date.now();
        
        try {
            const url = `${this.config.apiEndpoint}/bot${this.config.apiToken}/${method}`;
            const searchParams = new URLSearchParams(params);
            
            const response = await fetch(`${url}?${searchParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const responseTime = Date.now() - startTime;
            this.performanceMetrics.lastUpdateTime = responseTime;
            
            if (response.ok) {
                this.performanceMetrics.successfulRequests++;
            } else {
                this.performanceMetrics.failedRequests++;
            }

            // Update average response time
            const total = this.performanceMetrics.successfulRequests + this.performanceMetrics.failedRequests;
            const avgTime = (this.performanceMetrics.averageResponseTime * (total - 1) + responseTime) / total;
            this.performanceMetrics.averageResponseTime = avgTime;

            return response;
            
        } catch (error) {
            this.performanceMetrics.failedRequests++;
            console.error(`Telegram API request failed: ${method}`, error);
            throw error;
        }
    }

    /**
     * Add message handler
     */
    addMessageHandler(handler) {
        const id = this.generateHandlerId();
        this.messageHandlers.set(id, handler);
        return id;
    }

    /**
     * Remove message handler
     */
    removeMessageHandler(id) {
        return this.messageHandlers.delete(id);
    }

    /**
     * Notify message handlers
     */
    notifyMessageHandlers(channelId, message) {
        for (const [id, handler] of this.messageHandlers) {
            try {
                handler(channelId, message);
            } catch (error) {
                console.error(`Message handler ${id} failed:`, error);
            }
        }
    }

    /**
     * Add signal handler
     */
    addSignalHandler(handler) {
        const id = this.generateHandlerId();
        this.signalHandlers = this.signalHandlers || new Map();
        this.signalHandlers.set(id, handler);
        return id;
    }

    /**
     * Remove signal handler
     */
    removeSignalHandler(id) {
        if (this.signalHandlers) {
            return this.signalHandlers.delete(id);
        }
        return false;
    }

    /**
     * Notify signal handlers
     */
    notifySignalHandlers(signal) {
        if (!this.signalHandlers) return;
        
        for (const [id, handler] of this.signalHandlers) {
            try {
                handler(signal);
            } catch (error) {
                console.error(`Signal handler ${id} failed:`, error);
            }
        }
    }

    /**
     * Add update handler
     */
    addUpdateHandler(handler) {
        const id = this.generateHandlerId();
        this.updateHandlers.push({ id, handler });
        return id;
    }

    /**
     * Remove update handler
     */
    removeUpdateHandler(id) {
        const index = this.updateHandlers.findIndex(h => h.id === id);
        if (index !== -1) {
            this.updateHandlers.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Notify update handlers
     */
    notifyUpdateHandlers(update) {
        for (const { handler } of this.updateHandlers) {
            try {
                handler(update);
            } catch (error) {
                console.error('Update handler failed:', error);
            }
        }
    }

    /**
     * Get channel information
     */
    getChannel(channelId) {
        return this.channels.get(channelId);
    }

    /**
     * Get all channels
     */
    getAllChannels() {
        return Array.from(this.channels.values());
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            successRate: this.performanceMetrics.totalMessages > 0 
                ? (this.performanceMetrics.successfulRequests / this.performanceMetrics.totalMessages) * 100 
                : 0,
            channelsCount: this.channels.size,
            activeChannels: Array.from(this.channels.values()).filter(c => c.isActive).length
        };
    }

    /**
     * Generate unique signal ID
     */
    generateSignalId() {
        return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate unique handler ID
     */
    generateHandlerId() {
        return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if integration is initialized
     */
    isReady() {
        return this.isInitialized;
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
     * Destroy integration and cleanup
     */
    destroy() {
        this.stopUpdatePolling();
        this.channels.clear();
        this.messageHandlers.clear();
        this.updateHandlers = [];
        this.isInitialized = false;
        console.log('Telegram Integration destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelegramIntegration;
} else if (typeof window !== 'undefined') {
    window.TelegramIntegration = TelegramIntegration;
}