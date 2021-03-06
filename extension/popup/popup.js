console.log("popup.js");

function buttonElementFromEvent(event) {
    return (event.target.tagName === "BUTTON") ? event.target : event.target.parentElement;
}

function updateDomainElements(domain, enabled, moodle) {
    const domainElement = document.querySelector("#state #toggle");
    const settingsElement = document.querySelector("#settings");

    if (moodle === false) {
        domainElement.setAttribute("disabled", "");
    } else {
        domainElement.removeAttribute("disabled");
    }

    domainElement.setAttribute("data-domain", domain);
    domainElement.querySelector(".switch_on").textContent = domain;
    domainElement.querySelector(".switch_off").textContent = domain;
    domainElement.classList.toggle("on", enabled);
    settingsElement.classList.toggle("hidden", !enabled);
}

function optionToggled(event) {
    const element = buttonElementFromEvent(event);
    const on = element.classList.contains("on");
    const option = element.getAttribute("data-module");

    if (option !== null) {
        browser.runtime.sendMessage({
            setModule: {
                module: option,
                value: !on
            }
        }).then(response => {
            element.classList.toggle("on", response);
        },
        error =>{
            console.log(`Something went wrong while trying to toggle ${option}:`);
            console.log(error);
        });
    } else {
        // This shouldn't actually happen, it's here for testing.
        // All options should have the data-module attribute,
        // Otherwise, it might as well be a fidget spinner.
        console.log(`Missing data-module attribute on:`);
        console.log(element);
        element.classList.toggle("on", on);
    }
}

function updateAllOptions() {
    browser.runtime.sendMessage({
        getOptions: true
    }).then(response => {
        Object.keys(response.modules).forEach(key => {
            const moduleElement = document.querySelector(`[data-module="${key}"]`);
            if (moduleElement !== null) {
                moduleElement.classList.toggle("on", response.modules[key]);
            }
        });
        updateDomainElements(response.domain, response.enabled, response.moodle);
    },
    error => {
        console.log(`Something went wrong when updating options:`);
        console.log(error);
    });
}

function domainToggled(event) {
    const element = buttonElementFromEvent(event);
    const domain = element.getAttribute("data-domain");
    const on = element.classList.contains("on");

    browser.permissions.request({origins: ["*://" + domain + "/*"]})
    .then(granted => {
        if (granted === true) {
            browser.runtime.sendMessage({
                setDomain: !on
            }).then(response => {
                updateDomainElements(response.domain, response.enabled, response.moodle);
            },
            error =>{
                console.log(`Something went wrong while trying to toggle domain!`);
                console.log(error);
            });
        } else {
            console.log("Domain permissions were not granted!");
        }
    });
}

function openHelpPage(event) {
    window.open(event.target.href);
}

function localizePopupHTML() {
    document.querySelectorAll("[data-localize]").forEach(element => {
        element.innerHTML = browser.i18n.getMessage(element.getAttribute("data-localize"));
    });
    document.querySelectorAll("[data-localize-title]").forEach(element => {
        element.setAttribute("title", browser.i18n.getMessage(element.getAttribute("data-localize-title")));
    });
    document.querySelectorAll("[data-localize-href]").forEach(element => {
        element.href = browser.i18n.getMessage(element.getAttribute("data-localize-href"));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    localizePopupHTML();
    updateAllOptions();
    document.querySelector("#state #toggle").addEventListener("click", domainToggled);
    document.querySelector("footer #help").addEventListener("click", openHelpPage);
    document.querySelectorAll("#settings>button").forEach(element => {
        element.addEventListener("click", optionToggled);
    });
});