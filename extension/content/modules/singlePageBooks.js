console.log("singlePageBooks.js");

if (document.querySelector("body").id === "page-mod-book-view") {
    if (!(new URLSearchParams(window.location.search)).has("chapterid")) {
        singlePageBookify();
    } else {
        var url = new URL(window.location.href);
        url.hash = `#chapterid${url.searchParams.get("chapterid")}`;
        url.searchParams.delete("chapterid");
        window.location.href = url;
    }
}

function loadAllChapters() {
    const tocList = document.querySelector("aside .content [class^='book_toc'] ul");
    const chaptersRequests = [];
    [...tocList.getElementsByTagName("a")].forEach(element => {
        const xhr = new XMLHttpRequest();
        chaptersRequests.push(new Promise(resolve => {
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4 &&
                    (xhr.status === 0 || (xhr.status >= 200 && xhr.status <300))) {
                    resolve(xhr);
                }
            };
            xhr.open("GET", element.href);
            xhr.send();
        }));
    });

    const parser = new DOMParser();
    const bookContent = document.querySelector(".book_content");
    return Promise.all(chaptersRequests).then(chaptersRequests => {
        chaptersRequests.forEach(chapterRequest => {
            const chapterDOM = parser.parseFromString(chapterRequest.responseText, "text/html");
            const chapterContentElement = chapterDOM.querySelector(".book_content");
            const chapterID = new URL(chapterRequest.responseURL).searchParams.get("chapterid");
            chapterContentElement.querySelector("h3").id = `chapterid${chapterID}`;
            bookContent.insertAdjacentHTML("beforeend", chapterContentElement.innerHTML);
        });
    });
}

async function spin(element) {
    let deg = 0;
    setInterval(() => {
        deg += 1;
        if (deg > 360) deg = 0;
        element.style.transform = `rotate(${deg}deg)`;
    }, 1);
}

function singlePageBookify() {
    // Create a loading icon and hide contents
    const loadingElement = document.createElement("strong");
    loadingElement.innerHTML = "⟳";
    loadingElement.style.fontSize = "10em";
    loadingElement.style.display = "table";
    loadingElement.style.marginLeft = "auto";
    loadingElement.style.marginRight = "auto";
    loadingElement.style.textAlign = "center";
    document.querySelector("#page-header").appendChild(loadingElement);
    spin(loadingElement);
    document.querySelector("#page-content").style.visibility = "hidden";

    // Load all chapters
    loadAllChapters().then(() => {
        // Remove loading icon and show contents
        loadingElement.remove();
        document.querySelector("#page-content").style.visibility = "visible";

        // Scroll to chapter if necessary
        if (window.location.hash.startsWith("#chapterid")) {
            document.querySelector(`${window.location.hash}`).scrollIntoView(true);
        }
    });

    // Remove unnecessary navigation
    document.querySelector("[role='main']>.navtop").remove();
    document.querySelector("[role='main']>.navbottom").remove();

    // Turn all the links into jumping points
    const anchors = document.querySelectorAll("a[href*='&chapterid=']");
    anchors.forEach(anchor => {
        const url = new URL(anchor.href);
        if (url.searchParams.has("chapterid")) {
            url.hash = `#chapterid${url.searchParams.get("chapterid")}`;
            url.searchParams.delete("chapterid");
            anchor.href = url.href;
        }
    });

    // Make the TOC floaty
    const tocFloater = document.querySelector("#region-main-box section:nth-of-type(2)");
    tocFloater.style.position = "fixed";
    tocFloater.style.right = "15px";
    tocFloater.style.top = "65px";

    // Make the first item in the TOC a link
    const firstItem = document.querySelector("aside .content [class^='book_toc'] ul li:first-of-type");
    const firstItemStrong = firstItem.firstChild;
    const firstItemAnchor = document.createElement("a");
    firstItemAnchor.href = "#page-content";
    firstItemAnchor.innerHTML = firstItemStrong.innerHTML;
    firstItemAnchor.title = firstItemStrong.innerHTML;
    firstItemStrong.remove();
    firstItem.appendChild(firstItemAnchor);
}