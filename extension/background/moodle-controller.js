// List of all modules and whether their default state.
const cache = {};
const modules = Object.freeze(
                {"singlePageBooks": true,
                 "singlePageDicts": true,
                 "midClickFix": true,
                 "popupBlocker": true,
                 "sessionKeepAlive": true});

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

function getDomainFromURL(url) {
    return (new URL(url)).hostname;
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
    return new Promise();
}

function messageGetCurrentDomainOptions(currentDomainOptions) {
    return new Promise(resolve => {
        if (isModulesCurrent(currentDomainOptions.modules)) {
            resolve(currentDomainOptions);
        } else {
            const updatedOptions = updateModulesInOptions(currentDomainOptions);
            setDomainOptions(updatedOptions)
            .then(() => {
                resolve(updatedOptions);
            });
        }
    });
}

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
            getCurrentDomain()
            .then(domain => {
                const newDomainOptions = getDefaultOptions(domain);
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