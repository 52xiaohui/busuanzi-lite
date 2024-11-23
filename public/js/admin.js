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
    } catch (error) {
        console.error('获取统计数据失败:', error);
    }
}

function updateChart(hourlyData) {
    const ctx = document.getElementById('visitChart').getContext('2d');
    
    if (visitChart) {
        visitChart.destroy();
    }
    
    visitChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.map(d => d.hour),
            datasets: [{
                label: 'PV',
                data: hourlyData.map(d => d.pv),
                borderColor: '#2196F3',
                tension: 0.1
            }, {
                label: 'UV',
                data: hourlyData.map(d => d.uv),
                borderColor: '#4CAF50',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
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

// 页面加载完成后获取数据
document.addEventListener('DOMContentLoaded', () => {
    loadDomains();
    // 每分钟更新一次数据
    setInterval(fetchStats, 60000);
}); 