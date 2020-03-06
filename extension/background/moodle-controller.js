modules = ["singlePageBooks", "singlePageDicts", "midClickFix", "popupBlocker", "sessionKeepAlive"];

// storage_sync_structure = {
//     prefs: {
//         "example.com": {
//             enabled: false,
//             modules: {
//                 list: true,
//                 of: false,
//                 modules: true
//             }
//         },
//         "school.moodledemo.net": {
//             enabled: true,
//             modules: {
//                 potentially: true,
//                 incomplete: true,
//                 list: true,
//                 of: false,
//                 modules: true
//             }
//         }
//     }
// };

function onMessage(message, sender) {
    if (typeof message === undefined) {
        console.log("Received message with no actual message!");
    }
    if ("setModule" in message) {
        // toggle module for current domain and respond
    }
    if ("setCurrentDomain" in message) {
        // toggle module for current domain and respond
    }
}

browser.runtime.onMessage.addListener(onMessage);