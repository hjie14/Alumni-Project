document.addEventListener("DOMContentLoaded", () => {

    /* =======================
       LOGIN PAGE LOGIC
    ======================== */

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const passwordToggle = document.getElementById("passwordToggle");
        const loginBtn = document.querySelector(".login-btn");

        // Password show / hide
        if (passwordToggle) {
            passwordToggle.addEventListener("click", () => {
                passwordInput.type =
                    passwordInput.type === "password" ? "text" : "password";
            });
        }

        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // ❌ Validation
            if (!email) {
                alert("Email is required");
                return;
            }

            if (!validateEmail(email)) {
                alert("Invalid email format");
                return;
            }

            if (!password) {
                alert("Password is required");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }

            // ✅ Passed validation
            loginBtn.classList.add("loading");

            // TEMP redirect (Supabase later)
            setTimeout(() => {
                window.location.href = "home.html";
            }, 1000);
        });
    }

    /* =======================
       SIGNUP PAGE LOGIC
    ======================== */

    const signupForm = document.getElementById("signupForm");

    if (signupForm) {
        const signupEmail = document.getElementById("signupEmail");
        const signupPassword = document.getElementById("signupPassword");

        signupForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const email = signupEmail.value.trim();
            const password = signupPassword.value.trim();

            if (!email) {
                alert("Email is required");
                return;
            }

            if (!validateEmail(email)) {
                alert("Invalid email format");
                return;
            }

            if (!password) {
                alert("Password is required");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }

            // ✅ Passed validation
            alert("Account created successfully!");
            window.location.href = "index.html";
        });
    }

});

/* =======================
   COMMON FUNCTIONS
======================== */

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}