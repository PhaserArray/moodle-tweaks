console.log("midClickFix.js");

var anchors = document.getElementsByTagName("a");
for (const anchor of anchors) {
    if (!anchor.hasAttribute("onclick")) continue;
    if (anchor.onclick.toString().includes("&redirect=1")) {
        anchor.href = new URL(anchor.href).searchParams.append("redirect", 1);
    }
}