(() => {
  const rawBody = $response && $response.body;
  if (!rawBody) {
    return $done({});
  }

  function isPromoText(value) {
    if (typeof value !== 'string') return false;
    const s = value.toLowerCase();
    return /(promoted|sponsored|admeta|ad_metadata|native_ad|advertisement|campaign|creative|placement|marketing|recommended for you|who to follow|you might like)/i.test(s);
  }

  function hasPromoSignal(node, visited = new WeakSet()) {
    if (!node || typeof node !== 'object') return false;
    if (visited.has(node)) return false;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        if (hasPromoSignal(item, visited)) return true;
      }
      return false;
    }

    for (const [key, value] of Object.entries(node)) {
      const keyLower = String(key).toLowerCase();
      if (/(^|_|-)(promoted|sponsored|admeta|ad_metadata|native_ad|advertisement|campaign|creative|placement|marketing|recommendation|recommended)(_|$)/i.test(keyLower)) {
        return true;
      }
      if (isPromoText(value)) {
        return true;
      }
      if (value && typeof value === 'object' && hasPromoSignal(value, visited)) {
        return true;
      }
    }

    return false;
  }

  function stripPromo(node, visited = new WeakSet()) {
    if (!node || typeof node !== 'object') return node;
    if (visited.has(node)) return node;
    visited.add(node);

    if (Array.isArray(node)) {
      const out = [];
      for (const item of node) {
        if (!item || typeof item !== 'object') {
          out.push(item);
          continue;
        }
        const clean = stripPromo(item, visited);
        if (!hasPromoSignal(clean, new WeakSet())) {
          out.push(clean);
        }
      }
      return out;
    }

    for (const key of Object.keys(node)) {
      const val = node[key];
      const keyLower = String(key).toLowerCase();

      if (/(^|_|-)(promoted|sponsored|admeta|ad_metadata|native_ad|advertisement|campaign|creative|placement|marketing|recommendation|recommended)(_|$)/i.test(keyLower)) {
        delete node[key];
        continue;
      }

      if (val && typeof val === 'object') {
        const clean = stripPromo(val, visited);
        if (hasPromoSignal(clean, new WeakSet())) {
          delete node[key];
        } else {
          node[key] = clean;
        }
        continue;
      }

      if (typeof val === 'string' && isPromoText(val)) {
        delete node[key];
      }
    }

    return node;
  }

  try {
    let obj = JSON.parse(rawBody);

    // 处理 timeline / entries / instructions / modules / item list 等常见结构
    if (obj) {
      obj = stripPromo(obj);
    }

    // 额外精确清理常见广告容器
    const candidatePaths = [
      ['globalObjects', 'tweets'],
      ['timeline', 'instructions'],
      ['data'],
      ['instructions'],
      ['entries'],
      ['modules'],
      ['items']
    ];

    for (const path of candidatePaths) {
      let ref = obj;
      let ok = true;
      for (const p of path) {
        if (!ref || typeof ref !== 'object' || !(p in ref)) {
          ok = false;
          break;
        }
        ref = ref[p];
      }
      if (ok && Array.isArray(ref)) {
        obj = stripPromo(obj);
      }
    }

    if (obj && obj.globalObjects && obj.globalObjects.tweets && typeof obj.globalObjects.tweets === 'object') {
      for (const key of Object.keys(obj.globalObjects.tweets)) {
        const tweet = obj.globalObjects.tweets[key];
        if (hasPromoSignal(tweet)) {
          delete obj.globalObjects.tweets[key];
        }
      }
    }

    if (obj && obj.data && Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item => !hasPromoSignal(item));
    }

    if (obj && obj.instructions && Array.isArray(obj.instructions)) {
      obj.instructions = obj.instructions.filter(item => !hasPromoSignal(item));
    }

    return $done({ body: JSON.stringify(obj) });
  } catch (e) {
    return $done({ body: rawBody });
  }
})();
