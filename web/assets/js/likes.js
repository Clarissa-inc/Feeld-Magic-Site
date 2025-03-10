var totalLikesEle = 0
var currentUserInMoreUserInformation = null

function capitalizeFirstLetterWithSpaces(str) {
    return str.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

function loadLikes(data) {
    var likedBy = data["data"]["filteredWhoLikesMe"]["profiles"]["nodes"];
    var userGrid = document.getElementById("likesUserGrid");

    notify("Feeld current loads your likes in batches so if you've got quite a few likes 20+ they may not all load, just like/dislike your current batch and refresh the page")

    var totalLikes = document.getElementById("totalLikes")

    totalLikesEle = data["data"]["filteredWhoLikesMe"]["profiles"]["pageInfo"]["unfilteredTotal"]

    totalLikes.textContent = `${data["data"]["filteredWhoLikesMe"]["profiles"]["pageInfo"]["unfilteredTotal"].toLocaleString()} Total Likes`;

    userGrid.innerHTML = "";

    likedBy.forEach(user => {
        var { age, gender, sexuality, imaginaryName, interactionStatus, photos, distance, id, lastSeen } = user;

        var userSection = document.createElement("div");
        userSection.classList.add("likes-user-card");
        userSection.setAttribute("data-id", id);

        var baseInformation = `<h2 class="cleanText">${imaginaryName || "Unknown"}</h2>`

        if (lastSeen) {
            baseInformation = baseInformation + `
                <p class="cleanText">${formatLastSeenTimestamp(lastSeen)}</p>
            `
        }

        userSection.innerHTML = `${baseInformation}
            <p class="cleanText">${age || "Unknown"} ${capitalizeFirstLetterWithSpaces(gender?.toLowerCase().replaceAll("_", " ").replaceAll("-", "")) || "Unknown"} 
            ${capitalizeFirstLetterWithSpaces(sexuality?.toLowerCase().replaceAll("_", " ").replaceAll("-", "")) || "Unknown"}</p>
            <p class="cleanText">${distance?.mi ?? "Unknown"} mi away</p>
        `;

        if (photos && photos.length > 0) {
            let currentIndex = 0;

            var photoContainer = document.createElement("div");
            photoContainer.style.position = "relative";
            photoContainer.style.textAlign = "center";

            var img = document.createElement("img");
            img.src = photos[currentIndex].pictureUrl;
            img.classList.add("likes-user-photo");
            img.style.maxWidth = "100%";
            img.style.borderRadius = "10px";
            photoContainer.appendChild(img);

            var backButton = document.createElement("button");
            backButton.textContent = "<";
            backButton.style.position = "absolute";
            backButton.style.left = "10px";
            backButton.style.top = "50%";
            backButton.style.transform = "translateY(-50%)";
            backButton.style.padding = "10px";
            backButton.style.background = "#42454a";
            backButton.style.color = "#fff";
            backButton.style.border = "none";
            backButton.style.cursor = "pointer";
            backButton.style.borderRadius = "5px";

            var nextButton = document.createElement("button");
            nextButton.textContent = ">";
            nextButton.style.position = "absolute";
            nextButton.style.right = "10px";
            nextButton.style.top = "50%";
            nextButton.style.transform = "translateY(-50%)";
            nextButton.style.padding = "10px";
            nextButton.style.background = "#42454a";
            nextButton.style.color = "#fff";
            nextButton.style.border = "none";
            nextButton.style.cursor = "pointer";
            nextButton.style.borderRadius = "5px";

            backButton.addEventListener("click", () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    img.src = photos[currentIndex].pictureUrl;
                }
            });

            nextButton.addEventListener("click", () => {
                if (currentIndex < photos.length - 1) {
                    currentIndex++;
                    img.src = photos[currentIndex].pictureUrl;
                }
            });

            photoContainer.appendChild(backButton);
            photoContainer.appendChild(nextButton);

            userSection.appendChild(photoContainer);

            var actionButtons = document.createElement("div");
            actionButtons.style.display = "flex";
            actionButtons.style.justifyContent = "space-between";
            actionButtons.style.marginTop = "10px";

            var plusButton = document.createElement("button");
            plusButton.textContent = "+";
            plusButton.setAttribute("alt", id);
            plusButton.style.padding = "8px 16px";
            plusButton.style.background = "#9370DB";
            plusButton.style.color = "#fff";
            plusButton.style.border = "none";
            plusButton.style.cursor = "pointer";
            plusButton.style.borderRadius = "5px";
            plusButton.style.fontSize = "14px";
            plusButton.onclick = () => matchUser(id, imaginaryName);

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
            viewMoreButton.onclick = () => viewMoreUser(user, id, imaginaryName, "likes");

            var minusButton = document.createElement("button");
            minusButton.textContent = "-";
            minusButton.setAttribute("alt", id);
            minusButton.style.padding = "8px 16px";
            minusButton.style.background = "#9370DB";
            minusButton.style.color = "#fff";
            minusButton.style.border = "none";
            minusButton.style.cursor = "pointer";
            minusButton.style.borderRadius = "5px";
            minusButton.style.fontSize = "14px";
            minusButton.onclick = () => dislikeUser(id, imaginaryName);

            actionButtons.appendChild(plusButton);
            actionButtons.appendChild(viewMoreButton);
            actionButtons.appendChild(minusButton);

            userSection.appendChild(actionButtons);
        } else {
            userSection.innerHTML += `<p>No photos (this should never happen)</p>`;
        }

        userGrid.appendChild(userSection);
    });
}

function removeFromLikesCard(profileId) {
    var likedUserCard = document.querySelector(`.likes-user-card[data-id="${profileId}"]`);

    if (likedUserCard) {
        likedUserCard.remove();
        totalLikesEle = totalLikesEle - 1;

        var totalLikesElement = document.getElementById("totalLikes");
        totalLikesElement.textContent = `${(totalLikesEle).toLocaleString()} Total Likes`;
    }
}

async function viewMoreUser(user, profileId, displayName, type) {
    if (type == "likes") {
        document.getElementById("moreUserInformationLikeButton").setAttribute("onclick", "likeUserFromMoreUserInformation()")
        document.getElementById("moreUserInformationRejectButton").setAttribute("onclick", "dislikeUserFromMoreUserInformation()")

        document.getElementById("moreUserInformationLikeButton").innerText = `Like ${displayName}`
    } else if (type == "pings") {
        document.getElementById("moreUserInformationLikeButton").innerText = `Match ${displayName}`

        document.getElementById("moreUserInformationLikeButton").setAttribute("onclick", "likeUserFromMoreUserInformationPings()")
        document.getElementById("moreUserInformationRejectButton").setAttribute("onclick", "dislikeUserFromMoreUserInformationPings()")
    }

    currentUserInMoreUserInformation = user;

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
        var { bio, desires, interests } = response["data"]["profile"]

        document.getElementById("moreUserInformationRejectButton").innerText = `Reject ${displayName}`

        document.getElementById("moreUserInformationswipeBioText").value = bio || "N/A";
        document.getElementById("moreUserInformationdesiresText").textContent = desires?.length ? desires.map(d => capitalizeFirstLetterWithSpaces(d.replaceAll("_", " "))).join(", ") : "N/A";
        document.getElementById("moreUserInformationinterestsText").textContent = interests?.length ? interests.map(i => capitalizeFirstLetterWithSpaces(i.replaceAll("_", " "))).join(", ") : "N/A";

        document.getElementById("moreUserInformation").style.display = "block"
    }
}

function closeMoreUserInformationPopout() {
    document.getElementById("moreUserInformation").style.display = "none"
}

async function likeUserFromMoreUserInformation() {
    if (currentUserInMoreUserInformation !== null) {
        var { id, imaginaryName } = currentUserInMoreUserInformation

        var liked = await matchUser(id, imaginaryName)

        if (liked) {
            closeMoreUserInformationPopout()
        }
    }
}

async function dislikeUserFromMoreUserInformation() {
    if (currentUserInMoreUserInformation !== null) {
        var { id, imaginaryName } = currentUserInMoreUserInformation

        var disliked = await dislikeUser(id, imaginaryName)

        if (disliked) {
            closeMoreUserInformationPopout()
        }
    }
}

async function matchUser(profileId, displayName) {
    var response = await backendRequest("/feeldRequest", {
        "operationName": "ProfileLike",
        "query": "mutation ProfileLike($targetProfileId: String!) {\n  profileLike(input: {targetProfileId: $targetProfileId}) {\n    status\n    chat {\n      ...ChatListItemChatFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ChatListItemChatFragment on Chat {\n  ...ChatFragment\n  __typename\n}\n\nfragment ChatFragment on Chat {\n  id\n  name\n  type\n  streamChatId\n  status\n  members {\n    ...ChatMemberFragment\n    __typename\n  }\n  disconnectedMembers {\n    ...ChatMemberFragment\n    __typename\n  }\n  __typename\n}\n\nfragment ChatMemberFragment on Profile {\n  id\n  status\n  analyticsId\n  imaginaryName\n  streamUserId\n  age\n  dateOfBirth\n  sexuality\n  isIncognito\n  ...ProfileInteractionStatusFragment\n  gender\n  photos {\n    ...GetPictureUrlFragment\n    pictureType\n    __typename\n  }\n  ...AnalyticsProfileFragment\n  __typename\n}\n\nfragment ProfileInteractionStatusFragment on Profile {\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  __typename\n}\n\nfragment GetPictureUrlFragment on Picture {\n  id\n  publicId\n  pictureIsSafe\n  pictureIsPrivate\n  pictureUrl\n  __typename\n}\n\nfragment AnalyticsProfileFragment on Profile {\n  id\n  isUplift\n  lastSeen\n  age\n  gender\n  sexuality\n  verificationStatus\n  distance {\n    km\n    mi\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  __typename\n}",
        "variables": {
            "targetProfileId": profileId
        }
    })

    if (!response) {
        notify(`Failed to like/match ${displayName}`)
        return false
    }

    if (response.data.profileLike) {
        if (response.data.profileLike.status == "RECIPROCATED") {
            notify(`Successfully matched with ${displayName}`)

            removeFromLikesCard(profileId)
            return true
        }
    } else {
        if (response.errors) {
            notify(`Failed to like/match ${displayName} - ${response.errors[0].message}`)
            return false
        } else {
            notify(`Failed to like/match ${displayName} - Unknown reason`)
            return false
        }
    }
}

async function dislikeUser(profileId, displayName) {
    var response = await backendRequest("/feeldRequest", {
        "operationName": "ProfileDislike",
        "query": "mutation ProfileDislike($targetProfileId: String!) {\n  profileDislike(input: {targetProfileId: $targetProfileId})\n}",
        "variables": {
            "targetProfileId": profileId
        }
    })

    if (!response) {
        notify(`Failed to reject ${displayName}`)
        return false
    }

    if (response.data.profileDislike) {
        if (response.data.profileDislike == "SENT") {
            notify(`Successfully rejected ${displayName}`)

            removeFromLikesCard(profileId)
            return true
        }
    } else {
        if (response.errors) {
            notify(`Failed to reject ${displayName} - ${response.errors[0].message}`)
            return false
        } else {
            notify(`Failed to reject ${displayName} - Unknown reason`)
            return false
        }
    }
}