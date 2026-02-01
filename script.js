import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- GLOBAL VARIABLES ---
    const path = window.location.pathname;
    let currentUserAuth = null;
    let currentPublicUser = null; 

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
        }
    }

    // --- 2. PAGE ROUTER ---
    setupAuthForms();
    setupCommonUI();

    if (path.includes('home.html')) setupHomePage();
    else if (path.includes('connect.html')) setupConnectPage();
    else if (path.includes('notifications.html')) setupNotificationsPage();
    else if (path.includes('profile.html')) setupProfilePage();
    else if (path.includes('mentor.html')) initMentorDashboard();
    else if (path.includes('bookmarks.html')) setupBookmarksPage();
    else if (path.includes('jobpost.html')) initJobPostPage();
    else if (path.includes('event.html')) initEventPostPage();

// ==========================================
    //  FEATURE: PROFILE PAGE (With Custom Cancel Popup)
    // ==========================================
    async function setupProfilePage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }

        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');
        let profileUser = currentPublicUser;
        let isMe = true;

        if (targetId && targetId != currentPublicUser.user_id) {
            isMe = false;
            const { data: u } = await supabase.from('User').select('*').eq('user_id', targetId).single();
            if(u) profileUser = u;
        }

        // Render Profile Data
        const { data: pDataRaw } = await supabase.from('user_profile').select('*').eq('user_id', profileUser.user_id).maybeSingle();
        const pData = pDataRaw || {};

        document.getElementById('headerName').innerText = profileUser.name;
        document.getElementById('displayName').innerText = profileUser.name;
        document.getElementById('displayHandle').innerText = `@${profileUser.user_name}`;
        document.getElementById('profileAvatar').innerText = profileUser.name.charAt(0).toUpperCase();
        document.getElementById('displayBio').innerText = pData.about_me || "No bio yet.";

        if(pData.country) { document.getElementById('metaLocation').style.display='block'; document.getElementById('txtLocation').innerText = pData.country; }
        if(pData.education) { document.getElementById('metaEducation').style.display='block'; document.getElementById('txtEducation').innerText = pData.education; }
        if(pData.linkedin_url) { document.getElementById('metaLink').style.display='block'; document.getElementById('txtLink').href = pData.linkedin_url; document.getElementById('txtLink').innerText = "Social Link"; }

        const skillsContainer = document.getElementById('skillsSection');
        skillsContainer.innerHTML = '';
        if(pData.skills_text) {
            pData.skills_text.split(',').forEach(s => { if(s.trim()) skillsContainer.innerHTML += `<span class="skill-tag">${escapeHtml(s.trim())}</span>`; });
        }

        // BUTTONS & MODALS
        const editBtn = document.getElementById('editToggleBtn');
        const reqBtn = document.getElementById('requestMentorBtn');
        
        // Modals
        const editModal = document.getElementById('editProfileModal');
        const reqModal = document.getElementById('requestMentorModal');
        const cancelConfirmModal = document.getElementById('cancelConfirmModal'); // <--- NEW MODAL
        
        // Form Elements
        const reqMsgInput = document.getElementById('requestMessageInput');
        const confirmReqBtn = document.getElementById('confirmRequestBtn');
        const cancelReqBtn = document.getElementById('cancelRequestBtn');
        const closeReqBtn = document.getElementById('closeRequestModal');
        
        // Cancel Confirmation Buttons
        const confirmCancelActionBtn = document.getElementById('confirmCancelActionBtn');
        const closeCancelModalBtn = document.getElementById('closeCancelModalBtn');

        if (isMe) {
            editBtn.style.display = 'block';
            if(reqBtn) reqBtn.style.display = 'none';
            
            editBtn.onclick = () => editModal.style.display = 'block';
            document.getElementById('closeEditModal').onclick = () => editModal.style.display = 'none';
            
            document.getElementById('profileForm').onsubmit = async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button');
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
                if(!error) { editModal.style.display = 'none'; document.getElementById('saveSuccessPopup').classList.add('show'); }
                else { alert(error.message); btn.innerText = "Save"; btn.disabled = false; }
            };
        } else {
            editBtn.style.display = 'none';
            if(reqBtn) {
                reqBtn.style.display = 'block';

                // --- STATE 1: REQUEST ---
                const setRequestMode = () => {
                    reqBtn.innerText = "Request Mentorship";
                    reqBtn.className = "edit-profile-btn"; 
                    reqBtn.style.cssText = ""; 
                    reqBtn.disabled = false;
                    reqBtn.onclick = () => { reqModal.style.display = 'block'; reqMsgInput.value = ''; };
                };

                // --- STATE 2: CANCEL (UPDATED WITH POPUP) ---
                const setCancelMode = (requestId) => {
                    reqBtn.innerText = "Cancel Request";
                    reqBtn.className = "edit-profile-btn btn-cancel-request"; 
                    reqBtn.style.cssText = ""; 
                    reqBtn.disabled = false;
                    
                    reqBtn.onclick = () => {
                        // 1. OPEN CUSTOM MODAL (Instead of confirm())
                        if(cancelConfirmModal) cancelConfirmModal.style.display = 'block';

                        // 2. DEFINE "YES" ACTION
                        if(confirmCancelActionBtn) {
                            confirmCancelActionBtn.onclick = async () => {
                                confirmCancelActionBtn.innerText = "Canceling...";
                                confirmCancelActionBtn.disabled = true;

                                const { error } = await supabase.from('mentorship_requests').delete().eq('id', requestId);
                                
                                if(!error) {
                                    cancelConfirmModal.style.display = 'none';
                                    confirmCancelActionBtn.innerText = "Yes, Cancel"; 
                                    confirmCancelActionBtn.disabled = false;
                                    setRequestMode(); // RESET TO BLACK BUTTON
                                } else {
                                    alert("Error cancelling: " + error.message);
                                    confirmCancelActionBtn.innerText = "Yes, Cancel";
                                    confirmCancelActionBtn.disabled = false;
                                }
                            };
                        }

                        // 3. DEFINE "NO" ACTION
                        if(closeCancelModalBtn) {
                            closeCancelModalBtn.onclick = () => {
                                cancelConfirmModal.style.display = 'none';
                            };
                        }
                        
                        // Close on background click
                        window.onclick = (e) => { 
                            if (e.target == cancelConfirmModal) cancelConfirmModal.style.display='none';
                            if (e.target == reqModal) reqModal.style.display='none';
                            if (e.target == editModal) editModal.style.display='none';
                        };
                    };
                };

                // Check Status on Load
                const { data: existing } = await supabase.from('mentorship_requests')
                    .select('id, status')
                    .eq('sender_id', currentPublicUser.user_id)
                    .eq('receiver_id', profileUser.user_id)
                    .maybeSingle();

                if (existing) {
                    if (existing.status === 'Pending') setCancelMode(existing.id);
                    else if (existing.status === 'Accepted') { 
                        reqBtn.innerText = "Mentorship Active"; 
                        reqBtn.className = "edit-profile-btn";
                        reqBtn.disabled = true; 
                    }
                } else {
                    setRequestMode();
                }

                // Modal Close Logic (Request Form)
                const closePopup = () => { reqModal.style.display = 'none'; };
                cancelReqBtn.onclick = closePopup;
                closeReqBtn.onclick = closePopup;

                // Send Request Logic
                confirmReqBtn.onclick = async () => {
                    const msg = reqMsgInput.value.trim();
                    if(!msg) { alert("Please write a message."); return; }

                    confirmReqBtn.innerText = "Sending..."; 
                    confirmReqBtn.disabled = true;

                    const { data, error } = await supabase.from('mentorship_requests').insert([{
                        sender_id: currentPublicUser.user_id,
                        receiver_id: profileUser.user_id,
                        message: msg,
                        status: 'Pending'
                    }]).select();

                    if (!error && data && data.length > 0) {
                        closePopup();
                        setCancelMode(data[0].id); 
                        
                        await supabase.from("notification").insert([{
                            user_id: profileUser.user_id,
                            message: { type: "mentorship_request", text: `${currentPublicUser.name} requested mentorship.`, action: "Check Mentorship Tab" },
                            read_status: false
                        }]);
                        
                        const successPopup = document.getElementById('saveSuccessPopup');
                        if(successPopup) {
                            successPopup.querySelector('h3').innerText = "Request Sent!";
                            successPopup.querySelector('p').innerText = "Your request has been sent.";
                            successPopup.classList.add('show');
                        }
                    } else {
                        alert("Error: " + (error ? error.message : "Unknown error"));
                    }
                    confirmReqBtn.innerText = "Send Request"; 
                    confirmReqBtn.disabled = false;
                };
            }
        }
        
        // Tab Logic
        const tabPosts = document.getElementById('tabPosts');
        const tabLikes = document.getElementById('tabLikes');
        const contentPosts = document.getElementById('postsContent');
        const contentLikes = document.getElementById('likesContent');
        
        if(tabPosts && tabLikes) {
            tabPosts.onclick = () => { tabPosts.classList.add('active'); tabLikes.classList.remove('active'); contentPosts.style.display = 'block'; contentLikes.style.display = 'none'; };
            tabLikes.onclick = () => { tabLikes.classList.add('active'); tabPosts.classList.remove('active'); contentLikes.style.display = 'block'; contentPosts.style.display = 'none'; fetchLikedPosts(profileUser.user_id); };
        }
        fetchPosts(profileUser.user_id);
    }

    // ==========================================
    //  FEATURE: MENTOR DASHBOARD (Strict Separation)
    // ==========================================
    let currentMentorTab = 'incoming'; 

    async function initMentorDashboard() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        
        // 1. Immediate Count Refresh
        await updateAllMentorCounts();

        // 2. Load Default Tab
        window.switchMentorTab('incoming');
    }

    window.switchMentorTab = function(tabName) {
        currentMentorTab = tabName;
        
        // Update Classes
        document.querySelectorAll('.stat-card').forEach(el => el.classList.remove('active-tab'));
        const activeTab = document.getElementById(`tab-${tabName}`);
        if(activeTab) activeTab.classList.add('active-tab');
        
        const titles = {
            'incoming': 'Incoming Requests (Pending)', 
            'outgoing': 'Your Request Status'     
        };
        const titleEl = document.getElementById('section-title');
        if(titleEl) titleEl.innerText = titles[tabName] || 'Mentorship';

        loadMentorTab(tabName);
    }

    async function updateAllMentorCounts() {
        // Count Incoming (Pending Only)
        const { count: incoming } = await supabase.from('mentorship_requests')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', currentPublicUser.user_id).eq('status', 'Pending');
        
        const incEl = document.getElementById('count-incoming');
        if(incEl) incEl.innerText = incoming !== null ? incoming : 0;

        // Count Outgoing (All Sent)
        const { count: outgoing } = await supabase.from('mentorship_requests')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', currentPublicUser.user_id);
            
        const outEl = document.getElementById('count-outgoing');
        if(outEl) outEl.innerText = outgoing !== null ? outgoing : 0;
    }

    async function loadMentorTab(mode) {
        const container = document.getElementById('requests-container');
        const emptyMsg = document.getElementById('empty-msg');
        
        if(!container) return;

        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin'></i> Loading...</div>`;
        if(emptyMsg) emptyMsg.style.display = 'none';

        let query = supabase.from('mentorship_requests').select(`
            id, created_at, message, status, sender_email_shared, receiver_email_shared,
            sender:sender_id ( user_id, name, user_name, email ),
            receiver:receiver_id ( user_id, name, user_name, email )
        `).order('created_at', { ascending: false });

        // --- STRICT FILTERING ---
        if (mode === 'incoming') {
            // Logic: I am the RECEIVER + Status must be PENDING
            query = query.eq('receiver_id', currentPublicUser.user_id).eq('status', 'Pending');
        } else if (mode === 'outgoing') {
            // Logic: I am the SENDER (Show all statuses so I can see updates)
            query = query.eq('sender_id', currentPublicUser.user_id);
        }

        const { data, error } = await query;
        if (error) { console.error(error); container.innerHTML = 'Error loading data.'; return; }

        container.innerHTML = '';

        if (!data || data.length === 0) {
            if(emptyMsg) {
                emptyMsg.style.display = 'block';
                document.getElementById('empty-text').innerText = mode === 'incoming' ? "No pending requests." : "You haven't sent any requests.";
            }
            return;
        }

        data.forEach(req => {
            const isSender = req.sender.user_id === currentPublicUser.user_id;
            // If I am sender, show Receiver info. If I am receiver, show Sender info.
            const otherUser = isSender ? req.receiver : req.sender;
            const initial = otherUser.name ? otherUser.name.charAt(0).toUpperCase() : '?';
            
            let actionArea = '';

            if (mode === 'incoming') {
                // TAB 1: Accept/Decline Buttons
                actionArea = `
                    <div class="action-buttons">
                        <button class="btn-action btn-accept" onclick="window.updateMentorStatus(${req.id}, 'Accepted', '${otherUser.user_id}')">Accept</button>
                        <button class="btn-action btn-decline" onclick="window.updateMentorStatus(${req.id}, 'Declined', null)">Decline</button>
                    </div>
                `;
            } else if (mode === 'outgoing') {
                // TAB 2: Status Badge
                let statusBadge = '';
                if(req.status === 'Pending') {
                    statusBadge = `<span style="color:#d97706; font-weight:bold; font-size:14px;"><i class='bx bx-time'></i> Pending</span>`;
                } else if (req.status === 'Declined') {
                    statusBadge = `<span style="color:#dc3545; font-weight:bold; font-size:14px;"><i class='bx bx-x-circle'></i> Declined</span>`;
                } else if (req.status === 'Accepted') {
                    statusBadge = `<span style="color:#059669; font-weight:bold; font-size:14px;"><i class='bx bx-check-circle'></i> Accepted</span>`;
                    
                    // Logic: Sharing Email (Sender side)
                    const myEmailShared = req.sender_email_shared; 
                    const theirEmailShared = req.receiver_email_shared;

                    let shareBtn = myEmailShared 
                        ? `<div style="color:#059669; font-size:13px; margin-top:8px;">You shared your email</div>` 
                        : `<button class="btn-action" style="background:#0f1419; color:white; margin-top:8px; width:auto; font-size:12px;" onclick="window.shareMentorEmail(${req.id}, '${otherUser.user_id}')">Share Email</button>`;
                    
                    let viewEmail = theirEmailShared 
                        ? `<div style="margin-top:8px; font-weight:bold; color:#0f1419;">Contact: ${escapeHtml(otherUser.email)}</div>` 
                        : `<div style="margin-top:8px; font-size:13px; color:#536471; font-style:italic;">Waiting for email...</div>`;
                    
                    statusBadge += `<div style="margin-top:10px; padding-top:10px; border-top:1px solid #eee;">${shareBtn}${viewEmail}</div>`;
                }
                actionArea = `<div style="margin-top:15px;">${statusBadge}</div>`;
            }

            const html = `
                <div class="request-card" id="card-${req.id}">
                    <div style="display:flex; gap:12px; align-items:flex-start;">
                        <div class="user-avatar-sm" 
                             style="background-color:#0f1419; color:white; cursor:pointer; min-width:40px;"
                             onclick="window.location.href='profile.html?id=${otherUser.user_id}'">
                            ${initial}
                        </div>
                        <div style="flex:1;">
                            <div class="meta-info" style="cursor:pointer;" onclick="window.location.href='profile.html?id=${otherUser.user_id}'">
                                @${escapeHtml(otherUser.user_name)}
                            </div>
                            <h3 style="font-size:16px; margin-bottom:5px; cursor:pointer;" 
                                onclick="window.location.href='profile.html?id=${otherUser.user_id}'">
                                ${escapeHtml(otherUser.name)}
                            </h3>
                            <p>"${escapeHtml(req.message)}"</p>
                            ${actionArea}
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += html;
        });
    }

    // UPDATE STATUS
    window.updateMentorStatus = async function(id, newStatus, senderId) {
        if(!confirm(`Are you sure you want to ${newStatus} this request?`)) return;
        const { error } = await supabase.from('mentorship_requests').update({ status: newStatus }).eq('id', id);
        if (error) alert("Error: " + error.message); 
        else { 
            // Remove locally instantly
            const card = document.getElementById(`card-${id}`);
            if(card) card.remove();
            
            if(newStatus === 'Accepted' && senderId) { 
                await supabase.from("notification").insert([{ user_id: senderId, message: { type: "mentorship_update", text: `${currentPublicUser.name} accepted your mentorship request!`, action: "Go to Mentorship page to connect." }, read_status: false }]); 
            } 
            updateAllMentorCounts(); 
            loadMentorTab(currentMentorTab); 
        }
    };

    // SHARE EMAIL
    window.shareMentorEmail = async function(reqId, targetUserId) {
        const { data: req } = await supabase.from('mentorship_requests').select('sender_id').eq('id', reqId).single();
        let updatePayload = req.sender_id === currentPublicUser.user_id ? { sender_email_shared: true } : { receiver_email_shared: true };
        const { error } = await supabase.from('mentorship_requests').update(updatePayload).eq('id', reqId);
        if (error) alert("Error sharing email."); 
        else { 
            const popup = document.getElementById('saveSuccessPopup');
            if(popup) {
                popup.querySelector('h3').innerText = "Email Shared!";
                popup.querySelector('p').innerText = "Your contact info is now visible.";
                popup.classList.add('show'); 
            }
            await supabase.from("notification").insert([{ user_id: targetUserId, message: { type: "email_shared", text: `${currentPublicUser.name} shared their contact info with you.`, action: "View Email" }, read_status: false }]); 
            loadMentorTab('outgoing'); // Refresh to show email shared status
        }
    };

    // ==========================================
    //  FEATURE: CONNECT PAGE (Missing Function)
    // ==========================================
    function setupConnectPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        
        const searchInput = document.getElementById('connectSearchInput');
        const container = document.getElementById('connectContainer');
        
        // Safety check: if we are not on the Connect page, stop here
        if(!searchInput || !container) return;

        const fetchUsers = async (q) => {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>Finding people...</div>`;

            // Select all users except myself
            let query = supabase.from('User')
                .select('*')
                .neq('user_id', currentPublicUser.user_id);

            // If user typed something, filter by name
            if(q) query = query.ilike('name', `%${q}%`);

            const { data, error } = await query;
            
            container.innerHTML = ''; // Clear loading spinner

            if (error) {
                console.error("Connect Page Error:", error);
                container.innerHTML = `<div style="padding:20px; text-align:center; color:red;">Error loading users.</div>`;
                return;
            }

            if (!data || data.length === 0) {
                 container.innerHTML = '<div style="padding:20px; text-align:center; color:#536471;">No users found.</div>';
                 return;
            }

            // Render Users
            data.forEach(u => {
                const el = document.createElement('div'); 
                el.className = 'connect-item';
                
                const safeName = u.name || "Unknown";
                const safeHandle = u.user_name || "user";
                const initial = safeName.charAt(0).toUpperCase();

                const infoDiv = document.createElement('div');
                infoDiv.className = 'connect-info';
                infoDiv.innerHTML = `
                    <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                    <div>
                        <div style="font-weight:700;">${escapeHtml(safeName)}</div>
                        <div style="color:#536471; font-size:14px;">@${escapeHtml(safeHandle)}</div>
                    </div>`;

                const btn = document.createElement('button');
                btn.className = 'connect-btn';
                btn.innerText = 'View Profile'; 
                btn.onclick = () => { window.location.href = `profile.html?id=${u.user_id}`; };

                el.appendChild(infoDiv);
                el.appendChild(btn);
                container.appendChild(el);
            });
        };

        // Initial Load
        fetchUsers('');
        
        // Search Listener
        searchInput.oninput = (e) => fetchUsers(e.target.value);
    }

    // ==========================================
    //  FEATURE: HOME PAGE POSTS
    // ==========================================
    function setupHomePage() {
        if(currentPublicUser) {
             setupInputLogic('inlineInput', 'inlinePostBtn');
             const modal = document.getElementById('postModal');
             if(modal) {
                 const sidebarPostBtn = document.getElementById('sidebarPostBtn');
                 const closeBtn = document.querySelector('.close-modal');
                 if(sidebarPostBtn) sidebarPostBtn.addEventListener('click', () => modal.style.display = 'block');
                 if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
                 window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }
             }
        }
        fetchPosts(null);
    }

    // ==========================================
    //  FEATURE: BOOKMARKS PAGE
    // ==========================================
    function setupBookmarksPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        fetchBookmarkedPosts();
    }

    async function fetchBookmarkedPosts() {
        const container = document.getElementById('postsContainer') || document.getElementById('myPostsContainer');
        if(!container) return;
        
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>Loading bookmarks...</div>`;

        const { data: bookmarks } = await supabase.from('bookmarks').select('post_id').eq('user_id', currentPublicUser.user_id);
        
        if(!bookmarks || bookmarks.length === 0) {
            container.innerHTML = `<div class="no-posts-message">No bookmarks yet.</div>`;
            return;
        }

        const postIds = bookmarks.map(b => b.post_id);

        const { data: posts } = await supabase
            .from('post')
            .select(`id, created_at, text_content, user_id, User!post_user_id_fkey ( user_id, name, user_name )`)
            .in('id', postIds)
            .order('created_at', { ascending: false });

        renderPosts(posts, container);
    }

    async function fetchLikedPosts(targetUserId) {
        const container = document.getElementById('myLikesContainer');
        if(!container) return;
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin'></i> Loading likes...</div>`;

        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', targetUserId);
        
        if(!likes || likes.length === 0) {
            container.innerHTML = `<div class="no-posts-message">No liked posts yet.</div>`;
            return;
        }

        const postIds = likes.map(l => l.post_id);

        const { data: posts } = await supabase
            .from('post')
            .select(`id, created_at, text_content, user_id, User!post_user_id_fkey ( user_id, name, user_name )`)
            .in('id', postIds)
            .order('created_at', { ascending: false });

        renderPosts(posts, container);
    }

    async function fetchPosts(userIdFilter = null) {
        const container = document.getElementById(userIdFilter ? 'myPostsContainer' : 'postsContainer');
        if(!container) return;

        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>Loading posts...</div>`;

        let query = supabase.from('post').select(`
            id, created_at, text_content, user_id,
            User!post_user_id_fkey ( user_id, name, user_name )
        `).order('created_at', { ascending: false });

        if (userIdFilter) query = query.eq('user_id', userIdFilter);
        
        const { data: posts, error } = await query;
        if (error) { console.error("Error:", error); container.innerHTML="Error loading posts"; return; }
        
        renderPosts(posts, container);
    }

    async function renderPosts(posts, container) {
        container.innerHTML = '';
        if (!posts || posts.length === 0) { container.innerHTML = `<div class="no-posts-message">No posts found</div>`; return; }

        let myLikes = [];
        let myBookmarks = [];
        if(currentPublicUser) {
            const { data: l } = await supabase.from('likes').select('post_id').eq('user_id', currentPublicUser.user_id);
            const { data: b } = await supabase.from('bookmarks').select('post_id').eq('user_id', currentPublicUser.user_id);
            if(l) myLikes = l.map(x => x.post_id);
            if(b) myBookmarks = b.map(x => x.post_id);
        }

        posts.forEach(post => {
            const user = post.User || { name: 'Unknown', user_name: 'unknown' };
            const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
            let contentText = (post.text_content && typeof post.text_content === 'object') ? (post.text_content.body || "") : post.text_content;
            const date = new Date(post.created_at).toLocaleDateString();

            const isLiked = myLikes.includes(post.id);
            const isBookmarked = myBookmarks.includes(post.id);
            const bookmarkText = isBookmarked ? 'Saved' : 'Save';

            const div = document.createElement('article');
            div.className = 'post';
            div.innerHTML = `
                <div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div>
                <div style="flex:1;">
                    <div class="post-header" onclick="window.location.href='profile.html?id=${user.user_id}'">
                        <span class="post-name">${escapeHtml(user.name)}</span>
                        <span class="post-handle">@${escapeHtml(user.user_name)}</span>
                        <span class="post-time">· ${date}</span>
                    </div>
                    <div class="post-content" style="margin-top:5px;">${escapeHtml(contentText)}</div>
                    
                    <div class="post-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike(this, ${post.id})">
                            <i class='bx ${isLiked ? 'bxs-heart' : 'bx-heart'}'></i> <span>Like</span>
                        </button>
                        <button class="action-btn ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark(this, ${post.id})">
                            <i class='bx ${isBookmarked ? 'bxs-bookmark' : 'bx-bookmark'}'></i> <span>${bookmarkText}</span>
                        </button>
                    </div>
                </div>`;
            container.appendChild(div);
        });
    }

    window.toggleLike = async (btn, postId) => {
        if(!currentPublicUser) return alert("Sign in to like");
        const icon = btn.querySelector('i');
        const isLiked = btn.classList.contains('liked');

        if(isLiked) {
            btn.classList.remove('liked');
            icon.className = 'bx bx-heart';
            await supabase.from('likes').delete().match({ user_id: currentPublicUser.user_id, post_id: postId });
        } else {
            btn.classList.add('liked');
            icon.className = 'bx bxs-heart';
            await supabase.from('likes').insert([{ user_id: currentPublicUser.user_id, post_id: postId }]);
        }
    };

    window.toggleBookmark = async (btn, postId) => {
        if(!currentPublicUser) return alert("Sign in to bookmark");
        const icon = btn.querySelector('i');
        const textSpan = btn.querySelector('span');
        const isSaved = btn.classList.contains('bookmarked');

        if(isSaved) {
            btn.classList.remove('bookmarked');
            icon.className = 'bx bx-bookmark';
            textSpan.innerText = 'Save';
            await supabase.from('bookmarks').delete().match({ user_id: currentPublicUser.user_id, post_id: postId });
        } else {
            btn.classList.add('bookmarked');
            icon.className = 'bx bxs-bookmark';
            textSpan.innerText = 'Saved';
            await supabase.from('bookmarks').insert([{ user_id: currentPublicUser.user_id, post_id: postId }]);
        }
    };

    // ==========================================
    //  FEATURE: NOTIFICATIONS
    // ==========================================
    async function setupNotificationsPage() { 
        const container = document.getElementById("notificationsContainer");
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>Loading...</div>`;

        const { data: notifs } = await supabase.from("notification").select("*").eq("user_id", currentPublicUser.user_id).order("created_at", {ascending:false});
         
        container.innerHTML = ''; 
        if(!notifs || notifs.length === 0) {
             container.innerHTML = '<div style="padding:40px; text-align:center; color:#536471;">No new notifications</div>';
             return;
        }
         
        notifs.forEach(n => {
             const msg = n.message;
             let text = typeof msg === 'string' ? msg : (msg.text || "New Notification");
             let subtext = (typeof msg === 'object' && msg.action) ? `<div style="font-weight:bold; color:var(--primary-color); margin-top:5px; font-size:13px;">${msg.action}</div>` : '';
             
             const el = document.createElement('div');
             el.className = 'notification-item';
             el.innerHTML = `<div class="user-avatar-sm" style="background:#0f1419; color:white;">!</div><div><div>${escapeHtml(text)}</div>${subtext}</div>`;
             container.appendChild(el);
        });
    }

    // ==========================================
    //  HELPERS
    // ==========================================
    function setupInputLogic(inputId, btnId) {
        const input = document.getElementById(inputId); const btn = document.getElementById(btnId);
        if(!input || !btn) return;
        input.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; if(this.value.trim().length > 0) { btn.classList.add('active'); btn.disabled = false; } else { btn.classList.remove('active'); btn.disabled = true; } });
        btn.addEventListener('click', async () => {
            if (!currentPublicUser) { alert("Please sign in to post."); return; }
            btn.disabled = true; btn.innerText = "Posting...";
            const { error } = await supabase.from('post').insert([{ text_content: { body: input.value }, user_id: currentPublicUser.user_id }]);
            if (!error) { input.value = ''; input.style.height = 'auto'; btn.classList.remove('active'); if(document.getElementById('postModal')) document.getElementById('postModal').style.display="none"; fetchPosts(null); btn.innerText = "Post"; } 
            else { alert("Error: " + error.message); btn.innerText = "Post"; btn.disabled = false; }
        });
    }

    function setupCommonUI() {
        const sidebarUser = document.getElementById('sidebarUser');
        if (currentPublicUser && sidebarUser) {
            const initial = currentPublicUser.name ? currentPublicUser.name.charAt(0).toUpperCase() : 'U';
            sidebarUser.innerHTML = `<div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${initial}</div><div class="user-meta" style="display:flex; flex-direction:column; margin-left:10px;"><span style="font-weight:700;">${escapeHtml(currentPublicUser.name)}</span><span style="color:#536471; font-size:13px;">@${escapeHtml(currentPublicUser.user_name)}</span></div>`;
            let menu = document.getElementById('userPopupMenu');
            if(!menu) { menu = document.createElement('div'); menu.className = 'user-popup-menu'; menu.id = 'userPopupMenu'; sidebarUser.parentNode.appendChild(menu); }
            menu.innerHTML = `<div class="menu-item" id="logoutTrigger">Log out @${escapeHtml(currentPublicUser.user_name)}</div>`;
            sidebarUser.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); };
            window.onclick = () => { if(menu) menu.classList.remove('show'); };
            const logoutBtn = document.getElementById('logoutTrigger');
            if(logoutBtn) logoutBtn.onclick = async () => { await supabase.auth.signOut(); window.location.href = 'index.html'; };
        }
    }

    function setupAuthForms() {
        const f = document.getElementById('loginForm');
        if(f) f.onsubmit = async (e) => {
            e.preventDefault();
            const {error} = await supabase.auth.signInWithPassword({ email: document.getElementById('email').value, password: document.getElementById('password').value });
            if(error) alert(error.message); else window.location.href='home.html';
        }
        const sf = document.getElementById('signupForm');
        if (sf) sf.addEventListener('submit', async (e) => {
            e.preventDefault();
            const { data, error } = await supabase.auth.signUp({ email: document.getElementById('signupEmail').value, password: document.getElementById('signupPassword').value });
            if (error) { alert(error.message); return; }
            if (data.user) { await supabase.from('User').insert([{ user_name: document.getElementById('signupUsername').value, name: document.getElementById('signupName').value, email: document.getElementById('signupEmail').value, auth_id: data.user.id, user_type: 'Student' }]); window.location.href = 'home.html'; }
        });
    }

    function initJobPostPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        const btn = document.getElementById('sidebarPostBtn');
        if (btn) btn.addEventListener('click', async () => {
                const title = document.getElementById('jobTitle').value; const company = document.getElementById('jobCompany').value; const desc = document.getElementById('jobDesc').value;
                if(!title || !company) { alert("Please fill in required fields."); return; }
                btn.innerText = "Posting..."; btn.disabled = true;
                const { error } = await supabase.from('jobs').insert([{ title: title, company: company, description: desc, posted_by: currentPublicUser.user_id }]);
                if (error) { alert("Error: " + error.message); btn.innerText = "Submit Job"; btn.disabled = false; } else { alert("Job Posted Successfully!"); window.location.href = 'home.html'; }
        });
    }

    function initEventPostPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        const btn = document.getElementById('sidebarPostBtn');
        if (btn) btn.addEventListener('click', async () => {
                const title = document.getElementById('eventTitle').value; const location = document.getElementById('eventLocation').value; const desc = document.getElementById('eventDesc').value;
                if(!title || !location) { alert("Please fill in required fields."); return; }
                btn.innerText = "Posting..."; btn.disabled = true;
                const { error } = await supabase.from('events').insert([{ title: title, location: location, description: desc, posted_by: currentPublicUser.user_id }]);
                if (error) { alert("Error: " + error.message); btn.innerText = "Submit Event"; btn.disabled = false; } else { alert("Event Created Successfully!"); window.location.href = 'home.html'; }
        });
    }

    function setupPasswordToggle() { const t = document.getElementById('togglePassword'); if(t) t.onclick = () => { const i = document.getElementById('password'); i.type = i.type === 'password' ? 'text' : 'password'; t.innerText = i.type === 'password' ? 'Show' : 'Hide'; } }
    function escapeHtml(text) { if(!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
});