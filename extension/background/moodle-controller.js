// List of all modules and whether their default state.
const modules = Object.freeze(
                {"singlePageBooks": true,
                 "singlePageDicts": true,
                 "midClickFix": true,
                 "popupBlocker": true,
                 "sessionKeepAlive": true});



const cache = {};
const registered_domains = [];

// Reregisters all domains on first background load:
browser.storage.local.get()
.then(items => {
    Object.assign(cache, items);
    Object.keys(items).forEach(key => {
        if (items[key].enabled === true &&
            items[key].moodle === true) {
                registerContentScriptForDomain(items[key].domain);
        }
    });
});

// storage_structure = {
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


// Synchronous functions

function getDomainPermission(domain) {
    return {origins: ["*://" + domain + "/*"]};
}

function getDomainFromURL(url) {
    return (new URL(url)).hostname;
}

function setDomainOptions(domainOptions) {
    cache[domainOptions.domain] = domainOptions;
    return browser.storage.local.set({[domainOptions.domain]: domainOptions});
}

function isModulesCurrent(domainModules) {
    const oldModuleKeys = Object.keys(domainModules).sort();
    const newModuleKeys = Object.keys(modules).sort();
    return JSON.stringify(oldModuleKeys) === JSON.stringify(newModuleKeys);
}

function updateModulesInOptions(options) {
    const updatedModules = Object.assign({}, modules, options.modules);
    options.modules = updatedModules;
    return options;
}

function getDefaultOptions(domain) {
    return {
        domain: domain,
        enabled: false,
        moodle: null,
        modules: Object.assign({}, modules)
    };
}


// Asynchronous functions

function getDomainOptions(domain) {
    if (domain in cache) return cache[domain];

    return new Promise((resolve, reject) => {
        browser.storage.local.get(domain)
        .then(results => {
            if (Object.entries(results).length === 0) {
                return reject("not_found");
            }
            const result = results[domain];
            cache[domain] = result;
            return resolve(result);
        });
    });
}

async function getCurrentTab() {
    const matching_tabs = await browser.tabs.query({active: true, currentWindow: true});
    return matching_tabs[0];
}

async function getCurrentURL() {
    const tab = await getCurrentTab();
    return tab.url;
}

async function getCurrentDomain() {
    const url = await getCurrentURL();
    return getDomainFromURL(url);
}

async function getCurrentDomainOptions() {
    const domain = await getCurrentDomain();
    return getDomainOptions(domain);
}

function isMoodle(url) {
    return new Promise(resolve => {
        fetch(url, {credentials: "same-origin"})
        .then(response => response.text())
        .then(text => {resolve(text.split("\n")[3].startsWith("=== 3"));})
        .catch(() => {resolve(false);});
    });
}

function isMoodleDomain(domain) {
    return new Promise(resolve => {
        isMoodle("https://" + domain + "/lib/upgrade.txt")
        .then(() => resolve(isMoodle("http://" + domain + "/lib/upgrade.txt")));
    });
}

function hasPermissions(permissions) {
    return browser.permissions.contains(permissions);
}

function requestPermissions(permissions) {
    return browser.permissions.request(permissions);
}

function registerContentScriptForDomain(domain) {
    return new Promise(resolve => {
        browser.contentScripts.register({
            "js": [{file: "content/module-loader.js"}],
            "matches": ["https://" + domain + "/*"]
        })
        .then(() =>
        browser.contentScripts.register({
            "js": [{file: "content/module-loader.js"}],
            "matches": ["http://" + domain + "/*"]
        }))
        .then(() => {
            registered_domains.push(domain);
            return resolve();
        });
    });
}

// Message response handlers

function messageSetModule(currentDomainOptions, setModule) {
    return new Promise((resolve, reject) => {
        if (setModule.module in modules) {
            currentDomainOptions.modules[setModule.module] = setModule.value;
            setDomainOptions(currentDomainOptions).then(() => resolve(setModule.value));
        } else {
            reject("unknown_module");
        }
    });
}

function messageSetCurrentDomain(currentDomainOptions, setCurrentDomain) {
    return new Promise((resolve, reject) => {
        hasPermissions(getDomainPermission(currentDomainOptions.domain))
        .then(result => {
            if (result === false) {
                requestPermissions(getDomainPermission(currentDomainOptions.domain))
                .then(granted => {
                    if (granted === false) {
                        reject("not_granted");
                    }
                    resolve(messageSetCurrentDomain(currentDomainOptions, setCurrentDomain));
                });
            } else {
                if (currentDomainOptions.moodle === null) {
                    isMoodleDomain(currentDomainOptions.domain)
                    .then(isMoodle => {
                        currentDomainOptions.moodle = isMoodle;
                        setDomainOptions(currentDomainOptions).then(() => resolve(messageSetCurrentDomain(currentDomainOptions, setCurrentDomain)));
                    });
                } else if (currentDomainOptions.moodle === false) {
                    resolve({domain: currentDomainOptions.domain,
                             enabled: currentDomainOptions.enabled,
                             moodle:currentDomainOptions.moodle});
                } else {
                    if (!registered_domains.includes(currentDomainOptions.domain)) {
                        return registerContentScriptForDomain(currentDomainOptions.domain)
                        .then(() => {
                            resolve(messageSetCurrentDomain(currentDomainOptions, setCurrentDomain));
                        });
                    } else {
                        currentDomainOptions.enabled = setCurrentDomain;
                        setDomainOptions(currentDomainOptions).then(() => resolve({domain: currentDomainOptions.domain,
                                                                                   enabled: currentDomainOptions.enabled,
                                                                                   moodle: currentDomainOptions.moodle}));
                    }
                }
            }
        });
    });
}

function messageGetCurrentDomainOptions(currentDomainOptions) {
    if (isModulesCurrent(currentDomainOptions.modules)) {
        return currentDomainOptions;
    }
    const updatedOptions = updateModulesInOptions(currentDomainOptions);
    return setDomainOptions(updatedOptions).then(() => updatedOptions);
}


// Eventing

function onMessage(message) {
    return getCurrentDomainOptions()
    .then(options => {
        switch (true) {
            case ("setModule" in message):
                return messageSetModule(options, message.setModule);

            case ("setCurrentDomain" in message):
                return messageSetCurrentDomain(options, message.setCurrentDomain);

            case ("getCurrentDomainOptions" in message):
                return messageGetCurrentDomainOptions(options);

            default:
                return Promise.reject("invalid_message");
        }
    })
    .catch(error => {
        if (error !== "not_found") {
            console.log("Unexpected rejection when trying to get getCurrentDomainOptions: ");
            console.log(error);
            return Promise.reject("unexpected_error_getCurrentDomainOptions");
        }
        return new Promise(resolve => {
            getCurrentURL()
            .then(url => {
                if (!url.startsWith("http")) {
                    return resolve({domain: browser.i18n.getMessage("invalidProtocol"), enabled: false, moodle: false, modules: {}});
                }
                const newDomainOptions = getDefaultOptions(getDomainFromURL(url));
                setDomainOptions(newDomainOptions)
                .then(() => {
                    resolve(newDomainOptions);
                })
                .catch(sError => {
                    console.log("Failed to save new domain options: ");
                    console.log(sError);
                    return Promise.reject("new_options_not_saved");
                });
            });
        });
    });
}

browser.runtime.onMessage.addListener(onMessage);