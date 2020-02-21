/* https://github.com/fregante/content-scripts-register-polyfill @ v1.0.0 */

(function () {
    'use strict';

    function urlGlobToRegex(matchPattern) {
        return '^' + matchPattern
            .replace(/[.]/g, '\\.')
            .replace(/[?]/, '.')
            .replace(/^[*]:/, 'https?')
            .replace(/^(https[?]?:[/][/])[*]/, '$1[^/:]+')
            .replace(/[/][*]/, '/?.+')
            .replace(/[*]/g, '.+')
            .replace(/[/]/g, '\\/');
    }
    async function p(fn, ...args) {
        return new Promise((resolve, reject) => {
            fn(...args, result => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
    async function isOriginPermitted(url) {
        return p(chrome.permissions.contains, {
            origins: [new URL(url).origin + '/*']
        });
    }
    async function wasPreviouslyLoaded(tabId, loadCheck) {
        const result = await p(chrome.tabs.executeScript, tabId, {
            code: loadCheck,
            runAt: 'document_start'
        });
        return result && result[0];
    }
    if (!chrome.contentScripts) {
        chrome.contentScripts = {
            async register(contentScriptOptions, callback) {
                const { js = [], css = [], allFrames, matchAboutBlank, matches, runAt } = contentScriptOptions;
                const loadCheck = `document[${JSON.stringify(JSON.stringify({ js, css }))}]`;
                const matchesRegex = new RegExp(matches.map(urlGlobToRegex).join('$') + '$');
                const listener = async (tabId, { status }) => {
                    if (status !== 'loading') {
                        return;
                    }
                    const { url } = await p(chrome.tabs.get, tabId);
                    if (!url ||
                        !matchesRegex.test(url) ||
                        !await isOriginPermitted(url) ||
                        await wasPreviouslyLoaded(tabId, loadCheck)
                    ) {
                        return;
                    }
                    for (const file of css) {
                        chrome.tabs.insertCSS(tabId, {
                            ...file,
                            matchAboutBlank,
                            allFrames,
                            runAt: runAt || 'document_start'
                        });
                    }
                    for (const file of js) {
                        chrome.tabs.executeScript(tabId, {
                            ...file,
                            matchAboutBlank,
                            allFrames,
                            runAt
                        });
                    }
                    chrome.tabs.executeScript(tabId, {
                        code: `${loadCheck} = true`,
                        runAt: 'document_start',
                        allFrames
                    });
                };
                chrome.tabs.onUpdated.addListener(listener);
                const registeredContentScript = {
                    async unregister() {
                        return p(chrome.tabs.onUpdated.removeListener.bind(chrome.tabs.onUpdated), listener);
                    }
                };
                if (typeof callback === 'function') {
                    callback(registeredContentScript);
                }
                return Promise.resolve(registeredContentScript);
            }
        };
    }

}());
