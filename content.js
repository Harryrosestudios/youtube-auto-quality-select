// Content script for YouTube Auto Quality Select extension

class YouTubeQualityManager {
  constructor() {
    this.settings = {};
    this.currentVideo = null;
    this.qualityObserver = null;
    this.connectionMonitor = null;
    this.lastBufferingTime = 0;
    this.bufferingCount = 0;
    this.videoElement = null;
    this.isProcessing = false;
    this.popupBlockerObserver = null;
    
    this.init();
  }

  async init() {
    // Load settings
    await this.loadSettings();
    
    // Start monitoring for video changes
    this.startVideoMonitoring();
    
    // Start Premium popup blocking
    this.startPremiumPopupBlocking();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });
    
    // Log initialization
    this.log('YouTube Auto Quality Select initialized with Premium popup blocking');
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

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'checkForVideo':
        this.checkAndProcessVideo();
        break;
      case 'settingsUpdated':
        this.loadSettings().then(() => {
          this.checkAndProcessVideo();
        });
        break;
    }
  }

  startVideoMonitoring() {
    // Monitor for navigation changes (YouTube SPA)
    let currentUrl = window.location.href;
    
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        if (currentUrl.includes('/watch')) {
          setTimeout(() => this.checkAndProcessVideo(), 1000);
        }
      }
    });
    
    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial check
    if (window.location.href.includes('/watch')) {
      setTimeout(() => this.checkAndProcessVideo(), 2000);
    }
  }

  async checkAndProcessVideo() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Wait for video element to be available
      const videoElement = await this.waitForVideoElement();
      if (!videoElement) {
        this.isProcessing = false;
        return;
      }

      // Check if this is a new video
      const videoId = this.getVideoId();
      if (videoId && videoId !== this.currentVideo) {
        this.currentVideo = videoId;
        this.videoElement = videoElement;
        
        // Wait for player to be ready
        await this.waitForPlayerReady();
        
        // Apply quality settings
        await this.applyQualitySettings();
        
        // Start monitoring connection if fallback is enabled
        if (this.settings.autoFallback) {
          this.startConnectionMonitoring();
        }
      }
    } catch (error) {
      this.logError('Error processing video: ' + error.message);
    }
    
    this.isProcessing = false;
  }

  waitForVideoElement() {
    return new Promise((resolve) => {
      const checkForVideo = () => {
        const video = document.querySelector('video');
        if (video) {
          resolve(video);
        } else {
          setTimeout(checkForVideo, 500);
        }
      };
      checkForVideo();
    });
  }

  waitForPlayerReady() {
    return new Promise((resolve) => {
      const checkPlayer = () => {
        const settingsButton = document.querySelector('.ytp-settings-button');
        if (settingsButton && !settingsButton.disabled) {
          // Additional wait to ensure quality options are loaded
          setTimeout(resolve, 1000);
        } else {
          setTimeout(checkPlayer, 500);
        }
      };
      checkPlayer();
    });
  }

  async applyQualitySettings() {
    try {
      if (this.settings.autoHighest) {
        await this.selectHighestQuality();
      } else if (this.settings.autoPreferred) {
        await this.selectPreferredQuality();
      }
    } catch (error) {
      this.logError('Error applying quality settings: ' + error.message);
    }
  }

  async selectHighestQuality() {
    const qualities = await this.getAvailableQualities();
    if (qualities.length > 0) {
      // Highest quality is typically first in the list
      await this.selectQuality(qualities[0].value);
      this.log(`Selected highest quality: ${qualities[0].label}`);
    }
  }

  async selectPreferredQuality() {
    const qualities = await this.getAvailableQualities();
    const preferred = this.settings.preferredQuality;
    
    // Try to find exact match first
    let targetQuality = qualities.find(q => q.value.includes(preferred));
    
    // If not found, find closest lower quality
    if (!targetQuality) {
      const preferredNum = parseInt(preferred);
      targetQuality = qualities
        .filter(q => {
          const match = q.value.match(/(\d+)/);
          return match && parseInt(match[1]) <= preferredNum;
        })
        .sort((a, b) => {
          const aNum = parseInt(a.value.match(/(\d+)/)[1]);
          const bNum = parseInt(b.value.match(/(\d+)/)[1]);
          return bNum - aNum; // Descending order
        })[0];
    }

    if (targetQuality) {
      await this.selectQuality(targetQuality.value);
      this.log(`Selected preferred quality: ${targetQuality.label}`);
    }
  }

  async getAvailableQualities() {
    return new Promise((resolve) => {
      try {
        // Click settings button
        const settingsButton = document.querySelector('.ytp-settings-button');
        if (!settingsButton) {
          resolve([]);
          return;
        }

        settingsButton.click();

        setTimeout(() => {
          // Click quality option
          const qualityMenuItem = document.querySelector('.ytp-menuitem[role="menuitem"]:last-child');
          if (!qualityMenuItem) {
            // Close settings menu
            settingsButton.click();
            resolve([]);
            return;
          }

          qualityMenuItem.click();

          setTimeout(() => {
            // Get quality options
            const qualityOptions = document.querySelectorAll('.ytp-quality-menu .ytp-menuitem');
            const qualities = Array.from(qualityOptions).map(option => ({
              label: option.querySelector('.ytp-menuitem-label')?.textContent || '',
              value: option.querySelector('.ytp-menuitem-label')?.textContent || ''
            })).filter(q => q.label.includes('p') || q.label.includes('Auto'));

            // Close quality menu
            document.addEventListener('click', function closeMenu(e) {
              if (!e.target.closest('.ytp-settings-menu')) {
                document.removeEventListener('click', closeMenu);
              }
            });
            
            // Click outside to close
            setTimeout(() => {
              document.body.click();
            }, 100);

            resolve(qualities);
          }, 300);
        }, 300);
      } catch (error) {
        this.logError('Error getting available qualities: ' + error.message);
        resolve([]);
      }
    });
  }

  async selectQuality(qualityValue) {
    return new Promise((resolve) => {
      try {
        // Click settings button
        const settingsButton = document.querySelector('.ytp-settings-button');
        if (!settingsButton) {
          resolve();
          return;
        }

        settingsButton.click();

        setTimeout(() => {
          // Click quality option
          const qualityMenuItem = document.querySelector('.ytp-menuitem[role="menuitem"]:last-child');
          if (!qualityMenuItem) {
            settingsButton.click();
            resolve();
            return;
          }

          qualityMenuItem.click();

          setTimeout(() => {
            // Find and click the desired quality
            const qualityOptions = document.querySelectorAll('.ytp-quality-menu .ytp-menuitem');
            const targetOption = Array.from(qualityOptions).find(option => {
              const label = option.querySelector('.ytp-menuitem-label')?.textContent || '';
              return label.includes(qualityValue) || label === qualityValue;
            });

            if (targetOption) {
              targetOption.click();
            }

            resolve();
          }, 300);
        }, 300);
      } catch (error) {
        this.logError('Error selecting quality: ' + error.message);
        resolve();
      }
    });
  }

  startConnectionMonitoring() {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
    }

    this.bufferingCount = 0;
    this.lastBufferingTime = 0;

    this.connectionMonitor = setInterval(() => {
      this.checkConnectionStability();
    }, 5000); // Check every 5 seconds
  }

  checkConnectionStability() {
    if (!this.videoElement) return;

    const currentTime = Date.now();
    
    // Check if video is buffering
    if (this.videoElement.buffered.length > 0) {
      const bufferedEnd = this.videoElement.buffered.end(this.videoElement.buffered.length - 1);
      const currentVideoTime = this.videoElement.currentTime;
      
      // If buffered content is very close to current time, consider it buffering
      if (bufferedEnd - currentVideoTime < 3 && !this.videoElement.paused) {
        this.bufferingCount++;
        this.lastBufferingTime = currentTime;
        
        // If we've had multiple buffering events in the last minute, switch to lower quality
        if (this.bufferingCount >= 3 && currentTime - this.lastBufferingTime < 60000) {
          this.dropToLowerQuality();
          this.bufferingCount = 0; // Reset counter
        }
      }
    }
  }

  async dropToLowerQuality() {
    try {
      const fallbackQuality = this.settings.fallbackQuality;
      await this.selectQuality(fallbackQuality);
      this.log(`Dropped to lower quality due to connection issues: ${fallbackQuality}p`);
    } catch (error) {
      this.logError('Error dropping to lower quality: ' + error.message);
    }
  }

  getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  log(message) {
    chrome.runtime.sendMessage({
      action: 'logInfo',
      message: message
    });
  }

  logError(error) {
    chrome.runtime.sendMessage({
      action: 'logError',
      error: error
    });
  }

  startPremiumPopupBlocking() {
    // Start observing for Premium popups immediately
    this.blockExistingPremiumPopups();
    
    // Set up mutation observer to catch dynamically added popups
    if (this.popupBlockerObserver) {
      this.popupBlockerObserver.disconnect();
    }
    
    this.popupBlockerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkForPremiumPopup(node);
            }
          });
        }
      });
    });
    
    // Observe the entire document for popup additions
    this.popupBlockerObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.log('Premium popup blocking started');
  }

  blockExistingPremiumPopups() {
    // Check for existing popups when starting
    this.checkForPremiumPopup(document.body);
  }

  checkForPremiumPopup(element) {
    // Target the specific YouTube popup containers based on 2025 structure
    const popupSelectors = [
      // Primary popup containers (most common)
      'ytd-popup-container#popup',
      'ytd-popup-container',
      'tp-yt-paper-dialog[opened]',
      'tp-yt-paper-dialog',
      // Additional dialog and modal selectors
      '[role="dialog"]',
      'ytd-mealbar-promo-renderer',
      // YouTube-specific premium components
      'ytd-premium-subscription-item-renderer',
      'ytd-compact-promoted-item-renderer'
    ];
    
    // Check for popups in the provided element
    popupSelectors.forEach(selector => {
      try {
        const popups = element.querySelectorAll ? element.querySelectorAll(selector) : [];
        popups.forEach(popup => {
          if (this.isPremiumQualityPopup(popup)) {
            this.removePremiumPopup(popup);
          }
        });
        
        // Also check if the element itself matches
        if (element.matches && element.matches(selector) && this.isPremiumQualityPopup(element)) {
          this.removePremiumPopup(element);
        }
      } catch (e) {
        // Silently handle any selector errors
      }
    });
    
    // Also check document level for popup containers that might be missed
    this.checkDocumentLevelPopups();
  }

  isPremiumQualityPopup(element) {
    const textContent = element.textContent || '';
    const innerHTML = element.innerHTML || '';
    
    // Check for specific Premium quality popup text
    const premiumQualityIndicators = [
      'Enjoy enhanced quality with Premium',
      'Get YouTube Premium',
      'Ad-free YouTube and YouTube Music',
      'Download videos to watch offline',
      'Play videos in the background',
      '£12.99',
      '/month • Cancel at any time',
      'Not now'
    ];
    
    // Check if this popup contains the specific Premium quality promotion text
    const containsPremiumQualityText = premiumQualityIndicators.some(indicator => 
      textContent.includes(indicator) || innerHTML.includes(indicator)
    );
    
    // Additional check: if it contains "enhanced quality" AND "Premium", it's definitely our target
    const isQualityPremiumPopup = (textContent.includes('enhanced quality') || innerHTML.includes('enhanced quality')) &&
                                  (textContent.includes('Premium') || innerHTML.includes('Premium'));
    
    return containsPremiumQualityText || isQualityPremiumPopup;
  }

  checkDocumentLevelPopups() {
    // Direct document-level check for popup containers using the improved selectors
    const documentPopupSelectors = [
      'ytd-popup-container#popup',
      'ytd-popup-container',
      'tp-yt-paper-dialog[opened]',
      'tp-yt-paper-dialog'
    ];
    
    documentPopupSelectors.forEach(selector => {
      try {
        const popups = document.querySelectorAll(selector);
        popups.forEach(popup => {
          if (this.isPremiumQualityPopup(popup)) {
            this.removePremiumPopup(popup);
          }
        });
      } catch (e) {
        // Silently handle selector errors
      }
    });
  }

  removePremiumPopup(popup) {
    try {
      this.log('Detected Premium popup, removing...');
      
      // Strategy 1: Try clicking "Not now" button first (most natural)
      const buttons = popup.querySelectorAll('button, [role="button"], yt-button-renderer');
      let buttonClicked = false;
      
      buttons.forEach(button => {
        const buttonText = button.textContent || button.getAttribute('aria-label') || '';
        if (buttonText.toLowerCase().includes('not now') || 
            buttonText.toLowerCase().includes('no thanks') ||
            buttonText.toLowerCase().includes('dismiss')) {
          button.click();
          buttonClicked = true;
          this.log('Clicked "Not now" button');
        }
      });
      
      // Strategy 2: If no button worked, hide the popup completely
      if (!buttonClicked) {
        popup.style.display = 'none !important';
        popup.style.visibility = 'hidden !important';
        popup.style.opacity = '0 !important';
        popup.style.pointerEvents = 'none !important';
        popup.style.zIndex = '-9999 !important';
        
        // Also hide any backdrop/overlay
        const backdrop = document.querySelector('tp-yt-iron-overlay-backdrop, .backdrop, [role="presentation"]');
        if (backdrop) {
          backdrop.style.display = 'none !important';
        }
        
        this.log('Popup hidden with CSS');
      }
      
      // Strategy 3: As last resort, remove from DOM (after a delay to avoid issues)
      setTimeout(() => {
        if (popup && popup.parentNode && popup.style.display !== 'none') {
          try {
            popup.remove();
            this.log('Popup removed from DOM');
          } catch (e) {
            // Ignore removal errors
          }
        }
      }, 500);
      
      this.log('Premium quality popup blocked successfully');
      
    } catch (error) {
      this.logError('Error removing Premium popup: ' + error.message);
    }
  }
}

// Initialize the quality manager when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeQualityManager();
  });
} else {
  new YouTubeQualityManager();
}
