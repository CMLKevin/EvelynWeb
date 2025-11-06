/**
 * Temporal Engine - Centralized System Clock Management
 * 
 * This engine ensures all time-dependent subsystems in Evelyn are synchronized
 * with the system clock and correctly calculate their values at any point in time.
 * 
 * Managed Systems:
 * - Mood decay (30-minute half-life)
 * - Belief decay (14-day half-life)
 * - Memory recency (30-day exponential)
 * - Scheduled tasks and reflections
 */

import { db } from '../db/client.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

export const TEMPORAL_CONFIG = {
  // Mood decay parameters
  MOOD_HALF_LIFE_MINUTES: 30,
  MOOD_BASELINE_VALENCE: 0.2,
  MOOD_BASELINE_AROUSAL: 0.4,
  MOOD_MIN_DECAY_INTERVAL_MINUTES: 5,
  MOOD_SIGNIFICANT_CHANGE_THRESHOLD: 0.05,
  
  // Belief decay parameters
  BELIEF_HALF_LIFE_DAYS: 14,
  BELIEF_SIGNIFICANT_DECAY_THRESHOLD: 0.10,
  
  // Memory recency parameters
  MEMORY_RECENCY_HALF_LIFE_DAYS: 30,
  
  // Reflection parameters
  REFLECTION_CADENCE_CONVERSATIONS: 10,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface MoodState {
  id: number;
  valence: number;
  arousal: number;
  stance: string;
  decayHalfLifeMins: number;
  lastUpdateAt: Date;
}

interface BeliefState {
  id: number;
  subject: string;
  statement: string;
  confidence: number;
  evidenceIds: string;
  lastUpdateAt: Date;
}

interface TemporalCalculationResult {
  system: string;
  calculated: boolean;
  updated: boolean;
  before?: any;
  after?: any;
  elapsedTime?: string;
  message: string;
}

// ============================================================================
// MOOD DECAY CALCULATIONS
// ============================================================================

/**
 * Calculate decayed mood values based on elapsed time
 */
export function calculateMoodDecay(mood: MoodState, now: Date = new Date()): {
  valence: number;
  arousal: number;
  elapsedMinutes: number;
  decayApplied: boolean;
} {
  const lastUpdate = new Date(mood.lastUpdateAt).getTime();
  const currentTime = now.getTime();
  const elapsedMinutes = (currentTime - lastUpdate) / (1000 * 60);
  
  // Don't apply decay if less than minimum interval
  if (elapsedMinutes < TEMPORAL_CONFIG.MOOD_MIN_DECAY_INTERVAL_MINUTES) {
    return {
      valence: mood.valence,
      arousal: mood.arousal,
      elapsedMinutes,
      decayApplied: false
    };
  }
  
  // Calculate exponential decay factor
  const decayFactor = Math.pow(0.5, elapsedMinutes / mood.decayHalfLifeMins);
  
  // Apply decay toward baseline values
  const baselineValence = TEMPORAL_CONFIG.MOOD_BASELINE_VALENCE;
  const baselineArousal = TEMPORAL_CONFIG.MOOD_BASELINE_AROUSAL;
  
  const newValence = baselineValence + (mood.valence - baselineValence) * decayFactor;
  const newArousal = baselineArousal + (mood.arousal - baselineArousal) * decayFactor;
  
  return {
    valence: newValence,
    arousal: newArousal,
    elapsedMinutes,
    decayApplied: true
  };
}

/**
 * Apply mood decay and persist to database if significant change occurred
 */
export async function applyMoodDecay(now: Date = new Date()): Promise<TemporalCalculationResult> {
  try {
    const mood = await db.moodState.findFirst();
    
    if (!mood) {
      return {
        system: 'mood',
        calculated: false,
        updated: false,
        message: 'No mood state found'
      };
    }
    
    const before = {
      valence: mood.valence,
      arousal: mood.arousal,
      lastUpdateAt: mood.lastUpdateAt
    };
    
    const decayResult = calculateMoodDecay(mood, now);
    
    // Check if change is significant enough to update database
    const valenceChange = Math.abs(mood.valence - decayResult.valence);
    const arousalChange = Math.abs(mood.arousal - decayResult.arousal);
    const isSignificant = 
      valenceChange > TEMPORAL_CONFIG.MOOD_SIGNIFICANT_CHANGE_THRESHOLD ||
      arousalChange > TEMPORAL_CONFIG.MOOD_SIGNIFICANT_CHANGE_THRESHOLD;
    
    if (decayResult.decayApplied && isSignificant) {
      await db.moodState.update({
        where: { id: mood.id },
        data: {
          valence: decayResult.valence,
          arousal: decayResult.arousal,
          lastUpdateAt: now
        }
      });
      
      return {
        system: 'mood',
        calculated: true,
        updated: true,
        before,
        after: {
          valence: decayResult.valence,
          arousal: decayResult.arousal,
          lastUpdateAt: now
        },
        elapsedTime: `${decayResult.elapsedMinutes.toFixed(1)} minutes`,
        message: `Mood decay applied: valence ${before.valence.toFixed(2)} → ${decayResult.valence.toFixed(2)}, arousal ${before.arousal.toFixed(2)} → ${decayResult.arousal.toFixed(2)}`
      };
    }
    
    return {
      system: 'mood',
      calculated: true,
      updated: false,
      elapsedTime: `${decayResult.elapsedMinutes.toFixed(1)} minutes`,
      message: decayResult.decayApplied 
        ? 'Mood decay calculated but change not significant enough to persist'
        : 'Mood decay not applied (insufficient time elapsed)'
    };
  } catch (error) {
    return {
      system: 'mood',
      calculated: false,
      updated: false,
      message: `Error applying mood decay: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// BELIEF DECAY CALCULATIONS
// ============================================================================

/**
 * Calculate decayed belief confidence based on elapsed time
 */
export function calculateBeliefDecay(
  originalConfidence: number,
  lastUpdateAt: Date,
  now: Date = new Date()
): {
  confidence: number;
  originalConfidence: number;
  daysSinceUpdate: number;
  decayFactor: number;
  percentRetained: number;
} {
  const daysSinceUpdate = 
    (now.getTime() - new Date(lastUpdateAt).getTime()) / (1000 * 60 * 60 * 24);
  
  // Calculate exponential decay
  const decayFactor = Math.pow(0.5, daysSinceUpdate / TEMPORAL_CONFIG.BELIEF_HALF_LIFE_DAYS);
  const confidence = originalConfidence * decayFactor;
  
  return {
    confidence,
    originalConfidence,
    daysSinceUpdate,
    decayFactor,
    percentRetained: decayFactor
  };
}

/**
 * Calculate decay for all beliefs (read-only, no database updates)
 */
export async function calculateAllBeliefDecay(now: Date = new Date()): Promise<TemporalCalculationResult> {
  try {
    const beliefs = await db.personaBelief.findMany({
      orderBy: { confidence: 'desc' }
    });
    
    if (beliefs.length === 0) {
      return {
        system: 'beliefs',
        calculated: false,
        updated: false,
        message: 'No beliefs found'
      };
    }
    
    let significantDecayCount = 0;
    const decayDetails: any[] = [];
    
    for (const belief of beliefs) {
      const result = calculateBeliefDecay(belief.confidence, belief.lastUpdateAt, now);
      
      const decayAmount = result.originalConfidence - result.confidence;
      if (decayAmount > TEMPORAL_CONFIG.BELIEF_SIGNIFICANT_DECAY_THRESHOLD) {
        significantDecayCount++;
        decayDetails.push({
          id: belief.id,
          statement: belief.statement.substring(0, 50) + '...',
          original: (result.originalConfidence * 100).toFixed(0) + '%',
          current: (result.confidence * 100).toFixed(0) + '%',
          days: result.daysSinceUpdate.toFixed(1)
        });
      }
    }
    
    return {
      system: 'beliefs',
      calculated: true,
      updated: false, // Beliefs are calculated at read-time, not persisted
      before: { totalBeliefs: beliefs.length },
      after: { 
        significantDecayCount,
        decayDetails: decayDetails.slice(0, 5) // Show first 5
      },
      message: `Belief decay calculated for ${beliefs.length} beliefs, ${significantDecayCount} with significant decay (>10%)`
    };
  } catch (error) {
    return {
      system: 'beliefs',
      calculated: false,
      updated: false,
      message: `Error calculating belief decay: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// MEMORY RECENCY CALCULATIONS
// ============================================================================

/**
 * Calculate memory recency boost factor
 */
export function calculateMemoryRecency(
  lastAccessedAt: Date,
  now: Date = new Date()
): {
  ageDays: number;
  recencyBoost: number;
  decayFactor: number;
} {
  const ageMs = now.getTime() - new Date(lastAccessedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  
  // Exponential decay with 30-day characteristic time
  const decayFactor = Math.exp(-ageDays / TEMPORAL_CONFIG.MEMORY_RECENCY_HALF_LIFE_DAYS);
  const recencyBoost = decayFactor * 0.2; // Max 20% boost for very recent memories
  
  return {
    ageDays,
    recencyBoost,
    decayFactor
  };
}

/**
 * Analyze memory recency distribution
 */
export async function analyzeMemoryRecency(now: Date = new Date()): Promise<TemporalCalculationResult> {
  try {
    const memories = await db.memory.findMany({
      select: {
        id: true,
        lastAccessedAt: true,
        importance: true
      }
    });
    
    if (memories.length === 0) {
      return {
        system: 'memory-recency',
        calculated: false,
        updated: false,
        message: 'No memories found'
      };
    }
    
    const recencyStats = {
      fresh: 0,      // < 7 days
      recent: 0,     // 7-30 days
      aging: 0,      // 30-90 days
      old: 0         // > 90 days
    };
    
    for (const memory of memories) {
      const { ageDays } = calculateMemoryRecency(memory.lastAccessedAt, now);
      
      if (ageDays < 7) recencyStats.fresh++;
      else if (ageDays < 30) recencyStats.recent++;
      else if (ageDays < 90) recencyStats.aging++;
      else recencyStats.old++;
    }
    
    return {
      system: 'memory-recency',
      calculated: true,
      updated: false,
      after: {
        totalMemories: memories.length,
        distribution: recencyStats
      },
      message: `Memory recency analyzed: ${recencyStats.fresh} fresh, ${recencyStats.recent} recent, ${recencyStats.aging} aging, ${recencyStats.old} old`
    };
  } catch (error) {
    return {
      system: 'memory-recency',
      calculated: false,
      updated: false,
      message: `Error analyzing memory recency: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// ============================================================================
// SYSTEM INITIALIZATION
// ============================================================================

/**
 * Initialize all temporal systems on server startup
 * This ensures all time-dependent values are correctly calculated based on system clock
 */
export async function initializeTemporalSystems(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║        🕐 TEMPORAL ENGINE - System Clock Initialization       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  const now = new Date();
  
  console.log(`[Temporal] System time: ${now.toISOString()}`);
  console.log(`[Temporal] Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  console.log('');
  
  const results: TemporalCalculationResult[] = [];
  
  // 1. Apply mood decay
  console.log('[Temporal] Calculating mood decay...');
  const moodResult = await applyMoodDecay(now);
  results.push(moodResult);
  
  if (moodResult.calculated) {
    if (moodResult.updated) {
      console.log(`  ✓ ${moodResult.message}`);
      console.log(`    Elapsed: ${moodResult.elapsedTime}`);
    } else {
      console.log(`  ○ ${moodResult.message}`);
    }
  } else {
    console.log(`  ✗ ${moodResult.message}`);
  }
  console.log('');
  
  // 2. Calculate belief decay (non-persisting)
  console.log('[Temporal] Calculating belief decay...');
  const beliefResult = await calculateAllBeliefDecay(now);
  results.push(beliefResult);
  
  if (beliefResult.calculated) {
    console.log(`  ✓ ${beliefResult.message}`);
    if (beliefResult.after?.decayDetails && beliefResult.after.decayDetails.length > 0) {
      console.log('  Top decayed beliefs:');
      for (const detail of beliefResult.after.decayDetails) {
        console.log(`    • "${detail.statement}" ${detail.original} → ${detail.current} (${detail.days} days)`);
      }
    }
  } else {
    console.log(`  ○ ${beliefResult.message}`);
  }
  console.log('');
  
  // 3. Analyze memory recency
  console.log('[Temporal] Analyzing memory recency...');
  const memoryResult = await analyzeMemoryRecency(now);
  results.push(memoryResult);
  
  if (memoryResult.calculated) {
    console.log(`  ✓ ${memoryResult.message}`);
  } else {
    console.log(`  ○ ${memoryResult.message}`);
  }
  console.log('');
  
  // Summary
  const elapsedMs = Date.now() - startTime;
  const successCount = results.filter(r => r.calculated).length;
  const updateCount = results.filter(r => r.updated).length;
  
  console.log('━'.repeat(66));
  console.log(`[Temporal] Initialization complete in ${elapsedMs}ms`);
  console.log(`[Temporal] Systems calculated: ${successCount}/${results.length}`);
  console.log(`[Temporal] Values updated: ${updateCount}`);
  console.log('━'.repeat(66));
  console.log('');
}

/**
 * Get temporal system status
 */
export async function getTemporalStatus(): Promise<{
  systemTime: string;
  mood: any;
  beliefs: any;
  memoryRecency: any;
}> {
  const now = new Date();
  
  // Get mood status
  const mood = await db.moodState.findFirst();
  const moodStatus = mood ? {
    valence: mood.valence,
    arousal: mood.arousal,
    lastUpdate: mood.lastUpdateAt,
    minutesSinceUpdate: ((now.getTime() - new Date(mood.lastUpdateAt).getTime()) / (1000 * 60)).toFixed(1),
    decayed: calculateMoodDecay(mood, now)
  } : null;
  
  // Get belief status
  const beliefCount = await db.personaBelief.count();
  
  // Get memory status
  const memoryCount = await db.memory.count();
  
  return {
    systemTime: now.toISOString(),
    mood: moodStatus,
    beliefs: {
      total: beliefCount,
      halfLife: `${TEMPORAL_CONFIG.BELIEF_HALF_LIFE_DAYS} days`
    },
    memoryRecency: {
      total: memoryCount,
      halfLife: `${TEMPORAL_CONFIG.MEMORY_RECENCY_HALF_LIFE_DAYS} days`
    }
  };
}

// Export configuration for use by other modules
export default {
  initialize: initializeTemporalSystems,
  calculateMoodDecay,
  calculateBeliefDecay,
  calculateMemoryRecency,
  applyMoodDecay,
  calculateAllBeliefDecay,
  analyzeMemoryRecency,
  getStatus: getTemporalStatus,
  config: TEMPORAL_CONFIG
};

