// Popup JavaScript for YouTube Auto Quality Select extension

class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    // Load current settings
    await this.loadSettings();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Update UI based on current settings
    this.updateUI();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
        this.settings = response || {
          autoHighest: false,
          autoPreferred: true,
          preferredQuality: '1080',
          autoFallback: false,
          fallbackQuality: '720'
        };
        resolve();
      });
    });
  }

  setupEventListeners() {
    // Toggle switches
    document.getElementById('autoHighest').addEventListener('change', (e) => {
      this.settings.autoHighest = e.target.checked;
      if (e.target.checked) {
        // Disable other options when autoHighest is enabled
        document.getElementById('autoPreferred').checked = false;
        this.settings.autoPreferred = false;
      }
      this.updateUI();
    });

    document.getElementById('autoPreferred').addEventListener('change', (e) => {
      this.settings.autoPreferred = e.target.checked;
      if (e.target.checked) {
        // Disable autoHighest when autoPreferred is enabled
        document.getElementById('autoHighest').checked = false;
        this.settings.autoHighest = false;
      }
      this.updateUI();
    });

    document.getElementById('autoFallback').addEventListener('change', (e) => {
      this.settings.autoFallback = e.target.checked;
      this.updateUI();
    });

    // Quality selects
    document.getElementById('preferredQuality').addEventListener('change', (e) => {
      this.settings.preferredQuality = e.target.value;
    });

    document.getElementById('fallbackQuality').addEventListener('change', (e) => {
      this.settings.fallbackQuality = e.target.value;
    });

    // Save button
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    // Auto-save on any change
    document.addEventListener('change', () => {
      this.autoSave();
    });
  }

  updateUI() {
    // Update toggle states
    document.getElementById('autoHighest').checked = this.settings.autoHighest;
    document.getElementById('autoPreferred').checked = this.settings.autoPreferred;
    document.getElementById('autoFallback').checked = this.settings.autoFallback;

    // Update select values
    document.getElementById('preferredQuality').value = this.settings.preferredQuality;
    document.getElementById('fallbackQuality').value = this.settings.fallbackQuality;

    // Show/hide sub-options
    const preferredSection = document.getElementById('preferredQualitySection');
    const fallbackSection = document.getElementById('fallbackQualitySection');

    if (this.settings.autoPreferred) {
      preferredSection.classList.add('visible');
    } else {
      preferredSection.classList.remove('visible');
    }

    if (this.settings.autoFallback) {
      fallbackSection.classList.add('visible');
    } else {
      fallbackSection.classList.remove('visible');
    }

    // Update status
    this.updateStatus();
  }

  updateStatus() {
    const statusElement = document.getElementById('status');
    let statusText = 'Extension is active';
    let statusClass = 'status';

    if (this.settings.autoHighest) {
      statusText = 'Auto-selecting highest quality';
    } else if (this.settings.autoPreferred) {
      statusText = `Auto-selecting ${this.settings.preferredQuality}p quality`;
    } else {
      statusText = 'No auto-selection enabled';
      statusClass = 'status inactive';
    }

    if (this.settings.autoFallback) {
      statusText += ` (fallback: ${this.settings.fallbackQuality}p)`;
    }

    statusElement.className = statusClass;
    statusElement.querySelector('p').textContent = statusText;
  }

  async saveSettings() {
    try {
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ 
          action: 'saveSettings', 
          settings: this.settings 
        }, (response) => {
          resolve(response);
        });
      });

      // Notify content script of settings change
      this.notifyContentScript();

      // Show success feedback
      this.showSaveSuccess();

    } catch (error) {
      console.error('Error saving settings:', error);
      this.showSaveError();
    }
  }

  async notifyContentScript() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.includes('youtube.com')) {
        chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' }).catch(() => {
          // Ignore errors - content script might not be ready
        });
      }
    } catch (error) {
      console.error('Error notifying content script:', error);
    }
  }

  showSaveSuccess() {
    const button = document.getElementById('saveSettings');
    const originalText = button.textContent;
    button.textContent = 'Saved!';
    button.style.backgroundColor = '#4caf50';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '#1976d2';
    }, 1500);
  }

  showSaveError() {
    const button = document.getElementById('saveSettings');
    const originalText = button.textContent;
    button.textContent = 'Error!';
    button.style.backgroundColor = '#f44336';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '#1976d2';
    }, 1500);
  }

  // Auto-save with debouncing
  autoSave() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.saveSettings();
    }, 1000); // Auto-save after 1 second of no changes
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});

// Handle popup resize for better UX
document.addEventListener('DOMContentLoaded', () => {
  // Ensure popup maintains consistent size
  document.body.style.minHeight = '400px';
});
