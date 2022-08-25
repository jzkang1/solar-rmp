var button = document.getElementById("disable");
button.disabled = true;
var enabled = false;
var stony = document.getElementById("stony");

// Stony Button
stony.addEventListener("click", () => {
    if (!enabled) {
        chrome.storage.sync.set({"stonyOpacity": "1"}, () => {
            stony.style.opacity = "1";
            button.disabled = false;
        });
        enabled = true;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, "stony");
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: stonyReady
            });
        });
    }
});

// Disable Button
document.getElementById("disable").addEventListener("click", function() {
    if (enabled) {
        chrome.storage.sync.set({"stonyOpacity": "0.5"}, () => {
            stony.style.opacity = "0.5";
            button.disabled = true;
        });
        enabled = false;
    }
});

// Makes sure that whichever button is selected stays selected.
document.body.onload = () => {
    chrome.storage.sync.get("stonyOpacity", (result) => {
        let stonyOpacity = result["stonyOpacity"];
        if (stonyOpacity === "1") {
            stony.style.opacity = stonyOpacity;
            button.disabled = false;
            enabled = true;
        }
    });
}

function stonyReady() {
    if (!window.location.href.startsWith("https://psns.cc.stonybrook.edu/")) {
        return;
    }
    chrome.storage.sync.set({"stonyRunning": true}, () => {
    });

    async function stonyBrook() {
        // Name parser
        function parseName(name) {
            name = name.toLowerCase();
            for (let seq of [/\r?\n|\r/g, /(\r\n|\n|\r)/gm, "<br>", "staff", ",", "; homepage"]) {
                name = name.replaceAll(seq, "");
            }
            
            let names = name.trim().split(" ");
            if (names.length >= 2) {
                return [names[0].toLowerCase(), names[1].toLowerCase()];
            } else {
                return ["",""];
            }
        }

        let frames = document.getElementById("ptifrmtgtframe").contentWindow;
        let document1 = frames.document;
        let nodes = document1.querySelectorAll("[id^=MTG_INSTR]");
        let profSet = new Set();
        nodes.forEach((node) => {
            if (node.innerHTML.toLowerCase() !== "staff") {
                let nameArr = parseName(node.innerHTML);
                node.innerHTML = nameArr[0][0].toUpperCase() + nameArr[0].substring(1) + " " + nameArr[1][0].toUpperCase() + nameArr[1].substring(1);
                profSet.add(node.innerText);
            }
        });
    
        const stonyID = 971;
        async function infoScraper(schoolID, profs) {
            let numOfProfs = (await ((await fetch("https://www.ratemyprofessors.com/filter/professor/?&page=1&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=" + schoolID)).json())).searchResultsTotal;
            let numOfPages = Math.ceil(numOfProfs / 20);
            let i = 1;
            let info = {};
            let numProfsAdded = 0;
            console.log(numOfPages);
            while (i <= numOfPages) {
                let pageProfs = (await ((await fetch("https://www.ratemyprofessors.com/filter/professor/?&page=" + i + "&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=" + schoolID)).json())).professors;
                if (pageProfs.length == 0) {
                    break;
                }
                
                let firstProf = pageProfs[0];
                let lastProf = pageProfs[pageProfs.length - 1];
                for (let prof of profs) {
                    let profName = parseName(prof);
                    if (firstProf["tLname"].toLowerCase().localeCompare(profName[1]) <= 0 && profName[1].localeCompare(lastProf["tLname"].toLowerCase()) <= 0) {
                        // console.log("Found a match: " + profName[0] + profName[1] + " is suspected to be on page" + i);
                        for (let pageProf of pageProfs) {
                            if (profName[0] === pageProf["tFname"].toLowerCase() && profName[1] === pageProf["tLname"].toLowerCase()) {
                                console.log("found " + profName[0] + " " + profName[1] + "'s ratings. adding them to info")
                                info[prof] = {
                                    rating: pageProf["overall_rating"],
                                    numRatings: pageProf["tNumRatings"],
                                    dept: pageProf["tDept"],
                                    tid: pageProf["tid"]
                                }
                                numProfsAdded += 1;
                                console.log(info);
                            }
                        }
                        break;
                    }
                }
                if (numProfsAdded >= profs.size) {
                    break;
                }
                i += 1;
            }
            return info;
        }
    
        let info = await infoScraper(stonyID, profSet);
    
        // HTML processing
        for (let node of nodes) {
            try {
                console.log("processing " + node.innerHTML + "'s ratings");
                // Create link with name
                let link = document.createElement("a");
                link.href = "https://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + info[node.innerHTML].tid;
                link.setAttribute("target", "_blank");
                link.innerHTML = node.innerHTML;
                link.style.color = "black";
                link.style.textDecoration = "none";
    
                // Set link
                node.innerHTML = "";
                node.appendChild(link);
                node.innerHTML += "<br/>";
    
                // Add rating
                let rating = info[link.innerHTML].rating;
                let ratingNode = document.createElement("span");
                ratingNode.innerHTML += "Rating: " + rating + " / 5"
                if (0 <= rating && rating < 2) {
                    ratingNode.style.color = "red";
                    ratingNode.innerHTML += " 🗑️";
                } else if (2 <= rating && rating < 3) {
                    ratingNode.style.color = "orange";
                    ratingNode.innerHTML += " 😐";
                } else if (3 <= rating && rating <= 4) {
                    ratingNode.style.color = "green";
                    ratingNode.innerHTML += " 🙂";
                } else if (4 <= rating && rating <= 5) {
                    ratingNode.style.color = "blue";
                    ratingNode.innerHTML += " 😃";
                }
                ratingNode.innerHTML += "<br/>";
                node.appendChild(ratingNode);
    
                // Add num ratings
                let numRatingsNode = document.createElement("span");
                numRatingsNode.innerHTML = "From " + info[link.innerHTML].numRatings + " ratings";
                node.appendChild(numRatingsNode);
            } catch (ignored) {
                node.innerHTML += "<br/>" + "Professor Not Found 🤔";
            }
        }
    }

    let currentlyRunning = false;
    chrome.storage.sync.get("stonyRunning", (result) => {
        currentlyRunning = result.stonyRunning;
    });

    if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        let firstBox = document.getElementById("ptifrmtgtframe").contentWindow.document.querySelectorAll("[id^=MTG_INSTR]")[0].innerHTML;
        let ratingsExist = firstBox.includes("Rating: ") || firstBox.includes("Professor Not Found");
        if (!ratingsExist && !currentlyRunning) {
            stonyBrook();
        }
    }

    chrome.storage.sync.set({"stonyRunning": false}, () => {
        currentlyRunning = false;
    });
}
