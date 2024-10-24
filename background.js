chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.sendMessage(tab.id, {action: "toggleEditor"});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "showNotification") {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'path/to/icon.png',
      title: '微信文章编辑器',
      message: request.message
    });
  }
});
