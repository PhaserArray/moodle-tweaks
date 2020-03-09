console.log("Popup script!");

function buttonElementFromEvent(event) {
    return (event.target.tagName === "BUTTON") ? event.target : event.target.parentElement;
}

function updateDomainElements(domain, enabled, moodle) {
    let domainElement = document.querySelector("#state #toggle");
    let settingsElement = document.querySelector("#settings");

    if (moodle === false) {
        domainElement.setAttribute("disabled", "");
    } else {
        domainElement.removeAttribute("disabled");
    }
    domainElement.textContent = domain;
    domainElement.classList.toggle("on", enabled);
    settingsElement.classList.toggle("hidden", !enabled);
}

function optionToggled(event) {
    let element = buttonElementFromEvent(event);
    let on = element.classList.contains("on");
    let option = element.getAttribute("data-module");

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
        getCurrentDomainOptions: true
    }).then(response => {
        Object.keys(response.modules).forEach(key => {
            let moduleElement = document.querySelector(`[data-module="${key}"]`);
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
    let element = buttonElementFromEvent(event);
    let on = element.classList.contains("on");

    browser.runtime.sendMessage({
        setCurrentDomain: !on
    }).then(response => {
        updateDomainElements(response.domain, response.enabled, response.moodle);
    },
    error =>{
        console.log(`Something went wrong while trying to toggle domain!`);
        console.log(error);
    });
}

function localizePopupHTML() {
    document.querySelectorAll("[data-localize]").forEach(element => {
        element.innerHTML = browser.i18n.getMessage(element.getAttribute("data-localize"));
    });
    document.querySelectorAll("[data-localize-title]").forEach(element => {
        element.setAttribute("title", browser.i18n.getMessage(element.getAttribute("data-localize-title")));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    localizePopupHTML();
    updateAllOptions();
    document.querySelector("#state #toggle").addEventListener("click", domainToggled);
    document.querySelectorAll("#settings>button").forEach(element => {
        element.addEventListener("click", optionToggled);
    });
});