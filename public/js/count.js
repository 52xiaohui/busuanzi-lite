!function(){
    // 获取脚本标签的 src 属性来确定服务器地址
    function getServerUrl() {
        const scripts = document.getElementsByTagName('script');
        for (let script of scripts) {
            if (script.src && script.src.includes('/js/count.js')) {
                // 从脚本 URL 中提取基础 URL
                // 例如: https://b.com/js/count.js -> https://b.com
                return script.src.split('/js/count.js')[0] + '/count';
            }
        }
        // 如果找不到脚本，返回默认值
        console.error('无法找到统计脚本的URL');
        return window.location.origin + '/count';
    }
    
    const t = getServerUrl();
    
    function n(t,n){
        const e = document.getElementById(t);
        e && (e.textContent = n);
    }
    
    // 改进重试策略
    async function fetchWithRetry(url, options, retries = 3) {
        const delays = [1000, 3000, 5000]; // 递增的延迟时间
        
        for(let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if(!response.ok) throw new Error("Network response was not ok");
                return await response.json();
            } catch(error) {
                if(i === retries - 1) throw error;
                await new Promise(r => setTimeout(r, delays[i]));
            }
        }
    }
    
    async function e(){
        const e = window.location.pathname + window.location.search,
              o = window.location.hostname;
        
        try {
            const data = await fetchWithRetry(
                `${t}?domain=${encodeURIComponent(o)}&path=${encodeURIComponent(e)}`,
                {
                    mode: "cors",
                    headers: {
                        Referer: window.location.href
                    }
                }
            );
            
            // 更新显示
            n("busuanzi_value_site_pv", data.sitePV);
            n("busuanzi_value_site_uv", data.siteUV);
            n("busuanzi_value_page_pv", data.pagePV);
            
            // 隐藏的容器显示出来
            ["site_pv", "site_uv", "page_pv"].forEach(type => {
                const container = document.getElementById(`busuanzi_container_${type}`);
                if(container) container.style.display = "inline";
            });
            
        } catch(error) {
            console.error("访问统计错误:", error);
        }
    }
    
    // 使用 requestIdleCallback 延迟执行，不阻塞页面加载
    if("complete" === document.readyState) {
        window.requestIdleCallback ? requestIdleCallback(e) : setTimeout(e, 0);
    } else {
        window.addEventListener("load", () => {
            window.requestIdleCallback ? requestIdleCallback(e) : setTimeout(e, 0);
        });
    }
}(); 