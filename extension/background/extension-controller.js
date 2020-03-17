console.log("extension-controller.js");

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
                registerContentScriptForDomain(items[key].domain)
                .catch(error => {
                    console.log(`Could not restart content script for ${items[key].domain}: `);
                    console.log(error);
                });
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

function hasDomainPermissions(domain) {
    return browser.permissions.contains({origins: ["*://" + domain + "/*"]});
}

function registerContentScriptForDomain(domain) {
    return new Promise(resolve => {
        if (!registered_domains.includes(domain))
        {
            browser.contentScripts.register({
                "js": [{file: "libs/browser-polyfill.js"},
                       {file: "content/module-loader.js"}],
                "matches": ["https://" + domain + "/*"]
            })
            .then(() =>
            browser.contentScripts.register({
                "js": [{file: "libs/browser-polyfill.js"},
                       {file: "content/module-loader.js"}],
                "matches": ["http://" + domain + "/*"]
            }))
            .then(() => {
                registered_domains.push(domain);
                return resolve();
            });
        } else {
            return resolve();
        }
    });
}

function moodleCheck(domainOptions) {
    return new Promise(resolve => {
        if (domainOptions.moodle === null) {
            isMoodleDomain(domainOptions.domain)
            .then(isMoodle => {
                domainOptions.moodle = isMoodle;
                setDomainOptions(domainOptions)
                .then(() => {
                    resolve(domainOptions);
                });
            });
        } else {
            resolve(domainOptions);
        }
    });
}

function unsafeSetDomain(domainOptions, enabled) {
    return new Promise(resolve => {
        domainOptions.enabled = enabled;
        setDomainOptions(domainOptions)
        .then(() => {
            if (domainOptions.enabled === true) {
                registerContentScriptForDomain(domainOptions.domain)
                .then(() => resolve(domainOptions));
            } else {
                return resolve(domainOptions);
            }
        });
    });
}

function setDomain(domainOptions, enabled) {
    return new Promise((resolve, reject) => {
        hasDomainPermissions(domainOptions.domain)
        .then(hasPerms => {
            if (hasPerms === false) {
                reject("insufficient_permissions");
            }

            moodleCheck(domainOptions)
            .then(domainOptions => {
                if ((enabled === true && domainOptions.moodle === true) ||
                    enabled === false) {
                    unsafeSetDomain(domainOptions, enabled)
                    .then(domainOptions => resolve(domainOptions));
                } else {
                    resolve(domainOptions);
                }
            });
        });
    });
}

// Message response handlers

function messageSetModule(domainOptions, setModule) {
    return new Promise((resolve, reject) => {
        if (setModule.module in modules) {
            domainOptions.modules[setModule.module] = setModule.value;
            setDomainOptions(domainOptions).then(() => resolve(setModule.value));
        } else {
            reject("unknown_module");
        }
    });
}

function messageSetDomain(domainOptions, enabled) {
    return setDomain(domainOptions, enabled);
}

function messageGetOptions(domainOptions) {
    if (isModulesCurrent(domainOptions.modules)) {
        return domainOptions;
    }

    const updatedOptions = updateModulesInOptions(domainOptions);
    return setDomainOptions(updatedOptions).then(() => updatedOptions);
}


// Eventing

function onMessage(message) {
    return getCurrentDomainOptions()
    .then(options => {
        switch (true) {
            case ("setModule" in message):
                return messageSetModule(options, message.setModule);

            case ("setDomain" in message):
                return messageSetDomain(options, message.setDomain);

            case ("getOptions" in message):
                return messageGetOptions(options);

            default:
                return Promise.reject("invalid_message");
        }
    })
    .catch(error => {
        if (error !== "not_found" || !("getOptions" in message)) {
            console.log("Unexpected rejection in onMessage: ");
            console.log(error);
            return Promise.reject(error);
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