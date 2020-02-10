browser.runtime.onInstalled.addListener(function(){
    console.log("WIP plugin did something, yay!")
})

browser.browserAction.onClicked.addListener(function(tab){
    browser.tabs.executeScript({code: "console.log('Executed content script from click!')"});
});