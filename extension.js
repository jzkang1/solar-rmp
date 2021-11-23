var button = document.getElementById("disable");
button.disabled = true;
var enabled = false;
var uMich = document.getElementById("uMich");
var stony = document.getElementById("stony");

// uMich Button
uMich.addEventListener("click", () => {
    if (!enabled) {
        chrome.storage.sync.set({"umichOpacity": "1"}, () => {
            uMich.style.opacity = "1";
            button.disabled = false;
        });
        enabled = true;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, "UMich");
            chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                function: uMichReady
            });
        });
    }
});

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
        chrome.storage.sync.set({"umichOpacity": "0.5"}, () => {
            uMich.style.opacity = "0.5";
            button.disabled = true;
        });
        chrome.storage.sync.set({"stonyOpacity": "0.5"}, () => {
            stony.style.opacity = "0.5";
            button.disabled = true;
        });
        enabled = false;
    }
});

// Makes sure that whichever button is selected stays selected.
document.body.onload = () => {
    chrome.storage.sync.get("umichOpacity", (result) => {
        let umichOpacity = result["umichOpacity"];
        if (umichOpacity === "1") {
            uMich.style.opacity = umichOpacity;
            button.disabled = false;
            enabled = true;
        }
    });
    chrome.storage.sync.get("stonyOpacity", (result) => {
        let stonyOpacity = result["stonyOpacity"];
        if (stonyOpacity === "1") {
            stony.style.opacity = stonyOpacity;
            button.disabled = false;
            enabled = true;
        }
    });
}

function uMichReady() {
    // Only runs script if it was never run.
    if (document.readyState === "complete" || document.readyState === "loaded" || document.readyState === "interactive") {
        if (document.getElementsByClassName("Instructor").length === 0) {
            uMichigan();
        }
    }
    async function uMichigan() {
        // Name Parser
        // Format -> [firstName, lastName}
        function parseName(name) {
            name = name.toLowerCase();
            for (let seq of [/\r?\n|\r/g, /(\r\n|\n|\r)/gm, "<br>", "staff", "; homepage"]) {
                name = name.replaceAll(seq, "");
            }
            let names = name.trim().split(" ");
            if (names.length >= 2) {
                return [names[0].toLowerCase(), names[1].toLowerCase()];
            } else {
                return ["",""];
            }
        }
        let profs = new Set();
        $('div.col-sm-3 a').addClass("Instructor");
        var instructors = document.getElementsByClassName("Instructor");
        for (let i = 0; i < instructors.length; i++) {
            if (instructors[i].innerHTML == "homepage") {
                instructors[i].id = "remove";
                var myobj = document.getElementById("remove");
                myobj.remove();
            }
            if (instructors[i] != null) {
                var name = instructors[i].innerHTML;
            }
            for (let seq of ["  she-her-hers", "  she-her", "  she-hers", " he-him-his", " He-Him-His", " 'he-him-his'", " - she her", "- he him"]) {
                name = name.replaceAll(seq, "");
            }
            if (name.includes(", ")) {
                name = name.replace(", ", ",");
            }
            name = name.replace(" ", ",");
            name += " ";
            name = name.replace(" ","");
            var nameArray = name.split(",");
            if (nameArray[1] == "Christopher") {
                nameArray[1] = "Chris";
            }
            var fullName = nameArray[1] + " " + nameArray[0];
            if (instructors[i] != null) {
                instructors[i].innerHTML = fullName;
            }
            profs.add(fullName);
        }
        const uMichID = 1258;
        // schoolID : int
        // profs: Set<String>
        async function infoScraper(schoolID, profs) {
            let numOfProfs = 20 + (await ((await fetch("https://www.ratemyprofessors.com/filter/professor/?&page=1&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=" + schoolID)).json())).remaining;
            let numOfPages = Math.ceil(numOfProfs / 20);
            let i = 1;
            profInfo = {};
            let numProfsAdded = 0;
            while (i <= numOfPages) {
                let pageProfs = (await ((await fetch("https://www.ratemyprofessors.com/filter/professor/?&page=" + i + "&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=" + schoolID)).json())).professors;
                let firstProf = pageProfs[0];
                let lastProf = pageProfs[pageProfs.length - 1];
                for (let prof of profs) {
                    let profName = parseName(prof);
                    if (profName[1].localeCompare(firstProf["tLname"].toLowerCase()) >= 0 && profName[1].localeCompare(lastProf["tLname"].toLowerCase()) <= 0) {
                        for (let pageProf of pageProfs) {
                            if (profName[0] === pageProf["tFname"].toLowerCase() && profName[1] === pageProf["tLname"].toLowerCase()) {
                                profInfo[prof] = {
                                    rating: pageProf["overall_rating"],
                                    numRatings: pageProf["tNumRatings"],
                                    dept: pageProf["tDept"],
                                    tid: pageProf["tid"]
                                }
                                numProfsAdded += 1;
                            }
                        }
                    }
                }
                if (numProfsAdded >= profs.size) {
                    break;
                }
                i += 1;
            }
            return profInfo;
        }
        let info = await infoScraper(uMichID, profs);
        for (let instructor of instructors) {
            const rating = document.createElement("p");
            if (info[instructor.innerHTML]) {
                var instructorRating = info[instructor.innerHTML].rating;
                var numRating = info[instructor.innerHTML].numRatings;
                var emoji = "";
                if (0 <= instructorRating && instructorRating < 3) {
                    emoji = "😶";
                } else if (3 <= instructorRating && instructorRating < 4) {
                    emoji = "😐";
                } else if (4 <= instructorRating && instructorRating <= 5) {
                    emoji = "😄";
                }
                var ratingText = emoji + " Overall Rating: " + instructorRating + " / 5 Based on " + numRating + " ratings. ";
                rating.appendChild(document.createTextNode(ratingText));
                instructor.setAttribute("href", "https://www.ratemyprofessors.com/ShowRatings.jsp?tid=" + info[instructor.innerHTML].tid);
            }
            else {
                rating.appendChild(document.createTextNode("🤔 Professor Not Found"));
            }
            instructor.appendChild(rating);
        }
    }
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
            let numOfProfs = 20 + (await ((await fetch("https://www.ratemyprofessors.com/filter/professor/?&page=1&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=" + schoolID)).json())).remaining;
            let numOfPages = Math.ceil(numOfProfs / 20);
            let i = 1;
            let info = {};
            let numProfsAdded = 0;
            while (i <= numOfPages) {
                let pageProfs = (await ((await fetch("https://www.ratemyprofessors.com/filter/professor/?&page=" + i + "&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=" + schoolID)).json())).professors;
                let firstProf = pageProfs[0];
                let lastProf = pageProfs[pageProfs.length - 1];
                for (let prof of profs) {
                    let profName = parseName(prof);
                    if (firstProf["tLname"].toLowerCase().localeCompare(profName[1]) <= 0 && profName[1].localeCompare(lastProf["tLname"].toLowerCase()) <= 0) {
                        console.log("Found a match: " + profName[0] + profName[1] + " is suspected to be on page" + i);
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
