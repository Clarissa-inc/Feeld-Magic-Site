// Libraries
const app = require("express").Router()
const jwt = require("jsonwebtoken")
const util = require("./util")
const fs = require("fs")

// Variables
var { api, feeld } = require("./config")

app.post("/loadImage", async function(request, response) {
    try {
        var { imageUrl } = request.body;

        if (!imageUrl)
            return response.status(200).json({ success: false })

        var imageData = await util.getImage(imageUrl)

        if (!imageData)
            return response.status(200).json({ success: false })

        return response.status(200).json({ success: true, imageData: `data:image/png;base64,${imageData}` })
    } catch (error) {
        return response.status(500).json({ success: false })
    }
});

app.post("/feeldRequest", async function(request, response) {
    try {
        var { operationName } = request.body;

        if (!operationName)
            return response.status(500).json({});

        if (operationName === "Logout") {
            fs.writeFileSync("./data/account.json", JSON.stringify({ "profileId": null, "accessToken": null, "refreshToken": null }, null, "\t"))

            return response.status(200).json({ success: true })
        }

        if (operationName === "ReportBug") {
            await util.reportBug(request.body.report, request.body.username)
            return response.status(200).end()
        }

        var headers = null

        if (operationName === "SignInLink")
            headers = util.generateFeeldHeaders(false, "null")

        if (operationName === "ProfileLike" || operationName == "ProfileDislike" || operationName == "FilteredWhoLikesMe" || operationName == "WhoPingsMe" || operationName == "DiscoverProfiles" || operationName == "AccountHome" || operationName == "DiscoverSearchSettingsQuery" || operationName == "ProfileQuery" || operationName == "ConnectionsModalQuery") {
            await util.ensureAccessTokenIsValid()

            var account = JSON.parse(fs.readFileSync("./data/account.json"))

            headers = util.generateFeeldHeaders(account["accessToken"], account["profileId"])
        }

        var feeldResponse = await util.feeldRequest(headers, request.body)

        return response.status(feeldResponse.statusCode).json(feeldResponse.data)
    } catch (error) {
        console.log(error)

        response.status(500).json({ success: false, message: "Error on the backend" });
    }
})

app.post("/firebaseRequest", async function(request, response) {
    try {
        var { oobCode } = request.body;

        if (!oobCode)
            return response.status(500).json({});

        var feeldResponse = await util.firebaseRequest(request.body)

        if (feeldResponse.statusCode === 200) {
            if (feeldResponse.data.refreshToken) {
                fs.writeFileSync("./data/account.json", JSON.stringify({ "profileId": null, "accessToken": feeldResponse.data.idToken, "refreshToken": feeldResponse.data.refreshToken }, null, "\t"));

                return response.status(200).json({ success: true })
            } else
                return response.status(200).json({ success: false })
        } else
            return response.status(200).json({ success: false })
    } catch (error) {
        console.log(error)

        response.status(500).json({ success: false, message: "Error on the backend" });
    }
})

app.get("/login", function(request, response) {
    try {
        if (util.ensureUserIsntUsingPhone(request))
            return response.render("error", { error: "I've blocked mobile devices from using this aswell as Safari as for some reason it refuses to work" });

        return response.render("login")
    } catch (error) {
        console.log("Error -", error)

        return response.render("error", { error: "Error while trying to load" });
    }
})

app.get("/", async function(request, response) {
    try {
        if (util.ensureUserIsntUsingPhone(request))
            return response.render("error", { error: "I've blocked mobile devices from using this aswell as Safari as for some reason it refuses to work" });

        var account = JSON.parse(fs.readFileSync("./data/account.json"))

        if (account["accessToken"] == null)
            return response.redirect("/login")

        await util.ensureAccessTokenIsValid()

        account = JSON.parse(fs.readFileSync("./data/account.json"))

        if (account["profileId"] === null) {
            var apiKey = fs.readFileSync("./data/apiKey.txt").toString().trim()

            if (apiKey.length === 0) {
                console.log("[-] You haven't set your apiKey, contact developer for a key")
                return response.render("error", { error: "invalid apiKey, unable to login to account" });
            }

            var signedData = await util.signRequest(apiKey)

            if (!signedData) {
                console.log("[-] Failed to sign request, key is more than likely invalid")
                return response.render("error", { error: "Failed to sign request, key is more than likely invalid" });
            }

            var feeldResponse = await util.feeldRequest(util.generateFeeldHeaders(account["accessToken"], "null"), {
                "operationName": "AuthProviderSigninMutation",
                "query": "mutation AuthProviderSigninMutation($input: SignInInput!) {\n  signin(input: $input) {\n    ...AuthProviderFragment\n    __typename\n  }\n}\n\nfragment AuthProviderFragment on Account {\n  id\n  email\n  analyticsId\n  status\n  isFinishedOnboarding\n  isMajestic\n  upliftExpirationTimestamp\n  isUplift\n  isDistanceInMiles\n  language\n  location {\n    device {\n      country\n      __typename\n    }\n    __typename\n  }\n  profiles {\n    ...AuthProfile\n    __typename\n  }\n  __typename\n}\n\nfragment AuthProfile on Profile {\n  imaginaryName\n  verificationLimits {\n    attemptsAvailable\n    __typename\n  }\n  canVerify\n  photos {\n    pictureUrl\n    pictureStatus\n    ...PictureVerificationMeta\n    ...GetPictureUrlFragment\n    __typename\n  }\n  verificationStatus\n  ...ChatUser\n  ...AnalyticsOwnProfileFragment\n  ...ProfilePairsFragment\n  __typename\n}\n\nfragment PictureVerificationMeta on Picture {\n  id\n  verification {\n    status\n    updatedAt\n    sessionUrl\n    failureReason\n    attempts\n    __typename\n  }\n  enrollment {\n    sessionId\n    status\n    updatedAt\n    failureReason\n    __typename\n  }\n  __typename\n}\n\nfragment GetPictureUrlFragment on Picture {\n  id\n  publicId\n  pictureIsSafe\n  pictureIsPrivate\n  pictureUrl\n  __typename\n}\n\nfragment ChatUser on Profile {\n  id\n  streamToken\n  streamUserId\n  __typename\n}\n\nfragment AnalyticsOwnProfileFragment on Profile {\n  id\n  age\n  ageRange\n  desires\n  desiringFor\n  analyticsId\n  distanceMax\n  isUplift\n  recentlyOnline\n  isIncognito\n  status\n  isMajestic\n  gender\n  dateOfBirth\n  lookingFor\n  sexuality\n  allowPWM\n  enableChatContentModeration\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment ProfilePairsFragment on Profile {\n  id\n  pairCount\n  profilePairs {\n    ...ProfilePair\n    __typename\n  }\n  __typename\n}\n\nfragment ProfilePair on ProfilePair {\n  identityId\n  createdAt\n  partnerLabel\n  otherProfile {\n    id\n    age\n    imaginaryName\n    dateOfBirth\n    gender\n    sexuality\n    isIncognito\n    photos {\n      ...GetPictureUrlFragment\n      __typename\n    }\n    ...ProfileInteractionStatusFragment\n    status\n    verificationStatus\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileInteractionStatusFragment on Profile {\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  __typename\n}",
                "variables": {
                    "input": {
                        "deviceFingerprint": signedData["deviceFingerprintId"],
                        "deviceId": signedData["deviceUId"]
                    }
                }
            })

            if (!feeldResponse) {
                console.log("[-] Failed to make login request to get profileId, your ip may have a bad score")
                return response.render("error", { error: "Failed to make login request to get profileId, your ip may have a bad score" });
            }

            if (!JSON.stringify(feeldResponse.data).includes("profile#")) {
                console.log("[-] Failed to login, if you refresh the page and it fails again then contact developer")
                return response.render("error", { error: feeldResponse.data.errors[0].message });
            } else {
                account["profileId"] = feeldResponse.data.data.signin.profiles[0].id

                fs.writeFileSync("./data/account.json", JSON.stringify(account, null, "\t"));
            }
        }

        var profileQueryResponse = await util.feeldRequest(util.generateFeeldHeaders(account["accessToken"], account["profileId"]), {
            "operationName": "AuthProviderQuery",
            "query": "query AuthProviderQuery {\n  account {\n    ...AuthProviderFragment\n    __typename\n  }\n}\n\nfragment AuthProviderFragment on Account {\n  id\n  email\n  analyticsId\n  status\n  isFinishedOnboarding\n  isMajestic\n  upliftExpirationTimestamp\n  isUplift\n  isDistanceInMiles\n  language\n  location {\n    device {\n      country\n      __typename\n    }\n    __typename\n  }\n  profiles {\n    ...AuthProfile\n    __typename\n  }\n  __typename\n}\n\nfragment AuthProfile on Profile {\n  imaginaryName\n  verificationLimits {\n    attemptsAvailable\n    __typename\n  }\n  canVerify\n  photos {\n    pictureUrl\n    pictureStatus\n    ...PictureVerificationMeta\n    ...GetPictureUrlFragment\n    __typename\n  }\n  verificationStatus\n  ...ChatUser\n  ...AnalyticsOwnProfileFragment\n  ...ProfilePairsFragment\n  __typename\n}\n\nfragment PictureVerificationMeta on Picture {\n  id\n  verification {\n    status\n    updatedAt\n    sessionUrl\n    failureReason\n    attempts\n    __typename\n  }\n  enrollment {\n    sessionId\n    status\n    updatedAt\n    failureReason\n    __typename\n  }\n  __typename\n}\n\nfragment GetPictureUrlFragment on Picture {\n  id\n  publicId\n  pictureIsSafe\n  pictureIsPrivate\n  pictureUrl\n  __typename\n}\n\nfragment ChatUser on Profile {\n  id\n  streamToken\n  streamUserId\n  __typename\n}\n\nfragment AnalyticsOwnProfileFragment on Profile {\n  id\n  age\n  ageRange\n  desires\n  desiringFor\n  analyticsId\n  distanceMax\n  isUplift\n  recentlyOnline\n  isIncognito\n  status\n  isMajestic\n  gender\n  dateOfBirth\n  lookingFor\n  sexuality\n  allowPWM\n  enableChatContentModeration\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment ProfilePairsFragment on Profile {\n  id\n  pairCount\n  profilePairs {\n    ...ProfilePair\n    __typename\n  }\n  __typename\n}\n\nfragment ProfilePair on ProfilePair {\n  identityId\n  createdAt\n  partnerLabel\n  otherProfile {\n    id\n    age\n    imaginaryName\n    dateOfBirth\n    gender\n    sexuality\n    isIncognito\n    photos {\n      ...GetPictureUrlFragment\n      __typename\n    }\n    ...ProfileInteractionStatusFragment\n    status\n    verificationStatus\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileInteractionStatusFragment on Profile {\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  __typename\n}",
            "variables": {}
        })

        if (!profileQueryResponse) {
            console.log("[-] Failed to get profile information, this should never happen")
            return response.render("error", { error: "Failed to get profile information, this should never happen" });
        }

        if (profileQueryResponse.data.errors)
            return response.render("error", { error: profileQueryResponse.data.errors[0].message })

        var changelog = await util.getChangelog()

        if (!changelog) {
            console.log("[-] Failed to get changelog, backend may be down")
            return response.render("error", { error: "Failed to get changelog, backend may be down" });
        }

        return response.render("index", { "siteVersion": api.version, "feeldVersion": feeld.version, profileQueryResponse: profileQueryResponse.data, changelog })
    } catch (error) {
        console.log("Error -", error)

        return response.render("error", { error: "Error while trying to load" });
    }
})

module.exports = app;