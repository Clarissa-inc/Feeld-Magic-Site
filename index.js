// Libraries
const bodyParser = require("body-parser")
const { createServer } = require("http")
const jwt = require("jsonwebtoken")
const util = require("./util/util")
const express = require("express")
const fs = require("fs")

// App
const app = express()

// App Helpers
app.use(express.static(__dirname + "/web/assets"))
app.set("views", "./web/frontend")
app.set("view engine", "ejs")
app.use(bodyParser.json())

async function ensureAccessTokenIsValid() {
    var account = JSON.parse(fs.readFileSync("./data/account.json"))

    var decodedAccessToken = jwt.decode(account["accessToken"])

    if (decodedAccessToken["exp"] < Math.floor(Date.now() / 1000)) {
        var newAccessToken = await util.refreshAccessToken(account["refreshToken"])

        if (newAccessToken == false)
            return response.status(500).json({ error: "Failed to refresh access token" })

        account["accessToken"] = newAccessToken

        fs.writeFileSync("./data/account.json", JSON.stringify(account, null, "\t"));
    }
}

app.post("/feeldRequest", async function(request, response) {
    try {
        var { operationName } = request.body;

        if (!operationName)
            return response.status(500).json({});

        var headers = null

        if (operationName === "SignInLink")
            headers = util.generateFeeldHeaders(false, "null")

        if (operationName === "ProfileLike" || operationName == "ProfileDislike") {
            await ensureAccessTokenIsValid()

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
        return response.render("login")
    } catch (error) {
        console.log("Error -", error)

        return response.status(500).json({ error: "Error while trying to load" })
    }
})

app.get("/", async function(request, response) {
    try {
        var account = JSON.parse(fs.readFileSync("./data/account.json"))

        if (account["accessToken"] == null)
            return response.redirect("/login")

        await ensureAccessTokenIsValid()

        if (account["profileId"] === null) {
            var apiKey = fs.readFileSync("./data/apiKey.txt").toString().trim()

            if (apiKey.length === 0) {
                console.log("[-] You haven't set your apiKey, contact developer for a key")
                return response.status(500).json({ error: "invalid apiKey, unable to login to account" })
            }

            var signedData = await util.signRequest(apiKey)

            if (!signedData) {
                console.log("[-] Failed to sign request, key is more than likely invalid")
                return response.status(500).json({ error: "Failed to sign request, key is more than likely invalid" })
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
                return response.status(500).json({ error: "Failed to make login request to get profileId, your ip may have a bad score" })
            }

            if (!JSON.stringify(feeldResponse.data).includes("profile#")) {
                console.log("[-] Failed to login, if you refresh the page and it fails again then contact developer")
                return response.status(500).json({ error: "Failed to login, if you refresh the page and it fails again then contact developer" })
            } else {
                account["profileId"] = feeldResponse.data.data.signin.profiles[0].id

                fs.writeFileSync("./data/account.json", JSON.stringify(account, null, "\t"));
            }
        }

        var likesResponse = await util.feeldRequest(util.generateFeeldHeaders(account["accessToken"], account["profileId"]), {
            "operationName": "FilteredWhoLikesMe",
            "query": "mutation FilteredWhoLikesMe($input: FilteredInteractionInput!, $cursor: String) {\n  filteredWhoLikesMe(input: $input, cursor: $cursor) {\n    filters {\n      ageRange\n      desires\n      lookingFor\n      sexualities\n      __typename\n    }\n    profiles {\n      nodes {\n        ...LikesProfileFragment\n        __typename\n      }\n      pageInfo {\n        total\n        unfilteredTotal\n        hasNextPage\n        nextPageCursor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment LikesProfileFragment on Profile {\n  id\n  age\n  gender\n  status\n  lastSeen\n  isUplift\n  sexuality\n  isMajestic\n  dateOfBirth\n  streamUserId\n  imaginaryName\n  allowPWM\n  verificationStatus\n  interactionStatus {\n    message\n    mine\n    theirs\n    __typename\n  }\n  profilePairs {\n    identityId\n    __typename\n  }\n  distance {\n    km\n    mi\n    __typename\n  }\n  location {\n    ...ProfileLocationFragment\n    __typename\n  }\n  photos {\n    ...PhotoCarouselPictureFragment\n    __typename\n  }\n  __typename\n}\n\nfragment ProfileLocationFragment on ProfileLocation {\n  ... on DeviceLocation {\n    device {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  ... on VirtualLocation {\n    core\n    __typename\n  }\n  ... on TeleportLocation {\n    current: device {\n      city\n      country\n      __typename\n    }\n    teleport {\n      latitude\n      longitude\n      geocode {\n        city\n        country\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment PhotoCarouselPictureFragment on Picture {\n  id\n  pictureIsPrivate\n  pictureIsSafe\n  pictureStatus\n  pictureType\n  pictureUrl\n  publicId\n  verification {\n    status\n    __typename\n  }\n  __typename\n}",
            "variables": {
                "input": {
                    "filters": {
                        "ageRange": false
                    },
                    "sortBy": "LAST_INTERACTION"
                }
            }
        })

        if (!likesResponse) {
            console.log("[-] Failed to get likes, odd")
            return response.status(500).json({ error: "Failed to get likes, odd" })
        }

        if (likesResponse.data.data && likesResponse.data.data.filteredWhoLikesMe) {
            return response.render("index", { "likesResponse": likesResponse.data })
        } else {
            console.log("[-] Failed to get likes, odd")
            return response.status(500).json({ error: "Failed to get likes, odd" })
        }
    } catch (error) {
        console.log("Error -", error)

        return response.status(500).json({ error: "Error while trying to load" })
    }
})

createServer(app).listen(7331, () => {
    if (fs.readFileSync("./data/apiKey.txt").toString().trim().length === 0) {
        console.log("[-] apiKey hasn't been set, contact developer for a key")

        return process.exit(0)
    }

    app.disable("x-powered-by") && app.disable("etag") && app.disable("date")

    console.log("[?] Any problems contact me on Reddit; feeldghost\n")

    console.log("[?] Started site at http://localhost:7331\n")
})