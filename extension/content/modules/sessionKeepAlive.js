console.log("sessionKeepAlive.js");

const keepAliveDelay = 10 * 60 * 1000; // 10 minutes * 60 seconds * 1000 milliseconds
const keepAliveOn = true;

const targetURL = window.location.origin;
if (targetURL) {
    keepAlive(targetURL);
}

function timeout(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function keepAlive(url) {
    while (keepAliveOn) {
        await timeout(keepAliveDelay);
        console.log(`Sending a request to ${targetURL} to keep the session alive.`);
        await fetch(url, {credentials: "same-origin"});
    }
}