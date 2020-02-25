console.log("Popup script!")

function optionToggled(event) {
    console.log(event);
    let element = (event.target.tagName == "BUTTON") ? event.target : event.target.parentElement;
    let enabled = element.classList.contains("enabled");
    if (enabled) {
        // disable
    } else {
        // enable
    }
    element.classList.toggle("enabled"); // reimplement above
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
    document.querySelectorAll("#settings>button").forEach(element => {
        element.addEventListener("click", optionToggled);
    });
});