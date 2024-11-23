let visitChart;

async function loadDomains() {
    try {
        const response = await fetch('/admin/domains');
        const domains = await response.json();
        const select = document.getElementById('domain');
        select.innerHTML = domains.map(domain => 
            `<option value="${domain}">${domain}</option>`
        ).join('');
        
        if (domains.length > 0) {
            fetchStats();
        }
    } catch (error) {
        console.error('获取域名列表失败:', error);
    }
}

async function fetchStats() {
    try {
        const domain = document.getElementById('domain').value;
        const response = await fetch(`/admin/stats?domain=${encodeURIComponent(domain)}`);
        const data = await response.json();
        
        // 更新统计卡片
        document.getElementById('totalPV').textContent = data.sitePV;
        document.getElementById('totalUV').textContent = data.siteUV;
        document.getElementById('todayPV').textContent = data.todayPV;
        document.getElementById('todayUV').textContent = data.todayUV;
        
        // 更新访问记录表格
        updateTable(data.recentLogs);
        
        // 更新图表
        await updateChart(domain);
    } catch (error) {
        console.error('获取统计数据失败:', error);
    }
}

async function updateChart(domain) {
    try {
        // 获取最近7天的数据
        const response = await fetch(`/admin/chart-data?domain=${encodeURIComponent(domain)}`);
        const data = await response.json();
        
        if (visitChart) {
            visitChart.data.labels = data.dates;
            visitChart.data.datasets[0].data = data.pvData;
            visitChart.data.datasets[1].data = data.uvData;
            visitChart.update();
        } else {
            // 如果图表不存在，初始化它
            initChart();
            visitChart.data.labels = data.dates;
            visitChart.data.datasets[0].data = data.pvData;
            visitChart.data.datasets[1].data = data.uvData;
            visitChart.update();
        }
    } catch (error) {
        console.error('获取图表数据失败:', error);
    }
}

function updateTable(logs) {
    const tbody = document.querySelector('#recentLogs tbody');
    tbody.innerHTML = logs.map(log => {
        const logData = typeof log === 'string' ? JSON.parse(log) : log;
        return `
            <tr>
                <td>${new Date(logData.timestamp).toLocaleString()}</td>
                <td>${logData.ip}</td>
                <td>${logData.path || '/'}</td>
                <td>${logData.referer || '-'}</td>
            </tr>
        `;
    }).join('');
}

async function exportData() {
    try {
        const response = await fetch('/admin/export');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `busuanzi-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('导出数据失败:', error);
    }
}

async function resetData() {
    if (!confirm('确定要重置所有统计数据吗？此操作不可恢复！')) {
        return;
    }
    
    try {
        const response = await fetch('/admin/reset', { method: 'POST' });
        const result = await response.json();
        alert(result.message);
        fetchStats();
    } catch (error) {
        console.error('重置数据失败:', error);
    }
}

// 初始化图表
function initChart() {
    if (visitChart) {
        visitChart.destroy();
    }

    const ctx = document.getElementById('visitChart').getContext('2d');
    visitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [], // 将被日期填充
            datasets: [
                {
                    label: '每日访问量(PV)',
                    data: [],
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.1,
                    fill: true
                },
                {
                    label: '每日访客数(UV)',
                    data: [],
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            if (Math.floor(value) === value) {
                                return value;
                            }
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += Math.floor(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
    initChart();  // 先初始化图表
    loadDomains(); // 然后加载域名并获取数据
    // 每分钟更新一次数据
    setInterval(fetchStats, 60000);
}); 