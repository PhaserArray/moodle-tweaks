console.log("moodle-loader.js");

browser.runtime.sendMessage({
    getOptions: true
})
.then(options => {
    if (options.enabled === true && options.moodle === true) {
        // Load enabled modules for options.modules
        Object.keys(options.modules).forEach(module => {
            if (options.modules[module] === true) {
                const moduleElement = document.createElement("script");
                moduleElement.src = browser.runtime.getURL(`content/modules/${module}.js`);
                (document.head || document.defaultView).appendChild(moduleElement);
            }
        });
    }
});