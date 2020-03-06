console.log("Popup script!");

function buttonElementFromEvent(event) {
    return (event.target.tagName === "BUTTON") ? event.target : event.target.parentElement;
}

function isButtonOn(button) {
    return button.classList.contains("on");
}

function optionToggled(event) {
    let element = buttonElementFromEvent(event);
    let on = isButtonOn(element);

    if (element.hasAttribute("data-module")) {
        let option = element.getAttribute("data-module");
        browser.runtime.sendMessage({
            setModule: {
                key: option,
                value: !on
            }
        }).then(response => {
            if (typeof response !== "undefined" 
                && "success" in response 
                && response.success === true) {
                element.classList.toggle("on");
                console.log(`Sucessfully toggled ${option}!`);
            } else {
                console.log(`response.success !== true for ${option}, unexpected reponse:`);
                console.log(response);
            }
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
        element.classList.toggle("on");
    }
}

function updateAllOptions() {
    browser.runtime.sendMessage({
        getCurrentDomainOptions: true
    }).then(response => {
        if (typeof response === "undefined" 
            || !("success" in response) 
            || response.success !== true) {
            console.log("response.success !== true when updating options, unexpected reponse: ");
            console.log(response);
            return;
        } else if (!("options" in response)) {
            console.log("Options not provided when updating options, unexpected reponse: ");
            console.log(response);
            return;
        }

        let options = response.options;
        let modules = options.modules;
        Object.keys(modules).forEach(key => {
            console.log(key);
            let moduleElement = document.querySelector(`[data-module="${key}"]`);
            if (typeof moduleElement !== "undefined") {
                if (modules[key] === true) {
                    moduleElement.classList.add("on");
                } else if (modules[key] === false) {
                    moduleElement.classList.remove("on");
                }
            }
        });

        let domainElement = document.querySelector("#state #toggle");
        let settingsElement = document.querySelector("#settings");
        if (options.enabled === true) {
            domainElement.classList.add("on");
            settingsElement.classList.remove("hidden");
        } else if (options.enabled === false) {
            domainElement.classList.remove("on");
            settingsElement.classList.add("hidden");
        } else if (options.moodle === false) {
            domainElement.setAttribute("disabled", true);
            domainElement.classList.remove("on");
        }
        domainElement.querySelector(".switch_on").textContent = options.domain;
        domainElement.querySelector(".switch_off").textContent = options.domain;
    },
    error => {
        console.log(`Something went wrong when updating options:`);
        console.log(error);
    });
}

function domainToggled(event) {
    let element = buttonElementFromEvent(event);
    let on = isButtonOn(element);

    browser.runtime.sendMessage({
        setCurrentDomain: !on
    }).then(response => {
        if (typeof response !== "undefined" 
            && "success" in response 
            && response.success === true) {
            element.classList.toggle("on");
            document.querySelector("#settings").classList.toggle("hidden");
            console.log(`Sucessfully toggled domain ${response.domain}!`);
        } else {
            element.setAttribute("disabled", true);
            element.classList.remove("on");
            console.log(`response.success !== true, domain must not be Moodle, button disabled.`);
        }
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