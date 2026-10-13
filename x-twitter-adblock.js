(() => {
  const rawBody = $response && $response.body;
  if (!rawBody) {
    return $done({});
  }

  const AD_WORDS = [
    'promoted', 'sponsored', 'advertiser', 'native_ad', 'admetadata', 'ad_metadata',
    'advertisement', 'campaign', 'creative', 'placement', 'marketing', 'recommended',
    'recommendation', 'who_to_follow', 'who to follow', 'suggested', 'profile_card',
    'promotedtweet', 'promoted-tweet', 'promoted_content', 'promotedmetadata'
  ];

  function lowerText(v) {
    return typeof v === 'string' ? v.toLowerCase() : '';
  }

  function hasAdMarker(node, seen = new WeakSet()) {
    if (!node || typeof node !== 'object') return false;
    if (seen.has(node)) return false;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        if (hasAdMarker(item, seen)) return true;
      }
      return false;
    }

    for (const [key, value] of Object.entries(node)) {
      const k = lowerText(key);
      if (AD_WORDS.some(w => k.includes(w))) return true;
      if (typeof value === 'string' && AD_WORDS.some(w => lowerText(value).includes(w))) return true;
      if (value && typeof value === 'object' && hasAdMarker(value, seen)) return true;
    }

    return false;
  }

  function isPromotedEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;

    const entryId = lowerText(entry.entryId || entry.id || entry.entry_id || entry.name);
    if (entryId && /(promoted|sponsored|ad|advertisement|native_ad|campaign|creative)/.test(entryId)) {
      return true;
    }

    const direct = entry.promotedMetadata || entry.promoted_metadata || entry.native_ad || entry.adMetadata || entry.ad_metadata;
    if (direct) return true;

    const content = entry.content || entry.itemContent || entry.item_content || {};
    if (content.promotedMetadata || content.promoted_metadata || content.native_ad || content.adMetadata || content.ad_metadata) {
      return true;
    }

    if (Array.isArray(content.items)) {
      for (const item of content.items) {
        if (isPromotedEntry(item)) return true;
      }
    }

    const item = entry.item || {};
    const itemContent = item.itemContent || item.item_content || {};
    if (itemContent.promotedMetadata || itemContent.promoted_metadata || itemContent.native_ad || itemContent.adMetadata || itemContent.ad_metadata) {
      return true;
    }

    return hasAdMarker(entry);
  }

  function pruneArray(arr) {
    if (!Array.isArray(arr)) return arr;
    const out = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') {
        out.push(item);
        continue;
      }
      if (isPromotedEntry(item) || hasAdMarker(item)) {
        continue;
      }
      const cleaned = pruneObject(item);
      if (cleaned && Object.keys(cleaned).length > 0) {
        out.push(cleaned);
      }
    }
    return out;
  }

  function pruneObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) return pruneArray(obj);

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const k = String(key).toLowerCase();

      if (AD_WORDS.some(w => k.includes(w))) {
        delete obj[key];
        continue;
      }

      if (val && typeof val === 'object') {
        const cleaned = pruneObject(val);
        if (Array.isArray(cleaned)) {
          if (cleaned.length === 0) {
            delete obj[key];
          } else {
            obj[key] = cleaned;
          }
        } else if (cleaned && typeof cleaned === 'object') {
          if (isPromotedEntry(cleaned) || hasAdMarker(cleaned)) {
            delete obj[key];
          } else {
            obj[key] = cleaned;
          }
        } else {
          obj[key] = cleaned;
        }
      }
    }

    // 特别处理: 当前对象自身就是广告条目时，返回 null 让上层数组过滤掉
    if (isPromotedEntry(obj)) {
      return null;
    }

    return obj;
  }

  function deepFilterHomeTimeline(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    // 处理首页 timeline
    if (obj.data && obj.data.home && obj.data.home.home_timeline_urt) {
      const instructions = obj.data.home.home_timeline_urt.instructions;
      if (Array.isArray(instructions)) {
        obj.data.home.home_timeline_urt.instructions = instructions
          .map(instr => {
            if (!instr || typeof instr !== 'object') return instr;
            if (Array.isArray(instr.entries)) {
              instr.entries = instr.entries.filter(entry => !isPromotedEntry(entry));
            }
            if (instr.content && Array.isArray(instr.content.items)) {
              instr.content.items = instr.content.items.filter(item => !isPromotedEntry(item));
            }
            return instr;
          })
          .filter(instr => instr && !isPromotedEntry(instr));
      }
    }

    // 处理通用 timeline / items / instructions / entries 结构
    if (Array.isArray(obj.instructions)) {
      obj.instructions = obj.instructions.filter(instr => !isPromotedEntry(instr));
    }

    if (Array.isArray(obj.entries)) {
      obj.entries = obj.entries.filter(entry => !isPromotedEntry(entry));
    }

    if (Array.isArray(obj.items)) {
      obj.items = obj.items.filter(item => !isPromotedEntry(item));
    }

    if (Array.isArray(obj.modules)) {
      obj.modules = obj.modules.filter(module => !isPromotedEntry(module));
    }

    if (Array.isArray(obj.cards)) {
      obj.cards = obj.cards.filter(card => !isPromotedEntry(card));
    }

    if (obj.globalObjects && obj.globalObjects.tweets && typeof obj.globalObjects.tweets === 'object') {
      for (const key of Object.keys(obj.globalObjects.tweets)) {
        if (isPromotedEntry(obj.globalObjects.tweets[key])) delete obj.globalObjects.tweets[key];
      }
    }

    return obj;
  }

  try {
    let obj = JSON.parse(rawBody);
    obj = deepFilterHomeTimeline(obj);
    obj = pruneObject(obj);

    // 再做一次强过滤：直接删掉所有明显广告节点
    if (obj && obj.data && Array.isArray(obj.data)) {
      obj.data = obj.data.filter(item => !isPromotedEntry(item));
    }

    return $done({ body: JSON.stringify(obj) });
  } catch (e) {
    return $done({ body: rawBody });
  }
})();
