import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- GLOBAL VARS ---
    const path = window.location.pathname;
    let currentUserAuth = null;
    let currentPublicUser = null; 
    let currentProfileData = null;

    // --- CHECK SESSION ---
    const { data: { session } } = await supabase.auth.getSession();
    currentUserAuth = session?.user || null;

    if (currentUserAuth) {
        // Fetch 'User' table data
        const { data: userData } = await supabase
            .from('User')
            .select('*')
            .eq('auth_id', currentUserAuth.id)
            .maybeSingle(); 

        if (userData) {
            currentPublicUser = userData;
            // Fetch 'user_profile' data
            const { data: profileData } = await supabase
                .from('user_profile')
                .select('*')
                .eq('user_id', currentPublicUser.user_id)
                .maybeSingle();
            currentProfileData = profileData || {}; 
            
            // If on auth pages (login/signup) and logged in, redirect to home
            if (path.includes('index.html') || path.includes('signup.html') || path.includes('index-1.html')) {
                window.location.href = 'home.html';
                return;
            }
        } else {
            // AUTHENTICATED BUT NO PUBLIC PROFILE (The "Guest" Bug Fix)
            showCompleteProfileModal(currentUserAuth.id, currentUserAuth.email);
        }
    }

    // --- INITIALIZERS ---
    setupPasswordToggle();
    setupAuthForms();
    
    // Only run UI setup if we have a public user OR we are on public pages
    setupCommonUI();

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
        setupHomePage();
    }

    // --- COMMON UI (Sidebar & Logout Logic) ---
    function setupCommonUI() {
        const sidebarUser = document.getElementById('sidebarUser');
        if (currentPublicUser && sidebarUser) {
            // 1. Set User Info
            const initial = currentPublicUser.name ? currentPublicUser.name.charAt(0).toUpperCase() : 'U';
            sidebarUser.innerHTML = `
                <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                <div class="user-meta" style="display:flex; flex-direction:column; margin-left:10px;">
                    <span style="font-weight:700;">${escapeHtml(currentPublicUser.name)}</span>
                    <span style="color:#536471; font-size:13px;">@${escapeHtml(currentPublicUser.user_name)}</span>
                </div>
            `;
            
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
            }
        }
    }

    // --- NOTIFICATIONS PAGE LOGIC ---
    async function setupNotificationsPage() {
        const container = document.getElementById('notificationsContainer');
        const { data: notifs, error } = await supabase
            .from('notification')
            .select('*')
            .eq('user_id', currentPublicUser.user_id)
            .order('created_at', { ascending: false });

        container.innerHTML = '';

        if(notifs && notifs.length > 0) {
            notifs.forEach(notif => {
                // Ensure message object exists
                const msg = typeof notif.message === 'string' ? JSON.parse(notif.message) : notif.message;
                
                if(msg && msg.type === 'connection_request') {
                    const initial = msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : 'U';
                    const el = document.createElement('div');
                    el.className = 'notification-item';
                    el.innerHTML = `
                         <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                         <div class="notif-content">
                            <div class="notif-header">
                                <span style="font-weight:700;">${escapeHtml(msg.sender_name)}</span>
                            </div>
                            <div class="notif-text">Sent you a connection request</div>
                            <div class="notif-actions" style="margin-top:10px;">
                                <button class="btn-accept" data-id="${notif.id}" data-sender="${msg.sender_id}">Accept</button>
                                <button class="btn-decline" data-id="${notif.id}">Decline</button>
                            </div>
                         </div>
                    `;
                    container.appendChild(el);
                } 
                else if (msg && msg.type === 'request_accepted') {
                     const initial = msg.acceptor_name ? msg.acceptor_name.charAt(0).toUpperCase() : 'U';
                     const el = document.createElement('div');
                     el.className = 'notification-item';
                     el.innerHTML = `
                         <div class="user-avatar-sm" style="background-color:#1d9bf0; color:white;">${initial}</div>
                         <div class="notif-content">
                            <div class="notif-header">
                                <span style="font-weight:700;">${escapeHtml(msg.acceptor_name)}</span>
                            </div>
                            <div class="notif-text">Accepted your connection request.</div>
                            <div class="notif-actions" style="margin-top:10px;">
                                <button class="btn-accept view-info-btn" data-email="${escapeHtml(msg.email)}">View Info</button>
                            </div>
                         </div>
                    `;
                    container.appendChild(el);
                }
            });

            // Bind Events
            document.querySelectorAll('.btn-accept:not(.view-info-btn)').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const notifId = this.getAttribute('data-id');
                    const senderId = this.getAttribute('data-sender');

                    this.innerText = "Accepted";
                    this.disabled = true;
                    // Hide decline button
                    const declineBtn = this.parentElement.querySelector('.btn-decline');
                    if(declineBtn) declineBtn.style.display = 'none';

                    // Delete the notification
                    await supabase.from('notification').delete().eq('id', notifId);
                    
                    const payload = {
                        type: 'request_accepted',
                        acceptor_name: currentPublicUser.name,
                        email: currentPublicUser.email
                    };

                    // Send notification back to sender
                    await supabase.from('notification').insert([{
                        user_id: senderId,
                        message: payload,
                        read_status: false
                    }]);
                });
            });

            document.querySelectorAll('.btn-decline').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const notifId = this.getAttribute('data-id');
                    await supabase.from('notification').delete().eq('id', notifId);
                    this.closest('.notification-item').remove();
                });
            });

            document.querySelectorAll('.view-info-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const email = this.getAttribute('data-email');
                    document.getElementById('infoModalText').innerText = "You can contact them at: " + email;
                    document.getElementById('infoModal').style.display = 'block';
                });
            });

        } else {
            container.innerHTML = '<div style="padding:40px; text-align:center; color:#536471;">No notifications yet.</div>';
        }
    }

    // --- PROFILE PAGE LOGIC ---
    function setupProfilePage() {
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
            if(error) alert("Error: " + error.message);
            else window.location.reload();
        });

        fetchPosts(currentPublicUser.user_id);
    }

    // --- HOME PAGE LOGIC ---
    function setupHomePage() {
        if(currentPublicUser) {
             const initial = currentPublicUser.name.charAt(0).toUpperCase();
             document.querySelectorAll('.current-user-avatar').forEach(el => {
                el.innerText = initial; el.style.backgroundColor = '#0f1419'; el.style.color = 'white';
            });
            setupInputLogic('inlineInput', 'inlinePostBtn');
            setupInputLogic('modalInput', 'modalPostBtn');
            
            const modal = document.getElementById('postModal');
            const closeBtn = document.querySelector('.close-modal');
            const sidebarPostBtn = document.getElementById('sidebarPostBtn');
            if(sidebarPostBtn) sidebarPostBtn.addEventListener('click', () => modal.style.display = 'block');
            if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
            window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }
        }
        fetchPosts(null);
    }

    // --- UTILS ---
    async function fetchPosts(userIdFilter = null) {
        const container = document.getElementById(userIdFilter ? 'myPostsContainer' : 'postsContainer');
        if(!container) return;
        let query = supabase.from('post').select(`id, created_at, text_content, User ( name, user_name )`).order('created_at', { ascending: false });
        if (userIdFilter) query = query.eq('user_id', userIdFilter);
        const { data: posts, error } = await query;
        if (error || !posts) { container.innerHTML = '<p style="padding:20px; text-align:center;">Failed to load posts.</p>'; return; }
        
        container.innerHTML = '';
        
        if (posts.length === 0) {
            container.innerHTML = `<div class="no-posts-message">No posts yet</div>`;
            return;
        }

        posts.forEach(post => {
            const user = post.User || { name: 'Unknown', user_name: 'unknown' };
            const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
            let contentText = typeof post.text_content === 'object' ? (post.text_content.body || "") : post.text_content;
            const date = new Date(post.created_at).toLocaleDateString();
            const postHTML = `
                <article class="post">
                    <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                    <div style="flex:1;">
                        <div class="post-header"><span class="post-name">${escapeHtml(user.name)}</span><span class="post-handle">@${escapeHtml(user.user_name)}</span><span class="post-time">· ${date}</span></div>
                        <div class="post-content" style="margin-top:5px;">${escapeHtml(contentText)}</div>
                    </div>
                </article>`;
            container.innerHTML += postHTML;
        });
    }

    function setupInputLogic(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if(!input || !btn) return;
        input.addEventListener('input', function() {
            this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';
            if(this.value.trim().length > 0) btn.classList.add('active'); else btn.classList.remove('active');
        });
        btn.addEventListener('click', async () => {
            if (!currentPublicUser) return;
            const { error } = await supabase.from('post').insert([{ text_content: { body: input.value }, user_id: currentPublicUser.user_id }]);
            if (!error) { input.value = ''; if(document.getElementById('postModal')) document.getElementById('postModal').style.display="none"; fetchPosts(null); }
        });
    }

    function setupPasswordToggle() {
        const toggleBtn = document.getElementById('togglePassword');
        if (toggleBtn) toggleBtn.addEventListener('click', () => {
            const input = document.getElementById('password');
            if (input.type === "password") { input.type = "text"; toggleBtn.innerText = "Hide"; } else { input.type = "password"; toggleBtn.innerText = "Show"; }
        });
    }

    function setupAuthForms() {
        // Login Logic
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const btn = loginForm.querySelector('button[type="submit"]');
                
                btn.innerText = "Signing in..."; 
                btn.disabled = true;

                const { error } = await supabase.auth.signInWithPassword({ email, password });
                
                if (error) { 
                    alert(error.message); 
                    btn.innerText = "Sign in"; 
                    btn.disabled = false; 
                } else { 
                    window.location.href = 'home.html'; 
                }
            });
        }

        // Signup Logic (UPDATED)
        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const name = document.getElementById('signupName').value;
                const username = document.getElementById('signupUsername').value;
                const email = document.getElementById('signupEmail').value;
                const password = document.getElementById('signupPassword').value;
                const btn = signupForm.querySelector('button[type="submit"]');

                if (!name.trim()) {
                    alert("Full Name is required");
                    return;
                }

                btn.innerText = "Creating Account..."; 
                btn.disabled = true;

                // 1. Sign up
                const { data: authData, error: authError } = await supabase.auth.signUp({ 
                    email, 
                    password 
                });
                
                if (authError) { 
                    alert(authError.message); 
                    btn.innerText = "Agree & Join"; 
                    btn.disabled = false; 
                    return; 
                }

                // 2. Create Public User Profile
                if (authData.user) {
                    const { error: dbError } = await supabase
                        .from('User')
                        .insert([{ 
                            user_name: username, 
                            name: name, // Insert the Full Name
                            email: email, 
                            auth_id: authData.user.id,
                            user_type: 'Student' 
                        }]);

                    if (dbError) {
                        console.error("DB Error:", dbError);
                    }

                    if (authData.session) {
                        window.location.href = 'home.html';
                    } else {
                        alert("Account created! Please check your email to verify your account.");
                        window.location.href = 'index.html';
                    }
                }
            });
        }
    }

    function escapeHtml(text) { if(!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
});