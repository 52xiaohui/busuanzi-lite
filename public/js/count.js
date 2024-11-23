(function() {
  const COUNT_API = '/count';
  
  function getCount() {
    // 获取完整的 URL 路径，包括查询参数
    const fullPath = window.location.pathname + window.location.search;
    const domain = window.location.hostname;
    
    fetch(`${COUNT_API}?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(fullPath)}`, {
      credentials: 'include',
      mode: 'cors',
      headers: {
        'Referer': window.location.href // 添加来源页面信息
      }
    })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        updateElement('busuanzi_value_site_pv', data.sitePV);
        updateElement('busuanzi_value_site_uv', data.siteUV);
        updateElement('busuanzi_value_page_pv', data.pagePV);
      })
      .catch(error => {
        console.error('访问统计错误:', error);
      });
  }

  function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  // 在页面加载完成后执行统计
  if (document.readyState === 'complete') {
    getCount();
  } else {
    window.addEventListener('load', getCount);
  }
})(); 