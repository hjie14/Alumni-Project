import { supabase } from "./supabase.js";

/* =======================
   COMMON FUNCTIONS
======================== */
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =======================
   MAIN LOGIC
======================== */
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

            if (!email || !password) {
                alert("Email and password are required");
                return;
            }

            if (!validateEmail(email)) {
                alert("Invalid email format");
                return;
            }

            loginBtn.classList.add("loading");

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            loginBtn.classList.remove("loading");

            if (error) {
                alert("Invalid email or password");
                return;
            }

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

            if (!email || !password) {
                alert("Email and password are required");
                return;
            }

            if (!validateEmail(email)) {
                alert("Invalid email format");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters");
                return;
            }

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
       HOME PAGE (POST LOGIC)
    ======================== */
    if (window.location.pathname.includes("home.html")) {

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = "index.html";
            return;
        }

        const logoutBtn = document.getElementById("logoutBtn");
        const createPostBtn = document.getElementById("createPostBtn");
        const modal = document.getElementById("postModal");
        const postForm = document.getElementById("postForm");
        const postsContainer = document.getElementById("postsContainer");

        if (!postForm) {
            console.error("postForm not found");
            return;
        }

        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = "index.html";
        };

        createPostBtn.onclick = () => modal.classList.remove("hidden");

        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add("hidden");
        };

        /* =======================
           CREATE POST
        ======================== */
postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("postTitle");
    const contentInput = document.getElementById("content");

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
        alert("Title and content are required");
        return;
    }

    // 🔑 Map auth user → internal User table
    const { data: userRow, error: userError } = await supabase
        .from("User")
        .select("user_id")
        .eq("email", session.user.email)
        .single();

    if (userError || !userRow) {
        alert("User record not found in database");
        return;
    }

    // ✅ Insert post using BIGINT user_id
    const { error: postError } = await supabase
        .from("post")
        .insert({
            user_id: userRow.user_id,
            text_content: {
                title: title,
                body: content
            }
        });

    if (postError) {
        alert(postError.message);
        return;
    }

    postForm.reset();
    modal.classList.add("hidden");
    loadPosts();
});

        /* =======================
           LOAD POSTS
        ======================== */
        async function loadPosts() {
            postsContainer.innerHTML = "";

            const { data, error } = await supabase
                .from("post")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) {
                console.error(error);
                return;
            }

            data.forEach(post => {
                const div = document.createElement("div");
                div.className = "post-card";
                div.innerHTML = `
                    <h3>${post.text_content?.title || ""}</h3>
                    <p>${post.text_content?.body || ""}</p>
                `;
                postsContainer.appendChild(div);
            });
        }

        loadPosts();
    }
});