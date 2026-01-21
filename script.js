import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
    "YOUR_SUPABASE_URL",
    "YOUR_PUBLIC_ANON_KEY"
);

/* =========================
   SIGN UP
========================= */
if (document.getElementById("signupForm")) {
    document.getElementById("signupForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("signupUsername").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;
        const userType = document.getElementById("signupRole").value;

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        const authId = data.user.id;

        const { error: insertError } = await supabase
            .from("User")
            .insert({
                user_name: username,
                email: email,
                user_type: userType,
                auth_id: authId
            });

        if (insertError) {
            alert(insertError.message);
            return;
        }

        alert("Account created successfully!");
        window.location.href = "index.html";
    });
}

/* =========================
   LOGIN
========================= */
if (document.getElementById("loginForm")) {
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(error.message);
            return;
        }

        window.location.href = "home.html";
    });
}

/* =========================
   HOME PAGE
========================= */
if (window.location.pathname.includes("home.html")) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = "index.html";
        return;
    }

    // Get BIGINT user_id
    const { data: userRow } = await supabase
        .from("User")
        .select("user_id")
        .eq("auth_id", session.user.id)
        .single();

    const userId = userRow.user_id;

    const logoutBtn = document.getElementById("logoutBtn");
    const postForm = document.getElementById("postForm");
    const postsContainer = document.getElementById("postsContainer");

    logoutBtn.onclick = async () => {
        await supabase.auth.signOut();
        window.location.href = "index.html";
    };

    postForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("postTitle").value;
        const description = document.getElementById("postDescription").value;
        const imageFile = document.getElementById("postImage").files[0];

        let imageUrl = null;

        if (imageFile) {
            const path = `${session.user.id}/${Date.now()}-${imageFile.name}`;

            await supabase.storage
                .from("post-images")
                .upload(path, imageFile);

            imageUrl = supabase.storage
                .from("post-images")
                .getPublicUrl(path).data.publicUrl;
        }

        const { error } = await supabase.from("Post").insert({
            user_id: userId,
            text_content: {
                title,
                description,
                image_url: imageUrl
            }
        });

        if (error) {
            alert(error.message);
            return;
        }

        postForm.reset();
        loadPosts();
    });

    async function loadPosts() {
        postsContainer.innerHTML = "";

        const { data } = await supabase
            .from("Post")
            .select("*")
            .order("created_at", { ascending: false });

        data.forEach(post => {
            const c = post.text_content || {};
            const div = document.createElement("div");
            div.className = "post";
            div.innerHTML = `
                <h3>${c.title || ""}</h3>
                <p>${c.description || ""}</p>
                ${c.image_url ? `<img src="${c.image_url}">` : ""}
            `;
            postsContainer.appendChild(div);
        });
    }

    loadPosts();
}