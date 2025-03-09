var currentInformation = {
    profileDisplayName: null,
    gender: null,
    sexuality: null,
    bio: null,
    photoOrder: null,
    interests: null,
    desires: null,
    location: "",
    lookingFor: null
}

function setAccountInformation(data, searchSettingsData) {
    var profileBio = document.getElementById("profileBio");
    var charCount = document.getElementById("charCount");
    var profileDisplayName = document.getElementById("profileDisplayName")

    var interestsElement = document.getElementById("interests")
    var interestsLabel = document.getElementById("interestsLabel")

    profileBio.value = ""
    profileDisplayName.value = ""

    profileBio.value = data["data"]["profile"]["bio"]
    currentInformation["bio"] = data["data"]["profile"]["bio"] || ""

    charCount.textContent = `${1500 - profileBio.value.length} characters remaining`

    profileDisplayName.value = data["data"]["profile"]["imaginaryName"]
    currentInformation["profileDisplayName"] = data["data"]["profile"]["imaginaryName"]

    if (data["data"]["profile"]["interests"]) {
        currentInformation["interests"] = data["data"]["profile"]["interests"]

        if (data["data"]["profile"]["interests"].length >= 1) {
            interestsElement.value = data["data"]["profile"]["interests"].join(", ")
            interestsLabel.textContent = `Interests (${data["data"]["profile"]["interests"]}/10)`
        }
    }

    setGender(data["data"]["profile"]["gender"])
    currentInformation["gender"] = data["data"]["profile"]["gender"]

    setSexuality(data["data"]["profile"]["sexuality"])
    currentInformation["sexuality"] = data["data"]["profile"]["sexuality"]

    var profileDateOfBirth = document.getElementById("profileDateOfBirth")
    profileDateOfBirth.value = `${new Date(data["data"]["profile"]["dateOfBirth"]).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} (${data["data"]["profile"]["age"]} years old)`

    handlePhotos(data["data"]["profile"]["photos"])
    currentInformation["photoOrder"] = data["data"]["profile"]["photos"].map(photo => photo.publicId)

    document.getElementById("settingsProfilePicturesLabel").textContent = `Profile Pictures (${data["data"]["profile"]["photos"].length}/6)`

    handleDesires(data["data"]["profile"]["desires"])
    currentInformation["desires"] = data["data"]["profile"]["desires"]

    currentInformation["lookingFor"] = searchSettingsData.data.profile.lookingFor
    handleLookingFor(searchSettingsData.data.profile.lookingFor)
}

function handlePhotos(photos) {
    var photoGrid = document.getElementById("photoGrid");
    photoGrid.innerHTML = "";

    photos.forEach((photoObj, index) => {
        if (photoObj.__typename == "Picture" && !photoObj.pictureIsPrivate) {
            var img = document.createElement("img");
            img.src = photoObj.pictureUrl;
            img.alt = photoObj.publicId;
            img.id = photoObj.id;
            img.classList.add("photo");
            img.setAttribute("draggable", "true");
            img.setAttribute("data-index", index);

            img.addEventListener("dragstart", handleDragStart);
            img.addEventListener("dragover", handleDragOver);
            img.addEventListener("drop", handleDrop);

            photoGrid.appendChild(img);
        }
    });

    let dragSrcElement = null;

    function handleDragStart(event) {
        dragSrcElement = event.target;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", event.target.dataset.index);
    }

    function handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }

    function handleDrop(event) {
        event.preventDefault();

        const draggedIndex = parseInt(event.dataTransfer.getData("text/plain"), 10);
        const targetIndex = parseInt(event.target.dataset.index, 10);

        if (draggedIndex !== targetIndex) {
            const draggedElement = photoGrid.querySelector(`[data-index="${draggedIndex}"]`);
            const targetElement = photoGrid.querySelector(`[data-index="${targetIndex}"]`);

            draggedElement.dataset.index = targetIndex;
            targetElement.dataset.index = draggedIndex;

            if (targetIndex > draggedIndex) {
                targetElement.after(draggedElement);
            } else {
                targetElement.before(draggedElement);
            }
        }
    }
}

function handleDesires(desires) {
    const desiresCategoriesContainer = document.getElementById("availableDesiresCategories");
    const currentDesiresTitle = document.getElementById("currentDesiresLabel")

    desiresCategoriesContainer.innerHTML = "";

    const currentDesires = new Set(desires);

    currentDesiresTitle.innerText = `Desires (${currentDesires.size}/10)`;

    const categories = constants.possibleDesires["data"]["desiresByCategoryLocalised"];
    categories.forEach(category => {
        const categoryDiv = document.createElement("div");
        categoryDiv.classList.add("compact-category");
        categoryDiv.classList.add("cleanText")

        const categoryTitle = document.createElement("h4");
        categoryTitle.textContent = category.localisedCategory;
        categoryTitle.classList.add("cleanText")
        categoryDiv.appendChild(categoryTitle);

        const desiresList = document.createElement("ul");

        Object.keys(category.desires).forEach(key => {
            const desire = category.desires[key];
            const desireItem = document.createElement("li");
            desireItem.textContent = capitalizeFirstLetterWithSpaces(desire.localisedString);
            desireItem.classList.add("compact-item");
            desireItem.classList.add("cleanText");
            desireItem.setAttribute("data-desire", key);

            if (currentDesires.has(key)) {
                desireItem.classList.add("selected");
            }

            desireItem.addEventListener("click", () => {
                if (!currentDesires.has(key) && currentDesires.size >= 10) {
                    notify("You can only select up to 10 desires");
                    return;
                }

                toggleDesireSelection(key, desireItem);
            });

            desiresList.appendChild(desireItem);
        });

        categoryDiv.appendChild(desiresList);
        desiresCategoriesContainer.appendChild(categoryDiv);

        categoryTitle.addEventListener("click", () => {
            desiresList.classList.toggle("show");
        });
    });

    function toggleDesireSelection(key, element) {
        if (currentDesires.has(key)) {
            currentDesires.delete(key);
            element.classList.remove("selected");
        } else {
            currentDesires.add(key);
            element.classList.add("selected");
        }

        currentDesiresTitle.innerText = `Desires (${currentDesires.size}/10)`;
    }
}

function handleLookingFor(currentLookingForArr) {
    const lookingForCategoriesContainer = document.getElementById("availableLookingForCategories");

    lookingForCategoriesContainer.innerHTML = "";

    const currentLookingFor = new Set(currentLookingForArr);

    const categoryDiv = document.createElement("div");
    categoryDiv.classList.add("compact-category");
    categoryDiv.classList.add("cleanText");

    const categoryTitle = document.createElement("h4");
    categoryTitle.textContent = "Options"
    categoryTitle.classList.add("cleanText");
    categoryDiv.appendChild(categoryTitle);

    const lookingForList = document.createElement("ul");

    constants.lookingForOptions.forEach(key => {
        const lookingFor = capitalizeFirstLetterWithSpaces(key.replaceAll("_", " "))
        const lookingForItem = document.createElement("li");
        lookingForItem.textContent = lookingFor;
        lookingForItem.classList.add("compact-item");
        lookingForItem.classList.add("cleanText");
        lookingForItem.setAttribute("data-lookingFor", key);

        if (currentLookingFor.has(key)) {
            lookingForItem.classList.add("selected");
        }

        lookingForItem.addEventListener("click", () => {
            toggleDesireSelection(key, lookingForItem);
        });

        lookingForList.appendChild(lookingForItem);
    });

    categoryDiv.appendChild(lookingForList);
    lookingForCategoriesContainer.appendChild(categoryDiv);

    categoryTitle.addEventListener("click", () => {
        lookingForList.classList.toggle("show");
    });

    function toggleDesireSelection(key, element) {
        if (currentLookingFor.has(key)) {
            currentLookingFor.delete(key);
            element.classList.remove("selected");
        } else {
            currentLookingFor.add(key);
            element.classList.add("selected");
        }
    }
}

function addBioChangeEvent() {
    var profileBio = document.getElementById("profileBio");
    var charCount = document.getElementById("charCount");

    profileBio.addEventListener("input", () => {
        var remaining = 1500 - profileBio.value.length;
        charCount.textContent = `${remaining} characters remaining`;
    });
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function setGender(currentGender) {
    var genderSelector = document.getElementById("gender-selector");
    genderSelector.innerHTML = "";

    var currentGenderOption = document.createElement("option")

    currentGenderOption.value = currentGender
    currentGenderOption.textContent = capitalizeFirstLetterWithSpaces(currentGender.toLowerCase().replaceAll("_", " ").replaceAll("-", ""))
    genderSelector.appendChild(currentGenderOption)

    currentGender = currentGender.replaceAll("_", " ").replaceAll("-", " ").toLowerCase()

    constants.possibleGenders.forEach(option => {
        option = option.replaceAll("_", " ").replaceAll("-", " ").toLowerCase()

        if (option != currentGender) {
            var newGenderOption = document.createElement("option")

            newGenderOption.value = option.replaceAll(" ", "_").toUpperCase()
            newGenderOption.textContent = capitalizeFirstLetterWithSpaces(option)
            genderSelector.appendChild(newGenderOption)
        }
    });
}

function setSexuality(currentSexuality) {
    var sexualitySelector = document.getElementById("sexuality-selector");
    sexualitySelector.innerHTML = "";

    var currentSexualityOption = document.createElement("option")

    currentSexualityOption.value = currentSexuality
    currentSexualityOption.textContent = capitalizeFirstLetterWithSpaces(currentSexuality.toLowerCase().replaceAll("_", " ").replaceAll("-", ""))
    sexualitySelector.appendChild(currentSexualityOption)

    currentSexuality = currentSexuality.replaceAll("_", " ").replaceAll("-", " ").toLowerCase()

    constants.possibleSexualities.forEach(option => {
        option = option.replaceAll("_", " ").replaceAll("-", " ").toLowerCase()

        if (option != currentSexuality) {
            var newSexualityOption = document.createElement("option")

            newSexualityOption.value = option.replaceAll(" ", "_").toUpperCase()
            newSexualityOption.textContent = capitalizeFirstLetterWithSpaces(option)
            sexualitySelector.appendChild(newSexualityOption)
        }
    });
}

function updateInterestsLabel(currentInterests) {
    var interestsArray = currentInterests.value.split(",").map(interest => interest.trim()).filter(interest => interest !== "")
    
    if (interestsArray.length > 10) {
        notify("You cannot have more than 10 interests")

        currentInterests.value = interestsArray.slice(0, 10).join(", ")
        interestsArray = interestsArray.slice(0, 10)
    }

    document.getElementById("interestsLabel").textContent = `Interests (${interestsArray.length}/10)`;
}

function arraysAreDifferent(arrayOne, arrayTwo) {
    if (!Array.isArray(arrayOne) || !Array.isArray(arrayTwo)) return true;
    if (arrayOne.length !== arrayTwo.length) return true;

    return arrayOne.some((value, index) => value !== arrayTwo[index]);
}