console.log("singlePageDicts.js");

if (document.querySelector("body").id === "page-mod-glossary-view") {
    const showAll = document.querySelector(".paging a[href*='page=-1']");
    if (showAll !== null) {
        showAll.click();
    }
    document.querySelectorAll(".paging").forEach(element => element.remove());
}