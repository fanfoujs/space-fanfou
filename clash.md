// Clash Verge Rev 扩展脚本 - WSL 完全修复版
function main(params) {
  const config = params || {};
  
  // 关键：确保 LAN 访问设置正确
  config['allow-lan'] = true;
  config['bind-address'] = '*';  // 监听所有接口，不只是 localhost
  config['mixed-port'] = 7897;
  
  // 添加外部控制器（可选，用于调试）
  config['external-controller'] = '0.0.0.0:9090';
  
  // DNS 设置
  if (!config.dns) {
    config.dns = {};
  }
  config.dns.enable = true;
  config.dns['enhanced-mode'] = 'fake-ip';
  config.dns['fake-ip-range'] = '198.18.0.1/16';
  
  // 初始化代理组
  if (!config['proxy-groups']) {
    config['proxy-groups'] = [];
  }
  
  // 删除旧组
  config['proxy-groups'] = config['proxy-groups'].filter(g => 
    g.name !== 'CRYPTO-SG' && g.name !== '♾️ OpenAI'
  );
  
  // 创建新组
  const hasProviders = config['proxy-providers'] && Object.keys(config['proxy-providers']).length > 0;
  
  if (hasProviders) {
    const providers = Object.keys(config['proxy-providers']);
    
    // CRYPTO-SG 组（新加坡）
    config['proxy-groups'].unshift({
      name: 'CRYPTO-SG',
      type: 'select',
      use: providers,
      filter: '(?i)(Singapore|SG|🇸🇬|新加坡|狮城)'
    });
    
    // OpenAI 组（美国）
    config['proxy-groups'].unshift({
      name: '♾️ OpenAI',
      type: 'select',
      use: providers,
      filter: '(?i)(USA|US|United\\sStates|America|美国|🇺🇸)'
    });
  } else if (config.proxies) {
    const sgProxies = [];
    const usProxies = [];
    
    config.proxies.forEach(proxy => {
      if (proxy && proxy.name) {
        const name = proxy.name;
        if (/Singapore|SG|🇸🇬|新加坡|狮城/i.test(name)) {
          sgProxies.push(name);
        }
        if (/USA|US|United\s*States|America|美国|🇺🇸/i.test(name)) {
          usProxies.push(name);
        }
      }
    });
    
    config['proxy-groups'].unshift({
      name: 'CRYPTO-SG',
      type: 'select',
      proxies: sgProxies.length > 0 ? sgProxies : ['REJECT']
    });
    
    config['proxy-groups'].unshift({
      name: '♾️ OpenAI',
      type: 'select',
      proxies: usProxies.length > 0 ? usProxies : ['REJECT']
    });
  }
  
  // 配置规则
  if (!config.rules) {
    config.rules = [];
  }
  
  const newRules = [
    // 本地回环
    'IP-CIDR,127.0.0.0/8,DIRECT,no-resolve',
    'IP-CIDR,::1/128,DIRECT,no-resolve',
    
    // Binance -> 新加坡
    'DOMAIN,api.binance.com,CRYPTO-SG',
    'DOMAIN,api1.binance.com,CRYPTO-SG',
    'DOMAIN,api2.binance.com,CRYPTO-SG',
    'DOMAIN,api3.binance.com,CRYPTO-SG',
    'DOMAIN,fapi.binance.com,CRYPTO-SG',
    'DOMAIN,dapi.binance.com,CRYPTO-SG',
    'DOMAIN,sapi.binance.com,CRYPTO-SG',
    'DOMAIN,stream.binance.com,CRYPTO-SG',
    'DOMAIN,fstream.binance.com,CRYPTO-SG',
    'DOMAIN,data.binance.vision,CRYPTO-SG',
    'DOMAIN-SUFFIX,binance.com,CRYPTO-SG',
    'DOMAIN-SUFFIX,binance.vision,CRYPTO-SG',
    'DOMAIN-SUFFIX,bnbstatic.com,CRYPTO-SG',
    
    // AI 服务 -> 美国
    'DOMAIN,claude.ai,♾️ OpenAI',
    'DOMAIN,api.anthropic.com,♾️ OpenAI',
    'DOMAIN,console.anthropic.com,♾️ OpenAI',
    'DOMAIN,code.anthropic.com,♾️ OpenAI',
    'DOMAIN-SUFFIX,anthropic.com,♾️ OpenAI',
    'DOMAIN-SUFFIX,claude.ai,♾️ OpenAI',
    'DOMAIN,api.openai.com,♾️ OpenAI',
    'DOMAIN,chat.openai.com,♾️ OpenAI',
    'DOMAIN-SUFFIX,openai.com,♾️ OpenAI',
    'DOMAIN-SUFFIX,chatgpt.com,♾️ OpenAI',
    'DOMAIN-SUFFIX,oaistatic.com,♾️ OpenAI',
    'DOMAIN-SUFFIX,oaiusercontent.com,♾️ OpenAI',
    
    // 关键词
    'DOMAIN-KEYWORD,claude,♾️ OpenAI',
    'DOMAIN-KEYWORD,anthropic,♾️ OpenAI',
    'DOMAIN-KEYWORD,openai,♾️ OpenAI',
    'DOMAIN-KEYWORD,binance,CRYPTO-SG'
  ];
  
  // 去重添加规则
  const existingRules = new Set(config.rules);
  const rulesToAdd = newRules.filter(rule => !existingRules.has(rule));
  config.rules = rulesToAdd.concat(config.rules);
  
  console.log('配置已更新: allow-lan=' + config['allow-lan'] + ', bind=' + config['bind-address']);
  
  return config;
}

try { module.exports = main; } catch {}