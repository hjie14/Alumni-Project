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

    addEvent();
    addJob();

    // Logic Router
    if (path.includes('profile.html')) {
        if (!currentPublicUser) window.location.href = 'index.html';
        else setupProfilePage();
    } else if (path.includes('connect.html')) {
        if (!currentPublicUser) window.location.href = 'index.html';
        else setupConnectPage();
    } else if (path.includes('notifications.html')) {
        if (!currentPublicUser) window.location.href = 'index.html';
        else setupNotificationsPage();
    } else if (path.includes('home.html') || path === '/' || path.endsWith('/')) {
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
            
            // 2. Create Roll-up Menu
            const menu = document.createElement('div');
            menu.className = 'user-popup-menu';
            menu.id = 'userPopupMenu';
            menu.innerHTML = `
                <div class="menu-item" style="color:#0f1419;">Add an existing account</div>
                <div class="menu-item" id="logoutTrigger" style="color:#0f1419;">Log out @${escapeHtml(currentPublicUser.user_name)}</div>
            `;
            // Append menu to the sidebar or sidebarUser wrapper
            // To ensure positioning works relative to sidebar
            const sidebarDiv = document.querySelector('.sidebar > div:last-child'); // The wrapper div for user pill if any, or append to sidebar
            // Just append to sidebarUser's parent for simplicity, positioned absolute relative to body or sidebar
            sidebarUser.parentNode.appendChild(menu);

            // 3. Create Logout Confirmation Modal
            const logoutModal = document.createElement('div');
            logoutModal.className = 'modal';
            logoutModal.id = 'logoutModal';
            logoutModal.innerHTML = `
                <div class="logout-content">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg" style="width:30px; margin:0 auto; display:none;" /> 
                    <!-- Using simple text or icon if logo not avail -->
                    <i class='bx bxs-network-chart' style="font-size: 30px; margin: 0 auto;"></i>
                    
                    <h3>Log out of AlumniConnect?</h3>
                    <p>You can always log back in at any time.</p>
                    <button class="btn-logout-confirm" id="confirmLogoutBtn">Log out</button>
                    <button class="btn-logout-cancel" id="cancelLogoutBtn">Cancel</button>
                </div>
            `;
            document.body.appendChild(logoutModal);

            // 4. Event Listeners
            sidebarUser.addEventListener('click', (e) => {
                e.stopPropagation();
                const menuEl = document.getElementById('userPopupMenu');
                if (menuEl.classList.contains('show')) {
                    menuEl.classList.remove('show');
                } else {
                    menuEl.classList.add('show');
                }
            });

            // Close menu when clicking elsewhere
            window.addEventListener('click', () => {
                const menuEl = document.getElementById('userPopupMenu');
                if(menuEl) menuEl.classList.remove('show');
            });

            // Trigger Logout Modal
            document.getElementById('logoutTrigger').addEventListener('click', () => {
                document.getElementById('logoutModal').style.display = 'block';
            });

            // Cancel Logout
            document.getElementById('cancelLogoutBtn').addEventListener('click', () => {
                document.getElementById('logoutModal').style.display = 'none';
            });

            // Confirm Logout
            document.getElementById('confirmLogoutBtn').addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });
        }
    }

    // --- GUEST FIX: COMPLETE PROFILE MODAL ---
    function showCompleteProfileModal(authId, email) {
        const modal = document.createElement('div');
        modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:9999;";
        modal.innerHTML = `
            <div style="background:white; padding:30px; border-radius:12px; width:90%; max-width:400px; box-shadow:0 4px 20px rgba(0,0,0,0.2);">
                <h2 style="margin-bottom:10px; font-size:24px; color:#0f1419;">Complete your Profile</h2>
                <p style="margin-bottom:20px; color:#536471; font-size:14px;">We need a few more details to set up your account.</p>
                <form id="completeProfileForm">
                    <div style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; font-weight:700; font-size:14px;">Full Name</label>
                        <input type="text" id="cpName" required style="width:100%; padding:10px; border:1px solid #cfd9de; border-radius:4px; outline:none;">
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="display:block; margin-bottom:5px; font-weight:700; font-size:14px;">Username</label>
                        <input type="text" id="cpUsername" placeholder="e.g. johndoe" required style="width:100%; padding:10px; border:1px solid #cfd9de; border-radius:4px; outline:none;">
                    </div>
                    <button type="submit" style="width:100%; padding:12px; background:#0f1419; color:white; border-radius:99px; font-weight:bold; cursor:pointer;">Save & Continue</button>
                    <button type="button" id="cpSignOut" style="width:100%; padding:12px; margin-top:10px; color:#536471; font-size:14px; font-weight:600;">Sign Out</button>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cpSignOut').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });

        document.getElementById('completeProfileForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cpName').value;
            const username = document.getElementById('cpUsername').value;
            const btn = e.target.querySelector('button[type="submit"]');
            
            btn.innerText = "Saving...";
            btn.disabled = true;

            const { error } = await supabase.from('User').insert([{
                auth_id: authId,
                email: email,
                name: name,
                user_name: username,
                user_type: 'Student'
            }]);

            if (error) {
                alert("Error: " + error.message);
                btn.innerText = "Save & Continue";
                btn.disabled = false;
            } else {
                window.location.reload();
            }
        });
    }

    // --- CONNECT PAGE LOGIC (Search & Request) ---
    function setupConnectPage() {
        const searchInput = document.getElementById('connectSearchInput');
        const container = document.getElementById('connectContainer');

        fetchUsers(''); 

        searchInput.addEventListener('input', (e) => {
            fetchUsers(e.target.value);
        });

        async function fetchUsers(query) {
            // Explicitly exclude current user
            let dbQuery = supabase.from('User').select('*').neq('user_id', currentPublicUser.user_id);
            
            if(query.trim().length > 0) {
                dbQuery = dbQuery.ilike('name', `%${query}%`);
            } else {
                dbQuery = dbQuery.limit(10);
            }

            const { data: users, error } = await dbQuery;
            container.innerHTML = '';
            
            if(users && users.length > 0) {
                users.forEach(user => {
                    const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
                    const item = document.createElement('div');
                    item.className = 'connect-item';
                    item.innerHTML = `
                        <div class="connect-info">
                            <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                            <div>
                                <div style="font-weight:700;">${escapeHtml(user.name)}</div>
                                <div style="color:#536471; font-size:14px;">@${escapeHtml(user.user_name)}</div>
                            </div>
                        </div>
                        <button class="connect-btn" data-id="${user.user_id}" data-name="${escapeHtml(user.name)}">Connect</button>
                    `;
                    container.appendChild(item);
                });

                document.querySelectorAll('.connect-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const targetId = this.getAttribute('data-id');
                        
                        this.innerText = 'Request sent';
                        this.classList.add('sent');
                        this.disabled = true;

                        const msgPayload = {
                            type: 'connection_request',
                            sender_id: currentPublicUser.user_id,
                            sender_name: currentPublicUser.name,
                            sender_username: currentPublicUser.user_name
                        };

                        const { error } = await supabase.from('notification').insert([{
                            user_id: targetId,
                            message: msgPayload, 
                            read_status: false
                        }]);

                        if (error) {
                            console.error("Error sending request:", error);
                            this.innerText = 'Error';
                            this.classList.remove('sent');
                            this.disabled = false;
                            // ALERT THE ERROR TO THE USER
                            alert("Failed to send request: " + error.message + "\n\n(Tip: Check your Supabase RLS policies!)");
                        }
                    });
                });
            } else {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:#536471;">No users found.</div>';
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

    function escapeHtml(text) { if(!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
};

// ===== EVENTS =====
let events = [];

function addEvent() {
  const title = document.getElementById("eventTitle").value;
  const location = document.getElementById("eventLocation").value;
  const desc = document.getElementById("eventDesc").value;

  if (title === "" || location === "" || desc === "") {
    alert("Please fill in all event fields.");
    return;
  }

  events.push({ title, location, desc });
  displayEvents();

  document.getElementById("eventTitle").value = "";
  document.getElementById("eventLocation").value = "";
  document.getElementById("eventDesc").value = "";
}

function displayEvents() {
  const list = document.getElementById("eventList");
  if (!list) return;

  list.innerHTML = "";

  events.forEach(event => {
    list.innerHTML += `
      <div>
        <strong>${event.title}</strong><br>
        Location: ${event.location}<br>
        ${event.desc}
        <hr>
      </div>
    `;
  });
}

// ===== JOB POSTS =====
let jobs = [];

function addJob() {
  const title = document.getElementById("jobTitle").value;
  const company = document.getElementById("jobCompany").value;
  const desc = document.getElementById("jobDesc").value;

  if (title === "" || company === "" || desc === "") {
    alert("Please fill in all job fields.");
    return;
  }

  jobs.push({ title, company, desc });
  displayJobs();

  document.getElementById("jobTitle").value = "";
  document.getElementById("jobCompany").value = "";
  document.getElementById("jobDesc").value = "";
}

function displayJobs() {
  const list = document.getElementById("jobList");
  if (!list) return;

  list.innerHTML = "";

  jobs.forEach(job => {
    list.innerHTML += `
      <div>
        <strong>${job.title}</strong> at ${job.company}<br>
        ${job.desc}
        <hr>
      </div>
    `;
  });
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
