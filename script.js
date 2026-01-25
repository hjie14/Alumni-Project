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
            .single();

        if (userData) {
            currentPublicUser = userData;
            // Fetch 'user_profile' data
            const { data: profileData } = await supabase
                .from('user_profile')
                .select('*')
                .eq('user_id', currentPublicUser.user_id)
                .single();
            currentProfileData = profileData || {}; 
        }
    }

    // --- INITIALIZERS ---
    setupPasswordToggle();
    setupAuthForms();
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

    // --- COMMON UI (Sidebar) ---
    function setupCommonUI() {
        const sidebarUser = document.getElementById('sidebarUser');
        if (currentPublicUser && sidebarUser) {
            const initial = currentPublicUser.name.charAt(0).toUpperCase();
            sidebarUser.innerHTML = `
                <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                <div class="user-meta" style="display:flex; flex-direction:column; margin-left:10px;">
                    <span style="font-weight:700;">${currentPublicUser.name}</span>
                    <span style="color:#536471; font-size:13px;">@${currentPublicUser.user_name}</span>
                </div>
            `;
            sidebarUser.addEventListener('click', async () => {
                if(confirm(`Log out?`)) { await supabase.auth.signOut(); window.location.href = 'index.html'; }
            });
        }
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
            let dbQuery = supabase.from('User').select('*').neq('user_id', currentPublicUser.user_id);
            if(query.trim().length > 0) {
                dbQuery = dbQuery.ilike('name', `%${query}%`);
            } else {
                dbQuery = dbQuery.limit(10);
            }

            const { data: users, error } = await dbQuery;
            container.innerHTML = '';
            
            if(users) {
                users.forEach(user => {
                    const initial = user.name.charAt(0).toUpperCase();
                    const item = document.createElement('div');
                    item.className = 'connect-item';
                    item.innerHTML = `
                        <div class="connect-info">
                            <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                            <div>
                                <div style="font-weight:700;">${user.name}</div>
                                <div style="color:#536471; font-size:14px;">@${user.user_name}</div>
                            </div>
                        </div>
                        <button class="connect-btn" data-id="${user.user_id}" data-name="${user.name}">Connect</button>
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

                        await supabase.from('notification').insert([{
                            user_id: targetId,
                            message: msgPayload, 
                            read_status: false
                        }]);
                    });
                });
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
                const msg = notif.message;
                
                if(msg && msg.type === 'connection_request') {
                    const initial = msg.sender_name.charAt(0).toUpperCase();
                    const el = document.createElement('div');
                    el.className = 'notification-item';
                    el.innerHTML = `
                         <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                         <div class="notif-content">
                            <div class="notif-header">
                                <span style="font-weight:700;">${msg.sender_name}</span>
                            </div>
                            <div class="notif-text">Sent you a connection request</div>
                            <div class="notif-actions">
                                <button class="btn-accept" data-id="${notif.id}" data-sender="${msg.sender_id}">Accept</button>
                                <button class="btn-decline" data-id="${notif.id}">Decline</button>
                            </div>
                         </div>
                    `;
                    container.appendChild(el);
                } 
                else if (msg && msg.type === 'request_accepted') {
                     const initial = msg.acceptor_name.charAt(0).toUpperCase();
                     const el = document.createElement('div');
                     el.className = 'notification-item';
                     el.innerHTML = `
                         <div class="user-avatar-sm" style="background-color:#1d9bf0; color:white;">${initial}</div>
                         <div class="notif-content">
                            <div class="notif-header">
                                <span style="font-weight:700;">${msg.acceptor_name}</span>
                            </div>
                            <div class="notif-text">Accepted your connection request.</div>
                            <div class="notif-actions">
                                <button class="btn-accept view-info-btn" data-email="${msg.email}">View Info</button>
                            </div>
                         </div>
                    `;
                    container.appendChild(el);
                }
            });

            document.querySelectorAll('.btn-accept:not(.view-info-btn)').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const notifId = this.getAttribute('data-id');
                    const senderId = this.getAttribute('data-sender');

                    this.innerText = "Accepted";
                    this.disabled = true;
                    this.parentElement.querySelector('.btn-decline').style.display = 'none';

                    await supabase.from('notification').delete().eq('id', notifId);
                    
                    const payload = {
                        type: 'request_accepted',
                        acceptor_name: currentPublicUser.name,
                        email: currentPublicUser.email
                    };

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
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#536471;">No notifications</div>';
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
        posts.forEach(post => {
            const user = post.User || { name: 'Unknown', user_name: 'unknown' };
            const initial = user.name.charAt(0).toUpperCase();
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
         /* (Keep existing Auth logic from previous response) */
         const loginForm = document.getElementById('loginForm');
         if(loginForm) loginForm.addEventListener('submit', async (e) => {
             e.preventDefault();
             const { error } = await supabase.auth.signInWithPassword({ email: document.getElementById('email').value, password: document.getElementById('password').value });
             if(!error) window.location.href='home.html'; else alert(error.message);
         });
         const signupForm = document.getElementById('signupForm');
         if(signupForm) signupForm.addEventListener('submit', async (e) => {
             e.preventDefault();
             const { data: authData, error: authError } = await supabase.auth.signUp({ email: document.getElementById('signupEmail').value, password: document.getElementById('signupPassword').value });
             if(authData.user) {
                 await supabase.from('User').insert([{ user_name: document.getElementById('signupUsername').value, name: document.getElementById('signupName').value, email: document.getElementById('signupEmail').value, auth_id: authData.user.id }]);
                 window.location.href='index.html';
             } else alert(authError.message);
         });
    }

    function escapeHtml(text) { if(!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
});