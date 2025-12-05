/**
 * API Key Manager with Rotation and Monthly Reset
 * 
 * Tracks which keys are exhausted and rotates to the next available one.
 * Resets exhausted keys at the start of each month.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@api_key_status';

interface KeyStatus {
  key: string;
  exhaustedAt: string | null;  // ISO date when quota was exhausted
  invalidAt: string | null;    // ISO date when key was marked invalid
  lastUsed: string | null;     // ISO date of last successful use
}

interface ApiKeyState {
  keys: KeyStatus[];
  currentIndex: number;
  lastUpdated: string;
}

class ApiKeyManager {
  private state: ApiKeyState | null = null;
  private initialized = false;
  private apiKeys: string[] = [];

  constructor(keys: string[]) {
    this.apiKeys = keys;
  }

  /**
   * Initialize the manager - load state from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        this.state = JSON.parse(stored);
        
        // Check if we need to reset for new month
        await this.checkMonthlyReset();
        
        // Ensure all keys are in state (in case new keys were added)
        this.syncKeys();
      } else {
        // First time - initialize state
        this.state = {
          keys: this.apiKeys.map(key => ({
            key,
            exhaustedAt: null,
            invalidAt: null,
            lastUsed: null,
          })),
          currentIndex: 0,
          lastUpdated: new Date().toISOString(),
        };
        await this.saveState();
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('[ApiKeyManager] Error initializing:', error);
      // Fallback to fresh state
      this.state = {
        keys: this.apiKeys.map(key => ({
          key,
          exhaustedAt: null,
          invalidAt: null,
          lastUsed: null,
        })),
        currentIndex: 0,
        lastUpdated: new Date().toISOString(),
      };
      this.initialized = true;
    }
  }

  /**
   * Sync keys in case new ones were added to the config
   */
  private syncKeys(): void {
    if (!this.state) return;

    const existingKeys = new Set(this.state.keys.map(k => k.key));
    
    for (const key of this.apiKeys) {
      if (!existingKeys.has(key)) {
        this.state.keys.push({
          key,
          exhaustedAt: null,
          invalidAt: null,
          lastUsed: null,
        });
      }
    }
  }

  /**
   * Check if it's a new month and reset exhausted keys
   */
  private async checkMonthlyReset(): Promise<void> {
    if (!this.state) return;

    const now = new Date();
    const lastUpdated = new Date(this.state.lastUpdated);
    
    // Check if we're in a new month
    const isNewMonth = now.getMonth() !== lastUpdated.getMonth() || 
                       now.getFullYear() !== lastUpdated.getFullYear();

    if (isNewMonth) {
      console.log('[ApiKeyManager] New month detected - resetting exhausted keys');
      
      for (const keyStatus of this.state.keys) {
        // Reset exhausted keys (quota resets monthly)
        // Don't reset invalid keys - those need new credentials
        if (keyStatus.exhaustedAt) {
          keyStatus.exhaustedAt = null;
          console.log(`[ApiKeyManager] Reset key: ${keyStatus.key.slice(0, 8)}...`);
        }
      }
      
      // Reset to first available key
      this.state.currentIndex = this.findNextAvailableIndex(0);
      this.state.lastUpdated = now.toISOString();
      await this.saveState();
    }
  }

  /**
   * Get the current active API key
   */
  async getCurrentKey(): Promise<string | null> {
    await this.initialize();
    
    if (!this.state || this.state.keys.length === 0) {
      return this.apiKeys[0] || null;
    }

    const availableIndex = this.findNextAvailableIndex(this.state.currentIndex);
    
    if (availableIndex === -1) {
      console.log('[ApiKeyManager] All keys exhausted or invalid');
      return null;
    }

    return this.state.keys[availableIndex].key;
  }

  /**
   * Find the next available (not exhausted/invalid) key index
   */
  private findNextAvailableIndex(startIndex: number): number {
    if (!this.state) return 0;

    const numKeys = this.state.keys.length;
    
    for (let i = 0; i < numKeys; i++) {
      const index = (startIndex + i) % numKeys;
      const keyStatus = this.state.keys[index];
      
      if (!keyStatus.exhaustedAt && !keyStatus.invalidAt) {
        return index;
      }
    }
    
    return -1; // All keys unavailable
  }

  /**
   * Mark current key as exhausted (quota limit reached)
   */
  async markExhausted(): Promise<void> {
    await this.initialize();
    if (!this.state) return;

    const currentKey = this.state.keys[this.state.currentIndex];
    currentKey.exhaustedAt = new Date().toISOString();
    
    console.log(`[ApiKeyManager] Key exhausted: ${currentKey.key.slice(0, 8)}...`);
    
    // Move to next available key
    const nextIndex = this.findNextAvailableIndex(this.state.currentIndex + 1);
    if (nextIndex !== -1) {
      this.state.currentIndex = nextIndex;
      console.log(`[ApiKeyManager] Switched to key index ${nextIndex}`);
    }
    
    await this.saveState();
  }

  /**
   * Mark current key as invalid (bad credentials)
   */
  async markInvalid(): Promise<void> {
    await this.initialize();
    if (!this.state) return;

    const currentKey = this.state.keys[this.state.currentIndex];
    currentKey.invalidAt = new Date().toISOString();
    
    console.log(`[ApiKeyManager] Key invalid: ${currentKey.key.slice(0, 8)}...`);
    
    // Move to next available key
    const nextIndex = this.findNextAvailableIndex(this.state.currentIndex + 1);
    if (nextIndex !== -1) {
      this.state.currentIndex = nextIndex;
      console.log(`[ApiKeyManager] Switched to key index ${nextIndex}`);
    }
    
    await this.saveState();
  }

  /**
   * Mark current key as successfully used
   */
  async markSuccess(): Promise<void> {
    await this.initialize();
    if (!this.state) return;

    const currentKey = this.state.keys[this.state.currentIndex];
    currentKey.lastUsed = new Date().toISOString();
    
    await this.saveState();
  }

  /**
   * Check if any keys are available
   */
  async hasAvailableKeys(): Promise<boolean> {
    await this.initialize();
    if (!this.state) return this.apiKeys.length > 0;
    
    return this.findNextAvailableIndex(0) !== -1;
  }

  /**
   * Get status summary for debugging
   */
  async getStatus(): Promise<{ available: number; exhausted: number; invalid: number }> {
    await this.initialize();
    
    if (!this.state) {
      return { available: this.apiKeys.length, exhausted: 0, invalid: 0 };
    }

    let available = 0, exhausted = 0, invalid = 0;
    
    for (const keyStatus of this.state.keys) {
      if (keyStatus.invalidAt) invalid++;
      else if (keyStatus.exhaustedAt) exhausted++;
      else available++;
    }

    return { available, exhausted, invalid };
  }

  /**
   * Save state to storage
   */
  private async saveState(): Promise<void> {
    if (!this.state) return;
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[ApiKeyManager] Error saving state:', error);
    }
  }

  /**
   * Force reset all keys (for testing/debugging)
   */
  async resetAll(): Promise<void> {
    this.state = {
      keys: this.apiKeys.map(key => ({
        key,
        exhaustedAt: null,
        invalidAt: null,
        lastUsed: null,
      })),
      currentIndex: 0,
      lastUpdated: new Date().toISOString(),
    };
    await this.saveState();
    console.log('[ApiKeyManager] All keys reset');
  }
}

export { ApiKeyManager };
export default ApiKeyManager;
