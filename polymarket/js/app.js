/**
 * 主应用逻辑
 * 初始化应用、事件绑定和数据更新
 */

// 配置常量
const CONFIG = {
    REFRESH_INTERVAL: 30000, // 30秒自动刷新
    MARKETS_PER_PAGE: 50,
    BREAKING_NEWS_COUNT: 10,
    HOT_TOPICS_COUNT: 8
};

// DOM 元素引用
const DOM = {
    breakingNewsContainer: null,
    hotTopicsContainer: null,
    filtersContainer: null,
    marketsGrid: null,
    searchInput: null,
    refreshBtn: null,
    themeToggle: null,
    autoRefreshToggle: null,
    lastUpdated: null,
    modalOverlay: null,
    modal: null,
    modalCloseBtn: null
};

/**
 * 初始化应用
 */
async function initApp() {
    console.log('初始化 Polymarket 中文可视化网站...');

    // 获取 DOM 元素
    DOM.breakingNewsContainer = document.getElementById('breakingNewsContainer');
    DOM.hotTopicsContainer = document.getElementById('hotTopicsContainer');
    DOM.filtersContainer = document.getElementById('filtersContainer');
    DOM.marketsGrid = document.getElementById('marketsGrid');
    DOM.searchInput = document.getElementById('searchInput');
    DOM.refreshBtn = document.getElementById('refreshBtn');
    DOM.themeToggle = document.getElementById('themeToggle');
    DOM.autoRefreshToggle = document.getElementById('autoRefreshToggle');
    DOM.lastUpdated = document.getElementById('lastUpdated');
    DOM.modalOverlay = document.getElementById('modalOverlay');
    DOM.modal = document.getElementById('modal');

    // 绑定事件
    bindEvents();

    // 初始化主题
    initTheme();

    // 加载初始数据
    await loadInitialData();
}

/**
 * 绑定事件监听器
 */
function bindEvents() {
    // 搜索输入
    if (DOM.searchInput) {
        DOM.searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // 刷新按钮
    if (DOM.refreshBtn) {
        DOM.refreshBtn.addEventListener('click', handleRefresh);
    }

    // 自动刷新开关
    if (DOM.autoRefreshToggle) {
        DOM.autoRefreshToggle.addEventListener('change', handleAutoRefresh);
    }

    // 模态框关闭
    if (DOM.modalOverlay) {
        DOM.modalOverlay.addEventListener('click', (e) => {
            if (e.target === DOM.modalOverlay) {
                closeModal();
            }
        });
    }

    // ESC 关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // 模态框关闭按钮
    const closeBtns = document.querySelectorAll('.modal-close-btn');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
}

/**
 * 加载初始数据
 */
async function loadInitialData() {
    showLoading();

    try {
        // 分别加载数据，单个失败不影响其他
        let markets = [];
        let breakingNews = [];
        let hotTopics = [];

        // 获取市场数据
        markets = await fetchAllMarkets();
        console.log('市场数据加载成功，数量:', markets.length);

        // 获取 Breaking News
        breakingNews = await PolymarketAPI.fetchBreakingNews(CONFIG.BREAKING_NEWS_COUNT);
        console.log('Breaking News 加载成功，数量:', breakingNews.length);

        // 获取热门话题
        hotTopics = await PolymarketAPI.fetchHotTopics(CONFIG.HOT_TOPICS_COUNT);
        console.log('热门话题加载成功，数量:', hotTopics.length);

        // 检查是否有任何数据
        if (markets.length === 0) {
            throw new Error('无法加载市场数据，请检查网络连接');
        }

        // 处理数据
        const processedMarkets = DataProcessor.processMarketCards(markets);
        const processedBreakingNews = DataProcessor.processBreakingNews(breakingNews);
        const processedHotTopics = DataProcessor.processHotTopics(hotTopics);

        // 更新状态
        DataProcessor.updateState({
            markets: processedMarkets,
            breakingNews: processedBreakingNews,
            hotTopics: processedHotTopics,
            lastUpdated: new Date()
        });

        // 渲染界面
        renderAll();

        // 更新最后更新时间
        updateLastUpdated();

    } catch (error) {
        console.error('加载数据失败:', error);
        showError('无法连接到 Polymarket 服务器。请检查网络连接或稍后重试。');
    } finally {
        hideLoading();
    }
}

/**
 * 获取所有市场
 */
async function fetchAllMarkets() {
    return await PolymarketAPI.fetchMarkets({
        limit: CONFIG.MARKETS_PER_PAGE,
        active: true,
        order: 'volume24h'
    });
}

/**
 * 渲染所有内容
 */
function renderAll() {
    renderBreakingNews();
    renderHotTopics();
    renderFilters();
    renderMarkets();
}

/**
 * 渲染 Breaking News
 */
function renderBreakingNews() {
    if (!DOM.breakingNewsContainer) return;

    const breakingNews = DataProcessor.AppState.breakingNews;

    if (breakingNews.length === 0) {
        DOM.breakingNewsContainer.innerHTML = '<div class="empty-state">暂无突发新闻</div>';
        return;
    }

    DOM.breakingNewsContainer.innerHTML = `
        <div class="breaking-news-scroll">
            ${breakingNews.map(news => `
                <div class="breaking-news-card fade-in" data-market-id="${news.id}">
                    <img src="${news.imageUrl}" alt="${news.question}" class="breaking-news-image" loading="lazy">
                    <div class="breaking-news-content">
                        <div class="breaking-news-title">${escapeHtml(news.question)}</div>
                        <div class="breaking-news-meta">
                            <span class="live-tag">LIVE</span>
                            <span>${news.volumeFormatted}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // 绑定点击事件
    DOM.breakingNewsContainer.querySelectorAll('.breaking-news-card').forEach(card => {
        card.addEventListener('click', () => {
            const marketId = card.dataset.marketId;
            openMarketDetail(marketId);
        });
    });
}

/**
 * 渲染热门话题
 */
function renderHotTopics() {
    if (!DOM.hotTopicsContainer) return;

    const hotTopics = DataProcessor.AppState.hotTopics;

    if (hotTopics.length === 0) {
        DOM.hotTopicsContainer.innerHTML = '<div class="empty-state">暂无热门话题</div>';
        return;
    }

    DOM.hotTopicsContainer.innerHTML = `
        <div class="hot-topics-list">
            ${hotTopics.map(topic => `
                <div class="hot-topic-item fade-in" data-tag="${escapeHtml(topic.name)}">
                    <div>
                        <div class="hot-topic-name">${escapeHtml(topic.name)}</div>
                        <div class="hot-topic-volume">${topic.volumeFormatted} today</div>
                    </div>
                    <div class="hot-topic-rank">${topic.rank}</div>
                </div>
            `).join('')}
        </div>
    `;

    // 绑定点击事件
    DOM.hotTopicsContainer.querySelectorAll('.hot-topic-item').forEach(item => {
        item.addEventListener('click', () => {
            const tag = item.dataset.tag;
            setFilter(tag);
        });
    });
}

/**
 * 渲染筛选器
 */
function renderFilters() {
    if (!DOM.filtersContainer) return;

    const markets = DataProcessor.AppState.markets;
    const allTags = DataProcessor.getAllTags(markets);

    // 主要标签
    const mainTags = ['all', 'Politics', 'Sports', 'Crypto', 'Business', 'World'];

    DOM.filtersContainer.innerHTML = `
        ${mainTags.map(tag => {
            const isTagInList = tag === 'all' || allTags.some(t => t.toLowerCase().includes(tag.toLowerCase()));
            return isTagInList ? `
                <button class="filter-btn ${DataProcessor.AppState.currentFilter === tag ? 'active' : ''}" data-filter="${tag}">
                    ${tag === 'all' ? '全部' : tag}
                </button>
            ` : '';
        }).join('')}
        ${allTags
            .filter(tag => !mainTags.some(main => tag.toLowerCase().includes(main.toLowerCase())))
            .slice(0, 5)
            .map(tag => `
                <button class="filter-btn ${DataProcessor.AppState.currentFilter === tag ? 'active' : ''}" data-filter="${tag}">
                    ${escapeHtml(tag)}
                </button>
            `).join('')}
    `;

    // 绑定点击事件
    DOM.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            setFilter(filter);
        });
    });
}

/**
 * 渲染市场列表
 */
function renderMarkets() {
    if (!DOM.marketsGrid) return;

    const state = DataProcessor.AppState;
    const filteredMarkets = DataProcessor.filterMarkets(
        state.markets,
        state.currentFilter,
        state.searchQuery
    );

    if (filteredMarkets.length === 0) {
        DOM.marketsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">没有找到匹配的市场</div>
            </div>
        `;
        return;
    }

    DOM.marketsGrid.innerHTML = filteredMarkets.map(market => `
        <div class="market-card fade-in" data-market-id="${market.id}">
            <div class="market-card-header">
                <img src="${market.imageUrl}" alt="${escapeHtml(market.question)}" class="market-icon" loading="lazy">
                <div class="market-info">
                    <div class="market-title">${escapeHtml(market.question)}</div>
                    <div class="market-tags">
                        ${market.tags.slice(0, 2).map(tag => `
                            <span class="market-tag">${escapeHtml(tag)}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="market-card-body">
                <div class="market-odds">
                    <div class="odd-button odd-yes">
                        <div class="odd-value">${market.prices.yes ? DataProcessor.formatPricePercent(market.prices.yes) : 0}%</div>
                        <div class="odd-label">Yes</div>
                    </div>
                    <div class="odd-button odd-no">
                        <div class="odd-value">${market.prices.no ? DataProcessor.formatPricePercent(market.prices.no) : 0}%</div>
                        <div class="odd-label">No</div>
                    </div>
                </div>
                <div class="market-footer">
                    <div class="market-volume">
                        <span>💰</span>
                        <span>${market.volumeFormatted}</span>
                    </div>
                    <div class="market-end-time">
                        <span>⏰</span>
                        <span>${market.endTimeFormatted}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // 绑定点击事件
    DOM.marketsGrid.querySelectorAll('.market-card').forEach(card => {
        card.addEventListener('click', () => {
            const marketId = card.dataset.marketId;
            openMarketDetail(marketId);
        });
    });
}

/**
 * 打开市场详情模态框
 */
async function openMarketDetail(marketId) {
    // 查找市场数据
    const market = DataProcessor.AppState.markets.find(m => m.id === marketId);
    if (!market) return;

    try {
        // 获取市场详情和价格历史
        const [detailData, priceHistory] = await Promise.all([
            PolymarketAPI.fetchMarketDetails(marketId),
            PolymarketAPI.fetchPriceHistory(marketId)
        ]);

        // 处理数据
        const detail = DataProcessor.processMarketDetail(detailData || market);
        const chartData = DataProcessor.processChartData(priceHistory);

        // 渲染模态框内容
        renderModalContent(detail, chartData);

        // 显示模态框
        showModal();

    } catch (error) {
        console.error('加载市场详情失败:', error);
        showError('加载市场详情失败');
    }
}

/**
 * 渲染模态框内容
 */
function renderModalContent(detail, chartData) {
    const modalBody = document.querySelector('.modal-body');

    modalBody.innerHTML = `
        <div class="modal-odds-section">
            <div class="modal-odd-box modal-odd-yes">
                <div class="modal-odd-value">${DataProcessor.formatPricePercent(detail.prices.yes)}%</div>
                <div class="modal-odd-label">Yes</div>
            </div>
            <div class="modal-odd-box modal-odd-no">
                <div class="modal-odd-value">${DataProcessor.formatPricePercent(detail.prices.no)}%</div>
                <div class="modal-odd-label">No</div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">价格走势</div>
            <div class="chart-container">
                <div id="priceChart" style="width: 100%; height: 100%;"></div>
            </div>
        </div>

        <div class="modal-section">
            <div class="modal-section-title">市场信息</div>
            <div class="modal-stats">
                <div class="stat-item">
                    <div class="stat-label">交易量 (24h)</div>
                    <div class="stat-value">${detail.volumeFormatted}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">流动性</div>
                    <div class="stat-value">${detail.liquidityFormatted}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">开始时间</div>
                    <div class="stat-value">${detail.startTimeFormatted}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">结束时间</div>
                    <div class="stat-value">${detail.endTimeFormatted}</div>
                </div>
            </div>
        </div>
    `;

    // 初始化图表
    if (chartData.length > 0) {
        setTimeout(() => {
            ChartRenderer.initPriceChart('priceChart', chartData);
        }, 100);
    } else {
        document.getElementById('priceChart').innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6B7280;">暂无价格历史数据</div>';
    }

    // 更新模态框头部
    const modalHeader = document.querySelector('.modal-header');
    modalHeader.innerHTML = `
        <img src="${detail.imageUrl}" alt="${escapeHtml(detail.question)}" class="modal-market-icon">
        <div class="modal-market-info">
            <div class="modal-market-title">${escapeHtml(detail.question)}</div>
            <div class="modal-market-description">${escapeHtml(detail.description || '')}</div>
            <div class="modal-market-tags">
                ${detail.tags.map(tag => `
                    <span class="market-tag">${escapeHtml(tag)}</span>
                `).join('')}
            </div>
        </div>
        <button class="modal-close-btn">×</button>
    `;

    // 重新绑定关闭按钮事件
    modalHeader.querySelector('.modal-close-btn').addEventListener('click', closeModal);
}

/**
 * 显示模态框
 */
function showModal() {
    if (DOM.modalOverlay) {
        DOM.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * 关闭模态框
 */
function closeModal() {
    if (DOM.modalOverlay) {
        DOM.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';

        // 销毁图表
        setTimeout(() => {
            ChartRenderer.destroyChart('priceChart');
        }, 300);
    }
}

/**
 * 设置过滤器
 */
function setFilter(filter) {
    DataProcessor.updateState({ currentFilter: filter });

    // 更新筛选按钮状态
    if (DOM.filtersContainer) {
        DOM.filtersContainer.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
    }

    // 重新渲染市场列表
    renderMarkets();
}

/**
 * 处理搜索
 */
function handleSearch(e) {
    const query = e.target.value;
    DataProcessor.updateState({ searchQuery: query });
    renderMarkets();
}

/**
 * 处理刷新
 */
async function handleRefresh() {
    if (DOM.refreshBtn) {
        DOM.refreshBtn.disabled = true;
        DOM.refreshBtn.innerHTML = '<span class="spinner"></span> 刷新中...';
    }

    try {
        await loadInitialData();
    } finally {
        if (DOM.refreshBtn) {
            DOM.refreshBtn.disabled = false;
            DOM.refreshBtn.innerHTML = '🔄 刷新';
        }
    }
}

/**
 * 处理自动刷新
 */
function handleAutoRefresh(e) {
    const enabled = e.target.checked;
    DataProcessor.updateState({ autoRefresh: enabled });

    if (enabled) {
        DataProcessor.AppState.refreshInterval = setInterval(handleRefresh, CONFIG.REFRESH_INTERVAL);
        console.log('已启用自动刷新');
    } else {
        if (DataProcessor.AppState.refreshInterval) {
            clearInterval(DataProcessor.AppState.refreshInterval);
            DataProcessor.AppState.refreshInterval = null;
        }
        console.log('已禁用自动刷新');
    }
}

/**
 * 更新最后更新时间
 */
function updateLastUpdated() {
    if (DOM.lastUpdated) {
        const now = new Date();
        DOM.lastUpdated.textContent = `最后更新: ${now.toLocaleTimeString('zh-CN')}`;
    }
}

/**
 * 显示加载状态
 */
function showLoading() {
    DataProcessor.updateState({ isLoading: true });
    if (DOM.marketsGrid) {
        DOM.marketsGrid.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <div>加载数据中...</div>
            </div>
        `;
    }
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    DataProcessor.updateState({ isLoading: false });
}

/**
 * 显示错误信息
 */
function showError(message) {
    if (DOM.marketsGrid) {
        DOM.marketsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <div class="empty-state-text">${escapeHtml(message)}</div>
            </div>
        `;
    }
}

/**
 * HTML 转义
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 初始化主题
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    if (DOM.themeToggle) {
        DOM.themeToggle.addEventListener('click', toggleTheme);
    }
}

/**
 * 切换主题
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);

    // 更新 ECharts 主题
    ChartRenderer.updateChartsTheme();
}

/**
 * 更新主题图标
 */
function updateThemeIcon(theme) {
    if (DOM.themeToggle) {
        DOM.themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
        DOM.themeToggle.title = theme === 'light' ? '切换到深色模式' : '切换到浅色模式';
    }
}

/**
 * 页面加载完成后初始化
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
