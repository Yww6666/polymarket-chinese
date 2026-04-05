/**
 * ECharts 图表配置和渲染
 * 使用 ECharts 渲染价格走势图
 */

/**
 * 初始化价格走势图
 * @param {string} containerId - 容器 ID
 * @param {Array} data - 图表数据
 * @param {Object} options - 额外配置
 * @returns {Object} ECharts 实例
 */
function initPriceChart(containerId, data = [], options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`容器 ${containerId} 不存在`);
        return null;
    }

    // 如果已有实例，先销毁
    if (container._chartInstance) {
        container._chartInstance.dispose();
    }

    // 初始化 ECharts
    const chart = echarts.init(container, null, {
        renderer: options.renderer || 'canvas',
        width: options.width || 'auto',
        height: options.height || '100%'
    });

    // 默认配置
    const defaultOptions = {
        grid: {
            left: '8%',
            right: '5%',
            top: '10%',
            bottom: '15%'
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            textStyle: {
                color: '#1F2937'
            },
            formatter: function(params) {
                const param = params[0];
                const dataPoint = param.data;
                return `
                    <div style="padding: 8px;">
                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">${dataPoint.date}</div>
                        <div style="font-size: 14px; font-weight: 600;">
                            价格: <span style="color: #3B82F6;">${dataPoint.price}%</span>
                        </div>
                    </div>
                `;
            }
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: data.map(d => d.date),
            axisLine: {
                lineStyle: {
                    color: '#E5E7EB'
                }
            },
            axisLabel: {
                color: '#6B7280',
                fontSize: 11,
                rotate: data.length > 10 ? 45 : 0
            }
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            axisLine: {
                show: false
            },
            splitLine: {
                lineStyle: {
                    color: '#E5E7EB',
                    type: 'dashed'
                }
            },
            axisLabel: {
                color: '#6B7280',
                fontSize: 11,
                formatter: '{value}%'
            }
        },
        series: [
            {
                name: '价格',
                type: 'line',
                data: data.map(d => d.price),
                smooth: true,
                symbol: data.length > 50 ? 'none' : 'circle',
                symbolSize: 4,
                lineStyle: {
                    color: '#3B82F6',
                    width: 2
                },
                itemStyle: {
                    color: '#3B82F6'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            {
                                offset: 0,
                                color: 'rgba(59, 130, 246, 0.3)'
                            },
                            {
                                offset: 1,
                                color: 'rgba(59, 130, 246, 0.05)'
                            }
                        ]
                    }
                }
            }
        ],
        dataZoom: data.length > 20 ? [
            {
                type: 'inside',
                start: 0,
                end: 100
            },
            {
                type: 'slider',
                start: 0,
                end: 100,
                height: 20,
                bottom: 0,
                borderColor: '#E5E7EB',
                backgroundColor: '#F9FAFB',
                fillerColor: 'rgba(59, 130, 246, 0.2)',
                handleStyle: {
                    color: '#3B82F6'
                }
            }
        ] : []
    };

    // 合并自定义选项
    const finalOptions = mergeOptions(defaultOptions, options);

    chart.setOption(finalOptions);
    container._chartInstance = chart;

    // 响应式调整
    const resizeHandler = () => chart.resize();
    window.addEventListener('resize', resizeHandler);
    container._resizeHandler = resizeHandler;

    return chart;
}

/**
 * 更新图表数据
 * @param {Object} chart - ECharts 实例
 * @param {Array} data - 新数据
 */
function updateChartData(chart, data) {
    if (!chart) return;

    chart.setOption({
        xAxis: {
            data: data.map(d => d.date)
        },
        series: [
            {
                data: data.map(d => d.price)
            }
        ],
        dataZoom: data.length > 20 ? [
            {
                type: 'inside',
                start: 0,
                end: 100
            },
            {
                type: 'slider',
                start: 0,
                end: 100
            }
        ] : []
    });
}

/**
 * 销毁图表实例
 * @param {string} containerId - 容器 ID
 */
function destroyChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container._chartInstance) {
        container._chartInstance.dispose();
        container._chartInstance = null;
    }

    if (container._resizeHandler) {
        window.removeEventListener('resize', container._resizeHandler);
        container._resizeHandler = null;
    }
}

/**
 * 合并 ECharts 配置选项
 * @param {Object} target - 目标配置
 * @param {Object} source - 源配置
 * @returns {Object} 合并后的配置
 */
function mergeOptions(target, source) {
    const result = JSON.parse(JSON.stringify(target));

    function merge(obj1, obj2) {
        for (const key in obj2) {
            if (obj2.hasOwnProperty(key)) {
                if (typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
                    obj1[key] = merge(obj1[key] || {}, obj2[key]);
                } else {
                    obj1[key] = obj2[key];
                }
            }
        }
        return obj1;
    }

    return merge(result, source);
}

/**
 * 创建迷你图表（用于卡片内）
 * @param {string} containerId - 容器 ID
 * @param {Array} data - 图表数据
 * @returns {Object} ECharts 实例
 */
function initMiniChart(containerId, data = []) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (container._chartInstance) {
        container._chartInstance.dispose();
    }

    const chart = echarts.init(container, null, {
        renderer: 'canvas',
        width: '100%',
        height: '60px'
    });

    chart.setOption({
        grid: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
        },
        tooltip: {
            show: false
        },
        xAxis: {
            show: false,
            type: 'category',
            data: data.map(d => d.date)
        },
        yAxis: {
            show: false,
            type: 'value',
            min: 0,
            max: 100
        },
        series: [
            {
                type: 'line',
                data: data.map(d => d.price),
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    color: '#3B82F6',
                    width: 1.5
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
                        ]
                    }
                }
            }
        ]
    });

    container._chartInstance = chart;

    const resizeHandler = () => chart.resize();
    window.addEventListener('resize', resizeHandler);
    container._resizeHandler = resizeHandler;

    return chart;
}

/**
 * 创建成交量柱状图
 * @param {string} containerId - 容器 ID
 * @param {Array} data - 成交量数据
 * @returns {Object} ECharts 实例
 */
function initVolumeChart(containerId, data = []) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    if (container._chartInstance) {
        container._chartInstance.dispose();
    }

    const chart = echarts.init(container, null, {
        renderer: 'canvas',
        width: 'auto',
        height: '100%'
    });

    chart.setOption({
        grid: {
            left: '8%',
            right: '5%',
            top: '10%',
            bottom: '15%'
        },
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderColor: '#E5E7EB',
            borderWidth: 1,
            textStyle: { color: '#1F2937' },
            formatter: function(params) {
                const param = params[0];
                const dataPoint = param.data;
                return `
                    <div style="padding: 8px;">
                        <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">${dataPoint.date}</div>
                        <div style="font-size: 14px; font-weight: 600;">
                            成交量: <span style="color: #10B981;">$${dataPoint.volume.toLocaleString()}</span>
                        </div>
                    </div>
                `;
            }
        },
        xAxis: {
            type: 'category',
            data: data.map(d => d.date),
            axisLine: {
                lineStyle: { color: '#E5E7EB' }
            },
            axisLabel: {
                color: '#6B7280',
                fontSize: 11,
                rotate: data.length > 10 ? 45 : 0
            }
        },
        yAxis: {
            type: 'value',
            axisLine: { show: false },
            splitLine: {
                lineStyle: {
                    color: '#E5E7EB',
                    type: 'dashed'
                }
            },
            axisLabel: {
                color: '#6B7280',
                fontSize: 11,
                formatter: function(value) {
                    if (value >= 1000000) {
                        return '$' + (value / 1000000).toFixed(1) + 'M';
                    } else if (value >= 1000) {
                        return '$' + (value / 1000).toFixed(1) + 'K';
                    }
                    return '$' + value;
                }
            }
        },
        series: [
            {
                type: 'bar',
                data: data.map(d => d.volume),
                itemStyle: {
                    color: '#10B981',
                    borderRadius: [4, 4, 0, 0]
                },
                barMaxWidth: 30
            }
        ]
    });

    container._chartInstance = chart;

    const resizeHandler = () => chart.resize();
    window.addEventListener('resize', resizeHandler);
    container._resizeHandler = resizeHandler;

    return chart;
}

/**
 * 更新所有图表主题
 */
function updateChartsTheme() {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    const isDark = theme === 'dark';

    const textColor = isDark ? '#F9FAFB' : '#1F2937';
    const axisColor = isDark ? '#374151' : '#E5E7EB';
    const labelColor = isDark ? '#9CA3AF' : '#6B7280';

    // 更新所有图表
    document.querySelectorAll('[id]').forEach(container => {
        if (container._chartInstance) {
            container._chartInstance.setOption({
                xAxis: {
                    axisLine: { lineStyle: { color: axisColor } },
                    axisLabel: { color: labelColor }
                },
                yAxis: {
                    splitLine: { lineStyle: { color: axisColor } },
                    axisLabel: { color: labelColor }
                }
            });
        }
    });
}

/**
 * 导出图表相关函数
 */
if (typeof window !== 'undefined') {
    window.ChartRenderer = {
        initPriceChart,
        updateChartData,
        destroyChart,
        initMiniChart,
        initVolumeChart,
        updateChartsTheme
    };
}
