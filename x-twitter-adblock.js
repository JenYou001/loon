(() => {
  const rawBody = $response && $response.body;
  if (!rawBody) {
    return $done({});
  }

  function hasPromoMarker(value) {
    if (!value || typeof value !== 'object') return false;

    const stack = [value];
    const seen = new WeakSet();

    while (stack.length) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') continue;
      if (seen.has(current)) continue;
      seen.add(current);

      if (Array.isArray(current)) {
        for (const item of current) stack.push(item);
        continue;
      }

      for (const [key, val] of Object.entries(current)) {
        const keyLower = String(key).toLowerCase();
        if (/(^|_|-)(promoted|sponsored|admeta|ad_metadata|native_ad|advertisement|marketing|campaign|placement|creative)/i.test(keyLower)) {
          return true;
        }
        if (typeof val === 'string' && /(promoted|sponsored|admeta|ad_metadata|native_ad|advertisement|marketing|campaign|placement|creative)/i.test(val)) {
          return true;
        }
        if (val && typeof val === 'object') stack.push(val);
      }
    }

    return false;
  }

  function filterNode(node) {
    if (!node || typeof node !== 'object') return node;

    if (Array.isArray(node)) {
      const out = [];
      for (const item of node) {
        const clean = filterNode(item);
        if (clean !== undefined && clean !== null && !hasPromoMarker(clean)) {
          out.push(clean);
        }
      }
      return out;
    }

    for (const key of Object.keys(node)) {
      const keyLower = String(key).toLowerCase();
      const val = node[key];

      if (/(^|_|-)(promoted|sponsored|admeta|ad_metadata|native_ad|advertisement|marketing|campaign|placement|creative)/i.test(keyLower)) {
        delete node[key];
        continue;
      }

      if (val && typeof val === 'object') {
        const cleaned = filterNode(val);
        if (hasPromoMarker(cleaned)) {
          delete node[key];
          continue;
        }
        node[key] = cleaned;
      }
    }

    return node;
  }

  try {
    let obj = JSON.parse(rawBody);

    if (obj && obj.timeline && obj.timeline.instructions) {
      obj.timeline.instructions = filterNode(obj.timeline.instructions);
    }

    if (obj && obj.globalObjects && obj.globalObjects.tweets && typeof obj.globalObjects.tweets === 'object') {
      for (const key of Object.keys(obj.globalObjects.tweets)) {
        const tweet = obj.globalObjects.tweets[key];
        if (hasPromoMarker(tweet)) {
          delete obj.globalObjects.tweets[key];
        }
      }
    }

    if (obj && Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item => !hasPromoMarker(item));
    }

    if (obj && Array.isArray(obj.instructions)) {
      obj.instructions = filterNode(obj.instructions);
    }

    return $done({ body: JSON.stringify(obj) });
  } catch (e) {
    return $done({ body: rawBody });
  }
})();
