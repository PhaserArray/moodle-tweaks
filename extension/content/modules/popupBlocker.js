console.log("popupBlocker.js");

var anchors = document.getElementsByTagName("a");
for (const anchor of anchors) {
    if (!anchor.hasAttribute("onclick")) continue;
    if (!anchor.onclick.toString().includes("&inpopup=1")) continue;

    anchor.onclick = anchor.onclick.toString().replace("&inpopup=1", "");
}