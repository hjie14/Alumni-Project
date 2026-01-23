import { supabase } from "./supabase.js";

/* =======================
   COMMON FUNCTIONS
======================== */
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =======================
   MAIN ENTRY
======================== */
document.addEventListener("DOMContentLoaded", async () => {

/* =======================
   GLOBAL HEADER BUTTONS
======================== */
const logoutBtn = document.getElementById("logoutBtn");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const closeSidebar = document.getElementById("closeSidebar");

// Logout (ALL pages)
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    });
}

// Open sidebar
if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => {
        sidebar.classList.add("open");
    });
}

// Close sidebar
if (closeSidebar && sidebar) {
    closeSidebar.addEventListener("click", () => {
        sidebar.classList.remove("open");
    });
}

/* =======================
   SIDEBAR NAVIGATION
======================== */
const navProfile = document.getElementById("navProfile");

if (navProfile) {
    navProfile.addEventListener("click", () => {
        sidebar?.classList.remove("open");
        window.location.href = "profile.html";
    });
}

    /* =======================
       LOGIN PAGE
    ======================== */
    const loginForm = document.getElementById("loginForm");

    if (loginForm) {
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const passwordToggle = document.getElementById("passwordToggle");
        const loginBtn = document.querySelector(".login-btn");

        passwordToggle?.addEventListener("click", () => {
            passwordInput.type =
                passwordInput.type === "password" ? "text" : "password";
        });

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) return alert("Email and password required");
            if (!validateEmail(email)) return alert("Invalid email format");

            loginBtn.classList.add("loading");

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            loginBtn.classList.remove("loading");

            if (error) return alert("Invalid email or password");

            window.location.href = "home.html";
        });
    }

    

    /* =======================
       SIGNUP PAGE
    ======================== */
    const signupForm = document.getElementById("signupForm");

    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = signupName.value.trim();
            const username = signupUsername.value.trim();
            const email = signupEmail.value.trim();
            const password = signupPassword.value.trim();

            if (!name || !username || !email || !password)
                return alert("All fields required");

            const { data: authData, error } = await supabase.auth.signUp({
                email,
                password
            });

            if (error) return alert(error.message);

            const { error: insertError } = await supabase
                .from("User")
                .insert({
                    email,
                    user_name: username,
                    name,
                    user_type: "user",
                    auth_id: authData.user.id
                });

            if (insertError) return alert(insertError.message);

            alert("Account created. Please sign in.");
            window.location.href = "index.html";
        });
    }

    /* =======================
       HOME PAGE
    ======================== */
    if (window.location.pathname.includes("home.html")) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return (window.location.href = "index.html");

        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.location.href = "index.html";
        };

        createPostBtn.onclick = () => postModal.classList.remove("hidden");

        postModal.onclick = (e) => {
            if (e.target === postModal) postModal.classList.add("hidden");
        };

        postForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const title = postTitle.value.trim();
            const content = contentEditor.value.trim();
            if (!title || !content) return alert("Title & content required");

            const { data: userRow } = await supabase
                .from("User")
                .select("user_id")
                .eq("auth_id", session.user.id)
                .single();

            await supabase.from("post").insert({
                user_id: userRow.user_id,
                text_content: { title, body: content }
            });

            postForm.reset();
            postModal.classList.add("hidden");
            loadPosts();
        });

        async function loadPosts() {
            postsContainer.innerHTML = "";

            const { data } = await supabase
                .from("post")
                .select(`text_content, created_at, "User"(name, user_name)`)
                .order("created_at", { ascending: false });

            data.forEach(post => {
                postsContainer.innerHTML += `
                  <div class="post-card">
                    <div class="post-header">
                      <div class="post-author-name">${post.User.name}</div>
                      <div class="post-author-username">@${post.User.user_name}</div>
                    </div>
                    <div class="post-title">${post.text_content.title}</div>
                    <div class="post-content">${post.text_content.body}</div>
                  </div>`;
            });
        }

        loadPosts();
    }

    /* =======================
       PROFILE PAGE
    ======================== */
    if (window.location.pathname.includes("profile.html")) {
        const inputEducation = document.getElementById("inputEducation");
        const inputCountry = document.getElementById("inputCountry");
        const inputSkills = document.getElementById("inputSkills");
        const inputTwitter = document.getElementById("inputTwitter");
        const inputFacebook = document.getElementById("inputFacebook");
        const inputLinkedIn = document.getElementById("inputLinkedIn");
        const inputAbout = document.getElementById("inputAbout");
        const profileForm = document.querySelector("#profile form");

        await loadProfile();

async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }

    /* =========================
       USER (IDENTITY)
    ========================== */
    const { data: user } = await supabase
        .from("User")
        .select("user_id, name, user_name, email")
        .eq("auth_id", session.user.id)
        .single();

    // LEFT PROFILE CARD
    document.getElementById("profileName").textContent = user.name || "";
    document.getElementById("profileUsername").textContent = `@${user.user_name || ""}`;
    document.getElementById("profileEmail").textContent = user.email || "";

    // OVERVIEW → PROFILE DETAILS
    const viewFullName = document.getElementById("viewFullName");
    if (viewFullName) {
        viewFullName.textContent = user.name || "-";
    }

    /* =========================
       USER PROFILE DATA
    ========================== */
    const { data: profile } = await supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", user.user_id)
        .single();

    // LEFT SIDEBAR
    profileEducation.textContent = profile.education || "-";
    profileCountry.textContent = profile.country || "-";

    // OVERVIEW
    profileAbout.textContent = profile.about_me || "";
    viewEducation.textContent = profile.education || "-";
    viewCountry.textContent = profile.country || "-";

    // FORM VALUES
    inputEducation.value = profile.education || "";
    inputCountry.value = profile.country || "";
    inputSkills.value = profile.skills_text || "";
    inputTwitter.value = profile.twitter_url || "";
    inputFacebook.value = profile.facebook_url || "";
    inputLinkedIn.value = profile.linkedin_url || "";
    inputAbout.value = profile.about_me || "";

    /* =========================
       SKILLS (FIXED)
    ========================== */
    const skillsBox = document.getElementById("skillsContainer");
    skillsBox.innerHTML = "";

    (profile.skills_text || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(skill => {
            skillsBox.innerHTML +=
              `<span class="badge text-bg-primary me-1 mb-1">${skill}</span>`;
        });
}

        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const { data: { session } } = await supabase.auth.getSession();

            const { data: user } = await supabase
                .from("User")
                .select("user_id")
                .eq("auth_id", session.user.id)
                .single();

            await supabase.from("user_profile").update({
                education: inputEducation.value,
                country: inputCountry.value,
                skills_text: inputSkills.value,
                twitter_url: inputTwitter.value,
                facebook_url: inputFacebook.value,
                linkedin_url: inputLinkedIn.value,
                about_me: inputAbout.value,
                updated_at: new Date()
            }).eq("user_id", user.user_id);

            alert("Profile updated");
            loadProfile();
        });
    }

});