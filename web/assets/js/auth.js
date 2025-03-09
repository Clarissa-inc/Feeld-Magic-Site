document.addEventListener("DOMContentLoaded", () => {
    notify("Any problems contact me on Reddit; feeldghost")
});

$(document).ready(function() {
    var email = null;

    $("#login-form").submit(async function(event) {
        event.preventDefault();

        const loginButton = $("#btn-login");
        loginButton.prop("disabled", true);

        if (loginButton.val() === "Login") {
            email = $("#email").val();

            if (!email) {
                notify("Please enter a valid email")
                loginButton.prop("disabled", false)
            } else {
                var response = await backendRequest("/feeldRequest", {
                    "operationName": "SignInLink",
                    "query": "mutation SignInLink($input: SendSignInLinkInput!) {\n  sendSignInLink(input: $input)\n}",
                    "variables": {
                        "input": {
                            "email": email.toLowerCase(),
                            "isSignUpFlow": false,
                            "language": "ENGLISH_BRITISH"
                        }
                    }
                })

                if (!response) {
                    notify("Failed to make login request")
                    loginButton.prop("disabled", false)
                    return
                }

                if (response.data && response.data.sendSignInLink) {
                    notify(`Successfully sent verification email to ${email}`)

                    $("#verification-message").show();
                    $("#email").replaceWith('<input id="verificationEmail" type="text" placeholder="Login Link" required>');
                    $("#btn-login").val("Submit");

                    loginButton.prop("disabled", false)
                } else {
                    notify(`Failed to send verification email to ${email}`)
                    loginButton.prop("disabled", false)
                }
            }
        } else if (loginButton.val() === "Submit") {
            const verificationEmail = $("#verificationEmail").val();

            if (!verificationEmail) {
                notify("Please enter a valid login link")
                loginButton.prop("disabled", false)
            } else {
                var oobCode = parseEmail(decodeURIComponent(verificationEmail))

                if (oobCode === null) {
                    notify("Please enter a valid login link")
                    loginButton.prop("disabled", false)
                } else {
                    var fbResponse = await backendRequest("/firebaseRequest", {
                        "email": email,
                        "oobCode": oobCode
                    })

                    if (!fbResponse) {
                        notify("Failed to make verification request")
                        loginButton.prop("disabled", false)
                        return
                    }

                    if (fbResponse.success) {
                        notify(`Successfully logged into ${email}`)

                        setTimeout(function() {
                            window.location.pathname = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1)
                        }, 1000 * 5);
                    } else {
                        notify(`Failed to login to ${email}`)
                        loginButton.prop("disabled", false)
                    }
                }
            }
        }
    });
});
