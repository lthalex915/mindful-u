// ===== CUSTOM NOTIFICATION SYSTEM =====

/**
 * Show a modal notification with custom options
 * @param {Object} options - Notification configuration
 * @param {string} options.type - Type of notification: 'warning', 'error', 'success', 'info'
 * @param {string} options.title - Notification title
 * @param {string} options.subtitle - Optional subtitle
 * @param {string} options.message - Main message content
 * @param {string} options.confirmText - Text for confirm button (default: 'Confirm')
 * @param {string} options.cancelText - Text for cancel button (default: 'Cancel')
 * @param {boolean} options.showCancel - Whether to show cancel button (default: true)
 * @param {Function} options.onConfirm - Callback when confirmed
 * @param {Function} options.onCancel - Callback when cancelled
 * @param {boolean} options.isDanger - Whether confirm button should be styled as danger (default: false)
 */
function showNotification(options) {
  const {
    type = 'info',
    title = 'Notification',
    subtitle = '',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    showCancel = true,
    onConfirm = () => {},
    onCancel = () => {},
    isDanger = false
  } = options;

  // Remove any existing notification
  const existingOverlay = document.querySelector('.notification-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Icon mapping
  const icons = {
    warning: '⚠️',
    error: '❌',
    success: '✓',
    info: 'ℹ️'
  };

  // Create notification overlay
  const overlay = document.createElement('div');
  overlay.className = 'notification-overlay';
  
  // Create notification box
  const box = document.createElement('div');
  box.className = 'notification-box';
  
  // Header
  const header = document.createElement('div');
  header.className = 'notification-header';
  header.innerHTML = `
    <div class="notification-icon ${type}">
      ${icons[type] || icons.info}
    </div>
    <div class="notification-title">
      <h3>${title}</h3>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
  `;
  
  // Body
  const body = document.createElement('div');
  body.className = 'notification-body';
  body.innerHTML = `<p>${message}</p>`;
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'notification-footer';
  
  if (showCancel) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'notification-btn notification-btn-cancel';
    cancelBtn.textContent = cancelText;
    cancelBtn.onclick = () => {
      hideNotification(overlay);
      onCancel();
    };
    footer.appendChild(cancelBtn);
  }
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = `notification-btn notification-btn-confirm ${isDanger ? 'danger' : ''}`;
  confirmBtn.textContent = confirmText;
  confirmBtn.onclick = () => {
    hideNotification(overlay);
    onConfirm();
  };
  footer.appendChild(confirmBtn);
  
  // Assemble
  box.appendChild(header);
  box.appendChild(body);
  box.appendChild(footer);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  // Show with animation
  setTimeout(() => overlay.classList.add('show'), 10);
  
  // Close on overlay click (optional)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideNotification(overlay);
      onCancel();
    }
  });
  
  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      hideNotification(overlay);
      onCancel();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
  
  return overlay;
}

/**
 * Hide notification with animation
 */
function hideNotification(overlay) {
  overlay.classList.remove('show');
  setTimeout(() => overlay.remove(), 300);
}

/**
 * Show a toast notification (auto-dismiss)
 * @param {Object} options - Toast configuration
 * @param {string} options.type - Type: 'success', 'error', 'warning', 'info'
 * @param {string} options.title - Toast title
 * @param {string} options.message - Toast message
 * @param {number} options.duration - Duration in ms (default: 3000)
 */
function showToast(options) {
  const {
    type = 'info',
    title = '',
    message = '',
    duration = 3000
  } = options;

  // Icon mapping
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  // Create toast
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="Close">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    </button>
  `;

  // Add to DOM
  document.body.appendChild(toast);

  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.onclick = () => removeToast(toast);

  // Auto-dismiss
  const timeout = setTimeout(() => removeToast(toast), duration);

  // Pause on hover
  toast.addEventListener('mouseenter', () => clearTimeout(timeout));
  toast.addEventListener('mouseleave', () => {
    setTimeout(() => removeToast(toast), 1000);
  });

  return toast;
}

/**
 * Remove toast with animation
 */
function removeToast(toast) {
  toast.style.animation = 'toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse';
  setTimeout(() => toast.remove(), 300);
}

/**
 * Confirm dialog helper (returns Promise)
 * @param {Object} options - Confirmation options
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
function confirmDialog(options) {
  return new Promise((resolve) => {
    showNotification({
      ...options,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

// Make functions globally available
window.showNotification = showNotification;
window.hideNotification = hideNotification;
window.showToast = showToast;
window.confirmDialog = confirmDialog;
