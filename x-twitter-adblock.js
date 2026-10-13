(() => {
  const rawBody = $response && $response.body;
  if (!rawBody) {
    return $done({});
  }

  const AD_KEYS = [
    'promoted', 'sponsored', 'native_ad', 'admetadata', 'ad_metadata',
    'advertisement', 'advertiser', 'campaign', 'creative', 'placement',
    'promotedmetadata', 'promoted_content', 'recommendedforyou', 'recommendation',
    'whoToFollow', 'who_to_follow', 'injected', 'marketing'
  ];

  function isAdText(value) {
    if (typeof value !== 'string') return false;
    const text = value.toLowerCase();
    return AD_KEYS.some(k => text.includes(k.toLowerCase()));
  }

  function hasAdMarker(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        if (hasAdMarker(item, seen)) return true;
      }
      return false;
    }

    for (const [key, inner] of Object.entries(value)) {
      const keyLower = String(key).toLowerCase();
      if (AD_KEYS.some(k => keyLower.includes(k))) {
        return true;
      }
      if (typeof inner === 'string' && isAdText(inner)) {
        return true;
      }
      if (inner && typeof inner === 'object' && hasAdMarker(inner, seen)) {
        return true;
      }
    }

    return false;
  }

  function stripAdNodes(node, seen = new WeakSet()) {
    if (!node || typeof node !== 'object') return node;
    if (seen.has(node)) return node;
    seen.add(node);

    if (Array.isArray(node)) {
      const out = [];
      for (const item of node) {
        if (item && typeof item === 'object') {
          const cleaned = stripAdNodes(item, seen);
          if (!hasAdMarker(cleaned, new WeakSet())) out.push(cleaned);
        } else {
          out.push(item);
        }
      }
      return out;
    }

    for (const key of Object.keys(node)) {
      const val = node[key];
      const keyLower = String(key).toLowerCase();

      if (AD_KEYS.some(k => keyLower.includes(k))) {
        delete node[key];
        continue;
      }

      if (typeof val === 'string' && isAdText(val)) {
        delete node[key];
        continue;
      }

      if (val && typeof val === 'object') {
        const cleaned = stripAdNodes(val, seen);
        if (hasAdMarker(cleaned, new WeakSet())) {
          delete node[key];
        } else {
          node[key] = cleaned;
        }
      }
    }

    return node;
  }

  try {
    let obj = JSON.parse(rawBody);

    obj = stripAdNodes(obj);

    // 处理常见深层广告容器
    const deepCandidates = ['entries', 'items', 'modules', 'cards', 'media', 'content', 'timeline', 'instructions', 'data'];
    const removeDeepAds = (node) => {
      if (!node || typeof node !== 'object') return node;
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          node[i] = removeDeepAds(node[i]);
          if (node[i] && typeof node[i] === 'object' && hasAdMarker(node[i], new WeakSet())) {
            node.splice(i, 1);
            i--;
          }
        }
        return node;
      }
      for (const key of Object.keys(node)) {
        const v = node[key];
        if (deepCandidates.includes(key.toLowerCase()) || key.toLowerCase().includes('entry') || key.toLowerCase().includes('item') || key.toLowerCase().includes('module') || key.toLowerCase().includes('card') || key.toLowerCase().includes('media')) {
          if (v && typeof v === 'object') {
            node[key] = removeDeepAds(v);
            if (Array.isArray(node[key])) {
              node[key] = node[key].filter(item => !hasAdMarker(item, new WeakSet()));
            }
          }
        }
      }
      return node;
    };

    obj = removeDeepAds(obj);

    if (obj && obj.globalObjects && obj.globalObjects.tweets && typeof obj.globalObjects.tweets === 'object') {
      for (const key of Object.keys(obj.globalObjects.tweets)) {
        const tweet = obj.globalObjects.tweets[key];
        if (hasAdMarker(tweet, new WeakSet())) delete obj.globalObjects.tweets[key];
      }
    }

    if (obj && obj.data && Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item => !hasAdMarker(item, new WeakSet()));
    }

    if (obj && obj.instructions && Array.isArray(obj.instructions)) {
      obj.instructions = obj.instructions.filter(item => !hasAdMarker(item, new WeakSet()));
    }

    return $done({ body: JSON.stringify(obj) });
  } catch (e) {
    return $done({ body: rawBody });
  }
})();
