import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- GLOBAL VARIABLES ---
    const path = window.location.pathname;
    let currentUserAuth = null;
    let currentPublicUser = null; 
    let currentProfileData = null;

    console.log("🚀 App initializing on path:", path);

    // --- 1. AUTH & USER LOADING ---
    const { data: { session } } = await supabase.auth.getSession();
    currentUserAuth = session?.user || null;

    if (currentUserAuth) {
        const { data: userData } = await supabase
            .from('User')
            .select('*')
            .eq('auth_id', currentUserAuth.id)
            .maybeSingle(); 

        if (userData) {
            currentPublicUser = userData;
            const { data: profileData } = await supabase
                .from('user_profile')
                .select('*')
                .eq('user_id', currentPublicUser.user_id)
                .maybeSingle();
            currentProfileData = profileData || {}; 
        }
    }

    // --- 2. INITIALIZE UI ---
    setupAuthForms();
    setupPasswordToggle();
    setupCommonUI();

    // --- 3. PAGE ROUTER ---
    if (path.includes('home.html')) {
        setupHomePage();
    } else if (path.includes('connect.html')) {
        setupConnectPage();
    } else if (path.includes('notifications.html')) {
        setupNotificationsPage();
    } else if (path.includes('profile.html')) {
        setupProfilePage();
    } else if (path.includes('mentor.html')) {
        initMentorDashboard();
    } else if (path.includes('counseling.html')) {
        initCounselingPage();
    } else if (path.includes('feedback.html')) {
        initFeedbackPage();
    }

    // ==========================================
    //  HOME PAGE LOGIC (With Force Fix)
    // ==========================================
// ==========================================
    //  HOME PAGE LOGIC (Fixed Button)
    // ==========================================
    function setupHomePage() {
        console.log("🏠 Setting up Home Page");
        
        // 1. Setup Input Areas (Run this ALWAYS, even for Guests)
        setupInputLogic('inlineInput', 'inlinePostBtn');
        setupInputLogic('modalInput', 'modalPostBtn');

        // 2. Setup User Avatars (Only if logged in)
        if(currentPublicUser) {
             const initial = currentPublicUser.name.charAt(0).toUpperCase();
             document.querySelectorAll('.current-user-avatar').forEach(el => {
                el.innerText = initial; 
                el.style.backgroundColor = '#0f1419'; 
                el.style.color = 'white';
            });
            
            // Modal Logic
            const modal = document.getElementById('postModal');
            if(modal) {
                const sidebarPostBtn = document.getElementById('sidebarPostBtn');
                const closeBtn = document.querySelector('.close-modal');
                if(sidebarPostBtn) sidebarPostBtn.addEventListener('click', () => modal.style.display = 'block');
                if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
                window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }
            }
        }

        // 3. Fetch Posts
        fetchPosts(null);
    }

    async function fetchPosts(userIdFilter = null) {
        const container = document.getElementById(userIdFilter ? 'myPostsContainer' : 'postsContainer');
        if(!container) return;

        console.log("📥 Fetching posts from DB...");

        // FIX APPLIED BELOW: User!post_user_id_fkey
        // This forces the code to use the lowercase link and ignore duplicates
        let query = supabase
            .from('post')
            .select(`
                id, 
                created_at, 
                text_content, 
                User!post_user_id_fkey ( name, user_name )
            `) 
            .order('created_at', { ascending: false });

        if (userIdFilter) query = query.eq('user_id', userIdFilter);

        const { data: posts, error } = await query;

        if (error) { 
            console.error("❌ Supabase Error:", error);
            // If this specific name fails, we fallback to the generic attempt (unlikely to be needed)
            if(error.message.includes("Could not find a relationship")) {
                 console.warn("Fallback: Trying generic fetch...");
                 retryGenericFetch(userIdFilter, container);
                 return;
            }
            
            container.innerHTML = `<div style="padding:20px; color:red; text-align:center;">
                <strong>Failed to load posts</strong><br>${error.message}
            </div>`; 
            return; 
        }
        
        renderPosts(posts, container);
    }

    // Fallback function in case the specific name doesn't exist
    async function retryGenericFetch(userIdFilter, container) {
        let query = supabase.from('post').select(`id, created_at, text_content, User ( name, user_name )`).order('created_at', { ascending: false });
        if (userIdFilter) query = query.eq('user_id', userIdFilter);
        const { data: posts, error } = await query;
        if(error) {
             container.innerHTML = `<div style="padding:20px; color:red; text-align:center;">Error: ${error.message}</div>`; 
        } else {
             renderPosts(posts, container);
        }
    }

    function renderPosts(posts, container) {
        container.innerHTML = '';
        if (!posts || posts.length === 0) {
            container.innerHTML = `<div class="no-posts-message">No posts yet</div>`;
            return;
        }

        posts.forEach(post => {
            const user = post.User || { name: 'Unknown', user_name: 'unknown' };
            const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
            
            let contentText = "No content";
            if (post.text_content && typeof post.text_content === 'object') {
                contentText = post.text_content.body || "";
            } else if (post.text_content) {
                contentText = post.text_content;
            }

            const date = new Date(post.created_at).toLocaleDateString();
            
            const postHTML = `
                <article class="post">
                    <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                    <div style="flex:1;">
                        <div class="post-header">
                            <span class="post-name">${escapeHtml(user.name)}</span>
                            <span class="post-handle">@${escapeHtml(user.user_name)}</span>
                            <span class="post-time">· ${date}</span>
                        </div>
                        <div class="post-content" style="margin-top:5px;">${escapeHtml(contentText)}</div>
                    </div>
                </article>`;
            container.innerHTML += postHTML;
        });
    }

function setupInputLogic(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        
        // Safety check
        if(!input || !btn) {
            console.warn(`⚠️ Setup failed: ID '${inputId}' or '${btnId}' not found.`);
            return;
        }

        console.log(`✅ Input Logic Active for: ${inputId}`);

        // 1. Reset button state
        btn.disabled = true;
        btn.classList.remove('active');
        
        // 2. Listen for typing
        input.addEventListener('input', function() {
            // Auto-resize
            this.style.height = 'auto'; 
            this.style.height = (this.scrollHeight) + 'px';

            // Enable button if text exists
            if(this.value.trim().length > 0) {
                btn.classList.add('active'); 
                btn.disabled = false; 
            } else {
                btn.classList.remove('active');
                btn.disabled = true; 
            }
        });

        // 3. Handle Click
        btn.addEventListener('click', async () => {
            console.log("🖱️ Post button clicked");

            if (!currentPublicUser) { 
                alert("Please sign in to post."); 
                return; 
            }
            
            btn.disabled = true;
            btn.innerText = "Posting...";

            const { error } = await supabase.from('post').insert([{ 
                text_content: { body: input.value }, 
                user_id: currentPublicUser.user_id 
            }]);
            
            if (!error) { 
                console.log("✅ Post successful");
                input.value = ''; 
                input.style.height = 'auto';
                btn.classList.remove('active');
                
                // Close modal if open
                const modal = document.getElementById('postModal');
                if(modal) modal.style.display = "none"; 
                
                fetchPosts(null); 
                btn.innerText = "Post";
            } else {
                console.error("❌ Post Error:", error);
                alert("Error: " + error.message);
                btn.innerText = "Post";
                btn.disabled = false;
            }
        });
    }

    // ==========================================
    //  PROFILE PAGE
    // ==========================================
    function setupProfilePage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        
        const initial = currentPublicUser.name.charAt(0).toUpperCase();
        document.getElementById('headerName').innerText = currentPublicUser.name;
        document.getElementById('displayName').innerText = currentPublicUser.name;
        document.getElementById('displayHandle').innerText = `@${currentPublicUser.user_name}`;
        document.getElementById('profileAvatar').innerText = initial;
        document.getElementById('inputName').value = currentPublicUser.name;

        if (currentProfileData) {
            document.getElementById('displayBio').innerText = currentProfileData.about_me || "No bio yet.";
            
            const skillsContainer = document.getElementById('skillsSection');
            skillsContainer.innerHTML = '';
            if(currentProfileData.skills_text) {
                const skills = currentProfileData.skills_text.split(',').map(s => s.trim());
                skills.forEach(skill => {
                    if(skill) {
                        const tag = document.createElement('span');
                        tag.className = 'skill-tag';
                        tag.innerText = skill;
                        skillsContainer.appendChild(tag);
                    }
                });
            }

            if(currentProfileData.country) {
                document.getElementById('metaLocation').style.display = 'flex';
                document.getElementById('txtLocation').innerText = currentProfileData.country;
            }
            if(currentProfileData.education) {
                document.getElementById('metaEducation').style.display = 'flex';
                document.getElementById('txtEducation').innerText = currentProfileData.education;
            }
            if(currentProfileData.linkedin_url) {
                document.getElementById('metaLink').style.display = 'flex';
                document.getElementById('txtLink').href = currentProfileData.linkedin_url;
                document.getElementById('txtLink').innerText = "Social Link";
            }
            
            document.getElementById('inputBio').value = currentProfileData.about_me || "";
            document.getElementById('inputEducation').value = currentProfileData.education || "";
            document.getElementById('inputLocation').value = currentProfileData.country || "";
            document.getElementById('inputSkills').value = currentProfileData.skills_text || "";
            document.getElementById('inputWebsite').value = currentProfileData.linkedin_url || "";
        }

        const tabPosts = document.getElementById('tabPosts');
        const tabEdit = document.getElementById('tabEdit');
        const contentPosts = document.getElementById('postsContent');
        const contentEdit = document.getElementById('editContent');
        const editBtn = document.getElementById('editToggleBtn');

        function switchTab(tab) {
            if(tab === 'posts') {
                tabPosts.classList.add('active'); tabEdit.classList.remove('active');
                contentPosts.style.display = 'block'; contentEdit.style.display = 'none';
            } else {
                tabEdit.classList.add('active'); tabPosts.classList.remove('active');
                contentEdit.style.display = 'block'; contentPosts.style.display = 'none';
            }
        }
        tabPosts.onclick = () => switchTab('posts');
        tabEdit.onclick = () => switchTab('edit');
        editBtn.onclick = () => switchTab('edit');

        document.getElementById('profileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.innerText = "Saving..."; btn.disabled = true;

            const updates = {
                user_id: currentPublicUser.user_id,
                about_me: document.getElementById('inputBio').value,
                education: document.getElementById('inputEducation').value,
                country: document.getElementById('inputLocation').value,
                skills_text: document.getElementById('inputSkills').value,
                linkedin_url: document.getElementById('inputWebsite').value,
                updated_at: new Date()
            };
            const { error } = await supabase.from('user_profile').upsert(updates, { onConflict: 'user_id' });
            
            if(error) {
                alert("Error: " + error.message);
                btn.innerText = "Save"; btn.disabled = false;
            } else {
                window.location.reload();
            }
        });

        // Use the same fixed fetch function
        fetchPosts(currentPublicUser.user_id);
    }

    // ==========================================
    //  COMMON UI (Sidebar & Logout)
    // ==========================================
    function setupCommonUI() {
        const sidebarUser = document.getElementById('sidebarUser');
        if (currentPublicUser && sidebarUser) {
            const initial = currentPublicUser.name ? currentPublicUser.name.charAt(0).toUpperCase() : 'U';
            sidebarUser.innerHTML = `
                <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                <div class="user-meta" style="display:flex; flex-direction:column; margin-left:10px;">
                    <span style="font-weight:700;">${escapeHtml(currentPublicUser.name)}</span>
                    <span style="color:#536471; font-size:13px;">@${escapeHtml(currentPublicUser.user_name)}</span>
                </div>
            `;
            let menu = document.getElementById('userPopupMenu');
            if(!menu) {
                menu = document.createElement('div');
                menu.className = 'user-popup-menu';
                menu.id = 'userPopupMenu';
                sidebarUser.parentNode.appendChild(menu);
            }
            menu.innerHTML = `<div class="menu-item" id="logoutTrigger">Log out @${escapeHtml(currentPublicUser.user_name)}</div>`;
            sidebarUser.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
            window.onclick = () => { if(menu) menu.classList.remove('show'); };
            const logoutBtn = document.getElementById('logoutTrigger');
            if(logoutBtn) logoutBtn.onclick = async () => {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            };
        }
    }

    // ==========================================
    //  OTHER FEATURES
    // ==========================================
    function setupAuthForms() {
        const f = document.getElementById('loginForm');
        if(f) f.onsubmit = async (e) => {
            e.preventDefault();
            const {error} = await supabase.auth.signInWithPassword({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
            });
            if(error) alert(error.message); else window.location.href='home.html';
        }
        
        const sf = document.getElementById('signupForm');
        if (sf) {
            sf.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('signupName').value;
                const username = document.getElementById('signupUsername').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;

                const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
                if (authError) { alert(authError.message); return; }

                if (authData.user) {
                    await supabase.from('User').insert([{ 
                        user_name: username, name: name, email: email, auth_id: authData.user.id, user_type: 'Student' 
                    }]);
                    window.location.href = 'home.html';
                }
            });
        }
    }

    function setupConnectPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        const searchInput = document.getElementById('connectSearchInput');
        const container = document.getElementById('connectContainer');
        if(searchInput) {
            const fetchUsers = async (q) => {
                let dbQ = supabase.from('User').select('*').neq('user_id', currentPublicUser.user_id).neq('name', null).neq('name', '');
                if(q) dbQ = dbQ.ilike('name', `%${q}%`); else dbQ = dbQ.limit(10);
                const {data} = await dbQ;
                container.innerHTML='';
                if(!data || data.length===0) container.innerHTML='<div style="padding:20px;text-align:center">No users found</div>';
                data?.forEach(u => {
                    const el = document.createElement('div'); el.className='connect-item';
                    el.innerHTML=`<div class="connect-info"><b>${escapeHtml(u.name)}</b><br><small>@${escapeHtml(u.user_name)}</small></div><button class="connect-btn" onclick="this.innerText='Sent';this.disabled=true;">Connect</button>`;
                    container.appendChild(el);
                });
            };
            fetchUsers('');
            searchInput.oninput=(e)=>fetchUsers(e.target.value);
        }
    }

    async function initMentorDashboard() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        const container = document.getElementById('requests-container');
        if(!container) return;
        const { data } = await supabase.from('mentorship_requests').select('*').eq('status','Pending');
        document.getElementById('pending-count').innerText = data?.length || 0;
        container.innerHTML = '';
        if(!data || data.length===0) document.getElementById('empty-msg').style.display='block';
        else {
            document.getElementById('empty-msg').style.display='none';
            data.forEach(req => {
                container.innerHTML += `<div class="request-card" id="card-${req.id}"><h3>${escapeHtml(req.message)}</h3>
                <div class="action-buttons"><button onclick="window.updateMentorStatus(${req.id},'Accepted')">Accept</button></div></div>`;
            });
        }
    }
    window.updateMentorStatus = async (id, s) => {
        await supabase.from('mentorship_requests').update({status:s}).eq('id',id);
        const card = document.getElementById(`card-${id}`);
        if(card) card.remove();
        const c = document.getElementById('pending-count');
        c.innerText = Math.max(0, parseInt(c.innerText)-1);
    };

    async function initCounselingPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        const container = document.getElementById('counselors-container');
        if(!container) return;
        const {data} = await supabase.from('counselors').select('*');
        container.innerHTML='';
        data?.forEach(c => {
            container.innerHTML += `<div class="counselor-card">
            <div class="counselor-content"><b>${escapeHtml(c.name)}</b><br>${escapeHtml(c.specialization)}</div>
            <button class="book-btn" onclick="window.openCounselingModal('${escapeHtml(c.name)}')">Book</button></div>`;
        });
        window.onclick = (e) => { if(e.target == document.getElementById('bookingModal')) window.closeCounselingModal(); }
    }
    window.openCounselingModal = (n) => { document.getElementById('modalCounselorName').innerText=n; document.getElementById('bookingModal').style.display='block'; };
    window.closeCounselingModal = () => document.getElementById('bookingModal').style.display='none';
    window.submitBooking = async () => { alert("Booking Confirmed!"); window.closeCounselingModal(); }

    function initFeedbackPage() {
        const f = document.getElementById('feedbackForm');
        if(f) f.onsubmit = async (e) => { e.preventDefault(); alert("Feedback sent"); }
    }

    function setupNotificationsPage() { 
        const c = document.getElementById("notificationsContainer");
        if(c) c.innerHTML = '<div style="padding:20px;text-align:center">No new notifications</div>'; 
    }

    function setupPasswordToggle() {
         const t = document.getElementById('togglePassword');
         if(t) t.onclick = () => {
             const i = document.getElementById('password');
             i.type = i.type === 'password' ? 'text' : 'password';
             t.innerText = i.type === 'password' ? 'Show' : 'Hide';
         }
    }

    function escapeHtml(text) { 
        if(!text) return ""; 
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); 
    }
});