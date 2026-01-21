// =======================
// SUPABASE SETUP
// =======================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://kcybawwvsfucdpdcdvpk.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =======================
// COMMON FUNCTIONS
// =======================
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =======================
// MAIN LOGIC
// =======================
document.addEventListener("DOMContentLoaded", async () => {

    /* =======================
       LOGIN PAGE
    ======================== */
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const passwordToggle = document.getElementById("passwordToggle");
        const loginBtn = document.querySelector(".login-btn");

        // Show / hide password
        if (passwordToggle) {
            passwordToggle.addEventListener("click", () => {
                passwordInput.type =
                    passwordInput.type === "password" ? "text" : "password";
            });
        }

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Frontend validation
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

            loginBtn.classList.add("loading");

            // ✅ SUPABASE LOGIN
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            loginBtn.classList.remove("loading");

            if (error) {
                alert("Invalid email or password");
                return;
            }

            // ✅ SUCCESS
            window.location.href = "home.html";
        });
    }

    /* =======================
       SIGNUP PAGE
    ======================== */
    const signupForm = document.getElementById("signupForm");

    if (signupForm) {
        const signupEmail = document.getElementById("signupEmail");
        const signupPassword = document.getElementById("signupPassword");

        signupForm.addEventListener("submit", async (e) => {
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

            // ✅ SUPABASE SIGNUP
            const { error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) {
                alert(error.message);
                return;
            }

            alert("Account created successfully! Please sign in.");
            window.location.href = "index.html";
        });
    }

    /* =======================
       HOME PAGE PROTECTION
    ======================== */
    if (window.location.pathname.includes("home.html")) {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            window.location.href = "index.html";
        }
    }
});