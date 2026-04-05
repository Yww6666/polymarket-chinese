/**
 * 数据处理和状态管理
 * 处理从 API 获取的数据，提供状态管理和数据转换
 */

// 全局状态
const AppState = {
    markets: [],
    breakingNews: [],
    hotTopics: [],
    selectedMarket: null,
    currentFilter: 'all',
    searchQuery: '',
    lastUpdated: null,
    autoRefresh: false,
    refreshInterval: null,
    isLoading: false
};

/**
 * 格式化交易量
 * @param {number} volume - 原始交易量
 * @returns {string} 格式化后的交易量
 */
function formatVolume(volume) {
    if (!volume && volume !== 0) return '$0';

    if (volume >= 1000000) {
        return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
        return `$${(volume / 1000).toFixed(1)}K`;
    } else {
        return `$${volume.toFixed(0)}`;
    }
}

/**
 * 格式化日期
 * @param {string|number|Date} date - 日期
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '未知';

    const now = new Date();
    const diff = d - now;
    const absDiff = Math.abs(diff);

    // 如果在未来
    if (diff > 0) {
        if (absDiff < 60000) { // 1分钟内
            return '即将结束';
        } else if (absDiff < 3600000) { // 1小时内
            return `${Math.floor(absDiff / 60000)}分钟`;
        } else if (absDiff < 86400000) { // 1天内
            return `${Math.floor(absDiff / 3600000)}小时`;
        } else if (absDiff < 604800000) { // 1周内
            return `${Math.floor(absDiff / 86400000)}天`;
        } else {
            return d.toLocaleDateString('zh-CN');
        }
    }

    return d.toLocaleDateString('zh-CN');
}

/**
 * 格式化价格百分比
 * @param {number} price - 价格（0-1）
 * @returns {number} 百分比
 */
function formatPricePercent(price) {
    return Math.round((price || 0) * 100);
}

/**
 * 格式化时间戳为可读时间
 * @param {number} timestamp - Unix 时间戳（毫秒）
 * @returns {string} 格式化后的时间
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
        return '刚刚';
    } else if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

/**
 * 获取市场标签
 * @param {Object} market - 市场对象
 * @returns {Array} 标签数组
 */
function getMarketTags(market) {
    // API 不提供 tags 字段，根据问题内容推断标签
    const question = (market.question || '').toLowerCase();
    const description = (market.description || '').toLowerCase();

    const categories = [
        { keywords: ['politics', 'election', 'trump', 'biden', 'congress', 'senate', 'president', 'vote'], tag: 'Politics' },
        { keywords: ['sports', 'football', 'soccer', 'basketball', 'nba', 'nfl', 'mlb', 'world cup'], tag: 'Sports' },
        { keywords: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'token', 'coin', 'blockchain'], tag: 'Crypto' },
        { keywords: ['business', 'stock', 'market', 'economy', 'trading', 'finance', 'company'], tag: 'Business' },
        { keywords: ['world', 'war', 'conflict', 'country', 'nation', 'international'], tag: 'World' },
        { keywords: ['tech', 'technology', 'ai', 'artificial intelligence', 'software', 'internet'], tag: 'Tech' },
        { keywords: ['entertainment', 'movie', 'film', 'music', 'celebrity', 'actor'], tag: 'Entertainment' },
        { keywords: ['weather', 'climate', 'temperature', 'storm', 'hurricane', 'earthquake'], tag: 'Weather' },
        { keywords: ['science', 'research', 'study', 'discovery', 'space', 'nasa'], tag: 'Science' }
    ];

    const foundTags = [];

    for (const category of categories) {
        if (category.keywords.some(keyword =>
            question.includes(keyword) || description.includes(keyword)
        )) {
            foundTags.push(category.tag);
            if (foundTags.length >= 2) break;
        }
    }

    return foundTags.length > 0 ? foundTags : ['Other'];
}

/**
 * 获取市场图片 URL
 * @param {Object} market - 市场对象
 * @returns {string} 图片 URL
 */
function getMarketImageUrl(market) {
    // 尝试从多个字段获取图片
    if (market.image) return market.image;
    if (market.icon) return market.icon;
    if (market.imageUrl) return market.imageUrl;
    if (market.image_url) return market.image_url;

    // 根据标签生成默认图标
    const tags = getMarketTags(market);
    const tag = tags[0] || 'other';

    // 返回一个占位图片服务
    return `https://via.placeholder.com/64/3B82F6/FFFFFF?text=${encodeURIComponent(tag.substring(0, 2))}`;
}

/**
 * 检查市场是否活跃
 * @param {Object} market - 市场对象
 * @returns {boolean} 是否活跃
 */
function isMarketActive(market) {
    if (market.active !== undefined) return market.active;
    if (market.status) return market.status === 'active';
    return true;
}

/**
 * 检查市场是否已结算
 * @param {Object} market - 市场对象
 * @returns {boolean} 是否已结算
 */
function isMarketResolved(market) {
    if (market.resolved !== undefined) return market.resolved;
    if (market.status) return market.status === 'resolved';
    return false;
}

/**
 * 获取市场概率
 * @param {Object} market - 市场对象
 * @returns {Object} 包含 yesPrice 和 noPrice
 */
function getMarketPrices(market) {
    // 尝试从不同字段获取价格
    let yesPrice = 0;
    let noPrice = 0;

    // 优先使用 lastTradePrice (最后交易价格)
    if (market.lastTradePrice !== undefined) {
        yesPrice = parseFloat(market.lastTradePrice) || 0;
        noPrice = 1 - yesPrice;
    }
    // 使用 bestAsk (最低卖出价)
    else if (market.bestAsk !== undefined) {
        yesPrice = parseFloat(market.bestAsk) || 0;
        noPrice = 1 - yesPrice;
    }
    // 使用 outcomePrices (结果价格)
    else if (market.outcomePrices && Array.isArray(market.outcomePrices)) {
        yesPrice = parseFloat(market.outcomePrices[0]) || 0;
        noPrice = parseFloat(market.outcomePrices[1]) || 0;
    }
    // 使用 prices 对象
    else if (market.prices) {
        yesPrice = parseFloat(market.prices.yes) || 0;
        noPrice = parseFloat(market.prices.no) || 0;
    }
    // 使用 yesPrice 字段
    else if (market.yesPrice !== undefined) {
        yesPrice = parseFloat(market.yesPrice) || 0;
        noPrice = parseFloat(market.noPrice) || 0;
    }
    // 使用 marketMakerPrices
    else if (market.marketMakerPrices) {
        yesPrice = parseFloat(market.marketMakerPrices.yes) || 0;
        noPrice = parseFloat(market.marketMakerPrices.no) || 0;
    }

    // 确保 Yes + No ≈ 1 (容差范围)
    if (yesPrice + noPrice > 1.01) {
        const diff = (yesPrice + noPrice) - 1;
        yesPrice = Math.max(0, yesPrice - diff / 2);
        noPrice = Math.max(0, noPrice - diff / 2);
    } else if (yesPrice + noPrice < 0.99) {
        const diff = 1 - (yesPrice + noPrice);
        yesPrice += diff / 2;
        noPrice += diff / 2;
    }

    return {
        yes: Math.max(0, Math.min(1, yesPrice)),
        no: Math.max(0, Math.min(1, noPrice))
    };
}

/**
 * 筛选市场
 * @param {Array} markets - 市场列表
 * @param {string} filter - 过滤条件
 * @param {string} searchQuery - 搜索关键词
 * @returns {Array} 筛选后的市场列表
 */
function filterMarkets(markets, filter, searchQuery) {
    let filtered = [...markets];

    // 按标签筛选
    if (filter && filter !== 'all') {
        filtered = filtered.filter(market => {
            const tags = getMarketTags(market);
            return tags.some(tag =>
                tag.toLowerCase() === filter.toLowerCase() ||
                tag.toLowerCase().includes(filter.toLowerCase())
            );
        });
    }

    // 按关键词搜索
    if (searchQuery && searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(market => {
            return (
                market.question?.toLowerCase().includes(query) ||
                market.description?.toLowerCase().includes(query) ||
                getMarketTags(market).some(tag =>
                    tag.toLowerCase().includes(query)
                )
            );
        });
    }

    return filtered;
}

/**
 * 获取所有可用标签
 * @param {Array} markets - 市场列表
 * @returns {Array} 标签列表（去重）
 */
function getAllTags(markets) {
    const tagSet = new Set();
    markets.forEach(market => {
        const tags = getMarketTags(market);
        tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
}

/**
 * 处理 Breaking News 数据
 * @param {Array} markets - 市场列表
 * @returns {Array} 处理后的 Breaking News 数据
 */
function processBreakingNews(markets) {
    return markets.slice(0, 10).map(market => ({
        ...market,
        imageUrl: getMarketImageUrl(market),
        tags: getMarketTags(market),
        prices: getMarketPrices(market),
        volume: market.volume24hr || market.volume || 0,
        volumeFormatted: formatVolume(market.volume24hr || market.volume || 0),
        isActive: isMarketActive(market)
    }));
}

/**
 * 处理热门话题数据
 * @param {Array} topics - 话题列表
 * @returns {Array} 处理后的热门话题数据
 */
function processHotTopics(topics) {
    return topics.map((topic, index) => ({
        ...topic,
        rank: index + 1,
        volumeFormatted: formatVolume(topic.volume)
    }));
}

/**
 * 处理市场卡片数据
 * @param {Array} markets - 市场列表
 * @returns {Array} 处理后的市场卡片数据
 */
function processMarketCards(markets) {
    return markets.map(market => ({
        id: market.id,
        slug: market.slug,
        question: market.question,
        description: market.description,
        imageUrl: getMarketImageUrl(market),
        tags: getMarketTags(market),
        prices: getMarketPrices(market),
        volume: market.volume24hr || 0,
        volumeFormatted: formatVolume(market.volume24hr || 0),
        endTime: market.endDateTime || market.endDate,
        endTimeFormatted: formatDate(market.endDateTime || market.endDate),
        isActive: isMarketActive(market),
        isResolved: isMarketResolved(market),
        outcome: market.outcome
    }));
}

/**
 * 处理市场详情数据
 * @param {Object} market - 市场对象
 * @returns {Object} 处理后的市场详情
 */
function processMarketDetail(market) {
    return {
        id: market.id,
        slug: market.slug,
        question: market.question,
        description: market.description,
        imageUrl: getMarketImageUrl(market),
        tags: getMarketTags(market),
        prices: getMarketPrices(market),
        volume: market.volume24hr || 0,
        volumeFormatted: formatVolume(market.volume24hr || 0),
        liquidity: market.liquidity || 0,
        liquidityFormatted: formatVolume(market.liquidity || 0),
        endTime: market.endDateTime || market.endDate,
        endTimeFormatted: formatDate(market.endDateTime || market.endDate),
        startTime: market.startDateTime || market.startDate,
        startTimeFormatted: formatDate(market.startDateTime || market.startDate),
        isActive: isMarketActive(market),
        isResolved: isMarketResolved(market),
        outcome: market.outcome,
        createdAt: market.createdAt || market.created_at,
        createdAtFormatted: formatTimestamp(market.createdAt || market.created_at),
        questionId: market.questionId,
        conditionId: market.conditionId,
        tokenId: market.tokenId
    };
}

/**
 * 处理价格历史数据用于图表
 * @param {Array} priceHistory - 价格历史数组
 * @returns {Array} 格式化后的图表数据
 */
function processChartData(priceHistory) {
    return priceHistory.map(item => ({
        timestamp: item.timestamp,
        date: new Date(item.timestamp).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }),
        price: Math.round((item.price || 0) * 100),
        volume: item.volume || 0
    })).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 更新状态
 * @param {Object} updates - 状态更新
 */
function updateState(updates) {
    Object.assign(AppState, updates);
}

/**
 * 获取当前状态
 * @returns {Object} 当前状态
 */
function getState() {
    return { ...AppState };
}

/**
 * 重置状态
 */
function resetState() {
    AppState.markets = [];
    AppState.breakingNews = [];
    AppState.hotTopics = [];
    AppState.selectedMarket = null;
    AppState.currentFilter = 'all';
    AppState.searchQuery = '';
    AppState.lastUpdated = null;
}

/**
 * 导出数据处理函数
 */
if (typeof window !== 'undefined') {
    window.DataProcessor = {
        AppState,
        formatVolume,
        formatDate,
        formatPricePercent,
        formatTimestamp,
        getMarketTags,
        getMarketImageUrl,
        isMarketActive,
        isMarketResolved,
        getMarketPrices,
        filterMarkets,
        getAllTags,
        processBreakingNews,
        processHotTopics,
        processMarketCards,
        processMarketDetail,
        processChartData,
        updateState,
        getState,
        resetState
    };
}
