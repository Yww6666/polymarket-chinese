/**
 * Polymarket API 封装
 * 封装所有与 Polymarket API 的交互
 */

// API 基础 URL
// 注意: 如果直接访问 Polymarket API 遇到跨域问题，需要设置 CORS 代理
const API_BASE_URL = 'https://gamma-api.polymarket.com';
const CLOB_API_URL = 'https://clob.polymarket.com';
const DATA_API_URL = 'https://data-api.polymarket.com';

/**
 * 获取活跃市场列表
 * @param {Object} options - 查询参数
 * @param {number} options.limit - 返回数量限制
 * @param {number} options.offset - 偏移量
 * @param {boolean} options.active - 是否只返回活跃市场
 * @param {string} options.order - 排序字段
 * @returns {Promise<Array>} 市场列表
 */
async function fetchMarkets(options = {}) {
    const {
        limit = 50,
        offset = 0,
        active = true,
        closed = false
    } = options;

    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (active !== undefined) params.append('active', active.toString());
    if (closed !== undefined) params.append('closed', closed.toString());

    const url = `${API_BASE_URL}/markets?${params.toString()}`;

    console.log('fetchMarkets URL:', url);

    const response = await fetch(url);
    console.log('fetchMarkets response status:', response.status, response.statusText);

    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('fetchMarkets data type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('fetchMarkets data length:', Array.isArray(data) ? data.length : 'N/A');

    // API 返回的是数组，不是包含 markets 字段的对象
    return Array.isArray(data) ? data : (data.markets || []);
}

/**
 * 获取单个市场详情
 * @param {string} marketId - 市场 ID
 * @returns {Promise<Object>} 市场详情
 */
async function fetchMarketDetails(marketId) {
    const response = await fetch(`${API_BASE_URL}/markets?id=${marketId}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.markets?.[0] || data;
}

/**
 * 获取价格数据
 * @param {Array<string>} tokenIds - Token ID 列表
 * @returns {Promise<Object>} 价格数据
 */
async function fetchPrices(tokenIds) {
    if (!tokenIds || tokenIds.length === 0) {
        return {};
    }

    const response = await fetch(`${CLOB_API_URL}/prices?token_ids=${tokenIds.join(',')}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

/**
 * 获取市场订单簿
 * @param {string} tokenId - Token ID
 * @returns {Promise<Object>} 订单簿数据
 */
async function fetchOrderBook(tokenId) {
    const response = await fetch(`${CLOB_API_URL}/book?token_id=${tokenId}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

/**
 * 获取交易历史
 * @param {string} marketId - 市场 ID
 * @param {Object} options - 查询参数
 * @returns {Promise<Array>} 交易记录
 */
async function fetchTrades(marketId, options = {}) {
    const { limit = 100 } = options;

    const response = await fetch(`${DATA_API_URL}/trades?market=${marketId}&limit=${limit}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

/**
 * 获取价格历史数据（用于图表）
 * @param {string} marketId - 市场 ID
 * @param {string} tokenId - Token ID（可选）
 * @param {number} interval - 时间间隔（秒）
 * @returns {Promise<Array>} 价格历史数据
 */
async function fetchPriceHistory(marketId, tokenId = null, interval = 3600) {
    // 使用交易历史来构建价格历史
    const trades = await fetchTrades(marketId, { limit: 500 });

    if (!trades || trades.length === 0) {
        return [];
    }

    // 按时间排序并聚合数据
    const priceHistory = {};
    trades.forEach(trade => {
        const timestamp = Math.floor(trade.timestamp / interval) * interval;
        if (!priceHistory[timestamp]) {
            priceHistory[timestamp] = {
                timestamp,
                price: trade.price,
                volume: trade.size
            };
        } else {
            // 累加交易量，更新价格
            priceHistory[timestamp].volume += trade.size;
            priceHistory[timestamp].price = trade.price; // 使用最新价格
        }
    });

    // 转换为数组并按时间排序
    return Object.values(priceHistory).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * 获取事件列表
 * @param {Object} options - 查询参数
 * @returns {Promise<Array>} 事件列表
 */
async function fetchEvents(options = {}) {
    const { limit = 20 } = options;

    const response = await fetch(`${API_BASE_URL}/events?limit=${limit}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.events || data || [];
}

/**
 * 获取事件详情
 * @param {string} eventId - 事件 ID
 * @returns {Promise<Object>} 事件详情
 */
async function fetchEventDetails(eventId) {
    const response = await fetch(`${API_BASE_URL}/events?id=${eventId}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.events?.[0] || data;
}

/**
 * 搜索市场
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>} 匹配的市场列表
 */
async function searchMarkets(query) {
    const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.markets || data || [];
}

/**
 * 获取 Breaking News 市场
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>} Breaking News 市场列表
 */
async function fetchBreakingNews(limit = 10) {
    // 获取按交易量排序的热门市场
    const markets = await fetchMarkets({
        limit,
        active: true
    });

    // 按交易量排序
    return markets.sort((a, b) => (b.volume24hr || 0) - (a.volume24hr || 0));
}

/**
 * 获取热门话题
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>} 热门话题列表
 */
async function fetchHotTopics(limit = 8) {
    // 获取热门事件
    const response = await fetch(`${API_BASE_URL}/events?limit=${limit * 3}`);
    if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    const events = data.events || data || [];

    // 将事件转换为话题
    return events.slice(0, limit).map((event, index) => ({
        name: event.ticker || event.title || `Topic ${index + 1}`,
        volume: event.volume24hr || event.volume || 0,
        markets: event.markets || []
    }));
}

/**
 * 获取相似市场
 * @param {string} marketId - 市场 ID
 * @param {number} limit - 返回数量限制
 * @returns {Promise<Array>} 相似市场列表
 */
async function fetchSimilarMarkets(marketId, limit = 6) {
    // 先获取当前市场的信息
    const currentMarket = await fetchMarketDetails(marketId);
    if (!currentMarket) {
        return [];
    }

    // 获取更多市场
    const markets = await fetchMarkets({
        limit: 50,
        active: true
    });

    // 排除当前市场
    const otherMarkets = markets.filter(m => m.id !== marketId);

    // 简单计算相似度（基于交易量）
    // 返回交易量最接近的市场作为"相似"市场
    const sorted = otherMarkets.sort((a, b) => {
        const diffA = Math.abs((a.volume24hr || 0) - (currentMarket.volume24hr || 0));
        const diffB = Math.abs((b.volume24hr || 0) - (currentMarket.volume24hr || 0));
        return diffA - diffB;
    });

    return sorted.slice(0, limit);
}

/**
 * 导出所有 API 函数
 */
const PolymarketAPI = {
    fetchMarkets,
    fetchMarketDetails,
    fetchPrices,
    fetchOrderBook,
    fetchTrades,
    fetchPriceHistory,
    fetchEvents,
    fetchEventDetails,
    searchMarkets,
    fetchBreakingNews,
    fetchHotTopics,
    fetchSimilarMarkets
};

// 如果在浏览器环境中，挂载到 window 对象
if (typeof window !== 'undefined') {
    window.PolymarketAPI = PolymarketAPI;
}
