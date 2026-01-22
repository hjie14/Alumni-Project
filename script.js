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
        const signupName = document.getElementById("signupName");
        const signupUsername = document.getElementById("signupUsername");

        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = signupName.value.trim();
            const username = signupUsername.value.trim();
            const email = signupEmail.value.trim();
            const password = signupPassword.value.trim();

            if (!name || !username || !email || !password) {
                alert("All fields are required");
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

            const { error: insertError } = await supabase
                .from("User")
                .insert({
                    email,
                    user_name: username,
                    name: name,
                    user_type: "user"
                });

            if (insertError) {
                alert(insertError.message);
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

        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = "index.html";
        };

        createPostBtn.onclick = () => modal.classList.remove("hidden");

        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add("hidden");
        };

        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = document.getElementById("postTitle").value.trim();
            const content = document.getElementById("content").value.trim();

            if (!title || !content) {
                alert("Title and content are required");
                return;
            }

            const { data: userRow } = await supabase
                .from("User")
                .select("user_id")
                .eq("email", session.user.email)
                .single();

            if (!userRow) {
                alert("User record not found in database");
                return;
            }

            const { error } = await supabase
                .from("post")
                .insert({
                    user_id: userRow.user_id,
                    text_content: {
                        title,
                        body: content
                    }
                });

            if (error) {
                alert(error.message);
                return;
            }

            postForm.reset();
            modal.classList.add("hidden");
            loadPosts();
        });

        async function loadPosts() {
            postsContainer.innerHTML = "";

            const { data, error } = await supabase
                .from("post")
                .select(`
                    id,
                    text_content,
                    created_at,
                    "User" (
                        name,
                        user_name
                    )
                `)
                .order("created_at", { ascending: false });

            if (error) {
                alert(error.message);
                return;
            }

            data.forEach(post => {
                const div = document.createElement("div");
                div.className = "post-card";

                div.innerHTML = `
                    <div class="post-header">
                        <div class="post-author-name">
                            ${post.User?.name || "Unknown User"}
                        </div>
                        <div class="post-author-username">
                            @${post.User?.user_name || ""}
                        </div>
                    </div>

                    <div class="post-title">
                        ${post.text_content?.title || ""}
                    </div>

                    <div class="post-content">
                        ${post.text_content?.body || ""}
                    </div>
                `;

                postsContainer.appendChild(div);
            });
        }

        loadPosts();
    }
});