var matchesNextPageCursor = null
var isLoadingMoreMatches = false

document.querySelectorAll(".main-content").forEach(content => {
    content.addEventListener("scroll", () => {
        if (activeNav == "matches") {
            if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
                if (matchesNextPageCursor && !isLoadingMoreMatches) {
                    isLoadingMoreMatches = true;

                    loadMoreMatches()
                }
            }
        } else if (activeNav == "pings") {
            if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
                if (pingsNextPageCursor && !isLoadingMorePings) {
                    isLoadingMorePings = true;

                    loadMorePings()
                }
            }
        } else if (activeNav == "likes") {
            if (content.scrollTop + content.clientHeight >= content.scrollHeight - 100) {
                if (likesNextPageCursor && !isLoadingMoreLikes) {
                    isLoadingMoreLikes = true;

                    loadMoreLikes()
                }
            }
        }
    });
});

function loadMatches(data, firstLoad) {
    isLoadingMoreMatches = false

    var matchesArr = data["data"]["getProfileConnections"]["nodes"];
    var userGrid = document.getElementById("matchesUserGrid");

    if (data["data"]["getProfileConnections"]["pageInfo"]["hasNextPage"]) {
        matchesNextPageCursor = data["data"]["getProfileConnections"]["pageInfo"]["nextPageCursor"]
    } else {
        matchesNextPageCursor = null
    }

    if (firstLoad === true) {
        userGrid.innerHTML = "";
    }

    matchesArr.forEach(user => {
        var { age, gender, sexuality, imaginaryName, avatar, id } = user;

        var userSection = document.createElement("div");
        userSection.classList.add("likes-user-card");
        userSection.setAttribute("data-id", id);

        var baseInformation = `<h2 class="cleanText">${imaginaryName || "Unknown"}</h2>`

        userSection.innerHTML = `${baseInformation}
            <p class="cleanText">${age || "Unknown"} ${capitalizeFirstLetterWithSpaces(gender?.toLowerCase().replaceAll("_", " ").replaceAll("-", "")) || "Unknown"} 
            ${capitalizeFirstLetterWithSpaces(sexuality?.toLowerCase().replaceAll("_", " ").replaceAll("-", "")) || "Unknown"}</p>
        `;

        var photoContainer = document.createElement("div");
        photoContainer.style.position = "relative";
        photoContainer.style.textAlign = "center";

        var img = document.createElement("img");
        img.src = avatar
        img.classList.add("likes-user-photo");
        img.style.maxWidth = "100%";
        img.style.borderRadius = "10px";
        photoContainer.appendChild(img);

        userSection.appendChild(photoContainer);

        var actionButtons = document.createElement("div");
        actionButtons.style.display = "flex";
        actionButtons.style.justifyContent = "center";
        actionButtons.style.marginTop = "10px";

        var viewMoreButton = document.createElement("button");
        viewMoreButton.textContent = "View More";
        viewMoreButton.setAttribute("alt", id);
        viewMoreButton.style.padding = "8px 16px";
        viewMoreButton.style.background = "#9370DB";
        viewMoreButton.style.color = "#fff";
        viewMoreButton.style.border = "none";
        viewMoreButton.style.cursor = "pointer";
        viewMoreButton.style.borderRadius = "5px";
        viewMoreButton.style.fontSize = "14px";
        viewMoreButton.onclick = () => viewMoreUserMatch(user, id, imaginaryName);

        actionButtons.appendChild(viewMoreButton);
        userSection.appendChild(actionButtons);

        userGrid.appendChild(userSection);
    });
}

async function viewMoreUserMatch(user, profileId, displayName, type) {
    var response = await backendRequest("/feeldRequest", {
        "operationName": "ProfileQuery",
        "query": "query ProfileQuery($profileId: String!) {\n  profile(id: $profileId) {\n    ...ProfileContentProfileFragment\n    streamUserId\n    __typename\n  }\n}\n\nfragment ProfileContentProfileFragment on Profile {\n  bio\n  age\n  streamUserId\n  dateOfBirth\n  distance {\n    km\n    mi\n    __typename\n  }\n  connectionGoals\n  desires\n  gender\n  id\n  status\n  imaginaryName\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  interests\n  isMajestic\n  isIncognito\n  lastSeen\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  sexuality\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  pairCount\n  profilePairs {\n    ...ProfilePair\n    __typename\n  }\n  allowPWM\n  verificationStatus\n  enableChatContentModeration\n  ...AnalyticsProfileFragment\n  ...DiscoveryAnalyticsMetadata\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}\n\nfragment ProfilePair on ProfilePair {\n  identityId\n  createdAt\n  partnerLabel\n  otherProfile {\n    id\n    age\n    imaginaryName\n    dateOfBirth\n    gender\n    sexuality\n    isIncognito\n    photos {\n      ...GetPictureUrlFragment\n      __typename\n    }\n    ...ProfileInteractionStatusFragment\n    status\n    verificationStatus\n    __typename\n  }\n  __typename\n}\n\nfragment GetPictureUrlFragment on Picture {\n  id\n  publicId\n  pictureIsSafe\n  pictureIsPrivate\n  pictureUrl\n  __typename\n}\n\nfragment ProfileInteractionStatusFragment on Profile {\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  __typename\n}\n\nfragment AnalyticsProfileFragment on Profile {\n  id\n  isUplift\n  lastSeen\n  age\n  gender\n  sexuality\n  verificationStatus\n  distance {\n    km\n    mi\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  __typename\n}\n\nfragment DiscoveryAnalyticsMetadata on Profile {\n  metadata {\n    source\n    __typename\n  }\n  __typename\n}",
        "variables": {
            "profileId": profileId
        }
    })

    if (!response) {
        notify(`Failed to get full profile for ${displayName}`)
        return
    }

    if (response.errros) {
        notify(`Failed to get full profile for ${displayName} - ${response.errors[0].message}`)
    } else {
        var { bio, desires, interests, distance, lastSeen } = response["data"]["profile"]

        if (lastSeen) {
            document.getElementById("moreUserInformationMatchLastSeenSection").style.display = "block"
            document.getElementById("moreUserInformationMatchlastSeenText").textContent = formatLastSeenTimestamp(lastSeen)
        }

        document.getElementById("moreUserInformationMatchdistanceText").textContent = `${distance?.mi ?? "Unknown"} mi away`
        document.getElementById("moreUserInformationMatchswipeBioText").value = bio || "N/A";
        document.getElementById("moreUserInformationMatchdesiresText").textContent = desires?.length ? desires.map(d => capitalizeFirstLetterWithSpaces(d.replaceAll("_", " "))).join(", ") : "N/A";
        document.getElementById("moreUserInformationMatchinterestsText").textContent = interests?.length ? interests.map(i => capitalizeFirstLetterWithSpaces(i.replaceAll("_", " "))).join(", ") : "N/A";

        document.getElementById("moreUserInformationMatch").style.display = "block"
    }
}

function closeMoreUserInformationPopoutMatch() {
    document.getElementById("moreUserInformationMatchLastSeenSection").style.display = "none"
    document.getElementById("moreUserInformationMatch").style.display = "none"
}

async function loadMoreMatches() {
    if (!matchesNextPageCursor) return;

    var response = await backendRequest("/feeldRequest", {
        "operationName": "ConnectionsModalQuery",
        "query": "query ConnectionsModalQuery($cursor: String, $limit: Int) {\n  getProfileConnections(limit: $limit, cursor: $cursor) {\n    nodes {\n      ...ConnectionsListItemFragment\n      __typename\n    }\n    pageInfo {\n      hasNextPage\n      nextPageCursor\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ConnectionsListItemFragment on ProfileConnection {\n  id\n  age\n  imaginaryName\n  avatar\n  gender\n  isIncognito\n  sexuality\n  status\n  verificationStatus\n  __typename\n}",
        "variables": {
            "cursor": matchesNextPageCursor,
            "limit": 30
        }
    });

    if (!response || !response.data || !response.data.getProfileConnections) return;

    loadMatches(response, false);
}