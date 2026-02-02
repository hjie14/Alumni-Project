import { supabase } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- GLOBAL VARIABLES ---
    const path = window.location.pathname;
    let currentUserAuth = null;
    let currentPublicUser = null; 

    console.log("🚀 App initializing on path:", path);

// --- 1. AUTH & USER LOADING (Fixed) ---
    const { data: { session } } = await supabase.auth.getSession();
    currentUserAuth = session?.user || null;

    if (currentUserAuth) {
        // FETCH USER + FULL PROFILE (Grabbing everything is safer)
        const { data: userData } = await supabase
            .from('User')
            .select('*, user_profile(*)') 
            .eq('auth_id', currentUserAuth.id)
            .maybeSingle(); 

        if (userData) {
            currentPublicUser = userData;
            
            // ROBUST FLATTENING LOGIC
            // Checks if user_profile is an object OR an array (Supabase can return either)
            let profileData = null;
            if (userData.user_profile) {
                if (Array.isArray(userData.user_profile) && userData.user_profile.length > 0) {
                    profileData = userData.user_profile[0];
                } else if (typeof userData.user_profile === 'object') {
                    profileData = userData.user_profile;
                }
            }

            // If we found profile data, attach the avatar_url to the main user object
            if (profileData && profileData.avatar_url) {
                currentPublicUser.avatar_url = profileData.avatar_url;
            }
        }
    }

    // --- 2. GLOBAL SETUP (Runs on EVERY page) ---
    setupAuthForms();
    setupCommonUI();
    setupRightSidebarSearch(); // <--- FIXED: Now runs everywhere

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
    } else if (path.includes('bookmarks.html')) {
        setupBookmarksPage();
    } else if (path.includes('jobpost.html')) {
        initJobPostPage();
    } else if (path.includes('event.html') || path.includes('events.html')) {
        initEventPostPage();
    }

function getAvatarHTML(user, size='sm') {
        let avatarUrl = null;
        
        // Handle different data structures from joins
        if (user.avatar_url) {
            avatarUrl = user.avatar_url;
        } else if (user.user_profile) {
            if (Array.isArray(user.user_profile) && user.user_profile.length > 0) {
                avatarUrl = user.user_profile[0].avatar_url;
            } else if (typeof user.user_profile === 'object') {
                avatarUrl = user.user_profile.avatar_url;
            }
        }

        const initial = user.name ? user.name.charAt(0).toUpperCase() : '?';
        const sizeClass = size === 'lg' ? 'profile-avatar-lg' : 'user-avatar-sm';
        const styles = size === 'sm' ? 'background-color:#0f1419; color:white;' : '';

        if (avatarUrl) {
            return `<img src="${avatarUrl}" class="${sizeClass}" style="object-fit:cover; cursor:pointer;" onclick="window.location.href='profile.html?id=${user.user_id}'">`;
        } else {
            return `<div class="${sizeClass}" style="${styles} cursor:pointer;" onclick="window.location.href='profile.html?id=${user.user_id}'">${initial}</div>`;
        }
    }

// ==========================================
    //  FEATURE: RIGHT SIDEBAR SEARCH
    // ==========================================
    function setupRightSidebarSearch() {
        const searchInput = document.querySelector('.right-sidebar .search-box input');
        let resultsContainer = document.getElementById('sidebarSearchResults');
        if(searchInput && !resultsContainer) {
            resultsContainer = document.createElement('div'); resultsContainer.id = 'sidebarSearchResults'; resultsContainer.className = 'search-results-dropdown';
            if(searchInput.parentNode.nextSibling) searchInput.parentNode.parentNode.insertBefore(resultsContainer, searchInput.parentNode.nextSibling);
            else searchInput.parentNode.parentNode.appendChild(resultsContainer);
        }
        if(!searchInput) return;

        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if(query.length === 0) { resultsContainer.style.display = 'none'; return; }

            // JOIN user_profile
            const { data } = await supabase.from('User')
                .select('user_id, name, user_name, user_profile(avatar_url)')
                .ilike('name', `%${query}%`)
                .limit(6);

            if(data && data.length > 0) {
                resultsContainer.innerHTML = ''; resultsContainer.style.display = 'block';
                const displayCount = Math.min(data.length, 5);
                for(let i=0; i<displayCount; i++) {
                    const u = data[i];
                    const div = document.createElement('div'); div.className = 'sidebar-user-item';
                    div.onclick = () => window.location.href = `profile.html?id=${u.user_id}`;
                    
                    const avatarHTML = getAvatarHTML(u);
                    
                    div.innerHTML = `<div style="width:30px; height:30px;">${avatarHTML}</div><div><div style="font-weight:bold;">${escapeHtml(u.name)}</div><div style="font-size:12px; color:#536471;">@${escapeHtml(u.user_name)}</div></div>`;
                    resultsContainer.appendChild(div);
                }
                if(data.length > 5) { const viewAll = document.createElement('div'); viewAll.className = 'sidebar-view-all'; viewAll.innerText = `View all`; viewAll.onclick = () => window.location.href = 'connect.html'; resultsContainer.appendChild(viewAll); }
            } else { resultsContainer.style.display = 'none'; }
        });
        document.addEventListener('click', (e) => { if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) resultsContainer.style.display = 'none'; });
    }

// ==========================================
    //  FEATURE: HOME PAGE
    // ==========================================
    function setupHomePage() {
        if(currentPublicUser) {
             const modal = document.getElementById('postModal');
             const sidebarPostBtn = document.getElementById('sidebarPostBtn');
             const closeBtn = document.querySelector('.close-modal');
             
             // Update Create Post Avatar
             const modalAvatar = document.querySelector('#postModal .current-user-avatar');
             if(modalAvatar && currentPublicUser) {
                 modalAvatar.innerHTML = getAvatarHTML(currentPublicUser);
                 modalAvatar.style.background = 'none'; 
                 modalAvatar.style.border = 'none';
             }

             if(modal) {
                 if(sidebarPostBtn) sidebarPostBtn.addEventListener('click', () => modal.style.display = 'block');
                 if(closeBtn) closeBtn.onclick = () => modal.style.display = "none";
                 window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }
             }
             setupCreatePostLogic();
        }
        setupRightSidebarSearch();
        fetchPosts(null); // This was calling a missing function
    }

function setupCreatePostLogic() {
        const input = document.getElementById('modalInput');
        const imgInput = document.getElementById('postImageInput');
        const vidInput = document.getElementById('postVideoInput');
        const previewContainer = document.getElementById('mediaPreviewContainer');
        const imgPreview = document.getElementById('imagePreview');
        const vidPreview = document.getElementById('videoPreview');
        const removeBtn = document.getElementById('removeMediaBtn');
        const postBtn = document.getElementById('modalPostBtn');
        
        let selectedFile = null;

        const clearPreview = () => {
            selectedFile = null;
            if(imgInput) imgInput.value = '';
            if(vidInput) vidInput.value = '';
            previewContainer.style.display = 'none';
            imgPreview.style.display = 'none';
            vidPreview.style.display = 'none';
            vidPreview.src = "";
            imgPreview.src = "";
        };

        if(imgInput) {
            imgInput.onchange = (e) => {
                const file = e.target.files[0];
                if(file) {
                    clearPreview(); 
                    selectedFile = file;
                    imgPreview.src = URL.createObjectURL(file);
                    imgPreview.style.display = 'block';
                    previewContainer.style.display = 'block';
                    postBtn.classList.add('active'); postBtn.disabled = false;
                }
            };
        }

        if(vidInput) {
            vidInput.onchange = (e) => {
                const file = e.target.files[0];
                if(file) {
                    clearPreview();
                    selectedFile = file;
                    vidPreview.src = URL.createObjectURL(file);
                    vidPreview.style.display = 'block';
                    previewContainer.style.display = 'block';
                    postBtn.classList.add('active'); postBtn.disabled = false;
                }
            };
        }

        if(removeBtn) {
            removeBtn.onclick = () => {
                clearPreview();
                if(input.value.trim() === '') { 
                    postBtn.classList.remove('active'); 
                    postBtn.disabled = true; 
                }
            };
        }

        if(input) {
            input.oninput = () => {
                if(input.value.trim().length > 0 || selectedFile) {
                    postBtn.classList.add('active');
                    postBtn.disabled = false;
                } else {
                    postBtn.classList.remove('active');
                    postBtn.disabled = true;
                }
            };
        }

        if(postBtn) {
            postBtn.onclick = async () => {
                if (!currentPublicUser) return;
                
                const text = input.value;
                if(!text && !selectedFile) return;

                postBtn.innerText = "Posting...";
                postBtn.disabled = true;

                let fileUrl = null;

                if (selectedFile) {
                    const ext = selectedFile.name.split('.').pop();
                    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('post_images')
                        .upload(fileName, selectedFile);

                    if (uploadError) {
                        alert("Upload failed: " + uploadError.message);
                        postBtn.innerText = "Post";
                        postBtn.disabled = false;
                        return;
                    }

                    const { data: publicData } = supabase.storage
                        .from('post_images')
                        .getPublicUrl(fileName);
                    
                    fileUrl = publicData.publicUrl;
                }

                const { error } = await supabase.from('post').insert([{ 
                    text_content: text, 
                    image_url: fileUrl, 
                    user_id: currentPublicUser.user_id 
                }]);

                if (!error) {
                    input.value = '';
                    clearPreview();
                    document.getElementById('postModal').style.display = "none";
                    postBtn.innerText = "Post";
                    fetchPosts(null); 
                } else {
                    alert("Error: " + error.message);
                    postBtn.innerText = "Post";
                    postBtn.disabled = false;
                }
            };
        }
    }

// --- MISSING FUNCTION RESTORED ---
    async function fetchPosts(userIdFilter) {
        const container = document.getElementById(userIdFilter ? 'myPostsContainer' : 'postsContainer');
        if(!container) return;

        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;">Loading...</div>`;

        // Join User AND user_profile to get the avatar URL
        let query = supabase.from('post').select(`
            id, created_at, text_content, image_url, user_id,
            User!post_user_id_fkey ( 
                user_id, name, user_name,
                user_profile ( avatar_url ) 
            )
        `).order('created_at', { ascending: false });

        if (userIdFilter) query = query.eq('user_id', userIdFilter);
        
        const { data: posts, error } = await query;
        
        if (error) {
            console.error(error);
            container.innerHTML = "Error loading posts.";
            return;
        }

        renderPosts(posts, container);
    }

async function renderPosts(posts, container) {
        container.innerHTML = '';
        if (!posts || posts.length === 0) { container.innerHTML = `<div class="no-posts-message">No posts found</div>`; return; }

        let myLikes = []; let myBookmarks = [];
        if(currentPublicUser) {
            const { data: l } = await supabase.from('likes').select('post_id').eq('user_id', currentPublicUser.user_id);
            const { data: b } = await supabase.from('bookmarks').select('post_id').eq('user_id', currentPublicUser.user_id);
            if(l) myLikes = l.map(x => x.post_id); if(b) myBookmarks = b.map(x => x.post_id);
        }

        posts.forEach(post => {
            const user = post.User || { name: 'Unknown', user_name: 'unknown' };
            const date = new Date(post.created_at).toLocaleDateString();
            let contentText = (post.text_content && typeof post.text_content === 'object') ? post.text_content.body : post.text_content;

            // Media
            let mediaHTML = '';
            if (post.image_url) {
                const isVideo = post.image_url.match(/\.(mp4|webm|mov|mkv)$/i);
                if(isVideo) mediaHTML = `<video src="${post.image_url}" controls style="width:100%; border-radius:12px; margin-top:10px;"></video>`;
                else mediaHTML = `<img src="${post.image_url}" style="width:100%; border-radius:12px; margin-top:10px;">`;
            }

            const isLiked = myLikes.includes(post.id);
            const isBookmarked = myBookmarks.includes(post.id);

            const div = document.createElement('article');
            div.className = 'post';
            div.innerHTML = `
                <div style="width:40px; height:40px; margin-right:10px;">
                    ${getAvatarHTML(user)}
                </div>
                <div style="flex:1;">
                    <div class="post-header" onclick="window.location.href='profile.html?id=${user.user_id}'">
                        <span class="post-name">${escapeHtml(user.name)}</span>
                        <span class="post-handle">@${escapeHtml(user.user_name)}</span>
                        <span class="post-time">· ${date}</span>
                    </div>
                    <div class="post-content" style="margin-top:5px;">${escapeHtml(contentText || "")}</div>
                    ${mediaHTML}
                    <div class="post-actions" style="margin-top:10px; display:flex; gap:15px;">
                        <button class="action-btn ${isLiked?'liked':''}" onclick="toggleLike(this, ${post.id})">
                            <i class='bx ${isLiked?'bxs-heart':'bx-heart'}'></i> <span>Like</span>
                        </button>
                        <button class="action-btn ${isBookmarked?'bookmarked':''}" onclick="toggleBookmark(this, ${post.id})">
                            <i class='bx ${isBookmarked?'bxs-bookmark':'bx-bookmark'}'></i> <span>${isBookmarked?'Saved':'Save'}</span>
                        </button>
                    </div>
                </div>`;
            container.appendChild(div);
        });
    }

// ==========================================
    //  FEATURE: JOBS & APPLICATIONS (Fixed)
    // ==========================================
    async function initJobPostPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        
        const modal = document.getElementById('jobPostModal');
        const openBtn = document.getElementById('sidebarPostBtn');
        const closeBtn = document.getElementById('closeJobModal');
        const submitBtn = document.getElementById('submitJobBtn');

        if(openBtn) openBtn.onclick = () => modal.style.display = 'block';
        if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => { 
            if(e.target == modal) modal.style.display = 'none'; 
            if(e.target == document.getElementById('applyJobModal')) document.getElementById('applyJobModal').style.display = 'none';
            if(e.target == document.getElementById('cancelJobModal')) document.getElementById('cancelJobModal').style.display = 'none';
            if(e.target == document.getElementById('successModal')) document.getElementById('successModal').style.display = 'none';
        };

        if(submitBtn) {
            submitBtn.onclick = async () => {
                const title = document.getElementById('inputJobTitle').value; 
                const company = document.getElementById('inputJobCompany').value; 
                const desc = document.getElementById('inputJobDesc').value;
                if(!title) return;
                
                await supabase.from('jobs').insert([{ title: title, company: company, description: desc, posted_by: currentPublicUser.user_id }]);
                modal.style.display = 'none'; 
                showSuccessModal("Job Posted", "Your listing is live.");
                fetchJobs();
            };
        }

        // Apply Modal Logic
        window.openApplyModal = (id, title, comp) => {
             const m = document.getElementById('applyJobModal'); 
             if(m) {
                 document.getElementById('applyJobTitleDisplay').innerText = title;
                 document.getElementById('applyJobCompanyDisplay').innerText = comp;
                 m.style.display = 'block';
                 document.getElementById('applyName').value = currentPublicUser.name || "";
                 document.getElementById('applyEmail').value = currentPublicUser.email || "";

                 document.getElementById('closeApplyModal').onclick = () => m.style.display='none';
                 const btn = document.getElementById('confirmApplyBtn');
                 btn.onclick = null; // Clear old listeners

                 btn.onclick = async () => {
                     const name = document.getElementById('applyName').value;
                     const email = document.getElementById('applyEmail').value;
                     if(!name) return;
                     
                     btn.innerText = "Sending...";
                     await supabase.from('job_applications').insert([{ job_id: id, applicant_id: currentPublicUser.user_id, applicant_name: name, applicant_email: email }]);
                     
                     m.style.display='none'; 
                     btn.innerText = "Submit Application";
                     showSuccessModal("Applied!", "Good luck!");
                     fetchJobs(); // <--- REFRESH BUTTONS
                 };
             }
        };

        // Cancel Modal Logic
        window.openCancelJobModal = (jobId) => {
            const m = document.getElementById('cancelJobModal');
            if(m) {
                m.style.display = 'block';
                document.getElementById('closeCancelJobModal').onclick = () => m.style.display = 'none';
                const btn = document.getElementById('confirmCancelJobBtn');
                btn.onclick = null;

                btn.onclick = async () => {
                    btn.innerText = "Withdrawing...";
                    await supabase.from('job_applications').delete().match({ job_id: jobId, applicant_id: currentPublicUser.user_id });
                    
                    m.style.display = 'none';
                    btn.innerText = "Yes, Withdraw";
                    showSuccessModal("Withdrawn", "Application removed.");
                    fetchJobs(); // <--- REFRESH BUTTONS
                };
            }
        };

        fetchJobs();
    }

async function fetchJobs() {
        const container = document.getElementById('jobsContainer');
        if(!container) return;
        
        // 1. Get Jobs
        const { data: jobs } = await supabase.from('jobs').select('*, User:posted_by(name)').order('created_at', { ascending: false });
        
        // 2. Get My Applications
        const { data: myApps } = await supabase.from('job_applications').select('job_id').eq('applicant_id', currentPublicUser.user_id);
        const myJobIds = myApps ? myApps.map(a => a.job_id) : [];

        container.innerHTML = '';
        if(!jobs || jobs.length === 0) { container.innerHTML = '<div class="no-posts-message">No jobs posted yet.</div>'; return; }

        jobs.forEach(job => {
            const date = new Date(job.created_at).toLocaleDateString();
            const posterName = job.User?.name || "Unknown";
            const safeTitle = escapeHtml(job.title).replace(/'/g, "\\'"); 
            const safeCompany = escapeHtml(job.company).replace(/'/g, "\\'");

            // BUTTON STATE LOGIC
            const hasApplied = myJobIds.includes(job.id);
            let actionBtn = '';
            
            if (hasApplied) {
                // RED WITHDRAW BUTTON (New Class)
                actionBtn = `<button class="btn-destructive-action" 
                    onclick="window.openCancelJobModal(${job.id})">
                    Withdraw Application
                </button>`;
            } else {
                // BLACK APPLY BUTTON (New Class)
                actionBtn = `<button class="btn-primary-action" 
                    onclick="window.openApplyModal(${job.id}, '${safeTitle}', '${safeCompany}')">
                    Apply Now
                </button>`;
            }

            container.innerHTML += `
            <div class="post" style="cursor: default;">
                <div style="width: 50px; height: 50px; background:#f7f9f9; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-right:15px; font-size:24px;">💼</div>
                <div style="flex:1;">
                    <div style="font-size:13px; color:#536471; margin-bottom:5px;">Posted by ${escapeHtml(posterName)} · ${date}</div>
                    <h3 style="margin:0; font-size:18px;">${escapeHtml(job.title)}</h3>
                    <div style="font-weight:bold; color:#1d9bf0; margin-bottom:8px;">${escapeHtml(job.company)}</div>
                    <p style="font-size:15px; color:#0f1419; white-space:pre-wrap;">${escapeHtml(job.description)}</p>
                    ${actionBtn}
                </div>
            </div>`;
        });
    }

// ==========================================
    //  FEATURE: EVENTS (Fixed)
    // ==========================================
    async function initEventPostPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        
        const modal = document.getElementById('eventPostModal');
        const openBtn = document.getElementById('sidebarPostBtn');
        const closeBtn = document.getElementById('closeEventModal');
        const submitBtn = document.getElementById('submitEventBtn');

        if(openBtn) openBtn.onclick = () => modal.style.display = 'block';
        if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        
        window.onclick = (e) => { 
            if(e.target == modal) modal.style.display = 'none'; 
            if(e.target == document.getElementById('rsvpModal')) document.getElementById('rsvpModal').style.display = 'none';
            if(e.target == document.getElementById('cancelRsvpModal')) document.getElementById('cancelRsvpModal').style.display = 'none';
            if(e.target == document.getElementById('successModal')) document.getElementById('successModal').style.display = 'none';
        };

        if(submitBtn) {
            submitBtn.onclick = async () => {
                const title = document.getElementById('inputEventTitle').value; 
                const location = document.getElementById('inputEventLocation').value; 
                const desc = document.getElementById('inputEventDesc').value;
                if(!title) return;
                
                await supabase.from('events').insert([{ title: title, location: location, description: desc, posted_by: currentPublicUser.user_id }]);
                modal.style.display = 'none'; 
                showSuccessModal("Event Created", "Your event is live.");
                fetchEvents();
            };
        }

        // RSVP Logic
        window.openRsvpModal = (id, title) => {
            const m = document.getElementById('rsvpModal');
            if(m) {
                document.getElementById('rsvpEventTitleDisplay').innerText = title;
                m.style.display = 'block';
                document.getElementById('rsvpName').value = currentPublicUser.name || "";
                document.getElementById('rsvpEmail').value = currentPublicUser.email || "";

                document.getElementById('closeRsvpModal').onclick = () => m.style.display='none';
                const btn = document.getElementById('confirmRsvpBtn');
                btn.onclick = null;

                btn.onclick = async () => {
                    const name = document.getElementById('rsvpName').value;
                    const email = document.getElementById('rsvpEmail').value;
                    const status = document.getElementById('rsvpStatus').value;
                    if(!name) return;
                    
                    btn.innerText = "Confirming...";
                    await supabase.from('event_rsvps').insert([{ event_id: id, attendee_id: currentPublicUser.user_id, attendee_name: name, attendee_email: email, status: status }]);
                    
                    m.style.display='none';
                    btn.innerText = "Confirm Seat";
                    showSuccessModal("RSVP Confirmed!", "You are on the list.");
                    fetchEvents(); // <--- REFRESH BUTTONS
                };
            }
        };

        // Cancel RSVP Logic
        window.openCancelRsvpModal = (eventId) => {
            const m = document.getElementById('cancelRsvpModal');
            if(m) {
                m.style.display = 'block';
                document.getElementById('closeCancelRsvpModal').onclick = () => m.style.display = 'none';
                const btn = document.getElementById('confirmCancelRsvpBtn');
                btn.onclick = null;

                btn.onclick = async () => {
                    btn.innerText = "Canceling...";
                    await supabase.from('event_rsvps').delete().match({ event_id: eventId, attendee_id: currentPublicUser.user_id });
                    
                    m.style.display = 'none';
                    btn.innerText = "Yes, Cancel";
                    showSuccessModal("Cancelled", "Reservation removed.");
                    fetchEvents(); // <--- REFRESH BUTTONS
                };
            }
        };

        fetchEvents();
    }

async function fetchEvents() {
        const container = document.getElementById('eventsContainer');
        if(!container) return;
        
        // 1. Get Events
        const { data: events } = await supabase.from('events').select('*, User:posted_by(name)').order('created_at', { ascending: false });
        
        // 2. Get My RSVPs
        const { data: myRsvps } = await supabase.from('event_rsvps').select('event_id').eq('attendee_id', currentPublicUser.user_id);
        const myEventIds = myRsvps ? myRsvps.map(r => r.event_id) : [];

        container.innerHTML = '';
        if(!events || events.length === 0) { container.innerHTML = '<div class="no-posts-message">No upcoming events.</div>'; return; }

        events.forEach(event => {
            const hostName = event.User?.name || "Unknown";
            const safeTitle = escapeHtml(event.title).replace(/'/g, "\\'");

            // BUTTON STATE LOGIC
            const isGoing = myEventIds.includes(event.id);
            let actionBtn = '';
            
            if (isGoing) {
                // RED CANCEL BUTTON (New Class)
                actionBtn = `<button class="btn-destructive-action" 
                    onclick="window.openCancelRsvpModal(${event.id})">
                    Cancel Reservation
                </button>`;
            } else {
                // BLACK RSVP BUTTON (New Class)
                actionBtn = `<button class="btn-primary-action" 
                    onclick="window.openRsvpModal(${event.id}, '${safeTitle}')">
                    RSVP
                </button>`;
            }

            container.innerHTML += `
            <div class="post" style="cursor: default;">
                <div style="width: 50px; height: 50px; background:#e8f5fd; color:#1d9bf0; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-right:15px; font-weight:bold;">
                    <i class='bx bx-calendar'></i>
                </div>
                <div style="flex:1;">
                    <div style="font-size:13px; color:#536471; margin-bottom:5px;">Hosted by ${escapeHtml(hostName)}</div>
                    <h3 style="margin:0; font-size:18px;">${escapeHtml(event.title)}</h3>
                    <div style="color:#536471; font-size:14px; margin-bottom:8px;">
                        <i class='bx bx-map'></i> ${escapeHtml(event.location)}
                    </div>
                    <p style="font-size:15px; color:#0f1419; white-space:pre-wrap;">${escapeHtml(event.description)}</p>
                    ${actionBtn}
                </div>
            </div>`;
        });
    }

// ==========================================
    //  HELPER: Show New Success Modal
    // ==========================================
    function showSuccessModal(title, msg) {
        const m = document.getElementById('successModal');
        if(m) {
            document.getElementById('successTitle').innerText = title;
            document.getElementById('successMessage').innerText = msg;
            m.style.display = 'block';
        } else {
            alert(title + "\n" + msg); // Fallback if HTML missing
        }
    }

// ==========================================
    //  FEATURE: PROFILE PAGE
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

        // Fetch Profile Data (Bio, Skills, etc)
        const { data: pDataRaw } = await supabase.from('user_profile').select('*').eq('user_id', profileUser.user_id).maybeSingle();
        const pData = pDataRaw || {};

        document.getElementById('headerName').innerText = profileUser.name;
        document.getElementById('displayName').innerText = profileUser.name;
        document.getElementById('displayHandle').innerText = `@${profileUser.user_name}`;
        document.getElementById('displayBio').innerText = pData.about_me || "No bio yet.";

        if(pData.country) { document.getElementById('metaLocation').style.display='block'; document.getElementById('txtLocation').innerText = pData.country; }
        if(pData.education) { document.getElementById('metaEducation').style.display='block'; document.getElementById('txtEducation').innerText = pData.education; }
        if(pData.linkedin_url) { document.getElementById('metaLink').style.display='block'; document.getElementById('txtLink').href = pData.linkedin_url; document.getElementById('txtLink').innerText = "Social Link"; }

        const skillsContainer = document.getElementById('skillsSection');
        skillsContainer.innerHTML = '';
        if(pData.skills_text) {
            pData.skills_text.split(',').forEach(s => { if(s.trim()) skillsContainer.innerHTML += `<span class="skill-tag">${escapeHtml(s.trim())}</span>`; });
        }

        // Render Images
        const avatarContainer = document.getElementById('profileAvatarContainer');
        const avatarText = document.getElementById('profileAvatarText');
        const avatarImg = document.getElementById('profileAvatarImg');
        const bannerDiv = document.getElementById('profileBanner');

        if(pData.avatar_url) {
            avatarText.style.display = 'none';
            avatarImg.src = pData.avatar_url;
            avatarImg.style.display = 'block';
            avatarContainer.style.backgroundColor = 'transparent';
            avatarContainer.style.border = '4px solid white';
        } else {
            avatarText.style.display = 'block';
            avatarText.innerText = profileUser.name.charAt(0).toUpperCase();
            avatarImg.style.display = 'none';
            avatarContainer.style.backgroundColor = '#0f1419';
            avatarContainer.style.color = 'white';
        }

        if(pData.banner_url) bannerDiv.style.backgroundImage = `url('${pData.banner_url}')`;

        // Buttons & Modals
        const editBtn = document.getElementById('editToggleBtn');
        const reqBtn = document.getElementById('requestMentorBtn');
        const editModal = document.getElementById('editProfileModal');
        const reqModal = document.getElementById('requestMentorModal');
        const cancelConfirmModal = document.getElementById('cancelConfirmModal');
        const confirmCancelActionBtn = document.getElementById('confirmCancelActionBtn');
        const closeCancelModalBtn = document.getElementById('closeCancelModalBtn');
        const reqMsgInput = document.getElementById('requestMessageInput');
        const confirmReqBtn = document.getElementById('confirmRequestBtn');
        const cancelReqBtn = document.getElementById('cancelRequestBtn');
        const closeReqBtn = document.getElementById('closeRequestModal');

        if (isMe) {
            editBtn.style.display = 'block';
            if(reqBtn) reqBtn.style.display = 'none';
            
            // --- CLICK EDIT: PRE-FILL DATA ---
            editBtn.onclick = () => {
                document.getElementById('inputName').value = currentPublicUser.name || "";
                document.getElementById('displayUserOnly').value = currentPublicUser.user_name || "";
                document.getElementById('displayEmailOnly').value = currentPublicUser.email || "";

                document.getElementById('inputBio').value = pData.about_me || "";
                document.getElementById('inputSkills').value = pData.skills_text || "";
                document.getElementById('inputEducation').value = pData.education || "";
                document.getElementById('inputLocation').value = pData.country || "";
                
                const existingLink = pData.linkedin_url || "";
                document.getElementById('inputWebsite').value = existingLink ? existingLink : "https://";
                
                editModal.style.display = 'block';
            };

            document.getElementById('closeEditModal').onclick = () => editModal.style.display = 'none';
            
            // --- SAVE LOGIC ---
            document.getElementById('profileForm').onsubmit = async (e) => {
                e.preventDefault();
                const btn = document.getElementById('saveProfileBtn');
                btn.innerText = "Saving..."; btn.disabled = true;

                const avatarFile = document.getElementById('inputAvatar').files[0];
                const bannerFile = document.getElementById('inputBanner').files[0];
                const newName = document.getElementById('inputName').value.trim();
                
                if(!newName) { alert("Name cannot be empty."); btn.innerText="Save"; btn.disabled=false; return; }

                let avatarUrl = pData.avatar_url; 
                let bannerUrl = pData.banner_url;

                if(avatarFile) {
                    const fileName = `avatar_${currentPublicUser.user_id}_${Date.now()}`;
                    const { error: upErr } = await supabase.storage.from('profile_images').upload(fileName, avatarFile);
                    if(!upErr) { const { data: pub } = supabase.storage.from('profile_images').getPublicUrl(fileName); avatarUrl = pub.publicUrl; }
                }

                if(bannerFile) {
                    const fileName = `banner_${currentPublicUser.user_id}_${Date.now()}`;
                    const { error: upErr } = await supabase.storage.from('profile_images').upload(fileName, bannerFile);
                    if(!upErr) { const { data: pub } = supabase.storage.from('profile_images').getPublicUrl(fileName); bannerUrl = pub.publicUrl; }
                }

                let rawLink = document.getElementById('inputWebsite').value.trim();
                if (rawLink === "https://" || rawLink === "") rawLink = null;

                const { error: nameError } = await supabase.from('User')
                    .update({ name: newName })
                    .eq('user_id', currentPublicUser.user_id);

                if(nameError) { alert("Error saving name: " + nameError.message); btn.innerText="Save"; btn.disabled=false; return; }

                const updates = {
                    user_id: currentPublicUser.user_id,
                    about_me: document.getElementById('inputBio').value,
                    education: document.getElementById('inputEducation').value,
                    country: document.getElementById('inputLocation').value,
                    skills_text: document.getElementById('inputSkills').value,
                    linkedin_url: rawLink,
                    avatar_url: avatarUrl,
                    banner_url: bannerUrl,
                    updated_at: new Date()
                };

                const { error: profileError } = await supabase.from('user_profile').upsert(updates, { onConflict: 'user_id' });
                
                if(!profileError) { 
                    editModal.style.display = 'none'; 
                    document.getElementById('saveSuccessPopup').classList.add('show'); 
                    window.location.reload();
                } else { 
                    alert(profileError.message); 
                    btn.innerText = "Save"; btn.disabled = false; 
                }
            };
        } else {
            editBtn.style.display = 'none';
            if(reqBtn) {
                reqBtn.style.display = 'block';

                const setRequestMode = () => {
                    reqBtn.innerText = "Request Mentorship";
                    reqBtn.className = "edit-profile-btn"; 
                    reqBtn.disabled = false;
                    reqBtn.onclick = () => { reqModal.style.display = 'block'; reqMsgInput.value = ''; };
                };

                const setCancelMode = (requestId) => {
                    reqBtn.innerText = "Cancel Request";
                    reqBtn.className = "edit-profile-btn btn-cancel-request"; 
                    reqBtn.disabled = false;
                    
                    reqBtn.onclick = () => {
                        if(cancelConfirmModal) cancelConfirmModal.style.display = 'block';
                        
                        if(confirmCancelActionBtn) {
                            confirmCancelActionBtn.onclick = async () => {
                                confirmCancelActionBtn.innerText = "Canceling...";
                                confirmCancelActionBtn.disabled = true;
                                const { error } = await supabase.from('mentorship_requests').delete().eq('id', requestId);
                                if(!error) {
                                    cancelConfirmModal.style.display = 'none';
                                    confirmCancelActionBtn.innerText = "Yes, Cancel"; 
                                    confirmCancelActionBtn.disabled = false;
                                    setRequestMode();
                                } else {
                                    alert("Error cancelling: " + error.message);
                                    confirmCancelActionBtn.innerText = "Yes, Cancel";
                                    confirmCancelActionBtn.disabled = false;
                                }
                            };
                        }
                        if(closeCancelModalBtn) closeCancelModalBtn.onclick = () => cancelConfirmModal.style.display = 'none';
                    };
                };

                const { data: existing } = await supabase.from('mentorship_requests').select('id, status').eq('sender_id', currentPublicUser.user_id).eq('receiver_id', profileUser.user_id).maybeSingle();

                if (existing) {
                    if (existing.status === 'Pending') setCancelMode(existing.id);
                    else if (existing.status === 'Accepted') { reqBtn.innerText = "Mentorship Active"; reqBtn.className = "edit-profile-btn"; reqBtn.disabled = true; }
                } else {
                    setRequestMode();
                }

                if(cancelReqBtn) cancelReqBtn.onclick = () => reqModal.style.display = 'none';
                if(closeReqBtn) closeReqBtn.onclick = () => reqModal.style.display = 'none';

                if(confirmReqBtn) confirmReqBtn.onclick = async () => {
                    const msg = reqMsgInput.value.trim();
                    if(!msg) { alert("Please write a message."); return; }
                    confirmReqBtn.innerText = "Sending..."; confirmReqBtn.disabled = true;
                    const { data, error } = await supabase.from('mentorship_requests').insert([{
                        sender_id: currentPublicUser.user_id, receiver_id: profileUser.user_id, message: msg, status: 'Pending'
                    }]).select();

                    if (!error && data && data.length > 0) {
                        reqModal.style.display = 'none';
                        setCancelMode(data[0].id); 
                        await supabase.from("notification").insert([{ user_id: profileUser.user_id, message: { type: "mentorship_request", text: `${currentPublicUser.name} requested mentorship.`, action: "Check Mentorship Tab" }, read_status: false }]);
                        const successPopup = document.getElementById('saveSuccessPopup');
                        if(successPopup) { successPopup.querySelector('h3').innerText = "Request Sent!"; successPopup.querySelector('p').innerText = "Your request has been sent."; successPopup.classList.add('show'); }
                    } else { alert("Error: " + (error ? error.message : "Unknown error")); }
                    confirmReqBtn.innerText = "Send Request"; confirmReqBtn.disabled = false;
                };
            }
        }
        
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

async function fetchLikedPosts(targetUserId) {
        const container = document.getElementById('myLikesContainer');
        if(!container) return;
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;">Loading likes...</div>`;
        const { data: likes } = await supabase.from('likes').select('post_id').eq('user_id', targetUserId);
        if(!likes || likes.length === 0) { container.innerHTML = `<div class="no-posts-message">No liked posts yet.</div>`; return; }
        const postIds = likes.map(l => l.post_id);
        const { data: posts } = await supabase.from('post').select(`id, created_at, text_content, image_url, user_id, User!post_user_id_fkey ( user_id, name, user_name, user_profile(avatar_url) )`).in('id', postIds).order('created_at', { ascending: false });
        renderPosts(posts, container);
    }

    // ==========================================
    //  FEATURE: MENTOR DASHBOARD
    // ==========================================
    let currentMentorTab = 'incoming'; 

    async function initMentorDashboard() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        await updateAllMentorCounts();
        window.switchMentorTab('incoming');
    }

    window.switchMentorTab = function(tabName) {
        currentMentorTab = tabName;
        document.querySelectorAll('.stat-card').forEach(el => el.classList.remove('active-tab'));
        const activeTab = document.getElementById(`tab-${tabName}`);
        if(activeTab) activeTab.classList.add('active-tab');
        const titles = { 'incoming': 'Received Requests', 'outgoing': 'Sent Requests' };
        document.getElementById('section-title').innerText = titles[tabName];
        loadMentorTab(tabName);
    }

    async function updateAllMentorCounts() {
        const { count: incoming } = await supabase.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('receiver_id', currentPublicUser.user_id).eq('status', 'Pending');
        const incEl = document.getElementById('count-incoming'); if(incEl) incEl.innerText = incoming || 0;
        const { count: outgoing } = await supabase.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('sender_id', currentPublicUser.user_id);
        const outEl = document.getElementById('count-outgoing'); if(outEl) outEl.innerText = outgoing || 0;
    }

    async function loadMentorTab(mode) {
        const container = document.getElementById('requests-container');
        const emptyMsg = document.getElementById('empty-msg');
        if(!container) return;
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin'></i> Loading...</div>`;
        if(emptyMsg) emptyMsg.style.display = 'none';

        let query = supabase.from('mentorship_requests').select(`id, created_at, message, status, sender_email_shared, receiver_email_shared, sender:sender_id ( user_id, name, user_name, email ), receiver:receiver_id ( user_id, name, user_name, email )`).order('created_at', { ascending: false });

        if (mode === 'incoming') query = query.eq('receiver_id', currentPublicUser.user_id).eq('status', 'Pending');
        else if (mode === 'outgoing') query = query.eq('sender_id', currentPublicUser.user_id);

        const { data, error } = await query;
        if (error) { container.innerHTML = 'Error loading data.'; return; }
        container.innerHTML = '';
        if (!data || data.length === 0) { if(emptyMsg) { emptyMsg.style.display = 'block'; document.getElementById('empty-text').innerText = mode === 'incoming' ? "No pending requests." : "You haven't sent any requests."; } return; }

        data.forEach(req => {
            const isSender = req.sender.user_id === currentPublicUser.user_id;
            const otherUser = isSender ? req.receiver : req.sender;
            let actionArea = '';

            if (mode === 'incoming') {
                actionArea = `<div class="action-buttons"><button class="btn-action btn-accept" onclick="window.updateMentorStatus(${req.id}, 'Accepted', '${otherUser.user_id}')">Accept</button><button class="btn-action btn-decline" onclick="window.updateMentorStatus(${req.id}, 'Declined', null)">Decline</button></div>`;
            } else if (mode === 'outgoing') {
                let statusBadge = '';
                if(req.status === 'Pending') statusBadge = `<span style="color:#d97706; font-weight:bold;">Pending</span>`;
                else if(req.status === 'Declined') statusBadge = `<span style="color:#dc3545; font-weight:bold;">Declined</span>`;
                else if(req.status === 'Accepted') {
                    statusBadge = `<span style="color:#059669; font-weight:bold;">Accepted</span>`;
                    let shareBtn = req.sender_email_shared ? `<div style="color:#059669; font-size:12px; margin-top:5px;">Email shared</div>` : `<button class="btn-action" style="background:#0f1419; color:white; margin-top:5px; width:auto; font-size:12px;" onclick="window.shareMentorEmail(${req.id}, '${otherUser.user_id}')">Share Email</button>`;
                    let viewEmail = req.receiver_email_shared ? `<div style="margin-top:5px; font-weight:bold;">${escapeHtml(otherUser.email)}</div>` : `<div style="margin-top:5px; font-size:12px; color:#536471;">Waiting for email...</div>`;
                    statusBadge += `<div>${shareBtn}${viewEmail}</div>`;
                }
                actionArea = `<div style="margin-top:15px;">${statusBadge}</div>`;
            }
            container.innerHTML += `<div class="request-card" id="card-${req.id}"><div style="display:flex; gap:12px; align-items:flex-start;"><div class="user-avatar-sm" style="background-color:#0f1419; color:white;">${otherUser.name.charAt(0).toUpperCase()}</div><div style="flex:1;"><div class="meta-info">@${escapeHtml(otherUser.user_name)}</div><h3 style="font-size:16px; margin-bottom:5px;">${escapeHtml(otherUser.name)}</h3><p>"${escapeHtml(req.message)}"</p>${actionArea}</div></div></div>`;
        });
    }

    window.updateMentorStatus = async function(id, newStatus, senderId) {
        if(!confirm(`Are you sure you want to ${newStatus}?`)) return;
        const { error } = await supabase.from('mentorship_requests').update({ status: newStatus }).eq('id', id);
        if (error) alert("Error"); 
        else { document.getElementById(`card-${id}`).remove(); if(newStatus === 'Accepted' && senderId) await supabase.from("notification").insert([{ user_id: senderId, message: { type: "mentorship_update", text: `Request Accepted!`, action: "Check Mentorship" }, read_status: false }]); updateAllMentorCounts(); loadMentorTab(currentMentorTab); }
    };

    window.shareMentorEmail = async function(reqId, targetUserId) {
        const { data: req } = await supabase.from('mentorship_requests').select('sender_id').eq('id', reqId).single();
        let updatePayload = req.sender_id === currentPublicUser.user_id ? { sender_email_shared: true } : { receiver_email_shared: true };
        const { error } = await supabase.from('mentorship_requests').update(updatePayload).eq('id', reqId);
        if (error) alert("Error sharing email."); else { alert("Email Shared"); loadMentorTab('outgoing'); }
    };

// ==========================================
    //  FEATURE: CONNECT PAGE (Updated Render)
    // ==========================================
    function setupConnectPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        const searchInput = document.getElementById('connectSearchInput');
        const container = document.getElementById('connectContainer');
        if(!searchInput || !container) return;

        const fetchUsers = async (q) => {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;">Finding people...</div>`;
            
            // JOIN user_profile
            let query = supabase.from('User')
                .select('*, user_profile(avatar_url)')
                .neq('user_id', currentPublicUser.user_id);
            
            if(q) query = query.ilike('name', `%${q}%`);
            const { data } = await query;
            
            container.innerHTML = '';
            if (!data || data.length === 0) { container.innerHTML = '<div style="padding:20px; text-align:center; color:#536471;">No users found.</div>'; return; }

            data.forEach(u => {
                const el = document.createElement('div'); el.className = 'connect-item';
                const safeName = u.name || "Unknown"; const safeHandle = u.user_name || "user";
                
                // Use Helper
                const avatarHTML = getAvatarHTML(u);

                const infoDiv = document.createElement('div'); infoDiv.className = 'connect-info';
                infoDiv.innerHTML = `<div style="width:40px; height:40px;">${avatarHTML}</div><div><div style="font-weight:700;">${escapeHtml(safeName)}</div><div style="color:#536471; font-size:14px;">@${escapeHtml(safeHandle)}</div></div>`;
                const btn = document.createElement('button'); btn.className = 'connect-btn'; btn.innerText = 'View Profile'; btn.onclick = () => { window.location.href = `profile.html?id=${u.user_id}`; };
                el.appendChild(infoDiv); el.appendChild(btn); container.appendChild(el);
            });
        };
        fetchUsers('');
        searchInput.oninput = (e) => fetchUsers(e.target.value);
    }

    // ==========================================
    //  FEATURE: NOTIFICATIONS & BOOKMARKS
    // ==========================================
    async function setupNotificationsPage() { 
        const container = document.getElementById("notificationsContainer");
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>Loading...</div>`;
        const { data: notifs } = await supabase.from("notification").select("*").eq("user_id", currentPublicUser.user_id).order("created_at", {ascending:false});
        container.innerHTML = ''; 
        if(!notifs || notifs.length === 0) { container.innerHTML = '<div style="padding:40px; text-align:center; color:#536471;">No new notifications</div>'; return; }
        notifs.forEach(n => {
             const msg = n.message; let text = typeof msg === 'string' ? msg : (msg.text || "New Notification"); let subtext = (typeof msg === 'object' && msg.action) ? `<div style="font-weight:bold; color:var(--primary-color); margin-top:5px; font-size:13px;">${msg.action}</div>` : '';
             const el = document.createElement('div'); el.className = 'notification-item'; el.innerHTML = `<div class="user-avatar-sm" style="background:#0f1419; color:white;">!</div><div><div>${escapeHtml(text)}</div>${subtext}</div>`; container.appendChild(el);
        });
    }

    function setupBookmarksPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        fetchBookmarkedPosts();
    }

    async function fetchBookmarkedPosts() {
        const container = document.getElementById('postsContainer'); if(!container) return;
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:24px;"></i><br>Loading bookmarks...</div>`;
        const { data: bookmarks } = await supabase.from('bookmarks').select('post_id').eq('user_id', currentPublicUser.user_id);
        if(!bookmarks || bookmarks.length === 0) { container.innerHTML = `<div class="no-posts-message">No bookmarks yet.</div>`; return; }
        const postIds = bookmarks.map(b => b.post_id);
        const { data: posts } = await supabase.from('post').select(`id, created_at, text_content, image_url, user_id, User!post_user_id_fkey ( user_id, name, user_name )`).in('id', postIds).order('created_at', { ascending: false });
        renderPosts(posts, container);
    }

// ==========================================
    //  FEATURE: SIDEBAR USER (UI Fix)
    // ==========================================
    function setupCommonUI() {
        const sidebarUser = document.getElementById('sidebarUser');
        if (currentPublicUser && sidebarUser) {
            
            // Get the Avatar HTML
            const avatarHTML = getAvatarHTML(currentPublicUser);
            
            // We inject it into a wrapper div to ensure sizing is perfect
            sidebarUser.innerHTML = `
                <div style="width:40px; height:40px; flex-shrink:0;">
                    ${avatarHTML}
                </div>
                <div class="user-meta" style="display:flex; flex-direction:column; margin-left:10px; overflow:hidden;">
                    <span style="font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${escapeHtml(currentPublicUser.name)}
                    </span>
                    <span style="color:#536471; font-size:13px;">
                        @${escapeHtml(currentPublicUser.user_name)}
                    </span>
                </div>`;
            
            // Popup Menu Logic
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

function setupAuthForms() {
        // Login Form (Keep as is)
        const f = document.getElementById('loginForm');
        if(f) f.onsubmit = async (e) => {
            e.preventDefault(); 
            const {error} = await supabase.auth.signInWithPassword({ 
                email: document.getElementById('email').value, 
                password: document.getElementById('password').value 
            });
            if(error) alert(error.message); else window.location.href='home.html';
        }

        // --- SIGN UP FORM (Updated with Validation) ---
        const sf = document.getElementById('signupForm');
        if (sf) sf.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value.trim();
            const username = document.getElementById('signupUsername').value.trim();
            const name = document.getElementById('signupName').value.trim();

            // 1. STRICT CHECK: Stop if any field is empty
            if (!email || !password || !username || !name) {
                alert("Please fill in ALL fields correctly.");
                return;
            }

            // 2. Create Auth User
            const { data, error } = await supabase.auth.signUp({ email: email, password: password });
            
            if (error) { 
                alert(error.message); 
                return; 
            }

            // 3. Create Public Profile (Only if Auth succeeded)
            if (data.user) {
                const { error: dbError } = await supabase.from('User').insert([{ 
                    user_name: username, 
                    name: name, 
                    email: email, 
                    auth_id: data.user.id, 
                    user_type: 'Student' 
                }]);

                if (dbError) {
                    // If DB insert fails, we should ideally delete the Auth user to prevent "ghost" accounts
                    // But for now, just alerting is enough for this stage
                    console.error("DB Error:", dbError);
                    alert("Error creating profile: " + dbError.message);
                } else {
                    window.location.href = 'home.html'; 
                }
            }
        });
    }

    function setupPasswordToggle() { const t = document.getElementById('togglePassword'); if(t) t.onclick = () => { const i = document.getElementById('password'); i.type = i.type === 'password' ? 'text' : 'password'; t.innerText = i.type === 'password' ? 'Show' : 'Hide'; } }
    
    window.toggleLike = async (btn, postId) => {
        if(!currentPublicUser) return alert("Sign in to like");
        const icon = btn.querySelector('i'); const isLiked = btn.classList.contains('liked');
        if(isLiked) { btn.classList.remove('liked'); icon.className = 'bx bx-heart'; await supabase.from('likes').delete().match({ user_id: currentPublicUser.user_id, post_id: postId }); } 
        else { btn.classList.add('liked'); icon.className = 'bx bxs-heart'; await supabase.from('likes').insert([{ user_id: currentPublicUser.user_id, post_id: postId }]); }
    };

    window.toggleBookmark = async (btn, postId) => {
        if(!currentPublicUser) return alert("Sign in to bookmark");
        const icon = btn.querySelector('i'); const textSpan = btn.querySelector('span'); const isSaved = btn.classList.contains('bookmarked');
        if(isSaved) { btn.classList.remove('bookmarked'); icon.className = 'bx bx-bookmark'; textSpan.innerText = 'Save'; await supabase.from('bookmarks').delete().match({ user_id: currentPublicUser.user_id, post_id: postId }); } 
        else { btn.classList.add('bookmarked'); icon.className = 'bx bxs-bookmark'; textSpan.innerText = 'Saved'; await supabase.from('bookmarks').insert([{ user_id: currentPublicUser.user_id, post_id: postId }]); }
    };

    function escapeHtml(text) { if(!text) return ""; return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    window.previewFile = function(input, previewId) {
    const file = input.files[0];
    if(file) {
        const preview = document.getElementById(previewId);
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block'; // Show the image over the box
    }
};
});