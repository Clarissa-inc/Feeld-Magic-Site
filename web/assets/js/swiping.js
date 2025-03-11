var currentSwipeUsers = null;
var currentSwipeUser = null;
var swipeHistory = [];
var removedUsers = new Set();

function formatLastSeenTimestamp(timestamp) {
    var timestampDate = new Date(timestamp);
    var now = new Date();

    var diffInMilliseconds = now - timestampDate;
    var diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    var diffInMinutes = Math.floor(diffInSeconds / 60);
    var diffInHours = Math.floor(diffInMinutes / 60);
    var diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    if (diffInHours < 24) 
        return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ${diffInMinutes % 60} minute${diffInMinutes % 60 !== 1 ? "s" : ""} ago`;
    
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
}

function loadUserInSwipe() {
    if (!currentSwipeUsers || !currentSwipeUsers.data?.discovery?.nodes?.length) {
        return;
    }

    var firstListOfUsers = currentSwipeUsers.data.discovery.nodes;
    if (!firstListOfUsers.length) return;

    var user = firstListOfUsers[0];
    currentSwipeUser = user;

    var { age, bio, desires, distance, gender, id, imaginaryName, interests, photos, sexuality } = user;

    if (user.lastSeen) {
        document.getElementById("swipeLastSeenBox").style.display = "block";
        document.getElementById("swipeLastSeenText").textContent = formatLastSeenTimestamp(user.lastSeen);
    } else {
        document.getElementById("swipeLastSeenBox").style.display = "none";
    }

    document.getElementById("swipeDisplayNameText").textContent = imaginaryName;
    document.getElementById("swipeAgeText").textContent = age;
    document.getElementById("swipeGenderText").textContent = capitalizeFirstLetterWithSpaces(gender?.toLowerCase().replaceAll("_", " ").replaceAll("-", "")) || "Unknown";
    document.getElementById("swipeSexualityText").textContent = capitalizeFirstLetterWithSpaces(sexuality?.toLowerCase().replaceAll("_", " ").replaceAll("-", "")) || "Unknown";
    document.getElementById("swipeDistanceText").textContent = `${distance?.mi ?? "Unknown"} mi away`;

    document.getElementById("swipeBioText").value = bio || "N/A";
    document.getElementById("desiresText").textContent = desires?.length ? desires.map(d => capitalizeFirstLetterWithSpaces(d.replaceAll("_", " "))).join(", ") : "N/A";
    document.getElementById("interestsText").textContent = interests?.length ? interests.map(i => capitalizeFirstLetterWithSpaces(i.replaceAll("_", " "))).join(", ") : "N/A";

    if (user.interactionStatus?.theirs === "LIKED") {
        document.getElementById("hasUserLikedYou").textContent = "This user has liked you, like back to match";
        document.getElementById("sipweLikeProfileButton").textContent = "Match";
    } else {
        document.getElementById("hasUserLikedYou").textContent = `This user has not liked you`;
        document.getElementById("sipweLikeProfileButton").textContent = "Like";
    }

    var photoContainer = document.getElementById("photoContainer");
    photoContainer.innerHTML = "";

    if (photos && photos.length > 0) {
        let currentIndex = 0;

        var slideshowContainer = document.createElement("div");
        slideshowContainer.style.position = "relative";
        slideshowContainer.style.textAlign = "center";

        var img = document.createElement("img");
        loadImage(img, photos[currentIndex].pictureUrl)
        img.classList.add("likes-user-photo");
        img.style.maxWidth = "100%";
        img.style.borderRadius = "10px";
        slideshowContainer.appendChild(img);

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
                loadImage(img, photos[currentIndex].pictureUrl)
            }
        });

        nextButton.addEventListener("click", () => {
            if (currentIndex < photos.length - 1) {
                currentIndex++;
                loadImage(img, photos[currentIndex].pictureUrl)
            }
        });

        slideshowContainer.appendChild(backButton);
        slideshowContainer.appendChild(nextButton);
        photoContainer.appendChild(slideshowContainer);
    } else {
        photoContainer.textContent = "No pictures available";
    }
}

async function swipeLikeUser() {
    if (currentSwipeUser === null) return;

    var response = await backendRequest("/feeldRequest", {
        "operationName": "ProfileLike",
        "query": "mutation ProfileLike($targetProfileId: String!) {\n  profileLike(input: {targetProfileId: $targetProfileId}) {\n    status\n    chat {\n      ...ChatListItemChatFragment\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ChatListItemChatFragment on Chat {\n  ...ChatFragment\n  __typename\n}\n\nfragment ChatFragment on Chat {\n  id\n  name\n  type\n  streamChatId\n  status\n  members {\n    ...ChatMemberFragment\n    __typename\n  }\n  disconnectedMembers {\n    ...ChatMemberFragment\n    __typename\n  }\n  __typename\n}\n\nfragment ChatMemberFragment on Profile {\n  id\n  status\n  analyticsId\n  imaginaryName\n  streamUserId\n  age\n  dateOfBirth\n  sexuality\n  isIncognito\n  ...ProfileInteractionStatusFragment\n  gender\n  photos {\n    ...GetPictureUrlFragment\n    pictureType\n    __typename\n  }\n  ...AnalyticsProfileFragment\n  __typename\n}\n\nfragment ProfileInteractionStatusFragment on Profile {\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  __typename\n}\n\nfragment GetPictureUrlFragment on Picture {\n  id\n  publicId\n  pictureIsSafe\n  pictureIsPrivate\n  pictureUrl\n  __typename\n}\n\nfragment AnalyticsProfileFragment on Profile {\n  id\n  isUplift\n  lastSeen\n  age\n  gender\n  sexuality\n  verificationStatus\n  distance {\n    km\n    mi\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  __typename\n}",
        "variables": {
            "targetProfileId": currentSwipeUser.id
        }
    })

    if (!response) {
        notify(`Failed to like/match ${currentSwipeUser.imaginaryName}`)
        return
    }

    if (response.data.profileLike) {
        if (response.data.profileLike.status == "RECIPROCATED") {
            removedUsers.add(currentSwipeUser.id);

            notify(`Successfully matched with ${currentSwipeUser.imaginaryName}`)

            handleSwipe()
        } else if (response.data.profileLike.status == "SENT") {
            removedUsers.add(currentSwipeUser.id);

            notify(`Successfully liked ${currentSwipeUser.imaginaryName}`)

            handleSwipe()
        }
    } else {
        if (response.errors) {
            notify(`Failed to like/match ${currentSwipeUser.imaginaryName} - ${response.errors[0].message}`)
        } else {
            notify(`Failed to like/match ${currentSwipeUser.imaginaryName} - Unknown reason`)
        }
    }
}

async function swipeRejectUser() {
    if (currentSwipeUser === null) return;

    var response = await backendRequest("/feeldRequest", {
        "operationName": "ProfileDislike",
        "query": "mutation ProfileDislike($targetProfileId: String!) {\n  profileDislike(input: {targetProfileId: $targetProfileId})\n}",
        "variables": {
            "targetProfileId": currentSwipeUser.id
        }
    })

    if (!response) {
        notify(`Failed to reject ${currentSwipeUser.imaginaryName}`)
        return
    }

    if (response.data.profileDislike) {
        if (response.data.profileDislike == "SENT") {
            removedUsers.add(currentSwipeUser.id);

            notify(`Successfully rejected ${currentSwipeUser.imaginaryName}`)

            handleSwipe()
        }
    } else {
        if (response.errors) {
            notify(`Failed to reject ${currentSwipeUser.imaginaryName} - ${response.errors[0].message}`)
        } else {
            notify(`Failed to reject ${currentSwipeUser.imaginaryName} - Unknown reason`)
        }
    }
}

async function handleSwipe() {
    if (!currentSwipeUsers || !currentSwipeUsers.data?.discovery?.nodes?.length) {
        return
    }

    if (!currentSwipeUsers.data.discovery.hasNextBatch) {
        notify("You're ran out of people to swipe")
        return
    }

    currentSwipeUsers.data.discovery.nodes.shift()

    if (currentSwipeUsers.data.discovery.nodes.length > 0) {
        loadUserInSwipe()
    } else {
        currentSwipeUser = null

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
        }
    }
}

function swipeNextUser() {
    if (!currentSwipeUsers || !currentSwipeUsers.data?.discovery?.nodes?.length) {
        notify("No more users to swipe");
        return;
    }

    if (currentSwipeUser) {
        swipeHistory.push(currentSwipeUser);
    }

    currentSwipeUsers.data.discovery.nodes.shift();

    if (currentSwipeUsers.data.discovery.nodes.length > 0) {
        loadUserInSwipe();
    } else {
        notify("No more users available");
        currentSwipeUser = null;
    }
}

function goBackUser() {
    while (swipeHistory.length > 0) {
        var previousUser = swipeHistory.pop();

        if (!removedUsers.has(previousUser.id)) {
            currentSwipeUsers.data.discovery.nodes.unshift(previousUser);
            loadUserInSwipe();
            return;
        }
    }

    notify("No user to go back to");
}