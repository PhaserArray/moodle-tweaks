browser.runtime.onInstalled.addListener(async function(){
    console.log("WIP plugin did something, yay!");
    // const registeredScript = await browser.contentScripts.register({
    //     js: [{
    //         file: 'content/moodle-tweaker.js'
    //     }],
    //     matches: [
    //         'https://*/*'
    //     ]
    // });
});

browser.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log(tabId);
    console.log(changeInfo);
    console.log(tab);
    $.get(tab.url.match(/^https?:\/\/[^/]+/)[0] + "/lib/upgrade.txt", function(data){
        console.log(data);
    });
    browser.tabs.executeScript(tabId, {
        code: "console.log('test')"
    });
});