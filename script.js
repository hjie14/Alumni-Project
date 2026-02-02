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

function setupRightSidebarSearch() {
        const searchInput = document.querySelector('.right-sidebar .search-box input');
        let resultsContainer = document.getElementById('sidebarSearchResults');
        
        // Ensure container exists
        if(searchInput && !resultsContainer) {
            resultsContainer = document.createElement('div'); 
            resultsContainer.id = 'sidebarSearchResults'; 
            resultsContainer.className = 'search-results-dropdown';
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
                resultsContainer.innerHTML = ''; 
                resultsContainer.style.display = 'block';
                
                const displayCount = Math.min(data.length, 5);
                for(let i=0; i<displayCount; i++) {
                    const u = data[i];
                    const div = document.createElement('div'); 
                    div.className = 'sidebar-user-item';
                    div.onclick = () => window.location.href = `profile.html?id=${u.user_id}`;
                    
                    const avatarHTML = getAvatarHTML(u);
                    
                    div.innerHTML = `
                        <div style="width:40px; height:40px;">${avatarHTML}</div>
                        <div>
                            <div class="name">${escapeHtml(u.name)}</div>
                            <div class="handle">@${escapeHtml(u.user_name)}</div>
                        </div>`;
                    resultsContainer.appendChild(div);
                }
                if(data.length > 5) { 
                    const viewAll = document.createElement('div'); 
                    viewAll.className = 'sidebar-view-all'; 
                    viewAll.innerText = `View all results`; 
                    viewAll.onclick = () => window.location.href = 'connect.html'; 
                    resultsContainer.appendChild(viewAll); 
                }
            } else { resultsContainer.style.display = 'none'; }
        });
        
        // Close when clicking outside
        document.addEventListener('click', (e) => { 
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.style.display = 'none'; 
            }
        });
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

            // DELETE CHECK: Am I the owner?
            let deleteIcon = '';
            if (currentPublicUser && post.user_id === currentPublicUser.user_id) {
                deleteIcon = `<i class='bx bx-trash' style="margin-left:auto; cursor:pointer; color:#ef4444; font-size:18px;" onclick="window.openDeletePostModal(${post.id})" title="Delete Post"></i>`;
            }

            const div = document.createElement('article');
            div.className = 'post';
            div.innerHTML = `
                <div style="width:40px; height:40px; margin-right:10px;">
                    ${getAvatarHTML(user)}
                </div>
                <div style="flex:1;">
                    <div class="post-header" style="display:flex; align-items:center;">
                        <span class="post-name" onclick="window.location.href='profile.html?id=${user.user_id}'" style="cursor:pointer;">${escapeHtml(user.name)}</span>
                        <span class="post-handle">@${escapeHtml(user.user_name)}</span>
                        <span class="post-time">· ${date}</span>
                        ${deleteIcon}
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

    // --- NEW: GLOBAL DELETE POST LOGIC ---
    // Add this outside renderPosts (e.g., at the bottom of your script)
    window.openDeletePostModal = (postId) => {
        const m = document.getElementById('deletePostModal');
        if(m) {
            m.style.display = 'block';
            document.getElementById('closeDeletePostModal').onclick = () => m.style.display = 'none';
            
            const btn = document.getElementById('confirmDeletePostBtn');
            btn.onclick = null;

            btn.onclick = async () => {
                btn.innerText = "Deleting...";
                const { error } = await supabase.from('post').delete().eq('id', postId);
                
                if(error) {
                    alert("Error: " + error.message);
                    btn.innerText = "Delete";
                } else {
                    m.style.display = 'none';
                    btn.innerText = "Delete";
                    
                    // Refresh current view (works for both Home and Profile)
                    const isProfilePage = window.location.pathname.includes('profile.html');
                    const isHomePage = window.location.pathname.includes('home.html');
                    
                    if(isHomePage) fetchPosts(null);
                    if(isProfilePage) {
                         // We need to re-fetch based on the profile user ID
                         const urlParams = new URLSearchParams(window.location.search);
                         const targetId = urlParams.get('id') || currentPublicUser.user_id;
                         fetchPosts(targetId);
                    }
                }
            };
        }
    };

// ==========================================
    //  FEATURE: JOBS (With Delete Option)
    // ==========================================
    async function initJobPostPage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        
        const modal = document.getElementById('jobPostModal');
        const openBtn = document.getElementById('sidebarPostBtn');
        const closeBtn = document.getElementById('closeJobModal');
        const submitBtn = document.getElementById('submitJobBtn');

        if(openBtn) openBtn.onclick = () => modal.style.display = 'block';
        if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
        
        // Close Modals on Outside Click
        window.onclick = (e) => { 
            if(e.target == modal) modal.style.display = 'none'; 
            if(e.target == document.getElementById('applyJobModal')) document.getElementById('applyJobModal').style.display = 'none';
            if(e.target == document.getElementById('cancelJobModal')) document.getElementById('cancelJobModal').style.display = 'none';
            if(e.target == document.getElementById('deleteJobModal')) document.getElementById('deleteJobModal').style.display = 'none'; // NEW
            if(e.target == document.getElementById('successModal')) document.getElementById('successModal').style.display = 'none';
        };

        if(submitBtn) {
            submitBtn.onclick = async () => {
                const title = document.getElementById('inputJobTitle').value; 
                const company = document.getElementById('inputJobCompany').value; 
                const location = document.getElementById('inputJobLocation').value; 
                const type = document.getElementById('inputJobType').value;         
                const desc = document.getElementById('inputJobDesc').value;
                
                if(!title || !company) return;
                
                await supabase.from('jobs').insert([{ title: title, company: company, location: location, job_type: type, description: desc, posted_by: currentPublicUser.user_id }]);
                await broadcastNotificationToAll('new_job', `New Job: ${title} at ${company}`, "View Job Board");

                modal.style.display = 'none'; 
                showSuccessModal("Job Posted", "Your listing is live.");
                fetchJobs();
            };
        }

        // ... [Keep window.openApplyModal and window.openCancelJobModal as they were] ...
        // (You don't need to change Apply/Cancel logic, just keep them here)
        window.openApplyModal = (id, title, comp) => { /* ... existing code ... */ 
             const m = document.getElementById('applyJobModal'); 
             if(m) {
                 document.getElementById('applyJobTitleDisplay').innerText = title;
                 document.getElementById('applyJobCompanyDisplay').innerText = comp;
                 m.style.display = 'block';
                 document.getElementById('applyName').value = currentPublicUser.name || "";
                 document.getElementById('applyEmail').value = currentPublicUser.email || "";

                 document.getElementById('closeApplyModal').onclick = () => m.style.display='none';
                 const btn = document.getElementById('confirmApplyBtn');
                 btn.onclick = null; 
                 btn.onclick = async () => {
                     const name = document.getElementById('applyName').value;
                     const email = document.getElementById('applyEmail').value;
                     if(!name) return;
                     btn.innerText = "Sending...";
                     await supabase.from('job_applications').insert([{ job_id: id, applicant_id: currentPublicUser.user_id, applicant_name: name, applicant_email: email }]);
                     m.style.display='none'; btn.innerText = "Submit Application";
                     showSuccessModal("Applied!", "Good luck!");
                     setTimeout(() => fetchJobs(), 500); 
                 };
             }
        };

        window.openCancelJobModal = (jobId) => { /* ... existing code ... */ 
            const m = document.getElementById('cancelJobModal');
            if(m) {
                m.style.display = 'block';
                document.getElementById('closeCancelJobModal').onclick = () => m.style.display = 'none';
                const btn = document.getElementById('confirmCancelJobBtn');
                btn.onclick = null;
                btn.onclick = async () => {
                    btn.innerText = "Withdrawing...";
                    const { error } = await supabase.from('job_applications').delete().match({ job_id: jobId, applicant_id: currentPublicUser.user_id });
                    if(error) { alert("Error: " + error.message); btn.innerText = "Yes, Withdraw"; return; }
                    m.style.display = 'none'; btn.innerText = "Yes, Withdraw";
                    showSuccessModal("Withdrawn", "Application removed.");
                    setTimeout(() => fetchJobs(), 500);
                };
            }
        };

        // --- NEW: DELETE JOB LOGIC ---
        window.openDeleteJobModal = (jobId) => {
            const m = document.getElementById('deleteJobModal');
            if(m) {
                m.style.display = 'block';
                document.getElementById('closeDeleteJobModal').onclick = () => m.style.display = 'none';
                
                const btn = document.getElementById('confirmDeleteJobBtn');
                btn.onclick = null;

                btn.onclick = async () => {
                    btn.innerText = "Deleting...";
                    // Delete from database
                    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
                    
                    if(error) {
                        alert("Error: " + error.message);
                        btn.innerText = "Delete";
                        return;
                    }

                    m.style.display = 'none';
                    btn.innerText = "Delete";
                    showSuccessModal("Deleted", "Job post removed.");
                    setTimeout(() => fetchJobs(), 500);
                };
            }
        };

        fetchJobs();
    }

async function fetchJobs() {
        const container = document.getElementById('jobsContainer');
        if(!container) return;
        
        const { data: jobs } = await supabase.from('jobs').select('*, User:posted_by(name)').order('created_at', { ascending: false });
        const { data: myApps } = await supabase.from('job_applications').select('job_id').eq('applicant_id', currentPublicUser.user_id);
        const myJobIds = myApps ? myApps.map(a => a.job_id) : [];

        container.innerHTML = '';
        if(!jobs || jobs.length === 0) { container.innerHTML = '<div class="no-posts-message">No jobs posted yet.</div>'; return; }

        jobs.forEach(job => {
            const date = new Date(job.created_at).toLocaleDateString();
            const posterName = job.User?.name || "Unknown";
            const safeTitle = escapeHtml(job.title).replace(/'/g, "\\'"); 
            const safeCompany = escapeHtml(job.company).replace(/'/g, "\\'");
            const location = job.location || "Remote"; 
            const type = job.job_type || "Full-time";

            // CHECK: Is Current User the Creator?
            const isCreator = job.posted_by === currentPublicUser.user_id;
            
            let topRightAction = '';
            if (isCreator) {
                // Show Trash Icon for Creator
                topRightAction = `<i class='bx bx-trash' style="cursor:pointer; color:#ef4444; font-size:18px;" onclick="window.openDeleteJobModal(${job.id})" title="Delete Post"></i>`;
            }

            // Bottom Button Logic
            const hasApplied = myJobIds.includes(job.id);
            let actionBtn = '';
            if (!isCreator) { // Only show Apply/Withdraw if NOT the creator
                if (hasApplied) {
                    actionBtn = `<button class="btn-destructive-action" onclick="window.openCancelJobModal(${job.id})">Withdraw Application</button>`;
                } else {
                    actionBtn = `<button class="btn-primary-action" onclick="window.openApplyModal(${job.id}, '${safeTitle}', '${safeCompany}')">Apply Now</button>`;
                }
            } else {
                actionBtn = `<div style="margin-top:12px; font-size:13px; color:#536471; font-style:italic;">You posted this job.</div>`;
            }

            container.innerHTML += `
            <div class="post" style="cursor: default;">
                <div style="width: 50px; height: 50px; background:#f7f9f9; border-radius:8px; display:flex; align-items:center; justify-content:center; margin-right:15px; font-size:24px;">💼</div>
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="font-size:13px; color:#536471; margin-bottom:5px;">Posted by ${escapeHtml(posterName)} · ${date}</div>
                        <div>${topRightAction}</div>
                    </div>
                    
                    <h3 style="margin:0; font-size:18px;">${escapeHtml(job.title)}</h3>
                    <div style="font-weight:bold; color:#1d9bf0; margin-bottom:5px;">${escapeHtml(job.company)}</div>
                    
                    <div style="font-size:13px; color:#536471; margin-bottom:10px; display:flex; align-items:center; gap:12px;">
                        <span><i class='bx bx-map'></i> ${escapeHtml(location)}</span>
                        <span><i class='bx bx-time'></i> ${escapeHtml(type)}</span>
                    </div>

                    <p style="font-size:15px; color:#0f1419; white-space:pre-wrap;">${escapeHtml(job.description)}</p>
                    ${actionBtn}
                </div>
            </div>`;
        });
    }

// ==========================================
    //  FEATURE: EVENTS (With Delete Option)
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
            if(e.target == document.getElementById('deleteEventModal')) document.getElementById('deleteEventModal').style.display = 'none'; // NEW
            if(e.target == document.getElementById('successModal')) document.getElementById('successModal').style.display = 'none';
        };

        if(submitBtn) {
            submitBtn.onclick = async () => {
                const title = document.getElementById('inputEventTitle').value; 
                const location = document.getElementById('inputEventLocation').value; 
                const desc = document.getElementById('inputEventDesc').value;
                if(!title) return;
                
                await supabase.from('events').insert([{ title: title, location: location, description: desc, posted_by: currentPublicUser.user_id }]);
                await broadcastNotificationToAll('new_event', `New Event: ${title}`, "View Events");

                modal.style.display = 'none'; 
                showSuccessModal("Event Created", "Your event is live.");
                fetchEvents();
            };
        }

        // ... [Keep window.openRsvpModal and window.openCancelRsvpModal as they were] ...
        window.openRsvpModal = (id, title) => { /* ... existing code ... */ 
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
                    m.style.display='none'; btn.innerText = "Confirm Seat";
                    showSuccessModal("RSVP Confirmed!", "You are on the list.");
                    setTimeout(() => fetchEvents(), 500); 
                };
            }
        };

        window.openCancelRsvpModal = (eventId) => { /* ... existing code ... */ 
            const m = document.getElementById('cancelRsvpModal');
            if(m) {
                m.style.display = 'block';
                document.getElementById('closeCancelRsvpModal').onclick = () => m.style.display = 'none';
                const btn = document.getElementById('confirmCancelRsvpBtn');
                btn.onclick = null;
                btn.onclick = async () => {
                    btn.innerText = "Canceling...";
                    const { error } = await supabase.from('event_rsvps').delete().match({ event_id: eventId, attendee_id: currentPublicUser.user_id });
                    if(error) { alert("Error: " + error.message); btn.innerText = "Yes, Cancel"; return; }
                    m.style.display = 'none'; btn.innerText = "Yes, Cancel";
                    showSuccessModal("Cancelled", "Reservation removed.");
                    setTimeout(() => fetchEvents(), 500); 
                };
            }
        };

        // --- NEW: DELETE EVENT LOGIC ---
        window.openDeleteEventModal = (eventId) => {
            const m = document.getElementById('deleteEventModal');
            if(m) {
                m.style.display = 'block';
                document.getElementById('closeDeleteEventModal').onclick = () => m.style.display = 'none';
                
                const btn = document.getElementById('confirmDeleteEventBtn');
                btn.onclick = null;

                btn.onclick = async () => {
                    btn.innerText = "Deleting...";
                    const { error } = await supabase.from('events').delete().eq('id', eventId);
                    
                    if(error) { alert("Error: " + error.message); btn.innerText = "Delete"; return; }

                    m.style.display = 'none';
                    btn.innerText = "Delete";
                    showSuccessModal("Deleted", "Event removed.");
                    setTimeout(() => fetchEvents(), 500);
                };
            }
        };

        fetchEvents();
    }

    async function fetchEvents() {
        const container = document.getElementById('eventsContainer');
        if(!container) return;
        
        const { data: events } = await supabase.from('events').select('*, User:posted_by(name)').order('created_at', { ascending: false });
        const { data: myRsvps } = await supabase.from('event_rsvps').select('event_id').eq('attendee_id', currentPublicUser.user_id);
        const myEventIds = myRsvps ? myRsvps.map(r => r.event_id) : [];

        container.innerHTML = '';
        if(!events || events.length === 0) { container.innerHTML = '<div class="no-posts-message">No upcoming events.</div>'; return; }

        events.forEach(event => {
            const hostName = event.User?.name || "Unknown";
            const safeTitle = escapeHtml(event.title).replace(/'/g, "\\'");

            // CHECK: Is Current User the Creator?
            const isCreator = event.posted_by === currentPublicUser.user_id;
            
            let topRightAction = '';
            if (isCreator) {
                topRightAction = `<i class='bx bx-trash' style="cursor:pointer; color:#ef4444; font-size:18px;" onclick="window.openDeleteEventModal(${event.id})" title="Delete Event"></i>`;
            }

            // Button Logic
            const isGoing = myEventIds.includes(event.id);
            let actionBtn = '';
            if (!isCreator) {
                if (isGoing) {
                    actionBtn = `<button class="btn-destructive-action" onclick="window.openCancelRsvpModal(${event.id})">Cancel Reservation</button>`;
                } else {
                    actionBtn = `<button class="btn-primary-action" onclick="window.openRsvpModal(${event.id}, '${safeTitle}')">RSVP</button>`;
                }
            } else {
                 actionBtn = `<div style="margin-top:12px; font-size:13px; color:#536471; font-style:italic;">You are hosting this event.</div>`;
            }

            container.innerHTML += `
            <div class="post" style="cursor: default;">
                <div style="width: 50px; height: 50px; background:#e8f5fd; color:#1d9bf0; border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-right:15px; font-weight:bold;">
                    <i class='bx bx-calendar'></i>
                </div>
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="font-size:13px; color:#536471; margin-bottom:5px;">Hosted by ${escapeHtml(hostName)}</div>
                        <div>${topRightAction}</div>
                    </div>

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
    //  FEATURE: PROFILE PAGE (Updated with Fix)
    // ==========================================
    async function setupProfilePage() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }

        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('id');
        let profileUser = currentPublicUser;
        let isMe = true;

        // 1. Determine who we are looking at
        if (targetId && targetId != currentPublicUser.user_id) {
            isMe = false;
            const { data: u } = await supabase.from('User').select('*').eq('user_id', targetId).single();
            if(u) profileUser = u;
        }

        // 2. Render Profile Header (Bio, Name, etc) - Keep your existing code for this part
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
        
        // Render Avatar/Banner
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

        // 3. BUTTON LOGIC (Edit vs Request)
        const editBtn = document.getElementById('editToggleBtn');
        const reqBtn = document.getElementById('requestMentorBtn');
        
        // Modals
        const editModal = document.getElementById('editProfileModal');
        const reqModal = document.getElementById('requestMentorModal'); // New Modal ID
        const reqMsgInput = document.getElementById('requestMessageInput');
        const confirmReqBtn = document.getElementById('confirmRequestBtn');
        const reqError = document.getElementById('requestErrorMsg');
        const closeReqBtn = document.getElementById('closeRequestModal');

        if (isMe) {
            // ... (Keep your existing Edit Profile Logic here) ...
            editBtn.style.display = 'block';
            if(reqBtn) reqBtn.style.display = 'none';
            
            // Re-attach edit click handler just in case
            editBtn.onclick = () => {
                document.getElementById('inputName').value = currentPublicUser.name || "";
                // ... populate other fields ...
                editModal.style.display = 'block';
            };
            document.getElementById('closeEditModal').onclick = () => editModal.style.display = 'none';

        } else {
            // --- NOT ME (Viewing someone else) ---
            editBtn.style.display = 'none';
            if(reqBtn) {
                reqBtn.style.display = 'block';

                // Check Mentorship Status
                const { data: existing } = await supabase.from('mentorship_requests')
                    .select('id, status')
                    .eq('sender_id', currentPublicUser.user_id)
                    .eq('receiver_id', profileUser.user_id)
                    .maybeSingle();

                // State A: Active Mentorship
                if (existing && existing.status === 'Accepted') {
                    reqBtn.innerText = "Mentorship Active"; 
                    reqBtn.disabled = true;
                    // Green Style
                    reqBtn.style.backgroundColor = "#ecfdf5"; 
                    reqBtn.style.color = "#059669";           
                    reqBtn.style.border = "1px solid #059669"; 
                    reqBtn.style.fontWeight = "700";
                    reqBtn.innerHTML = "<i class='bx bx-check'></i> Mentorship Active";
                } 
                // State B: Pending Request (Cancel Option)
                else if (existing && existing.status === 'Pending') {
                    reqBtn.innerText = "Cancel Request";
                    reqBtn.className = "edit-profile-btn btn-cancel-request"; 
                    reqBtn.style.color = "#f4212e";
                    reqBtn.style.borderColor = "#f4212e";
                    
                    // --- NEW: Open Custom Cancel Modal ---
                    reqBtn.onclick = () => {
                        const m = document.getElementById('cancelRequestModal');
                        if(m) {
                            m.style.display = 'block';
                            
                            // Close Button
                            document.getElementById('closeCancelReqModal').onclick = () => m.style.display = 'none';
                            
                            // Confirm Withdraw Button
                            const yesBtn = document.getElementById('confirmCancelReqBtn');
                            yesBtn.onclick = null;
                            yesBtn.onclick = async () => {
                                yesBtn.innerText = "Withdrawing...";
                                await supabase.from('mentorship_requests').delete().eq('id', existing.id);
                                m.style.display = 'none';
                                window.location.reload(); // Reload to update UI
                            };
                        }
                    };
                }
                
                // State C: No Request OR Declined (Allow Requesting)
                else {
                    reqBtn.innerText = "Request Mentorship";
                    reqBtn.className = "edit-profile-btn";
                    
                    reqBtn.onclick = () => {
                        reqModal.style.display = 'block';
                        reqMsgInput.value = '';
                        reqMsgInput.classList.remove('error');
                        reqError.style.display = 'none';
                    };

                    if(closeReqBtn) closeReqBtn.onclick = () => reqModal.style.display = 'none';
                    
                    if(confirmReqBtn) {
                        confirmReqBtn.onclick = null;
                        confirmReqBtn.onclick = async () => {
                            const msg = reqMsgInput.value.trim();
                            if(!msg) { 
                                reqMsgInput.classList.add('error');
                                reqError.style.display = 'block';
                                return; 
                            }

                            confirmReqBtn.innerText = "Sending..."; 
                            confirmReqBtn.disabled = true;

                            let error = null;

                            if (existing) {
                                // Update existing row
                                const { error: upErr } = await supabase.from('mentorship_requests')
                                    .update({ status: 'Pending', message: msg, created_at: new Date() })
                                    .eq('id', existing.id);
                                error = upErr;
                            } else {
                                // Insert new row
                                const { error: inErr } = await supabase.from('mentorship_requests').insert([{
                                    sender_id: currentPublicUser.user_id, 
                                    receiver_id: profileUser.user_id, 
                                    message: msg, 
                                    status: 'Pending'
                                }]);
                                error = inErr;
                            }

                            if (!error) {
                                reqModal.style.display = 'none';
                                
                                // Send Notification
                                await supabase.from("notification").insert([{ 
                                    user_id: profileUser.user_id, 
                                    message: { type: "mentorship_request", text: `${currentPublicUser.name} requested mentorship.`, action: "Check Mentorship Tab" }, 
                                    read_status: false 
                                }]);
                                
                                // --- NEW: Show Custom Success Modal instead of Alert ---
                                const successModal = document.getElementById('requestSentModal');
                                if(successModal) {
                                    // Optional: Customize text
                                    const textP = document.getElementById('sentModalText');
                                    if(textP) textP.innerText = `Your request to @${profileUser.user_name} has been sent successfully.`;
                                    
                                    successModal.style.display = 'block';
                                    // Note: The "Great" button in HTML triggers window.location.reload()
                                } else {
                                    window.location.reload();
                                }
                                
                            } else { 
                                alert("Error: " + error.message); 
                                confirmReqBtn.innerText = "Send Request"; 
                                confirmReqBtn.disabled = false;
                            }
                        };
                    }
                }
            }
        }
        
        // Fetch posts logic (keep existing)...
        const tabPosts = document.getElementById('tabPosts');
        // ... rest of your profile post fetching code ...
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
    //  FEATURE: MENTOR DASHBOARD (Updated)
    // ==========================================
    let currentMentorTab = 'incoming'; 

    async function initMentorDashboard() {
        if (!currentPublicUser) { window.location.href = 'index.html'; return; }
        await updateAllMentorCounts();
        window.switchMentorTab('incoming');
    }

    // Updated to handle 3 tabs
    window.switchMentorTab = function(tabName) {
        currentMentorTab = tabName;
        
        // Update UI Tabs
        document.querySelectorAll('.stat-card').forEach(el => el.classList.remove('active-tab'));
        const activeTab = document.getElementById(`tab-${tabName}`);
        if(activeTab) activeTab.classList.add('active-tab');
        
        // Update Title
        const titles = { 
            'incoming': 'Received Requests (Pending)', 
            'outgoing': 'Sent Requests',
            'accepted': 'Active Mentorships' 
        };
        const titleEl = document.getElementById('section-title');
        if(titleEl) titleEl.innerText = titles[tabName];

        loadMentorTab(tabName);
    }

    // Helper to jump from Sent -> Accepted
    window.jumpToAccepted = function(reqId) {
        window.switchMentorTab('accepted');
        // Wait slightly for render, then scroll
        setTimeout(() => {
            const card = document.getElementById(`card-${reqId}`);
            if(card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.border = "2px solid #1d9bf0"; // Highlight effect
                setTimeout(() => card.style.border = "1px solid #eff3f4", 2000);
            }
        }, 600);
    }

    async function updateAllMentorCounts() {
        // Incoming (Pending only)
        const { count: incoming } = await supabase.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('receiver_id', currentPublicUser.user_id).eq('status', 'Pending');
        const incEl = document.getElementById('count-incoming'); if(incEl) incEl.innerText = incoming || 0;

        // Outgoing (All)
        const { count: outgoing } = await supabase.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('sender_id', currentPublicUser.user_id);
        const outEl = document.getElementById('count-outgoing'); if(outEl) outEl.innerText = outgoing || 0;

        // Accepted (As Sender OR Receiver)
        const { count: accepted } = await supabase.from('mentorship_requests').select('*', { count: 'exact', head: true }).eq('status', 'Accepted').or(`sender_id.eq.${currentPublicUser.user_id},receiver_id.eq.${currentPublicUser.user_id}`);
        const accEl = document.getElementById('count-accepted'); if(accEl) accEl.innerText = accepted || 0;
    }

async function loadMentorTab(mode) {
        const container = document.getElementById('requests-container');
        const emptyMsg = document.getElementById('empty-msg');
        if(!container) return;
        
        container.innerHTML = `<div style="text-align:center; padding:20px; color:#536471;"><i class='bx bx-loader-alt bx-spin'></i> Loading...</div>`;
        if(emptyMsg) emptyMsg.style.display = 'none';

        let query = supabase.from('mentorship_requests').select(`
            id, created_at, message, status, sender_email_shared, receiver_email_shared,
            sender:sender_id ( user_id, name, user_name, email, user_profile(avatar_url) ), 
            receiver:receiver_id ( user_id, name, user_name, email, user_profile(avatar_url) )
        `).order('created_at', { ascending: false });

        if (mode === 'incoming') {
            query = query.eq('receiver_id', currentPublicUser.user_id).eq('status', 'Pending');
        } else if (mode === 'outgoing') {
            query = query.eq('sender_id', currentPublicUser.user_id);
        } else if (mode === 'accepted') {
            query = query.eq('status', 'Accepted').or(`sender_id.eq.${currentPublicUser.user_id},receiver_id.eq.${currentPublicUser.user_id}`);
        }

        const { data, error } = await query;
        if (error) { container.innerHTML = 'Error loading data.'; return; }
        
        container.innerHTML = '';
        if (!data || data.length === 0) { 
            if(emptyMsg) { 
                emptyMsg.style.display = 'block'; 
                let msg = "";
                if(mode === 'incoming') msg = "No pending requests.";
                else if(mode === 'outgoing') msg = "You haven't sent any requests.";
                else msg = "No active mentorships yet.";
                document.getElementById('empty-text').innerText = msg;
            } 
            return; 
        }

        data.forEach(req => {
            const isSender = req.sender.user_id === currentPublicUser.user_id;
            const otherUser = isSender ? req.receiver : req.sender; 
            const avatarHTML = getAvatarHTML(otherUser);
            
            let topRightContent = '';
            let actionArea = '';

            // --- 1. ACCEPTED TAB (Active) ---
            if (mode === 'accepted') {
                // Badge + DELETE BUTTON
                let badge = isSender ? `<span class="tag-sent">Sent by you</span>` : `<span class="tag-received">Received</span>`;
                
                // Add Trash Icon next to the badge
                topRightContent = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${badge}
                        <div onclick="window.openEndMentorshipModal(${req.id})" 
                             style="width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:#fee2e2; cursor:pointer;" 
                             title="End Mentorship">
                            <i class='bx bx-trash' style="color:#ef4444; font-size:14px;"></i>
                        </div>
                    </div>`;

                const emailToShow = isSender ? req.receiver.email : req.sender.email;
                actionArea = `
                    <div style="margin-top:10px; background:#f7f9f9; padding:10px; border-radius:8px; border:1px solid #eff3f4;">
                        <div style="font-size:11px; color:#536471; font-weight:bold; text-transform:uppercase;">Contact Info</div>
                        <div style="font-weight:bold; color:#0f1419; margin-top:2px; font-size:14px;">
                            <i class='bx bx-envelope'></i> ${escapeHtml(emailToShow)}
                        </div>
                        <div style="font-size:13px; color:#059669; margin-top:5px;">
                            <i class='bx bx-check-circle'></i> Mentorship Active
                        </div>
                    </div>
                `;
            } 
// --- 2. INCOMING TAB ---
            else if (mode === 'incoming') {
                 actionArea = `
                    <div class="action-buttons">
                        <button class="btn-action btn-accept" onclick="window.openAcceptModal(${req.id}, '${otherUser.user_id}')">Accept</button>
                        
                        <button class="btn-action btn-decline" onclick="window.openDeclineModal(${req.id}, '${otherUser.user_id}')">Decline</button>
                    </div>`;
            }

            // --- 3. OUTGOING TAB ---
            else if (mode === 'outgoing') {
                let statusBadge = '';
                if(req.status === 'Pending') statusBadge = `<span style="color:#d97706; font-weight:bold; background:#fef3c7; padding:4px 8px; border-radius:4px;">Pending</span>`;
                else if(req.status === 'Declined') statusBadge = `<span style="color:#dc3545; font-weight:bold; background:#fee2e2; padding:4px 8px; border-radius:4px;">Declined</span>`;
                else if(req.status === 'Accepted') statusBadge = `<button onclick="window.jumpToAccepted(${req.id})" style="background:#d1fae5; color:#059669; border:none; padding:6px 12px; border-radius:20px; font-weight:bold; cursor:pointer;">Accepted <i class='bx bx-right-arrow-alt'></i> View</button>`;
                actionArea = `<div style="margin-top:10px;">${statusBadge}</div>`;
            }

            container.innerHTML += `
                <div class="request-card" id="card-${req.id}">
                    <div style="display:flex; gap:12px; align-items:flex-start;">
                        <div style="width:40px;">${avatarHTML}</div>
                        <div style="flex:1;">
                            
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                                <div class="meta-info">@${escapeHtml(otherUser.user_name)}</div>
                                ${topRightContent}
                            </div>

                            <h3 style="font-size:16px; margin-bottom:5px;">${escapeHtml(otherUser.name)}</h3>
                            <p style="font-size:14px; color:#536471; margin-bottom:10px;">"${escapeHtml(req.message)}"</p>
                            ${actionArea}
                        </div>
                    </div>
                </div>`;
        });
    }

window.updateMentorStatus = async function(id, newStatus, senderId) {
        
        if (newStatus !== 'Accepted' && newStatus !== 'Declined') {
            if(!confirm(`Are you sure you want to ${newStatus}?`)) return;
        }
        
        const updateData = { status: newStatus };
        if (newStatus === 'Accepted') {
            updateData.sender_email_shared = true;
            updateData.receiver_email_shared = true;
        }

        const { error } = await supabase.from('mentorship_requests').update(updateData).eq('id', id);
        
        if (error) {
            alert("Error updating status.");
        } else {
            const card = document.getElementById(`card-${id}`);
            if(card) card.remove();
            
            // --- NOTIFICATION LOGIC ---
            if (senderId) {
                let notifMessage = {};

                if (newStatus === 'Accepted') {
                    notifMessage = { 
                        type: "mentorship_update", 
                        text: `Request Accepted! Check the Accepted tab.`, 
                        action: "View Mentorship" 
                    };
                } else if (newStatus === 'Declined') {
                    // NEW: Notification for Decline
                    notifMessage = { 
                        type: "mentorship_update", 
                        text: `Mentorship request was declined.`, 
                        action: "View Status" 
                    };
                }

                // Send the notification
                await supabase.from("notification").insert([{ 
                    user_id: senderId, 
                    message: notifMessage, 
                    read_status: false 
                }]);
            }
            
            updateAllMentorCounts();
            loadMentorTab(currentMentorTab); 
        }
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
    //  FEATURE: NOTIFICATIONS (With Custom Delete Modal)
    // ==========================================
    async function setupNotificationsPage() { 
        const container = document.getElementById("notificationsContainer");
        if(!container) return;

        container.innerHTML = `<div style="text-align:center; padding:40px; color:#536471;"><i class='bx bx-loader-alt bx-spin' style="font-size:28px;"></i><br>Checking updates...</div>`;
        
        const { data: notifs } = await supabase.from("notification").select("*").eq("user_id", currentPublicUser.user_id).order("created_at", {ascending:false});
        
        container.innerHTML = ''; 
        if(!notifs || notifs.length === 0) { container.innerHTML = `<div style="text-align:center; padding:40px; color:#536471;">No notifications yet</div>`; return; }
        
        const listDiv = document.createElement('div');
        listDiv.className = 'notification-list';

        notifs.forEach(n => {
             const msg = n.message; 
             const rawText = typeof msg === 'string' ? msg : (msg.text || "New Notification"); 
             const actionText = (typeof msg === 'object' && msg.action) ? msg.action : '';
             const isUnread = !n.read_status;

             // Icon Logic
             let typeClass = 'notif-type-general'; let iconClass = 'bx-bell'; let targetLink = '#';
             const type = (msg.type || "").toLowerCase();
             if(type.includes('job')) { typeClass = 'notif-type-job'; iconClass = 'bx-briefcase'; targetLink = 'jobpost.html'; }
             else if(type.includes('event')) { typeClass = 'notif-type-event'; iconClass = 'bx-calendar-event'; targetLink = 'events.html'; }
             else if(type.includes('mentorship')) { typeClass = 'notif-type-mentor'; iconClass = 'bx-group'; targetLink = 'mentor.html'; }

             const card = document.createElement('div'); 
             card.className = `notification-card ${isUnread ? 'unread' : 'read'}`;
             card.id = `notif-${n.id}`;

             // 1. CLICK TO VIEW
             card.onclick = async () => {
                 card.classList.remove('unread'); card.classList.add('read');
                 await supabase.from('notification').update({ read_status: true }).eq('id', n.id);
                 if(targetLink !== '#') window.location.href = targetLink;
             };

             card.innerHTML = `
                <div class="notif-icon-box ${typeClass}"><i class='bx ${iconClass}'></i></div>
                <div class="notif-content">
                    <div class="notif-text">${escapeHtml(rawText)}</div>
                    ${actionText ? `<div class="notif-action-link">${escapeHtml(actionText)} <i class='bx bx-chevron-right'></i></div>` : ''}
                    <div class="notif-time">${getTimeAgo(new Date(n.created_at))}</div>
                </div>
                ${isUnread ? '<div class="unread-dot"></div>' : ''}
                <button class="btn-delete-notif" title="Delete Notification"><i class='bx bx-trash'></i></button>
             `;
             
             // 2. CLICK TO DELETE (New Logic)
             const deleteBtn = card.querySelector('.btn-delete-notif');
             if(deleteBtn) {
                 deleteBtn.onclick = (e) => {
                     e.stopPropagation(); // Stop redirection
                     window.openDeleteNotifModal(n.id, card);
                 };
             }
             listDiv.appendChild(card);
        });
        container.appendChild(listDiv);
    }

    // --- NEW: Global Helper for Delete Notification ---
    window.openDeleteNotifModal = (notifId, cardElement) => {
        const m = document.getElementById('deleteNotifModal');
        if(m) {
            m.style.display = 'block';
            document.getElementById('closeDelNotifModal').onclick = () => m.style.display = 'none';
            
            const btn = document.getElementById('confirmDelNotifBtn');
            btn.onclick = null;
            btn.onclick = async () => {
                btn.innerText = "Deleting...";
                await supabase.from('notification').delete().eq('id', notifId);
                
                // Animate removal
                m.style.display = 'none';
                btn.innerText = "Delete";
                if(cardElement) {
                    cardElement.style.opacity = '0';
                    setTimeout(() => cardElement.remove(), 300);
                }
            };
        }
    };

    // Helper: Time Ago (e.g., "5m ago")
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return "Just now";
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

// ==========================================
    //  HELPER: Broadcast Notification (Debug Version)
    // ==========================================
    async function broadcastNotificationToAll(type, text, actionLabel) {
        console.log("🚀 Starting Broadcast...");

        // 1. Fetch all users EXCEPT the current user
        const { data: users, error } = await supabase
            .from('User')
            .select('user_id')
            .neq('user_id', currentPublicUser.user_id);
        
        if (error) {
            console.error("❌ Error fetching users:", error.message);
            return;
        }

        console.log(`👥 Found ${users.length} other users to notify.`);

        if (users && users.length > 0) {
            // 2. Prepare notifications
            const notifications = users.map(u => ({
                user_id: u.user_id,
                message: { 
                    type: type, 
                    text: text, 
                    action: actionLabel 
                },
                read_status: false
            }));

            // 3. Insert
            const { error: insertError } = await supabase.from('notification').insert(notifications);
            
            if (insertError) {
                console.error("❌ Error sending notifications:", insertError.message);
            } else {
                console.log("✅ Notifications sent successfully!");
            }
        } else {
            console.warn("⚠️ No other users found. Create a second account to test!");
        }
    }

    // ==========================================
    //  FEATURE: END MENTORSHIP
    // ==========================================
    window.openEndMentorshipModal = (reqId) => {
        const m = document.getElementById('endMentorshipModal');
        if(m) {
            m.style.display = 'block';
            
            const closeBtn = document.getElementById('closeEndMentorModal');
            if(closeBtn) closeBtn.onclick = () => m.style.display = 'none';

            const confirmBtn = document.getElementById('confirmEndMentorBtn');
            if(confirmBtn) {
                confirmBtn.onclick = null; // Clear old events
                confirmBtn.onclick = async () => {
                    confirmBtn.innerText = "Ending...";
                    
                    const { error } = await supabase.from('mentorship_requests').delete().eq('id', reqId);
                    
                    if(error) {
                        alert("Error: " + error.message);
                        confirmBtn.innerText = "End";
                    } else {
                        m.style.display = 'none';
                        confirmBtn.innerText = "End";
                        
                        // Show generic success and reload tab
                        alert("Mentorship ended."); 
                        updateAllMentorCounts();
                        loadMentorTab('accepted');
                    }
                };
            }
        }
    };
    
    // Close modal on outside click
    window.onclick = (e) => {
        const m = document.getElementById('endMentorshipModal');
        if(e.target == m) m.style.display = 'none';
    };

    // ==========================================
    //  FEATURE: ACCEPT MENTORSHIP MODAL
    // ==========================================
    window.openAcceptModal = (reqId, senderId) => {
        const m = document.getElementById('acceptMentorshipModal');
        if(m) {
            m.style.display = 'block';
            
            // Cancel Button
            document.getElementById('closeAcceptModal').onclick = () => m.style.display = 'none';

            // Confirm Button
            const btn = document.getElementById('confirmAcceptBtn');
            btn.onclick = null; // Clear old events
            
            btn.onclick = async () => {
                btn.innerText = "Connecting...";
                
                // Call the existing update function, but now we know the user confirmed
                await window.updateMentorStatus(reqId, 'Accepted', senderId);
                
                m.style.display = 'none';
                btn.innerText = "Let's Start";
            };
        }
    };

// ==========================================
    //  FEATURE: DECLINE MENTORSHIP MODAL
    // ==========================================
    // Updated to accept senderId
    window.openDeclineModal = (reqId, senderId) => {
        const m = document.getElementById('declineMentorshipModal');
        if(m) {
            m.style.display = 'block';
            
            document.getElementById('closeDeclineModal').onclick = () => m.style.display = 'none';

            const btn = document.getElementById('confirmDeclineBtn');
            btn.onclick = null; 
            
            btn.onclick = async () => {
                btn.innerText = "Declining...";
                
                // Pass senderId to the update function
                await window.updateMentorStatus(reqId, 'Declined', senderId);
                
                m.style.display = 'none';
                btn.innerText = "Decline";
            };
        }
    };

    // --- FEEDBACK IMPLEMENTATION ---
async function setupFeedbackSubmission() {
    const submitBtn = document.getElementById('submitFeedbackBtn');
    const feedbackInput = document.getElementById('feedbackText');

    if (!submitBtn || !feedbackInput) return;

    submitBtn.onclick = async () => {
        const messageContent = feedbackInput.value.trim();

        if (!messageContent) {
            alert("Please enter your feedback message.");
            return;
        }

        // currentPublicUser is defined on line 11 of your script
        if (!currentPublicUser) {
            alert("Error: User session not found. Please log in again.");
            return;
        }

        submitBtn.innerText = "Sending...";
        submitBtn.disabled = true;

        // Implementation to the database based on your query results
        const { error } = await supabase.from('feedback').insert([{
            user_id: currentPublicUser.user_id, // Links to your 'User' table
            message: messageContent,            // The content to be stored
            feedback_type: 'General',           // Matches your USER-DEFINED type
            is_highlighted: 0                   // Default bigint value
        }]);

        if (error) {
            console.error("Feedback Save Error:", error.message);
            alert("Database Error: " + error.message);
        } else {
            alert("Feedback successfully stored!");
            feedbackInput.value = ''; 
        }

        submitBtn.innerText = "Submit Feedback";
        submitBtn.disabled = false;
    };
}

// ==========================================
    //  GLOBAL: SIDEBAR POST BUTTON LOGIC
    // ==========================================
    const sidebarPostBtn = document.getElementById('sidebarPostBtn');
    
    if (sidebarPostBtn) {
        sidebarPostBtn.onclick = () => {
            const currentPath = window.location.pathname;

            // CONDITION 1: ARE WE ON THE PROFILE PAGE?
            if (currentPath.includes('profile.html')) {
                // Redirect to Home with a "signal" to open the box
                window.location.href = 'home.html?open_post=true';
            } 
            
            // CONDITION 2: ALL OTHER PAGES (Home, Jobs, Connect, etc.)
            else {
                // Try to find the modal on the current page
                const modal = document.getElementById('postModal');
                
                if (modal) {
                    // Open it immediately
                    modal.style.display = 'block';
                } else {
                    // Fallback: If you forgot to add the Modal HTML to this specific page, 
                    // we redirect to home so the button doesn't appear broken.
                    window.location.href = 'home.html?open_post=true';
                }
            }
        };
    }
});