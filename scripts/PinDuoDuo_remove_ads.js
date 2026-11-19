// Adapted from zijinan/star-loon; original plugin credits ZenmoFeiShi and 可莉🅥.
// Source plugin: https://github.com/zijinan/star-loon/blob/108cf618ed29468f30dfc708da06bb0704eacc80/lpx/PinDuoDuo_remove_ads.lpx
// This script's upstream reference noted by the source: https://raw.githubusercontent.com/RuCu6/Loon/refs/heads/main/Scripts/pdd.js
// Original mirrored resource: https://github.com/zijinan/star-loon/blob/108cf618ed29468f30dfc708da06bb0704eacc80/scripts/kelee.one/Resource/JavaScript/PinDuoDuo/PinDuoDuo_remove_ads.js

const url = $request.url;
if (!$response.body) $done({});
let obj = JSON.parse($response.body);

if (url.includes("/api/alexa/homepage/hub")) {
  // Bottom navigation tabs
  if (obj?.result) {
    if (obj?.result?.bottom_tabs?.length > 0) {
      obj.result.bottom_tabs = obj.result.bottom_tabs.filter((i) => /(?:chat_list|index|personal)/.test(i?.link));
    }
    if (obj?.result?.buffer_bottom_tabs?.length > 0) {
      obj.result.buffer_bottom_tabs = obj.result.buffer_bottom_tabs.filter((i) => /(?:chat_list|index|personal)/.test(i?.link));
    }
    if (obj?.result?.dy_module?.irregular_banner_dy) {
      delete obj.result.dy_module.irregular_banner_dy;
    }
    // Keep icon_set intact; it may contain useful app shortcuts.
    if (obj?.result?.search_bar_hot_query) {
      delete obj.result.search_bar_hot_query;
    }
    if (obj?.result?.top_skin) {
      delete obj.result.top_skin;
    }
  }
}

$done({ body: JSON.stringify(obj) });
