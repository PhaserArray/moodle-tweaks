// List of all modules and whether their default state.
const modules = Object.freeze(
                {"singlePageBooks": true, 
                 "singlePageDicts": true, 
                 "midClickFix": true, 
                 "popupBlocker": true, 
                 "sessionKeepAlive": true});

// storage_sync_structure = {
//     prefs: {
//         "example.com": {
//             domain: "example.com"
//             moodle: true, 
//             enabled: false,
//             modules: {
//                 list: true,
//                 of: false,
//                 modules: true
//             }
//         },
//         "school.moodledemo.net": {
//             domain: "school.moodledemo.net"
//             moodle: false, 
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

function getDomainOptions(domain) {
    return new Promise((resolve, reject) => {
        browser.storage.local.get(domain)
        .then(result => {
            if (Object.entries(result).length === 0) {
                return reject("not_found");
            }
            return resolve(result[domain]);
        });
    });
}

function getCurrentTab() {
    return new Promise(resolve => {
        browser.tabs.query({active: true, currentWindow: true})
        .then(tabs => {
            return resolve(tabs[0]);
        });
    });
}

function getHostnameFromURL(url) {
    return (new URL(url)).hostname;
}

function getCurrentDomain() {
    return new Promise(resolve => {
        getCurrentTab().then(tab => {
            resolve(getHostnameFromURL(tab.url));
        });
    });
}

function getCurrentDomainOptions() {
    return new Promise((resolve, reject) => {
        getCurrentDomain()
        .then(domain => {
            resolve(getDomainOptions(domain));
        })
        .catch(error => {
            reject(error);
        });
    });
}

function setDomainOptions(domainOptions) {
    return browser.storage.local.set({[domainOptions.domain]: domainOptions});
}

function isModulesCurrent(domainModules) {
    let oldModuleKeys = Object.keys(domainModules).sort();
    let newModuleKeys = Object.keys(modules).sort();
    return JSON.stringify(oldModuleKeys) === JSON.stringify(newModuleKeys);
}

function updateModulesInOptions(options) {
    let updatedModules = Object.assign({}, modules, options.modules);
    options.modules = updatedModules;
    return options;
}

function getDefaultOptions(domain) {
    return {
        domain: domain,
        enabled: false,
        moodle: null,
        modules: {"singlePageBooks": false}
    };
}

function messageSetModule(currentDomainOptions) {
    return new Promise();
}

function messageSetCurrentDomain(currentDomainOptions) {
    return new Promise();
}

function messageGetCurrentDomainOptions(currentDomainOptions) {
    return new Promise(resolve => {
        if (isModulesCurrent(currentDomainOptions.modules)) {
            resolve({success: true, options:currentDomainOptions});
        } else {
            let updatedOptions = updateModulesInOptions(currentDomainOptions);
            setDomainOptions(updatedOptions)
            .then(() => {
                resolve({success: true, options:updatedOptions});
            });
        }
    });
}

function onMessage(message) {
    return getCurrentDomainOptions()
    .then(options => {
        switch (true) {
            case ("setModule" in message):
                return messageSetModule(options);

            case ("setCurrentDomain" in message):
                return messageSetCurrentDomain(options);

            case ("getCurrentDomainOptions" in message):
                return messageGetCurrentDomainOptions(options);
        
            default:
                return Promise.resolve({success:false, reason:"No valid message!"});
        }
    })
    .catch(error => {
        if (error !== "not_found") {
            console.log("Unknown rejection when trying to process message: ");
            console.log(error);
            return Promise.resolve({success:false, reason:"Unknown reject!"});
        }
        return new Promise(resolve => {
            getCurrentDomain()
            .then(domain => {
                console.log(domain);
                let newDomainOptions = getDefaultOptions(domain);
                setDomainOptions(newDomainOptions)
                .then(() => {
                    resolve(newDomainOptions);
                })
                .catch(error => {
                    console.log("Failed to save new domain options: ");
                    console.log(error);
                    return Promise.resolve({success:false, reason:"Unable to save!"});
                });
            });
        });
    });
}

browser.runtime.onMessage.addListener(onMessage);