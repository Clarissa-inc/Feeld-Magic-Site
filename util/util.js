// Libraries
const { createHTTP2Adapter } = require("axios-http2-adapter")
const { v4: randomUuid } = require("uuid")
const http2 = require("http2-wrapper")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const axios = require("axios")
const https = require("https")
const fs = require("fs")

// Variables
const signingHost = Buffer.from("ZmVlbGQuanVzdGFnaG9zdC5iaXo=", "base64")
const hexadecimalCharacters = "0123456789abcdef"
var { feeld } = require("./config")
var axiosClient = null

// Firebase Headers
var baseFirebaseHeaders = {
    "x-client-version": "iOS/FirebaseSDK/11.5.0/FirebaseCore-iOS",
    "content-type": "application/json",
    "accept": "*/*",
    "x-ios-bundle-identifier": "com.3nder.threender",
    "accept-language": "en",
    "accept-encoding": "gzip, deflate, x-ios-bundle-identifier"
}

module.exports = {
    generateHex: function(length) {
        return crypto.randomBytes(length).toString("hex")
    },

    generateSentryTrace: function() {
        var traceId = this.generateHex(16)
        var spanId = this.generateHex(8)

        return `${traceId}-${spanId}`
    },

    generateFeeldHeaders: function(accessToken, profileId) {
        var sentryTraceId = this.generateSentryTrace()

        var baseFeeldHeaders = {
            "accept": "*/*",
            "x-transaction-id": randomUuid(),
            "x-profile-id": profileId,
            "x-app-version": feeld.version,
            "sentry-trace": sentryTraceId,
            "baggage": [
                `sentry-environment=production`,
                `sentry-release=${feeld.version}`,
                `sentry-public_key=${feeld.sentryPublicKey}`,
                `sentry-trace_id=${sentryTraceId.split("-")[0]}`
            ].join(","),
            "x-device-os": "ios",
            "accept-language": "en-GB,en;q=0.9",
            "accept-encoding": "gzip, deflate, br",
            "user-agent": "feeld-mobile"
        };

        if (accessToken)
            baseFeeldHeaders["authorization"] = `Bearer ${accessToken}`

        return baseFeeldHeaders
    },

    generateGmpid: function() {
        var gmpid = ""

        for (var i = 0; i < 24; i++)
            gmpid += hexadecimalCharacters.charAt(Math.floor(Math.random() * hexadecimalCharacters.length));

        return gmpid
    },

    feeldRequest: async function(headers, jsonData) {
        try {
            var response = await axiosClient.post("https://core.api.fldcore.com/graphql", jsonData, {
                headers: headers
            });

            return { statusCode: response.status, data: response.data }
        } catch (error) {
            console.log(error)
            console.log(JSON.stringify(error.response.data))

            return { statusCode: 500, data: {} }
        }
    },

    firebaseRequest: async function(jsonData) {
        try {
            var headers = baseFirebaseHeaders

            headers["x-firebase-gmpid"] = `1:594152761603:ios:${this.generateGmpid()}`
            headers["user-agent"] = `FirebaseAuth.iOS/11.5.0 com.3nder.threender/${feeld.version} iPhone/18.3.1 hw/iPhone16_1`

            var response = await axiosClient.post("https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=AIzaSyD9o9mzulN50-hqOwF6ww9pxUNUxwVOCXA", jsonData, {
                headers: headers
            });

            return { statusCode: response.status, data: response.data }
        } catch (error) {
            console.log(error)

            return { statusCode: 500, data: {} }
        }
    },

    refreshAccessToken: async function(refreshToken) {
        try {
            var headers = baseFirebaseHeaders

            headers["x-firebase-gmpid"] = `1:594152761603:ios:${this.generateGmpid()}`
            headers["user-agent"] = `FirebaseAuth.iOS/11.5.0 com.3nder.threender/${feeld.version} iPhone/18.3.1 hw/iPhone16_1`

            var response = await axiosClient.post(`https://securetoken.googleapis.com/v1/token?key=AIzaSyD9o9mzulN50-hqOwF6ww9pxUNUxwVOCXA`, {
                "grantType": "refresh_token",
                "refreshToken": refreshToken
            }, {
                headers: headers
            });

            if (response.status !== 200)
                return false;

            if (response.data && response.data.access_token) {
                return response.data["access_token"]
            } else
                return false
        } catch (error) {
            return false;
        }
    },

    signRequest: async function(apiKey) {
        try {
            var response = await axiosClient.post(`https://${signingHost}/ios/sign`, {}, {
                headers: {
                    "X-WeDaBess": apiKey
                }
            });

            if (response.status !== 200)
                return false;

            return response.data
        } catch (error) {
            return false
        }
    },

    getLatestVersion: async function(apiKey) {
        try {
            var response = await axiosClient.post(`https://${signingHost}/latestVersion`, {}, {});

            if (response.status !== 200)
                return false;

            return response.data["version"]
        } catch (error) {
            return false
        }
    },

    getChangelog: async function() {
        try {
            var response = await axiosClient.get(`https://${signingHost}/changelog`);

            if (response.status !== 200)
                return false;

            return response.data
        } catch (error) {
            return false
        }
    },

    reportBug: async function(report, redditUsername) {
        try {
            var response = await axiosClient.post(`https://${signingHost}/reportBug`, {
                "report": report,
                "username": redditUsername
            }, {});

            if (response.status !== 200)
                return false;

            return response.data
        } catch (error) {
            return false
        }
    },

    ensureAccessTokenIsValid: async function() {
        var account = JSON.parse(fs.readFileSync("./data/account.json"))

        var decodedAccessToken = jwt.decode(account["accessToken"])

        if (decodedAccessToken["exp"] < Math.floor(Date.now() / 1000)) {
            var newAccessToken = await this.refreshAccessToken(account["refreshToken"])

            if (newAccessToken == false)
                return response.status(500).json({ error: "Failed to refresh access token" })

            account["accessToken"] = newAccessToken

            fs.writeFileSync("./data/account.json", JSON.stringify(account, null, "\t"));
        }
    },

    ensureUserIsntUsingPhone: function(request) {
        try {
            var userAgent = request.headers["user-agent"] || "";
            var mobileRegex = /Android|iPhone|iPad|iPod|Windows Phone/i;

            var safariRegex = /Safari/i;
            var chromeRegex = /Chrome|Chromium|Edg/i;

            var isMobile = mobileRegex.test(userAgent);
            var isSafari = safariRegex.test(userAgent) && !chromeRegex.test(userAgent);

            if (isMobile || isSafari)
                return true
        } catch (error) {
            return false
        }
    },

    getImage: async function(imageUrl) {
        return new Promise((resolve, reject) => {
            https.get(imageUrl, {
                headers: {
                    "user-agent": `Feeld/${feeld.version} (iPhone; iOS 18.3.1; Scale/3.00)`,
                    "accept": "image/*,*/*;q=0.8",
                    "accept-language": "en-GB,en;q=0.9",
                    "accept-encoding": "gzip, deflate, br",
                    Connection: "keep-alive"
                }
            }, (response) => {
                if (response.statusCode !== 200) return resolve(false);

                response.setEncoding("base64");
                let base64 = "";

                response.on("data", (chunk) => base64 += chunk);
                response.on("end", () => resolve(base64));
            }).on("error", reject);
        });
    },

    initAxiosClient: async function() {
        axiosClient = axios.create({
            adapter: createHTTP2Adapter({
                agent: new http2.Agent({
                    maxSessions: 500,
                    maxFreeSessions: 50,
                    timeout: 10000,
                    rejectUnauthorized: false
                }),
                force: true
            })
        });

        return true
    }
}