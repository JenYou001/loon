(() => {
  const rawBody = $response && $response.body;
  if (!rawBody) {
    return $done({});
  }

  function isPromotedLike(value) {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const s = JSON.stringify(value);
    return /promoted|sponsored|admetadata|promoted_metadata|promoted_content|promotedTweet|native_ad|advertisement/i.test(s);
  }

  function stripPromoted(node) {
    if (!node || typeof node !== 'object') {
      return node;
    }

    if (Array.isArray(node)) {
      const result = [];
      for (const item of node) {
        if (isPromotedLike(item)) {
          continue;
        }
        const cleaned = stripPromoted(item);
        if (cleaned !== undefined) {
          result.push(cleaned);
        }
      }
      return result;
    }

    for (const key of Object.keys(node)) {
      const val = node[key];
      const keyLower = String(key).toLowerCase();

      if (/promoted|sponsored|admetadata|advertisement|native_ad/.test(keyLower)) {
        delete node[key];
        continue;
      }

      if (val && typeof val === 'object') {
        if (isPromotedLike(val)) {
          delete node[key];
          continue;
        }
        node[key] = stripPromoted(val);
      }
    }

    return node;
  }

  try {
    let obj = JSON.parse(rawBody);

    obj = stripPromoted(obj);

    if (obj && obj.globalObjects && obj.globalObjects.tweets && typeof obj.globalObjects.tweets === 'object') {
      for (const key of Object.keys(obj.globalObjects.tweets)) {
        const tweet = obj.globalObjects.tweets[key];
        if (isPromotedLike(tweet)) {
          delete obj.globalObjects.tweets[key];
        }
      }
    }

    if (obj && obj.timeline && obj.timeline.instructions) {
      obj.timeline.instructions = stripPromoted(obj.timeline.instructions);
    }

    if (obj && obj.data && Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item => !isPromotedLike(item));
    }

    return $done({ body: JSON.stringify(obj) });
  } catch (e) {
    return $done({ body: rawBody });
  }
})();
