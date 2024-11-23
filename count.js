(function() {
  const COUNT_API = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/count'
    : 'http://你的域名:3000/count';
  
  function getCount() {
    const url = encodeURIComponent(window.location.pathname);
    
    fetch(`${COUNT_API}?url=${url}`)
      .then(response => response.json())
      .then(data => {
        // 更新显示
        document.getElementById('busuanzi_value_site_pv').innerText = data.totalPV;
        document.getElementById('busuanzi_value_site_uv').innerText = data.totalUV;
        document.getElementById('busuanzi_value_page_pv').innerText = data.pagePV;
      })
      .catch(console.error);
  }

  // 页面加载完成后获取数据
  if (document.readyState === 'complete') {
    getCount();
  } else {
    window.addEventListener('load', getCount);
  }
})(); 