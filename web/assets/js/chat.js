var messagesHistory = {};
var currentChatUserId = null;
var currentChatType = null;
var currentChatId = null;
var currentProfileId = null;
var currentDisplayName = null;

var currentChatResponses = {}

var socket = null;
var isAccountDeactivated = false;
var connectedToWebSocket = false;

var messagesNextPage = null;
var isPullingMoreData = false

async function loadChatPage(unspokenUsersResp, activeChats, chatStreamResponse) {
    var userList = document.getElementById("userList");
    userList.innerHTML = "";

    loadUnspokenUsers(unspokenUsersResp)
    loadActiveChats(activeChats, chatStreamResponse["channels"])
}

userList.addEventListener("scroll", function() {
    if (userList.scrollHeight - userList.scrollTop <= userList.clientHeight + 10) {
        if (messagesNextPage && !isPullingMoreData) {
            isPullingMoreData = true

            loadMoreChats();
        }
    }
});

document.getElementById("chat-message").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();

        handleMessageSend()
    }
});

function loadUnspokenUsers(unspokenUsersResp) {
    var unspokenContainer = document.getElementById("unspokenUserBar");

    unspokenContainer.innerHTML = "";

    unspokenUsersResp["data"]["summaries"]["nodes"].forEach(user => {
        messagesHistory[user.streamChannelId] = [];

        var accountElement = document.createElement("div");
        accountElement.classList.add("unspoken-user");

        var profilePicture = document.createElement("img");
        loadImage(profilePicture, user["avatarSet"][0])
        profilePicture.alt = JSON.stringify(user)

        accountElement.appendChild(profilePicture);
        unspokenContainer.appendChild(accountElement);

        accountElement.addEventListener("click", () => openInactiveChat(user.targetProfileId, user.streamChannelId, user.id, user.name, accountElement));
    });
}

function loadActiveChats(activeChats, chats) {
    var nextPage = activeChats["data"]["summaries"]["pageInfo"]
    messagesNextPage = nextPage

    var userList = document.getElementById("userList");

    activeChats["data"]["summaries"]["nodes"].forEach(user => {
        var userItem = document.createElement("div");
        userItem.classList.add("user-item");
        userItem.dataset.chatId = user.id;
        userItem.dataset.displayName = user.name;
        userItem.dataset.streamChannelId = user.streamChannelId
        userItem.dataset.profileId = user.targetProfileId

        var profilePic = document.createElement("img");
        loadImage(profilePic, user["avatarSet"][0])
        profilePic.classList.add("user-img");

        var userInfo = document.createElement("div");
        userInfo.classList.add("user-info");

        var userName = document.createElement("span");
        userName.classList.add("user-name");
        userName.textContent = user.name;

        var userTime = document.createElement("span");
        userTime.classList.add("spoken-user-time");
        userTime.textContent = timeElapsed(user.latestMessage.created_at)

        userInfo.appendChild(userName);
        userInfo.appendChild(userTime);

        userItem.appendChild(profilePic);
        userItem.appendChild(userInfo);
        userList.appendChild(userItem);

        if (messagesHistory[user.streamChannelId] == null) {
            messagesHistory[user.streamChannelId] = [];
        }

        user.hasLeftChat = false

        for (var ii = 0; ii < chats.length; ii++) {
            for (var bb = 0; bb < chats[ii]["messages"].length; bb++) {
                var tempMsg = chats[ii]["messages"][bb]

                if (tempMsg.type === "system") {
                    var messageFromUserId = tempMsg["user"]["id"]

                    if (tempMsg["cid"] == `messaging:${user.streamChannelId}`) {
                        if (tempMsg["custom_properties"]["event_type"] === "user_left_chat")
                            user.hasLeftChat = true
                    }
                }
            }
        }

        for (var i = 0; i < chats.length; i++) {
            for (var b = 0; b < chats[i]["messages"].length; b++) {
                var msg = chats[i]["messages"][b]

                if (msg.type == "regular") {
                    var messageFromUserId = msg["user"]["id"]

                    if (msg["cid"] == `messaging:${user.streamChannelId}`) {
                        if (!messagesHistory[user.streamChannelId].includes(msg["id"])) {
                            if (messageFromUserId !== profile.streamUserId) {
                                messagesHistory[user.streamChannelId].push({
                                    "id": msg["id"],
                                    "sender": "received",
                                    "text": msg["text"],
                                    "attachments": msg["attachments"],
                                    "timestamp": new Date(msg["created_at"]).getTime()
                                })
                            } else {
                                messagesHistory[user.streamChannelId].push({
                                    "id": msg["id"],
                                    "sender": "self",
                                    "text": msg["text"],
                                    "attachments": msg["attachments"],
                                    "timestamp": new Date(msg["created_at"]).getTime()
                                })
                            }
                        }
                    }
                }
            }
        }

        userItem.addEventListener("click", () => openChatWithUser(user.targetProfileId, user.streamChannelId, user.id, user.name, user.hasLeftChat, userItem));
    });
}

async function loadMoreChats() {
    if (messagesNextPage && messagesNextPage.hasNextPage) {
        var moreActiveChats = await backendRequest("/feeldRequest", {
            "operationName": "ListSummaries",
            "query": "query ListSummaries($limit: Int = 10, $cursor: String) {\n  summaries: getChatSummariesForChatList(limit: $limit, cursor: $cursor) {\n    nodes {\n      ...ChatSummary\n      __typename\n    }\n    pageInfo {\n      hasNextPage\n      nextPageCursor\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment ChatSummary on ChatSummary {\n  ...ChatSummaryItem\n  __typename\n}\n\nfragment ChatSummaryItem on ChatSummary {\n  id\n  name\n  type\n  status\n  avatarSet\n  memberCount\n  latestMessage\n  streamChannelId\n  targetProfileId\n  enableChatContentModeration\n  __typename\n}",
            "variables": {
                "limit": 10,
                "cursor": messagesNextPage.nextPageCursor
            }
        })

        messagesNextPage = moreActiveChats["data"]["summaries"]["pageInfo"]

        var tempMessageIds = []

        for (var i = 0; i < moreActiveChats["data"]["summaries"]["nodes"].length; i++) {
            if (moreActiveChats["data"]["summaries"]["nodes"][i]["latestMessage"]) {
                if (moreActiveChats["data"]["summaries"]["nodes"][i]["latestMessage"]["cid"]) {
                    tempMessageIds.push(moreActiveChats["data"]["summaries"]["nodes"][i]["latestMessage"]["cid"])
                }
            }
        }

        var chatStreamResponse = await chatStreamRequest({
            "filter_conditions": {
                "cid": {
                    "$in": tempMessageIds
                }
            },
            "limit": tempMessageIds.length,
            "presence": true,
            "sort": [{
                "direction": -1,
                "field": "last_message_at"
            }],
            "state": true,
            "watch": true
        })

        var chats = chatStreamResponse["channels"]

        var userList = document.getElementById("userList");

        moreActiveChats["data"]["summaries"]["nodes"].forEach(user => {
            var userItem = document.createElement("div");
            userItem.classList.add("user-item");
            userItem.dataset.chatId = user.id;
            userItem.dataset.displayName = user.name;
            userItem.dataset.streamChannelId = user.streamChannelId
            userItem.dataset.profileId = user.targetProfileId

            var profilePic = document.createElement("img");
            loadImage(profilePic, user["avatarSet"][0])
            profilePic.classList.add("user-img");

            var userInfo = document.createElement("div");
            userInfo.classList.add("user-info");

            var userName = document.createElement("span");
            userName.classList.add("user-name");
            userName.textContent = user.name;

            var userTime = document.createElement("span");
            userTime.classList.add("spoken-user-time");
            userTime.textContent = timeElapsed(user.latestMessage.created_at)

            userInfo.appendChild(userName);
            userInfo.appendChild(userTime);

            userItem.appendChild(profilePic);
            userItem.appendChild(userInfo);
            userList.appendChild(userItem);

            if (messagesHistory[user.streamChannelId] == null) {
                messagesHistory[user.streamChannelId] = [];
            }

            user.hasLeftChat = false

            for (var ii = 0; ii < chats.length; ii++) {
                for (var bb = 0; bb < chats[ii]["messages"].length; bb++) {
                    var tempMsg = chats[ii]["messages"][bb]

                    if (tempMsg.type === "system") {
                        var messageFromUserId = tempMsg["user"]["id"]

                        if (tempMsg["cid"] == `messaging:${user.streamChannelId}`) {
                            if (tempMsg["custom_properties"]["event_type"] === "user_left_chat")
                                user.hasLeftChat = true
                        }
                    }
                }
            }

            for (var i = 0; i < chats.length; i++) {
                for (var b = 0; b < chats[i]["messages"].length; b++) {
                    var msg = chats[i]["messages"][b]

                    if (msg.type == "regular") {
                        var messageFromUserId = msg["user"]["id"]

                        if (msg["cid"] == `messaging:${user.streamChannelId}`) {
                            if (!messagesHistory[user.streamChannelId].includes(msg["id"])) {
                                if (messageFromUserId !== profile.streamUserId) {
                                    messagesHistory[user.streamChannelId].push({
                                        "id": msg["id"],
                                        "sender": "received",
                                        "text": msg["text"],
                                        "attachments": msg["attachments"],
                                        "timestamp": new Date(msg["created_at"]).getTime()
                                    })
                                } else {
                                    messagesHistory[user.streamChannelId].push({
                                        "id": msg["id"],
                                        "sender": "self",
                                        "text": msg["text"],
                                        "attachments": msg["attachments"],
                                        "timestamp": new Date(msg["created_at"]).getTime()
                                    })
                                }
                            }
                        }
                    }
                }
            }

            userItem.addEventListener("click", () => openChatWithUser(user.targetProfileId, user.streamChannelId, user.id, user.name, user.hasLeftChat, userItem));
        });
    }

    isPullingMoreData = false;
}

function openInactiveChat(profileId, streamChannelId, chatId, displayName, accountElement) {
    document.querySelectorAll(".user-item").forEach(user => user.classList.remove("selected"));
    document.querySelectorAll(".unspoken-user").forEach(user => user.classList.remove("selected"));

    accountElement.classList.add("selected");

    currentChatUserId = streamChannelId;
    currentChatType = 2;
    currentChatId = chatId
    currentProfileId = profileId
    currentDisplayName = displayName

    var messagesContainer = document.querySelector(".messages");
    var chatMessageInput = document.getElementById("chat-message");
    var sendMessageButton = document.getElementById("send-message-btn");

    chatMessageInput.disabled = false;
    sendMessageButton.disabled = false;

    messagesContainer.innerHTML = "";

    messagesHistory[streamChannelId].forEach(msg => {
        var messageElement = document.createElement("div");
        messageElement.classList.add("message", msg.sender === "self" ? "sent" : "received");

        var messageHeader = document.createElement("div");
        messageHeader.classList.add("message-header");

        var usernameSpan = document.createElement("span");
        usernameSpan.classList.add("username");
        usernameSpan.textContent = msg.sender === "self" ? "You" : displayName;

        var timestampSpan = document.createElement("span");
        timestampSpan.classList.add("timestamp");
        timestampSpan.textContent = formatTimestamp(newMessage.timestamp)

        messageHeader.appendChild(usernameSpan);
        messageHeader.appendChild(timestampSpan);

        var messageText = document.createElement("p");
        messageText.textContent = msg.text;

        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageText);
        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function handleMessageSend() {
    var messageInput = document.getElementById("chat-message");
    var messageText = messageInput.value.trim();
    if (messageText && messageText.length >= 1 && currentChatUserId) {
        var chatStreamResponse = await chatStreamRequestMessage(currentChatUserId, {
            "message": {
                "attachments": [],
                "custom_properties": {
                    "status": "regular",
                    "type": "text"
                },
                "id": randomUuid(),
                "mentioned_users": [],
                "text": messageText
            },
            "skip_enrich_url": true
        })

        if (currentChatType == 2) {
            currentChatType = 1;

            var unspokenContainer = document.getElementById("unspokenUserBar");
            var unspokenUsers = Array.from(unspokenContainer.children);
            var targetUnspokenUser = unspokenUsers.find(user => JSON.parse(user.firstChild.alt).streamChannelId === currentChatUserId);
            if (targetUnspokenUser) {
                unspokenContainer.removeChild(targetUnspokenUser);
            }

            var userList = document.getElementById("userList");
            var userItem = document.createElement("div");
            userItem.classList.add("user-item");
            userItem.dataset.chatId = currentChatId;
            userItem.dataset.displayName = currentDisplayName;
            userItem.dataset.streamChannelId = currentChatUserId;
            userItem.dataset.profileId = currentProfileId;

            var profilePic = document.createElement("img");
            loadImage(profilePic, JSON.parse(targetUnspokenUser.firstChild.alt).avatarSet[0])
            profilePic.classList.add("user-img");

            var userInfo = document.createElement("div");
            userInfo.classList.add("user-info");

            var userName = document.createElement("span");
            userName.classList.add("user-name");
            userName.textContent = currentDisplayName;

            var userTime = document.createElement("span");
            userTime.classList.add("spoken-user-time");
            userTime.textContent = "Now";

            userInfo.appendChild(userName);
            userInfo.appendChild(userTime);

            userItem.appendChild(profilePic);
            userItem.appendChild(userInfo);
            userList.prepend(userItem);

            userItem.addEventListener("click", () => openChatWithUser(currentProfileId, currentChatUserId, currentChatId, currentDisplayName, userItem));

            backendRequest("/feeldRequest", {
                "operationName": "ChatActivate",
                "query": "mutation ChatActivate($input: ChatActivateInput!) {\n  chatActivate(input: $input) {\n    id\n    streamChatId\n    __typename\n  }\n}",
                "variables": {
                    "input": {
                        "chatId": currentChatId
                    }
                }
            })

            currentChatId = null;
            currentDisplayName = null;
            currentProfileId = null;
        }

        if (JSON.stringify(chatStreamResponse).includes("custom_properties")) {
            var messagesContainer = document.querySelector(".messages");

            var newMessage = {
                sender: "self",
                text: messageText,
                timestamp: Date.now(),
            };

            messagesHistory[currentChatUserId].push(newMessage);

            var messageElement = document.createElement("div");
            messageElement.classList.add("message", "sent");

            var messageHeader = document.createElement("div");
            messageHeader.classList.add("message-header");

            var usernameSpan = document.createElement("span");
            usernameSpan.classList.add("username");
            usernameSpan.textContent = "You";

            var timestampSpan = document.createElement("span");
            timestampSpan.classList.add("timestamp");
            timestampSpan.textContent = formatTimestamp(newMessage.timestamp)

            messageHeader.appendChild(usernameSpan);
            messageHeader.appendChild(timestampSpan);

            var messageTextElement = document.createElement("p");
            messageTextElement.textContent = messageText;

            messageElement.appendChild(messageHeader);
            messageElement.appendChild(messageTextElement);
            messagesContainer.appendChild(messageElement);

            document.getElementById("chat-message").value = "";
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            moveUserToTop(currentChatUserId)
        } else {
            notify("Failed to send message")
        }
    }
}

function formatTimestamp(timestamp) {
    if (timestamp === "Unknown") return "Unknown";

    var date = new Date(timestamp)

    var now = new Date();
    var localTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    var isToday = date.toDateString() === now.toDateString();
    var isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();

    if (isToday) {
        return `Today at ${localTime}`;
    } else if (isYesterday) {
        return `Yesterday at ${localTime}`;
    } else {
        var localDate = date.toLocaleDateString();
        return `${localDate} at ${localTime}`;
    }
}

async function openChatWithUser(profileId, streamChannelId, chatId, displayName, hasLeftChat, userItem) {
    if (hasLeftChat) {
        notify(`Failed to open chat with ${displayName} because they"ve either deleted or blocked you`)
        return
    }

    currentChatUserId = streamChannelId;
    currentChatType = 1

    chatStreamRequestReadMessages(streamChannelId)

    var messagesContainer = document.querySelector(".messages");
    var chatMessageInput = document.getElementById("chat-message");
    var sendMessageButton = document.getElementById("send-message-btn");

    document.querySelectorAll(".user-item").forEach(user => user.classList.remove("selected"));
    document.querySelectorAll(".unspoken-user").forEach(user => user.classList.remove("selected"));

    userItem.classList.add("selected");

    chatMessageInput.disabled = false;
    sendMessageButton.disabled = false;

    messagesContainer.innerHTML = "";

    messagesHistory[streamChannelId].forEach(msg => {
        var messageElement = document.createElement("div");
        messageElement.classList.add("message", msg.sender === "self" ? "sent" : "received");

        var messageHeader = document.createElement("div");
        messageHeader.classList.add("message-header");

        var usernameSpan = document.createElement("span");
        usernameSpan.classList.add("username");
        usernameSpan.textContent = msg.sender === "self" ? "You" : displayName;

        var timestampSpan = document.createElement("span");
        timestampSpan.classList.add("timestamp");
        timestampSpan.textContent = formatTimestamp(msg.timestamp)

        messageHeader.appendChild(usernameSpan);
        messageHeader.appendChild(timestampSpan);

        var messageText = document.createElement("p");

        if (msg.text.length >= 1) {
            messageText.textContent = msg.text;
        } else {
            messageText.textContent = "Picture/Video (Not implemented yet)"
        }

        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageText);
        messagesContainer.appendChild(messageElement);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function timeElapsed(dateString) {
    var now = new Date();
    var inputDate = new Date(dateString);
    var diffMs = now - inputDate;

    var diffMinutes = Math.floor(diffMs / (1000 * 60));
    var diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
        return `${diffMinutes}m`;
    } else if (diffHours < 24) {
        return `${diffHours}h`;
    } else {
        return `${diffDays}d`;
    }
}

function moveUserToTop(streamChannelId) {
    var userList = document.getElementById("userList");
    var userItems = Array.from(userList.children);

    var targetUser = userItems.find(user => user.dataset.streamChannelId === streamChannelId);

    if (targetUser) {
        var spokenTimeElement = targetUser.querySelector(".spoken-user-time");
        if (spokenTimeElement) {
            spokenTimeElement.textContent = "Now";
        }

        userList.prepend(targetUser);
    }
}

function refreshActiveMessages(streamChannelId, displayName, messageText) {
    var userList = document.getElementById("userList");
    var userItems = Array.from(userList.children);

    var targetUser = userItems.find(user => user.dataset.streamChannelId === streamChannelId);

    if (currentChatUserId === streamChannelId) {
        var messagesContainer = document.querySelector(".messages");

        var newMessage = {
            sender: "received",
            text: messageText,
            timestamp: Date.now(),
            attachments: []
        };

        var messageElement = document.createElement("div");
        messageElement.classList.add("message", "received");

        var messageHeader = document.createElement("div");
        messageHeader.classList.add("message-header");

        var usernameSpan = document.createElement("span");
        usernameSpan.classList.add("username");
        usernameSpan.textContent = displayName;

        var timestampSpan = document.createElement("span");
        timestampSpan.classList.add("timestamp");
        timestampSpan.textContent = formatTimestamp(newMessage.timestamp)

        messageHeader.appendChild(usernameSpan);
        messageHeader.appendChild(timestampSpan);

        var messageTextElement = document.createElement("p");

        if (newMessage.text.length >= 1) {
            messageTextElement.textContent = newMessage.text;
        } else {
            messageTextElement.textContent = "Picture/Video (Not implemented yet)"
        }

        messageElement.appendChild(messageHeader);
        messageElement.appendChild(messageTextElement);
        messagesContainer.appendChild(messageElement);

        document.getElementById("chat-message").value = "";
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function handleWebsocket() {
    if (connectedToWebSocket)
        return

    if (isAccountDeactivated)
        return;

    connectedToWebSocket = true;

    var socketId = randomUuid()

    var json = JSON.stringify({ "user_id": profile.streamUserId, "user_details": { "id": profile.streamUserId }, "client_request_id": socketId })

    socket = new WebSocket(`wss://chat.stream-io-api.com/connect?json=${encodeURIComponent(json)}&api_key=y4tp4akjeb49&authorization=${encodeURIComponent(profile.streamToken)}&stream-auth-type=jwt&X-Stream-Client=stream-chat-react-native-ios-5.32.1`);

    socket.addEventListener("message", (event) => {
        try {
            var data = JSON.parse(event.data);

            if (event.data.includes("was deactivated"))
                isAccountDeactivated = true;

            if (data["type"] == "notification.message_new") {
                if (event.data.includes("messaging:")) {

                    if (data["message"]) {
                        if (data["message"]["type"] == "regular") {
                            var messageFrom = data["message"]["user"]

                            if (messageFrom["id"] !== profile.streamUserId) {
                                notify(`${messageFrom["name"]} - ${data["message"]["text"]}`)

                                var chatStreamUserId = data["message"]["cid"].replace("messaging:", "")

                                if (messagesHistory[chatStreamUserId] == null) {
                                    messagesHistory[chatStreamUserId] = [];
                                }

                                messagesHistory[chatStreamUserId].push({
                                    "sender": "received",
                                    "text": data["message"]["text"],
                                    "attachments": data["message"]["attachments"],
                                    "timestamp": new Date(data["message"]["created_at"]).getTime()
                                });

                                moveUserToTop(chatStreamUserId)
                                refreshActiveMessages(chatStreamUserId, messageFrom["name"], data["message"]["text"])
                            }
                        }
                    }

                    if (data["message"]["type"] == "system") {
                        if (data["message"]["custom_properties"]["event_type"] == "new_match") {
                            var newMatchUser = data.channel.members.filter(member => member.user_id !== profile.streamUserId)[0]["user"]
                            var chatStreamUserId = data["cid"].replace("messaging:", "")

                            messagesHistory[chatStreamUserId] = [];

                            var accountElement = document.createElement("div");
                            accountElement.classList.add("unspoken-user");

                            var profilePicture = document.createElement("img");
                            loadImage(profilePic, newMatchUser["image"])
                            profilePicture.alt = JSON.stringify(newMatchUser)

                            var unspokenContainer = document.getElementById("unspokenUserBar");

                            accountElement.appendChild(profilePicture);
                            unspokenContainer.appendChild(accountElement);

                            accountElement.addEventListener("click", () => openInactiveChat(newMatchUser.id, chatStreamUserId, newMatchUser.id, newMatchUser.name, accountElement));
                        }
                    }
                }
            }

            // console.log(data)
        } catch (error) {
            console.error("Error parsing Websocket message: ", error);
        }
    });

    socket.addEventListener("open", () => {
        setInterval(() => {
            if (connectedToWebSocket && socket.readyState === WebSocket.OPEN && !isAccountDeactivated) {
                socket.send(JSON.stringify([{ "type": "health.check", "client_id": `${profile.streamUserId}--${socketId}` }]));
            }
        }, 1000 * 9);
    });

    socket.addEventListener("close", () => {
        connectedToWebSocket = false;

        if (socket.readyState !== WebSocket.CLOSED) {
            socket.close()
        }

        setTimeout(() => { handleWebsocket() }, 1000 * 2)
    });

    socket.addEventListener("error", (error) => {
        connectedToWebSocket = false;

        if (socket.readyState !== WebSocket.CLOSED) {
            socket.close()

            setTimeout(() => { handleWebsocket() }, 1000 * 2)
        }
    });
}

var typingIndicatorTime = 1000 * 3;
let typingTimeout;
let isTyping = false;

document.getElementById("chat-message").addEventListener("input", () => {
    if (!isTyping) {
        isTyping = true;
        sendTypingEvent(currentChatUserId, true);
    }

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(() => {
        isTyping = false;
        sendTypingEvent(currentChatUserId, false);
    }, typingIndicatorTime);
});

async function sendTypingEvent(chatStreamUserId, isTyping) {
    if (isTyping) {
        chatStreamRequestEvent(chatStreamUserId, "typing.start")
    } else {
        chatStreamRequestEvent(chatStreamUserId, "typing.stop")
    }
}

async function chatStreamRequest(jsonData) {
    try {
        var response = await fetch(`https://chat.stream-io-api.com/channels?user_id=${profile.streamUserId}&connection_id=${randomUuid()}&api_key=y4tp4akjeb49`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json, text/plain, */*",
                "authorization": profile.streamToken,
                "stream-auth-type": "jwt",
                "x-stream-client": "stream-chat-react-native-ios-5.32.1",
                "accept-language": "en-GB,en;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "user-agent": "Feeld/1429 CFNetwork/1568.100.1.2.1 Darwin/24.0.0",
                "x-client-request-id": randomUuid()
            },
            body: JSON.stringify(jsonData),
        });

        var data = await response.json();

        return data;
    } catch (error) {
        console.log(error)
        return false;
    }
}

async function chatStreamRequestMessage(chatStreamId, jsonData) {
    try {
        var response = await fetch(`https://chat.stream-io-api.com/channels/messaging/${chatStreamId}/message?user_id=${profile.streamUserId}&connection_id=${randomUuid()}&api_key=y4tp4akjeb49`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json, text/plain, */*",
                "authorization": profile.streamToken,
                "stream-auth-type": "jwt",
                "x-stream-client": "stream-chat-react-native-ios-5.32.1",
                "accept-language": "en-GB,en;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "user-agent": "Feeld/1429 CFNetwork/1568.100.1.2.1 Darwin/24.0.0",
                "x-client-request-id": randomUuid()
            },
            body: JSON.stringify(jsonData),
        });

        var data = await response.json();

        return data;
    } catch (error) {
        console.log(error)
        return false;
    }
}

async function chatStreamRequestEvent(chatStreamId, event) {
    try {
        var response = await fetch(`https://chat.stream-io-api.com/channels/messaging/${chatStreamId}/event?user_id=${profile.streamUserId}&connection_id=${randomUuid()}&api_key=y4tp4akjeb49`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json, text/plain, */*",
                "authorization": profile.streamToken,
                "stream-auth-type": "jwt",
                "x-stream-client": "stream-chat-react-native-ios-5.32.1",
                "accept-language": "en-GB,en;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "user-agent": "Feeld/1429 CFNetwork/1568.100.1.2.1 Darwin/24.0.0",
                "x-client-request-id": randomUuid()
            },
            body: JSON.stringify({
                "event": {
                    "type": event
                }
            }),
        });

        var data = await response.json();

        return data;
    } catch (error) {
        console.log(error)
        return false;
    }
}

async function chatStreamRequestReadMessages(chatStreamId) {
    try {
        var response = await fetch(`https://chat.stream-io-api.com/channels/messaging/${chatStreamId}/read?user_id=${profile.streamUserId}&connection_id=${randomUuid()}&api_key=y4tp4akjeb49`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "accept": "application/json, text/plain, */*",
                "authorization": profile.streamToken,
                "stream-auth-type": "jwt",
                "x-stream-client": "stream-chat-react-native-ios-5.32.1",
                "accept-language": "en-GB,en;q=0.9",
                "accept-encoding": "gzip, deflate, br",
                "user-agent": "Feeld/1429 CFNetwork/1568.100.1.2.1 Darwin/24.0.0",
                "x-client-request-id": randomUuid()
            },
            body: JSON.stringify({}),
        });

        var data = await response.json();

        return data;
    } catch (error) {
        console.log(error)
        return false;
    }
}

function randomUuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}