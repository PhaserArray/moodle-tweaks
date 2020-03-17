console.log("popupBlocker.js");

var anchors = document.getElementsByTagName("a");
for (const anchor of anchors) {
    if (!anchor.hasAttribute("onclick")) continue;

    let anchorOnclick = anchor.onclick.toString();
    if (anchorOnclick.includes("&inpopup=1")) {
        anchorOnclick = anchor.onclick.toString().replace("&inpopup=1", "");
    }
    if (anchorOnclick.includes("window.open(")) {
        // I don't want to do the more expensive regex if it's not the right thing anyways.
        // I'm doing the regex don't want to edit anything that might be something other than a popup link.
        if (anchorOnclick.match(/window\.open\('.*?', '', 'width.*?'\); return false;/)) {
            anchorOnclick = anchorOnclick.replace(/, 'width.*?'/, "");
        }
    }

    // Don't mess with it if it's the same string.
    if (anchor.onclick.toString() !== anchorOnclick) {
        anchor.onclick = anchorOnclick;
    }
}