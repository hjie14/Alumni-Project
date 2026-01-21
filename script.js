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

if (window.location.pathname.includes("home.html")) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) window.location.href = "index.html";

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
    modal.onclick = e => {
        if (e.target === modal) modal.classList.add("hidden");
    };

    postForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("postTitle").value;
        const description = document.getElementById("postDescription").value;
        const imageFile = document.getElementById("postImage").files[0];

        let imageUrl = null;

        if (imageFile) {
            const filePath = `${session.user.id}/${Date.now()}-${imageFile.name}`;
            const { error } = await supabase.storage
                .from("post-images")
                .upload(filePath, imageFile);

            if (error) return alert(error.message);

            imageUrl = supabase.storage
                .from("post-images")
                .getPublicUrl(filePath).data.publicUrl;
        }

        const { error } = await supabase.from("posts").insert({
            user_id: session.user.id,
            title,
            description,
            image_url: imageUrl
        });

        if (error) return alert(error.message);

        modal.classList.add("hidden");
        postForm.reset();
        loadPosts();
    });

    async function loadPosts() {
        postsContainer.innerHTML = "";

        const { data } = await supabase
            .from("posts")
            .select("*")
            .order("created_at", { ascending: false });

        data.forEach(post => {
            const div = document.createElement("div");
            div.className = "post-card";
            div.innerHTML = `
                <h3>${post.title}</h3>
                <p>${post.description || ""}</p>
                ${post.image_url ? `<img src="${post.image_url}">` : ""}
            `;
            postsContainer.appendChild(div);
        });
    }

    loadPosts();
}
});