console.log("Popup script!")

function optionToggled(event) {
    let element = (event.target.tagName == "BUTTON") ? event.target : event.target.parentElement;

    let enabled = element.classList.contains("enabled");

    if (element.hasAttribute("data-option")) {
        let option = element.getAttribute("data-option");
        browser.runtime.sendMessage({
            setOption: {
                key: option,
                value: !enabled
            }
        }).then(response => {
            if (response.success === true) {
                element.classList.toggle("enabled");
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
        // All options should have the data-option attribute,
        // Otherwise, it might as well be a fidget spinner.
        console.log(`Missing data-option attribute on:`);
        console.log(element);
        element.classList.toggle("enabled");
    }
}

function updateAllOptions() {
    browser.runtime.sendMessage({
        getOptions: true
    }).then(response => {
        if(response.success !== true) {
            console.log("response.success !== true when updating options, unexpected reponse: ");
            console.log(response);
            return;
        } else if (!"options" in response) {
            console.log("Options not provided when updating options, unexpected reponse: ");
            console.log(response);
            return;
        }
        response.options.forEach(option => {
            let optionElement = document.querySelector(`[${option.key}]`);
            if (option.value === true) {
                optionElement.classList.add("enabled")
            } else if (option.value === false) {
                optionElement.classList.remove("enabled")
            }
        });
    },
    error => {
        console.log(`Something went wrong when updating options:`)
        console.log(error);
    })
}

function localizePopupHTML() {
    document.querySelectorAll("[data-localize]").forEach(element => {
        console.log(element.getAttribute("data-localize"));
        console.log(browser.i18n.getMessage(element.getAttribute("data-localize")));
        element.innerHTML = browser.i18n.getMessage(element.getAttribute("data-localize"));
    });
    document.querySelectorAll("[data-localize-title]").forEach(element => {
        element.setAttribute("title", browser.i18n.getMessage(element.getAttribute("data-localize-title")));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    localizePopupHTML();
    updateAllOptions();
    document.querySelectorAll("#settings>button").forEach(element => {
        element.addEventListener("click", optionToggled);
    });
});