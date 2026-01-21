// Basic Login Form Script
class BasicLoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.successMessage = document.getElementById('successMessage');
        this.loginBtn = document.querySelector('.login-btn');
        
        this.init();
    }
    
    init() {
        // Setup floating labels
        this.setupFloatingLabels();
        
        // Setup password toggle
        this.setupPasswordToggle();
        
        // Add event listeners
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.emailInput.addEventListener('input', () => this.validateField('email'));
        this.passwordInput.addEventListener('input', () => this.validateField('password'));
        
        // Add entrance animation
        setTimeout(() => {
            const loginCard = this.form.closest('.login-card');
            loginCard.style.opacity = '1';
            loginCard.style.transform = 'translateY(0)';
        }, 100);
    }
    
    setupFloatingLabels() {
        const inputs = this.form.querySelectorAll('input');
        
        inputs.forEach(input => {
            // Check if input has value on page load
            if (input.value) {
                input.classList.add('has-value');
            }
            
            // Add/remove has-value class on input
            input.addEventListener('input', () => {
                if (input.value) {
                    input.classList.add('has-value');
                } else {
                    input.classList.remove('has-value');
                }
            });
            
            // Add/remove has-value class on blur
            input.addEventListener('blur', () => {
                if (input.value) {
                    input.classList.add('has-value');
                }
            });
        });
    }
    
    setupPasswordToggle() {
        this.passwordToggle.addEventListener('click', () => {
            const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            this.passwordInput.setAttribute('type', type);
            this.passwordToggle.querySelector('.eye-icon').classList.toggle('show-password');
        });
    }
    
    clearError(fieldName) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.classList.remove('show');
            errorElement.textContent = '';
        }
        
        const formGroup = document.getElementById(fieldName).closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('error');
        }
    }
    
    showError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
        
        const formGroup = document.getElementById(fieldName).closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('error');
        }
    }
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                isValid: false,
                message: 'Please enter a valid email address'
            };
        }
        return { isValid: true, message: '' };
    }
    
    validatePassword(password) {
        if (password.length < 6) {
            return {
                isValid: false,
                message: 'Password must be at least 6 characters'
            };
        }
        return { isValid: true, message: '' };
    }
    
    validateField(fieldName) {
        const input = document.getElementById(fieldName);
        const value = input.value.trim();
        let validation;
        
        // Clear previous errors
        this.clearError(fieldName);
        
        // Validate based on field type
        if (fieldName === 'email') {
            validation = this.validateEmail(value);
        } else if (fieldName === 'password') {
            validation = this.validatePassword(value);
        }
        
        if (!validation.isValid && value !== '') {
            this.showError(fieldName, validation.message);
            return false;
        }
        
        return true;
    }
    
    showNotification(message, type, element) {
        // Remove any existing notification
        const existingNotification = element.querySelector('.custom-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: absolute;
            top: -50px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ef4444' : '#22c55e'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            white-space: nowrap;
        `;
        
        element.style.position = 'relative';
        element.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    simulateLogin(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // For demo purposes, accept any non-empty email and password with at least 6 characters
                if (email && password.length >= 6) {
                    resolve();
                } else {
                    reject(new Error('Invalid email or password'));
                }
            }, 1500);
        });
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        // Validate all fields
        const emailValid = this.validateField('email');
        const passwordValid = this.validateField('password');
        
        if (!emailValid || !passwordValid) {
            this.showNotification('Please fix the errors below', 'error', this.form);
            return;
        }
        
        // Show loading state
        this.loginBtn.classList.add('loading');
        
        try {
            // Simulate login process
            await this.simulateLogin(email, password);
            
            // Show success state
            this.showSuccess();
            
        } catch (error) {
            // Show error notification
            this.showNotification(error.message, 'error', this.form);
        } finally {
            // Remove loading state
            this.loginBtn.classList.remove('loading');
        }
    }
    
    showSuccess() {
        // Hide the form
        this.form.style.display = 'none';
        
        // Show success message
        this.successMessage.classList.add('show');
        
        // Simulate redirect after 2 seconds
        setTimeout(() => {
            this.showNotification('Redirecting to dashboard...', 'success', this.successMessage);
            
            // For demo purposes, reload the page after 3 seconds
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        }, 2000);
    }
}

// Initialize the form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BasicLoginForm();
});

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // TEMP: real Supabase auth later
        setTimeout(() => {
            window.location.href = "home.html";
        }, 1000);
    });
});

document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();

    // TEMP: Supabase signup later
    alert("Account created (placeholder)");
    window.location.href = "index.html";
});