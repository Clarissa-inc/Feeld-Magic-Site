function notify(message) {
    var container = document.getElementById("notification-container");
    var notification = document.createElement("div");

    notification.classList.add("notification");
    notification.textContent = message;
    notification.style.backgroundColor = "#9370DB";

    container.appendChild(notification);

    setTimeout(() => { notification.remove() }, 1000 * 7);
}

function parseEmail(email) {
    var regex = /[?&](oobCode=([a-zA-Z0-9_-]+))/g;
    var match;

    while ((match = regex.exec(email)) !== null) {
        if (match[1].startsWith("oobCode")) {
            return match[2];
        }
    }

    return null;
}

async function backendRequest(endpoint, data) {
    try {
        const response = await fetch(`http://localhost:7331${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        });

        var data = await response.json();

        return data;
    } catch (error) {
        return false;
    }
}

async function handleLogout() {
    var response = await backendRequest("/feeldRequest", {
        "operationName": "Logout"
    })

    if (!response) {
        notify("Failed to logout, this shouldn't ever happen")
        return
    }

    if (response.success) {
        notify("Successfully logged out")

        setTimeout(function() {
            window.location.href = "/"
        }, 1000 * 3);
    } else {
        notify("Failed to logout, this shouldn't ever happen")
        return
    }
}

const sections = document.querySelectorAll(".content-section");
const navLinks = document.querySelectorAll(".nav-link");

navLinks.forEach((link) => {
    link.addEventListener("click", async function(e) {
        e.preventDefault();

        var target = link.getAttribute("href").substring(1);

        if (target !== "likes") {
            notify("Not implemented yet (just the likes tab for now)")
            return
        }

        if (target == "likes") {
            var response = await backendRequest("/feeldRequest", {
                operationName: "WhoLikesMe",
                query: "query WhoLikesMe($limit: Int, $cursor: String, $sortBy: SortBy!) {\n  interactions: whoLikesMe(\n    input: {sortBy: $sortBy}\n    limit: $limit\n    cursor: $cursor\n  ) {\n    nodes {\n      ...LikesProfileFragment\n      __typename\n    }\n    pageInfo {\n      total\n      hasNextPage\n      nextPageCursor\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment LikesProfileFragment on Profile {\n  id\n  age\n  gender\n  status\n  lastSeen\n  isUplift\n  sexuality\n  isMajestic\n  dateOfBirth\n  streamUserId\n  imaginaryName\n  allowPWM\n  verificationStatus\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  distance {\n    km\n    mi\n    __typename\n  }\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}",
                variables: { sortBy: "LAST_INTERACTION" }
            })

            if (!response) {
                notify("Failed to get likes")
                return
            }

            if (response.errors) {
                notify(response.errors[0].message)
            } else {
                loadLikes(response)
            }
        }

        sections.forEach((section) => {
            section.classList.toggle("hidden", section.id !== target);
        });

        navLinks.forEach((nav) => nav.classList.remove("active"));
        link.classList.add("active");
    });
});