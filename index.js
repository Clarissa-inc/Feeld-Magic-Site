// Libraries
const bodyParser = require("body-parser")
const { createServer } = require("http")
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

// Variables
var { api, feeld } = require("./util/config")

app.use("", require("./util/routes"))

createServer(app).listen(7331, async () => {
    if (fs.readFileSync("./data/apiKey.txt").toString().trim().length === 0) {
        console.log("[-] apiKey hasn't been set, contact developer for a key")

        return process.exit(0)
    }

    var latestVersion = await util.getLatestVersion()

    if (latestVersion === false) {
        console.log(`[-] Backend is down, exiting...`)

        return process.exit(0)
    }

    if (latestVersion !== api.version) {
        var changelog = await util.getChangelog()

        console.log(`[-] You aren't using the latest version (${api.version}), please update to the latest version - https://github.com/feeldghost/Feeld-Magic-Site\n\n[?] Latest version --> ${changelog[changelog.length -1]}`)

        return process.exit(0)
    }

    app.disable("x-powered-by") && app.disable("etag") && app.disable("date")

    console.log("[?] Any problems contact me on Reddit; feeldghost\n")

    console.log("[?] Started site at http://localhost:7331\n")
})