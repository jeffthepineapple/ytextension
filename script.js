document.addEventListener('DOMContentLoaded', function() {
    // Toggle sidebar on mobile
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');
    
    menuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('show-sidebar');
        container.classList.toggle('sidebar-open');
    });
    
    // Video card hover effects
    const videoCards = document.querySelectorAll('.video-card');
    
    videoCards.forEach(card => {
        card.addEventListener('click', function() {
            // In a real application, this would navigate to the video page
            alert('Video player functionality would open here!');
        });
    });
    
    // Search form submission
    const searchForm = document.querySelector('.search-form');
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        alert(`You searched for: ${searchInput.value}`);
    });
    
    // Sign in button
    const signInBtn = document.querySelector('.signin-btn');
    
    signInBtn.addEventListener('click', function() {
        alert('Sign in functionality would open here!');
    });
    
    // Upload button
    const uploadBtn = document.querySelector('.upload-btn');
    
    uploadBtn.addEventListener('click', function() {
        alert('Upload video functionality would open here!');
    });
});

// Add CSS class for mobile sidebar
document.head.insertAdjacentHTML('beforeend', `
<style>
    @media (max-width: 992px) {
        .sidebar {
            transform: translateX(-100%);
            position: fixed;
            z-index: 200;
            transition: transform 0.3s ease;
            background-color: white;
        }
        
        .show-sidebar {
            transform: translateX(0);
        }
        
        .sidebar-open {
            margin-left: 72px;
        }
    }
</style>
`);