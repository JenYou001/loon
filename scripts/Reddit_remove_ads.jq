# Adapted from zijinan/star-loon, originally sourced from kelee.one.
# Source plugin: https://github.com/zijinan/star-loon/blob/108cf618ed29468f30dfc708da06bb0704eacc80/lpx/Reddit_remove_ads.lpx
# Original resource: https://github.com/zijinan/star-loon/blob/108cf618ed29468f30dfc708da06bb0704eacc80/scripts/kelee.one/Resource/JQLang/Reddit/Reddit_remove_ads.jq
# Original author of plugin: xream (https://github.com/xream)
walk(
  if type == "object" then
    # Set NSFW-related fields to avoid repeated confirmation prompts.
    (if .isNsfw == true then .isNsfw = false else . end)
    | (if .isNsfwMediaBlocked == true then .isNsfwMediaBlocked = false else . end)
    | (if .isNsfwContentShown == false then .isNsfwContentShown = true else . end)
    # Empty commentsPageAds array.
    | (if (.commentsPageAds | type == "array") then (.commentsPageAds = []) else . end)
    # Filter ad-related data.
    | (if ((.node | type == "object") and (.node.cells | type == "array") and (.node.cells | any(.__typename? == "AdMetadataCell" or .isAdPost? == true))) then empty else . end)
    | (if (.node | type == "object") and (.node.adPayload | type == "object") then empty else . end)
    | (if .__typename == "AdPost" then empty else . end)
  else .
  end)
