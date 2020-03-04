function onMessage(message, sender) {
    if (sender.url.endsWith("popup.html")) {
        console.log("Message from popup script: ");
        console.log(message);
        return Promise.resolve({success: true}); 
    } else {
        console.log("Unknown origin!");
    }
}

browser.runtime.onMessage.addListener(onMessage);