function validateUsername() {
    const usernameInput = document.getElementById('username');
    let usernameValue = usernameInput.value.trim(); // Trim whitespace
    const usernamePattern = /^[a-zA-Z0-9.]+$/; // Allowed characters: alphanumeric and periods
    const usernameError = document.getElementById('usernameError'); // Error message element

    // Check for invalid characters and remove them
    if (!usernamePattern.test(usernameValue)) {
        usernameValue = usernameValue.replace(/[^a-zA-Z0-9.]/g, '');
        usernameInput.value = usernameValue; // Update input value
        usernameError.textContent = 'Invalid username format. Please use only letters, numbers, and dots.';
        usernameError.style.display = 'block'; // Display error message
    } else {
        usernameError.textContent = ''; // Clear error message
        usernameError.style.display = 'none'; // Hide error message
    }

    const isValidUsername = usernamePattern.test(usernameValue);

    // Update input styling
    usernameInput.classList.toggle('is-invalid', !isValidUsername);

    // Disable or enable the signup button based on validation result
    document.getElementById('signupButton').disabled = !isValidUsername;
}

function validatePassword() {
    const passwordInput = document.getElementById('password');
    let passwordValue = passwordInput.value.trim(); // Trim whitespace
    const passwordPattern = /^[a-zA-Z!@#$%^&*?.-_]+$/; // Allowed characters: alphanumeric and !@#$%^&*?.-_

    // Check for invalid characters and remove them
    if (!passwordPattern.test(passwordValue)) {
        passwordValue = passwordValue.replace(/[^a-zA-Z!@#$%^&*?.-_]/g, '');
        passwordInput.value = passwordValue; // Update input value
    }

    const isValidPassword = passwordPattern.test(passwordValue);

    // Update input styling and error message
    passwordInput.classList.toggle('is-invalid', !isValidPassword);
    passwordInput.setAttribute('aria-describedby', isValidPassword ? '' : 'passwordError');
    document.getElementById('passwordError').textContent = isValidPassword ? '' : 'Invalid password format. Only alphabetical characters, letters, and the following special characters are allowed: !@#$%^&*?.-_';

    // Disable or enable the signup button based on validation result
    document.getElementById('signupButton').disabled = !isValidPassword;
}

function validateInput() {
    const usernamePattern = /^[a-zA-Z0-9.]+$/;
    const passwordPattern = /^[a-zA-Z!@#$%^&*?.-_]+$/;

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    const loginButton = document.getElementById('loginButton');

    let usernameValue = usernameInput.value.trim(); // Trim whitespace
    let passwordValue = passwordInput.value.trim(); // Trim whitespace

    // Check for invalid characters in username and remove them
    if (!usernamePattern.test(usernameValue)) {
        usernameValue = usernameValue.replace(/[^a-zA-Z0-9.]/g, '');
        usernameInput.value = usernameValue; // Update input value
        usernameError.textContent = 'Invalid username format. Please use only letters, numbers, and dots.';
    } else {
        usernameError.textContent = '';
    }

    // Check for invalid characters in password and remove them
    if (!passwordPattern.test(passwordValue)) {
        passwordValue = passwordValue.replace(/[^a-zA-Z!@#$%^&*?.-_]/g, '');
        passwordInput.value = passwordValue; // Update input value
    } else {
        passwordError.textContent = '';
    }

    // Disable the login button if either username or password is invalid
    loginButton.disabled = !usernamePattern.test(usernameValue) || !passwordPattern.test(passwordValue);
}

function validateConfirmPassword() {
    var password = document.getElementById('password').value;
    var confirmPassword = document.getElementById('confirmPassword').value;
    var confirmPasswordError = document.getElementById('confirmPasswordError');

    if (password !== confirmPassword) {
        confirmPasswordError.textContent = "Passwords do not match.";
        document.getElementById('signupButton').disabled = true; // Disable sign up button
    } else {
        confirmPasswordError.textContent = "";
        document.getElementById('signupButton').disabled = false; // Enable sign up button
    }
}

// Wait for the DOM to be fully loaded
$(document).ready(function() {
    // Fetch user's name and check login status when the page loads
    fetchUserName();
    checkLoginStatus();

    // Attach an event listener to the form submission
    $('#loginForm').submit(function(event) {
        // Prevent the default form submission
        event.preventDefault();
    });

    $('#signupForm').submit(function(event) {
        // Prevent the default form submission
        event.preventDefault();
    });

    $('#togglePassword').click(function() {
        var passwordField = $('#password');
        var confirmPasswordField = $('#confirmPassword');
        var fieldType = passwordField.attr('type');
        if (fieldType === 'password') {
            passwordField.attr('type', 'text');
            confirmPasswordField.attr('type', 'text');
            $(this).text('Hide');
        } else {
            passwordField.attr('type', 'password');
            confirmPasswordField.attr('type', 'password');
            $(this).text('Show');
        }
    });
    
});

// Function to set the session ID in localStorage
function setSessionID(sessionID) {
    localStorage.setItem('sessionID', sessionID);
}

// Function to get the session ID from localStorage
function getSessionID() {
    return localStorage.getItem('sessionID');
}

// Login logic
function loginAjax(username, password) {
    var username = $("#username").val();
    var password = $("#password").val();

    var url = "http://172.17.13.115/final.php/login";
    var data = {
        username: username,
        password: password
    };

    $.ajax({
        url: url,
        method: "POST",
        data: data,
    })
    .done(function(response) {
        // Handle the successful response
        console.log("Login successful:", response);

        if (response.status == 0) {
            // User logged in successfully
            console.log("User logged in:", response.message);

            // Handle regular login
            setSessionID(response.session); // Set session ID
            $("#loginMessage").html("<span class='text-success'>" + username + " has been sucessfully logged in!</span>");
            $("#loginMessage").append("<p style='margin-top: 20px;'>Return to the main page <a href='index.html'>here.</a></p>");
            $("#signUpMessage").remove(); // Remove signup message
            $("#loginButton").remove(); // Remove the login button

            // Store the user's full name in local storage
            localStorage.setItem('fullName', username);
            checkLoginStatus();

            // Fetch and update the "Account" tab with the username
            fetchUserName();
        } else {
            // Error occurred during login
            console.log("Login error:", response.message);
            // Display error message to the user, e.g., "Incorrect username or password"
            $("#loginMessage").html("<span class='text-danger'>Username and/or password not found. Please try again.</span>");
            $("#password").val(""); // Clear password
        }
    })
    .fail(function(error) {
        // Handle any errors that occur during the AJAX request
        console.error("Error:", error);
    });
}

function signUpAjax(name, username, password) {
    var name = $("#name").val();
    var username = $("#username").val();
    var password = $("#password").val();
    var confirmPassword = document.getElementById('confirmPassword').value;
    
    var url = "http://172.17.13.115/final.php/signUp"; // URL without parameters
    
    // Data to send in the AJAX request
    var data = {
        name: name,
        username: username,
        password: password
    };

    // Check if passwords match
    if (password !== confirmPassword) {
        var confirmPasswordError = document.getElementById('confirmPasswordError');
        confirmPasswordError.textContent = "Passwords do not match.";
        return; // Exit the function without proceeding to signup if passwords don't match
    }

    // AJAX call with the modified URL and data in the request body
    $.ajax({
        url: url,
        method: "POST",
        data: data, // Send data in the request body
    })
    .done(function(response) {
        // Handle the successful response
        console.log("Signup successful:", response);
        if (response.message.includes("Required parameter")) {
            console.log("Parameters weren't all filled in")
            $("#signupMessage").html("<span class='text-danger'>Please fill out all fields</span>");
        }

        if (response.status === 1) {
            // Username already exists
            console.log("Username exists:", response.message);
            $("#signupMessage").html("<span class='text-danger'>" + response.message + "</span>");
        } else {
            // Signup successful
            console.log("Signup successful message:", response.message);
            $("#signupMessage").html("<span class='text-success'>" + response.message + "</span>");
            
            // Clear input fields
            $("#name").val(""); // Clear name input field
            $("#username").val(""); // Clear username input field
            $("#password").val(""); // Clear password input field
            $("#confirmPassword").val(""); // Clear confirm password input field
            $("hr").remove(); // Remove the horizontal line
            $("#loginNotification").html(""); // Clear the content of the login message paragraph
            $("#signupButton").remove(); // Remove signup button totally
            $("#signupMessage").html("<p>Success! <a href='login.html'>Log in here</a></p>");
        }

    })
    .fail(function(error) {
        // Handle any errors that occur during the AJAX request
        console.error("Error:", error);
        // You can display an error message or handle the error in another way
    });
}

function logoutAjax() {
    var username = localStorage.getItem('fullName'); // Get the username from local storage

    var data = {
        username: username,
        session: getSessionID(),
    };

    $.ajax({
        url: "http://172.17.13.115/final.php/logout",
        method: "POST",
        data: data,
        success: function(response) {
            // Handle the successful logout response
            console.log("Logout successful:", response);

            // Clear local storage
            localStorage.removeItem('fullName');
            setSessionID(null);

            // Remove the buttons
            $("#logoutButton").remove();
            $("#cancelButton").remove();            
        },
        error: function(xhr, status, error) {
            // Handle any errors that occur during the AJAX request
            console.error("Error:", error);
            // You can display an error message or handle the error in another way
            $("#logoutMessage").html("<span class='text-danger'>Error occurred during logout. Please try again.</span>");
            clearInterval(countdownInterval); // Clear the countdown interval on error
        }
    });

    var countdown = 10; // Initial countdown value

    var countdownInterval = setInterval(function() {
        $("#logoutMessage").html("<span class='text-success'>Logout successful! Redirecting in " + countdown + " seconds to the main page...</span>");
        $("#logoutMessage").append("<p style='margin-top: 20px'>Click <a href='login.html'>here</a> if redirect doesn't happen automatically.</p>")
        countdown--;

        if (countdown < 0) {
            clearInterval(countdownInterval); // Clear the interval when countdown reaches 0
            window.location.href = "login.html"; // Redirect to login page
        }
    }, 1000); // Update every second (1000 milliseconds)
}


// Function to fetch user's name from local storage or via AJAX
function fetchUserName() {
    // console.log("User's Name: ",localStorage.getItem('fullName'));
    $(document).ready(function() {
        // Get the user's full name from local storage
        var fullName = localStorage.getItem('fullName');
        var sessionID = getSessionID(); // Assuming getSessionID is a defined function

        if (window.location.href.indexOf('stocks_history.html') !== -1) {
            // Check if the URL contains 'stocks_history.html'
            var signInWarning = document.getElementById('signInWarning');

            if (sessionID && sessionID == "null") {
                // User is not signed in, display a message prompting them to sign in
                signInWarning.innerHTML = "Please sign in order to view favorites.";
                signInButton.innerHTML = "Sign In"
            } else {
                signInButton.remove();
            }
        }

        // Update other elements based on login status
        if (fullName && fullName !== "undefined") {
            var accountTab = document.getElementById('accountTab');
            var logoutName = document.getElementById('usernameText');
            if (accountTab) {
                accountTab.textContent = fullName;
                logoutName.textContent = fullName;
            }
        } else {
            // If the full name is not in local storage or is empty, keep it as "Account"
            var accountTab = document.getElementById('accountTab');
            var logoutName = document.getElementById('usernameText');
            if (accountTab) {
                accountTab.textContent = "Account";
                if (window.location.href.indexOf('logout.html') !== -1) {
                    // This only happens if the user goes to logout.html without an account logged in
                    var usernamePara = document.getElementById('usernamePara');
                    if (usernamePara) {
                        usernamePara.innerHTML = "You're not supposed to be here right now!<br><br>There's no account logged in. Please log in <a href='login.html'>here.</a>";
                    }

                    var cancelButton = document.getElementById('cancelButton');
                    if (cancelButton) {
                        cancelButton.remove();
                    }

                    var logoutButton = document.getElementById('logoutButton');
                    if (logoutButton) {
                        logoutButton.remove();
                    }

                    var logoutFooter = document.getElementById('logoutFooter');
                    if (logoutFooter) {
                        logoutFooter.innerHTML = "Copyright © 2024 E̷̝͍̻̰̍R̸̮̖̎͌̍͝Ŗ̸̗̲̮͛Ơ̵̡̤̱̗̇̃͊R̶̪̳̓̔̓̒!̸͚̫̍̆";
                    }
                }
            }
        }
    });
}

function checkLoginStatus() {
    var sessionID = getSessionID();
    var accountTab = document.getElementById('accountTab');
    if (accountTab) {
        if (sessionID !== "null") {
            // Update accountTab href when user is logged in
            accountTab.href = "logout.html";
        } else {
            // Update accountTab href when user is logged out
            accountTab.href = "login.html";
        }
    }
}

function openImage() {
    window.open('images/AFFC-clicked.jpg', '_blank');
}

function redirectToLogin() {
    window.location.href = 'login.html';
}