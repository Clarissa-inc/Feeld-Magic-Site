// Libraries
const { v4: randomUuid } = require("uuid")
const crypto = require("crypto")
const axios = require("axios")
const https = require("https")

// Variables
const signingHost = Buffer.from("ZmVlbGQuanVzdGFnaG9zdC5iaXo=", "base64")
const sentryPublicKey = "9b7d845ff1ee4461a7129aecccd888d5"
const hexadecimalCharacters = "0123456789abcdef"
const feeldVersion = "7.22.0"

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
            "x-app-version": feeldVersion,
            "sentry-trace": sentryTraceId,
            "baggage": [
                `sentry-environment=production`,
                `sentry-release=${feeldVersion}`,
                `sentry-public_key=${sentryPublicKey}`,
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
            var response = await axios.post("https://core.api.fldcore.com/graphql", jsonData, {
                headers: headers
            });

            return { statusCode: response.status, data: response.data }
        } catch (error) {
            console.log(error)

            return { statusCode: 500, data: {} }
        }
    },

    firebaseRequest: async function(jsonData) {
        try {
            var headers = baseFirebaseHeaders

            headers["x-firebase-gmpid"] = `1:594152761603:ios:${this.generateGmpid()}`
            headers["user-agent"] = `FirebaseAuth.iOS/11.5.0 com.3nder.threender/${feeldVersion} iPhone/18.3.1 hw/iPhone16_1`

            var response = await axios.post("https://www.googleapis.com/identitytoolkit/v3/relyingparty/emailLinkSignin?key=AIzaSyD9o9mzulN50-hqOwF6ww9pxUNUxwVOCXA", jsonData, {
                headers: baseFirebaseHeaders
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
            headers["user-agent"] = `FirebaseAuth.iOS/11.5.0 com.3nder.threender/${feeldVersion} iPhone/18.3.1 hw/iPhone16_1`

            var response = await axios.post(`https://securetoken.googleapis.com/v1/token?key=AIzaSyD9o9mzulN50-hqOwF6ww9pxUNUxwVOCXA`, {
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
            var response = await axios.post(`https://${signingHost}/ios/sign`, {}, {
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
    }
}