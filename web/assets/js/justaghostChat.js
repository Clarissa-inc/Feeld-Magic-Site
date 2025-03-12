const chatUrl = "wss://feeld-web.justaghost.biz/chat";
let chatWebsocket

const maxReconnectAttempts = 10
const reconnectDelay = 3000
let reconnectAttempts = 0

function connectToGhostWs() {
    chatWebsocket = new WebSocket(chatUrl);

    chatWebsocket.onopen = function () {
        reconnectAttempts = 0;

        try {
            setInterval(() => {
                if (chatWebsocket.readyState === WebSocket.OPEN) {
                    chatWebsocket.send(JSON.stringify({ type: "ping" }));
                }
            }, 5000);
        } catch (error) {

        }
    };

    chatWebsocket.onmessage = function (message) {
        try {
            const parsedData = JSON.parse(message.data);

            if (parsedData.type === "connectionAck") {
                document.getElementById("chatMessages").value = ""

                document.getElementById("devTime").value = parsedData.devTime

                if (parsedData.spotify.song.length == 0) {
                    document.getElementById("spotifyNowPlaying").value = "Nothing is currently playing"
                } else {
                    document.getElementById("spotifyNowPlaying").value = parsedData.spotify.song
                }

                if (parsedData.isGhostConnected)
                    document.getElementById("justaghostChatLabel").textContent = `Chat (${parsedData.connectedUsers} Online) (Ghost Is Online)`;
                else
                    document.getElementById("justaghostChatLabel").textContent = `Chat (${parsedData.connectedUsers} Online)`;

                parsedData.previousMessages.forEach(appendMessage);
            } else if (parsedData.type === "newMessage") {
                appendMessage(parsedData);
            } else if (parsedData.type == "userDisconnected") {
                if (parsedData.isGhostConnected) {
                    document.getElementById("justaghostChatLabel").textContent = `Chat (${parsedData.connectedUsers} Online) (Ghost Is Online)`;
                } else
                    document.getElementById("justaghostChatLabel").textContent = `Chat (${parsedData.connectedUsers} Online)`;
            } else if (parsedData.type == "devTimeUpdate") {
                document.getElementById("devTime").value = parsedData.devTime

                if (parsedData.spotify.song.length == 0) {
                    document.getElementById("spotifyNowPlaying").value = "Nothing is currently playing"
                } else {
                    document.getElementById("spotifyNowPlaying").value = parsedData.spotify.song
                }
            }
        } catch (error) {
        }
    };

    chatWebsocket.onclose = function () {
        document.getElementById("justaghostChatLabel").textContent = `Chat (Not Connected)`;
        document.getElementById("spotifyNowPlaying").value = "Unknown"

        attemptReconnect();
    };
}

function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        return;
    }

    const delay = reconnectDelay * (reconnectAttempts + 1);

    setTimeout(() => {
        reconnectAttempts++;
        connectToGhostWs();
    }, delay);
}

function appendMessage(message) {
    const chatMessages = document.getElementById("chatMessages");
    const timestamp = new Date(message.timestamp).toLocaleString();
    const messageLine = `[${message.username}] [${timestamp}]: ${message.message}\n`;

    chatMessages.value += messageLine;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.getElementById("chatMessageInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault()

        const messageInput = this.value.trim()

        if (messageInput.length > 0 && chatWebsocket.readyState === WebSocket.OPEN) {
            chatWebsocket.send(JSON.stringify({
                type: "newMessage",
                message: messageInput
            }));

            this.value = "";
        }
    }
});

connectToGhostWs()