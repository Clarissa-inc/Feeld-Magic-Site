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
        const response = await fetch(`${endpoint}`, {
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

function handleReport() {
    document.getElementById("reportBugPopout").style.display = "block"
}

async function submitReport() {
    var bugProblem = document.getElementById("bugDescription").value
    var redditUsername = document.getElementById("reportRedditUsername").value

    if (bugProblem.length < 3) {
        notify("Please describe the problem")
        return
    }

    if (redditUsername.length == 0) {
        notify("Please enter your Reddit username")
        return
    }

    await backendRequest("/feeldRequest", {
        operationName: "ReportBug",
        report: bugProblem,
        username: redditUsername
    })

    notify("Successfully reported bug")

    document.getElementById("bugDescription").value = ""
    document.getElementById("reportRedditUsername").value = ""

    closeReportPopout()
}

function closeReportPopout() {
    document.getElementById("reportBugPopout").style.display = "none"
}

const sections = document.querySelectorAll(".content-section");
const navLinks = document.querySelectorAll(".nav-link");

navLinks.forEach((link) => {
    link.addEventListener("click", async function(e) {
        e.preventDefault();

        var target = link.getAttribute("href").substring(1);

        if (target !== "dashboard" && target !== "swipe" && target !== "likes" && target !== "pings" && target !== "settings") {
            notify("Not implemented yet (only dashboard, swipe, likes & pings, settings for now)")
            return
        }

        if (target == "swipe") {
            var response = await backendRequest("/feeldRequest", {
                "operationName": "DiscoverProfiles",
                "query": "query DiscoverProfiles($input: ProfileDiscoveryInput!) {\n  discovery(input: $input) {\n    nodes {\n      ...DiscoveryProfileFragment\n      __typename\n    }\n    hasNextBatch\n    feedGeneratedAt\n    generatedWithProfileUpdatedAt\n    feedSize\n    feedCapacity\n    __typename\n  }\n}\n\nfragment DiscoveryProfileFragment on Profile {\n  ...ProfileContentProfileFragment\n  ...DiscoveryAnalyticsMetadata\n  streamUserId\n  analyticsId\n  age\n  pairCount\n  profilePairs {\n    ...ProfilePair\n    __typename\n  }\n  distance {\n    km\n    mi\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileContentProfileFragment on Profile {\n  bio\n  age\n  streamUserId\n  dateOfBirth\n  distance {\n    km\n    mi\n    __typename\n  }\n  connectionGoals\n  desires\n  gender\n  id\n  status\n  imaginaryName\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  interests\n  isMajestic\n  isIncognito\n  lastSeen\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  sexuality\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  pairCount\n  profilePairs {\n    ...ProfilePair\n    __typename\n  }\n  allowPWM\n  verificationStatus\n  enableChatContentModeration\n  ...AnalyticsProfileFragment\n  ...DiscoveryAnalyticsMetadata\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}\n\nfragment ProfilePair on ProfilePair {\n  identityId\n  createdAt\n  partnerLabel\n  otherProfile {\n    id\n    age\n    imaginaryName\n    dateOfBirth\n    gender\n    sexuality\n    isIncognito\n    photos {\n      ...GetPictureUrlFragment\n      __typename\n    }\n    ...ProfileInteractionStatusFragment\n    status\n    verificationStatus\n    __typename\n  }\n  __typename\n}\n\nfragment GetPictureUrlFragment on Picture {\n  id\n  publicId\n  pictureIsSafe\n  pictureIsPrivate\n  pictureUrl\n  __typename\n}\n\nfragment ProfileInteractionStatusFragment on Profile {\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  __typename\n}\n\nfragment AnalyticsProfileFragment on Profile {\n  id\n  isUplift\n  lastSeen\n  age\n  gender\n  sexuality\n  verificationStatus\n  distance {\n    km\n    mi\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  __typename\n}\n\nfragment DiscoveryAnalyticsMetadata on Profile {\n  metadata {\n    source\n    __typename\n  }\n  __typename\n}",
                "variables": {
                    "input": {
                        "filters": {
                            "ageRange": profile.ageRange,
                            "lookingFor": profile.lookingFor,
                            "maxDistance": profile.distanceMax,
                            "recentlyOnline": true
                        }
                    }
                }
            })

            if (!response) {
                notify("Failed to get users to swipe")
                return
            }

            if (response.errors) {
                notify(response.errors[0].message)
            } else {
                currentSwipeUsers = response
                loadUserInSwipe()

                notify("Only showing the people who've been active in the last 7 days (:")
            }
        } else if (target == "likes") {
            var response = await backendRequest("/feeldRequest", {
                "operationName": "FilteredWhoLikesMe",
                "query": "mutation FilteredWhoLikesMe($input: FilteredInteractionInput!, $cursor: String) {\n  filteredWhoLikesMe(input: $input, cursor: $cursor) {\n    filters {\n      ageRange\n      desires\n      lookingFor\n      sexualities\n      __typename\n    }\n    profiles {\n      nodes {\n        ...LikesProfileFragment\n        __typename\n      }\n      pageInfo {\n        total\n        unfilteredTotal\n        hasNextPage\n        nextPageCursor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment LikesProfileFragment on Profile {\n  id\n  age\n  gender\n  status\n  lastSeen\n  isUplift\n  sexuality\n  isMajestic\n  dateOfBirth\n  streamUserId\n  imaginaryName\n  allowPWM\n  verificationStatus\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  distance {\n    km\n    mi\n    __typename\n  }\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}",
                "variables": {
                    "input": {
                        "filters": {},
                        "sortBy": "LAST_INTERACTION"
                    }
                }
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
        } else if (target == "pings") {
            var response = await backendRequest("/feeldRequest", {
                operationName: "WhoPingsMe",
                query: "query WhoPingsMe($limit: Int, $cursor: String, $sortBy: SortBy!) {\n  interactions: whoPingsMe(\n    input: {sortBy: $sortBy}\n    limit: $limit\n    cursor: $cursor\n  ) {\n    nodes {\n      ...LikesProfileFragment\n      __typename\n    }\n    pageInfo {\n      total\n      hasNextPage\n      nextPageCursor\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment LikesProfileFragment on Profile {\n  id\n  age\n  gender\n  status\n  lastSeen\n  isUplift\n  sexuality\n  isMajestic\n  dateOfBirth\n  streamUserId\n  imaginaryName\n  allowPWM\n  verificationStatus\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  distance {\n    km\n    mi\n    __typename\n  }\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}",
                variables: { sortBy: "LAST_INTERACTION" }
            })

            if (!response) {
                notify("Failed to get pings")
                return
            }

            if (response.errors) {
                notify(response.errors[0].message)
            } else {
                loadPings(response)
            }
        } else if (target == "settings") {
            var response = await await backendRequest("/feeldRequest", {
                "operationName": "AccountHome",
                "query": "query AccountHome($profileId: String!) {\n  account {\n    firebaseId\n    availablePings\n    isUplift\n    __typename\n  }\n  profile(id: $profileId) {\n    ...AccountHomeProfileFragment\n    __typename\n  }\n}\n\nfragment AccountHomeProfileFragment on Profile {\n  id\n  age\n  bio\n  dateOfBirth\n  desires\n  gender\n  imaginaryName\n  interests\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  sexuality\n  status\n  verificationStatus\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
                "variables": {
                    "profileId": profile.id
                }
            })

            var searchSettingsResponse = await await backendRequest("/feeldRequest", {
                "operationName": "DiscoverSearchSettingsQuery",
                "query": "query DiscoverSearchSettingsQuery($profileId: String!) {\n  profile(id: $profileId) {\n    ...DiscoverSearchSettingsFragment\n    __typename\n  }\n}\n\nfragment DiscoverSearchSettingsFragment on Profile {\n  id\n  status\n  ageRange\n  desiringFor\n  distanceMax\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  lookingFor\n  recentlyOnline\n  allowPWM\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}",
                "variables": {
                    "profileId": profile.id
                }
            })

            if (!response || !searchSettingsResponse) {
                notify("Failed to get current settings")
                return
            }

            if (response.errors) {
                notify(response.errors[0].message)
            } else if (searchSettingsResponse.errors) {
                notify(searchSettingsResponse.errors[0].message)
            } else {
                setAccountInformation(response, searchSettingsResponse)

                notify("Settings isn't finished yet sorry pookies")
            }
        }

        sections.forEach((section) => {
            section.classList.toggle("hidden", section.id !== target);
        });

        navLinks.forEach((nav) => nav.classList.remove("active"));
        link.classList.add("active");
    });
});