function notify(message) {
    var container = document.getElementById("notification-container");
    var notification = document.createElement("div");

    notification.classList.add("notification");
    notification.textContent = message;
    notification.style.backgroundColor = "#9370DB";

    container.appendChild(notification);

    setTimeout(() => { notification.remove() }, 1000 * 7);
}

function parseEmail(email) {
    var regex = /[?&](oobCode=([a-zA-Z0-9_-]+))/g;
    var match;

    while ((match = regex.exec(email)) !== null) {
        if (match[1].startsWith("oobCode")) {
            return match[2];
        }
    }

    return null;
}

async function backendRequest(endpoint, data) {
    try {
        const response = await fetch(`http://localhost:7331${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        });

        var data = await response.json();

        return data;
    } catch (error) {
        return false;
    }
}