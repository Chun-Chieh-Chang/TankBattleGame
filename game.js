window.addEventListener('load', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const endBtn = document.getElementById('endBtn');

    // --- 遊戲設定 ---
    const TILE_SIZE = 40;
    const MAP_WIDTH_TILES = 20;
    const MAP_HEIGHT_TILES = 15;

    canvas.width = MAP_WIDTH_TILES * TILE_SIZE;
    canvas.height = MAP_HEIGHT_TILES * TILE_SIZE;

    const TANK_SIZE = TILE_SIZE * 0.9;
    const TANK_SPEED = 2.5; // Slightly faster for responsiveness
    const BULLET_SPEED = 7; // Faster bullets
    const BULLET_SIZE = 10;
    const PLAYER_START_LIVES = 3;
    const INVINCIBILITY_TIME = 180; // 3 seconds (60fps) -> will need to update timers too!
    const BLINK_INTERVAL = 8; // 閃爍間隔

    // --- 視覺增強設定 ---
    const VISUAL_EFFECTS = {
        BACKGROUND_ANIMATION: true,
        SMOOTH_MOVEMENT: true,
        PARTICLE_EFFECTS: true,
        SCREEN_SHAKE: true,
        ENHANCED_UI: true
    };

    // 背景動畫變數
    let backgroundOffset = 0;
    let screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    let particles = [];

    // --- 顏色與敵人設定 ---
    const COLORS = {
        PLAYER: { main: '#00e676', accent: '#00c853', glow: 'rgba(0, 230, 118, 0.3)' },
        ENEMY_NORMAL: { main: '#e57373', accent: '#d32f2f', glow: 'rgba(229, 115, 115, 0.3)' },
        ENEMY_TOUGH: { main: '#ff7043', accent: '#d84315', glow: 'rgba(255, 112, 67, 0.3)' },
        BULLET: '#ffffff',
        BRICK: { main: '#a13d2d', highlight: '#d84315', shadow: '#6a281e', glow: 'rgba(161, 61, 45, 0.2)' },
        STEEL: { main: '#b0bec5', highlight: '#e0e0e0', shadow: '#78909c', rivet: '#546e7a', glow: 'rgba(176, 190, 197, 0.2)' },
        BUSH: { main: 'rgba(76, 175, 80, 0.8)', dark: 'rgba(56, 142, 60, 0.8)', light: 'rgba(129, 199, 132, 0.8)', glow: 'rgba(76, 175, 80, 0.3)' },
        BASE: { main: '#ffd54f', shadow: '#ff8f00', destroyed: '#5a5a5a', glow: 'rgba(255, 213, 79, 0.4)' },
        BACKGROUND: { main: '#0d1421', grid: 'rgba(100, 100, 100, 0.1)', accent: '#1a237e' },
        EXPLOSION: ['#ffffff', '#ffd54f', '#ff7043', '#d84315'],
        UI: { main: '#ffffff', accent: '#64b5f6', success: '#4caf50', warning: '#ff9800', danger: '#f44336' },
        PARTICLE: { spark: '#ffeb3b', smoke: '#757575', energy: '#e1bee7' }
    };
    const ENEMY_TYPES = {
        NORMAL: { colors: COLORS.ENEMY_NORMAL, health: 2, speed: 0.85, points: 100 }, // 增加血量和速度
        TOUGH: { colors: COLORS.ENEMY_TOUGH, health: 3, speed: 0.75, points: 300 },   // 增加血量和速度
        ELITE: { colors: { main: '#ff1744', accent: '#d50000', glow: 'rgba(255, 23, 68, 0.4)' }, health: 4, speed: 0.9, points: 500 } // 新增精英敵人
    };

    // --- AI 增強設定 ---
    const AI_CONFIG = {
        FORMATION_DISTANCE: TILE_SIZE * 3, // 陣型保持距離
        COORDINATION_RANGE: TILE_SIZE * 5, // 協調攻擊範圍
        RETREAT_HEALTH_THRESHOLD: 0.15, // 血量低於15%時撤退（更低的撤退閾值）
        AMBUSH_PROBABILITY: 0.25, // 埋伏機率（提高）
        FLANKING_PROBABILITY: 0.35, // 包夸機率（提高）
        GROUP_ATTACK_THRESHOLD: 2, // 當2人時群攻（降低閾值）
        SMART_PATHFINDING: true, // 智能尋路
        DYNAMIC_DIFFICULTY: true, // 動態難度
        ENEMY_SHOOT_COOLDOWN: 20, // 敵人射擊冷卻時間（從35降勺20，更快連續射擊）
        AGGRESSIVE_BONUS_SPEED: 1.2, // 攻擊性坦克速度加成
        COMBAT_AGGRESSION: 0.7 // 提高戰鬥積極性
    };

    // --- 道具系統設定 ---
    const POWERUP_TYPES = {
        RAPID_FIRE: { color: '#ff4444', symbol: 'R', duration: 600, points: 200 }, // 10秒快速射擊
        ARMOR: { color: '#4444ff', symbol: 'A', duration: 900, points: 300 }, // 15秒護甲
        EXTRA_LIFE: { color: '#44ff44', symbol: 'L', duration: 0, points: 500 }, // 額外生命
        INVINCIBLE: { color: '#ffff44', symbol: 'S', duration: 300, points: 1000 }, // 5秒無敵星星
        SHOTGUN: { color: '#ff00ff', symbol: 'W', duration: 600, points: 400 }, // 散彈槍
        LASER: { color: '#00ffff', symbol: 'Z', duration: 400, points: 500 } // 雷射
    };
    const POWERUP_SPAWN_CHANCE = 0.15; // 15%機率生成道具
    const POWERUP_SIZE = TILE_SIZE * 0.8;
    const POWERUP_LIFETIME = 1200; // 20秒後消失

    // --- 音效系統設定 ---
    const AUDIO_ENABLED = true;
    let audioContext;
    let audioInitialized = false;
    let backgroundMusic = null; // 背景音樂控制器
    let musicPlaying = false; // 背景音樂播放狀態

    // 初始化音效系統（自動啟動）
    function initAudio() {
        if (audioInitialized || !AUDIO_ENABLED) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
            console.log('音效系統已啟動');

            // 初始化成功後開始播放背景音樂
            startBackgroundMusic();
        } catch (error) {
            console.warn('無法初始化音效:', error);
            audioInitialized = false;
        }
    }

    // 音效配置
    const SOUND_CONFIG = {
        SHOOT: { frequency: 800, duration: 0.1, type: 'square', volume: 0.3 },
        EXPLOSION: { frequency: 150, duration: 0.3, type: 'sawtooth', volume: 0.4 },
        POWERUP_COLLECT: { frequency: 1200, duration: 0.2, type: 'sine', volume: 0.3 },
        ENEMY_DESTROY: { frequency: 200, duration: 0.4, type: 'square', volume: 0.4 },
        PLAYER_HIT: { frequency: 100, duration: 0.6, type: 'sawtooth', volume: 0.5 },
        LEVEL_COMPLETE: { frequency: 600, duration: 0.8, type: 'sine', volume: 0.4 },
        GAME_OVER: { frequency: 80, duration: 1.0, type: 'square', volume: 0.6 }
    };
    const POINTS = {
        ENEMY_NORMAL: 100,
        ENEMY_TOUGH: 300,
        LEVEL_COMPLETE: 1000,
        BRICK_DESTROY: 10
    };

    // --- 地圖佈局 ---
    const levelLayouts = [
        [ /* Level 1 - 基礎關卡 */
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 0, 0, 0, 2, 2, 0, 0, 0, 1, 1, 0, 0, 0, 0],
            [1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1],
            [1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1],
            [0, 0, 0, 0, 0, 0, 1, 2, 2, 0, 0, 2, 2, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0],
            [0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 0, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 2 - 叢林迷宮 */
            [0, 5, 5, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 5, 5, 0],
            [0, 5, 5, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 5, 5, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 0, 0, 0, 0],
            [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
            [2, 1, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 1, 2],
            [0, 0, 0, 0, 5, 5, 5, 0, 1, 1, 1, 1, 0, 5, 5, 5, 0, 0, 0, 0],
            [0, 0, 1, 1, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 1, 1, 0, 0],
            [0, 0, 2, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 2, 0, 0],
            [0, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
            [1, 1, 2, 0, 0, 0, 0, 0, 5, 5, 5, 5, 0, 0, 0, 0, 2, 1, 1, 1],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 0, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 3 - 十字要塞 (修復封閉區域) */
            [2, 2, 2, 2, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 2, 2, 2, 2],
            [2, 0, 0, 2, 0, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 2, 0, 0, 2],
            [2, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 2],
            [2, 0, 0, 2, 0, 1, 0, 5, 5, 5, 5, 5, 5, 0, 1, 0, 2, 0, 0, 2], // 開放左右端
            [0, 0, 0, 0, 0, 0, 0, 5, 2, 2, 2, 2, 5, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 0, 5, 5, 0, 5, 2, 0, 0, 2, 5, 0, 5, 5, 0, 1, 1, 0], // 開放通道
            [0, 1, 0, 0, 5, 2, 0, 2, 2, 0, 0, 2, 2, 0, 2, 5, 0, 0, 1, 0], // 減少封閉
            [0, 1, 0, 5, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 5, 0, 1, 0],
            [0, 1, 0, 5, 5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 5, 0, 1, 0],
            [0, 1, 0, 0, 5, 2, 0, 2, 2, 0, 0, 2, 2, 0, 2, 5, 0, 0, 1, 0], // 減少封閉
            [0, 1, 1, 0, 5, 5, 0, 5, 2, 0, 0, 2, 5, 0, 5, 5, 0, 1, 1, 0], // 開放通道
            [0, 0, 0, 0, 0, 0, 0, 5, 2, 2, 2, 2, 5, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 0, 1, 1, 1, 5, 5, 3, 3, 3, 3, 5, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 4 - 鋼鐵陣地 */
            [2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
            [2, 0, 0, 0, 2, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 2, 0, 0, 0, 2],
            [2, 0, 5, 0, 2, 0, 1, 1, 0, 5, 5, 0, 1, 1, 0, 2, 0, 5, 0, 2],
            [2, 0, 5, 0, 0, 0, 1, 2, 0, 0, 0, 0, 2, 1, 0, 0, 0, 5, 0, 2],
            [2, 0, 5, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 5, 0, 2], // 開放封閉區域
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 2, 2, 0, 1, 1, 1, 0, 2, 2, 0, 1, 1, 1, 0, 2, 2, 0, 1],
            [1, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0, 2, 2, 0, 1],
            [1, 0, 2, 2, 0, 1, 0, 0, 0, 2, 2, 0, 0, 0, 1, 0, 2, 2, 0, 1],
            [1, 0, 2, 2, 0, 1, 1, 1, 0, 2, 2, 0, 1, 1, 1, 0, 2, 2, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [2, 0, 5, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 5, 0, 2], // 開放封閉區域
            [1, 1, 1, 0, 1, 1, 1, 0, 5, 3, 3, 3, 3, 5, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 5 - 螺旋迷宮 (修復封閉區域) */
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1],
            [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
            [1, 0, 2, 0, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 2, 0, 1],
            [1, 0, 2, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 2, 0, 1],
            [1, 0, 2, 0, 5, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 5, 0, 2, 0, 1], // 開放右側
            [1, 0, 2, 0, 5, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0, 2, 0, 1], // 開放內部
            [1, 0, 2, 0, 5, 0, 2, 0, 5, 5, 0, 5, 0, 0, 0, 5, 0, 2, 0, 1], // 開放核心
            [1, 0, 2, 0, 5, 0, 2, 0, 5, 0, 0, 5, 0, 0, 0, 5, 0, 2, 0, 1], // 開放核心
            [1, 0, 2, 0, 5, 0, 2, 0, 5, 0, 0, 5, 0, 0, 0, 5, 0, 2, 0, 1], // 開放核心
            [1, 0, 2, 0, 5, 0, 2, 0, 5, 5, 0, 5, 0, 0, 0, 5, 0, 2, 0, 1], // 開放核心
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 6 - 叢林伏擊 (更多草叢) */
            [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
            [5, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 0, 5, 0, 0, 5],
            [5, 0, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1, 5, 1, 1, 1, 5, 1, 0, 5],
            [5, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 5],
            [5, 0, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1, 0, 5],
            [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
            [5, 5, 5, 1, 1, 1, 5, 5, 5, 1, 1, 1, 5, 5, 5, 1, 1, 1, 5, 5],
            [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0],
            [5, 5, 5, 1, 1, 1, 5, 5, 5, 1, 1, 1, 5, 5, 5, 1, 1, 1, 5, 5],
            [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
            [5, 0, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1, 0, 5],
            [5, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 5],
            [5, 1, 1, 5, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 1, 1, 1, 5, 1, 5],
            [5, 2, 1, 5, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 5, 2, 5],
            [5, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 5],
        ],
        [ /* Level 7 - 死亡迴廊 (狹窄通道) */
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2],
            [2, 0, 2, 2, 2, 0, 2, 0, 2, 2, 2, 2, 0, 2, 0, 2, 2, 2, 0, 2],
            [2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2],
            [2, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 2],
            [2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2],
            [2, 0, 2, 2, 2, 0, 2, 0, 2, 2, 2, 2, 0, 2, 0, 2, 2, 2, 0, 2],
            [2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2],
            [2, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 1, 1, 1, 0, 1, 2],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [2, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 2],
        ],
        [ /* Level 8 - 破碎島嶼 (水域概念 - 用鋼牆模擬不可通過但可射擊 - 暫用鋼牆) */
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 1, 1, 1, 0],
            [0, 1, 5, 1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 5, 1, 0],
            [0, 1, 1, 1, 0, 0, 2, 0, 1, 1, 1, 1, 0, 2, 0, 0, 1, 1, 1, 0],
            [0, 0, 0, 0, 0, 0, 2, 0, 1, 5, 5, 1, 0, 2, 0, 0, 0, 0, 0, 0],
            [0, 2, 2, 2, 0, 0, 0, 0, 1, 5, 5, 1, 0, 0, 0, 0, 2, 2, 2, 0],
            [0, 2, 0, 2, 0, 0, 2, 0, 1, 1, 1, 1, 0, 2, 0, 0, 2, 0, 2, 0],
            [0, 2, 0, 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 2, 0, 2, 0],
            [0, 2, 0, 2, 0, 0, 2, 2, 2, 0, 0, 2, 2, 2, 0, 0, 2, 0, 2, 0],
            [0, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2, 0],
            [0, 0, 0, 0, 0, 0, 2, 0, 1, 1, 1, 1, 0, 2, 0, 0, 0, 0, 0, 0],
            [0, 1, 1, 1, 0, 0, 2, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 1, 1, 0],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 9 - 棋盤戰場 (密集障礙) */
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [0, 2, 0, 2, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [0, 2, 0, 2, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0, 0, 2, 1, 2, 1, 2, 1, 2, 1],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [0, 2, 0, 2, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
            [0, 2, 0, 2, 0, 2, 0, 2, 0, 0, 0, 0, 2, 0, 2, 0, 2, 0, 2, 0],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ],
        [ /* Level 10 - 最終防線 (堡壘) */
            [2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 2, 2, 2, 2, 2, 2, 2, 0, 2],
            [2, 0, 2, 1, 1, 1, 1, 1, 2, 0, 0, 2, 1, 1, 1, 1, 1, 2, 0, 2],
            [2, 0, 2, 1, 5, 5, 5, 1, 2, 0, 0, 2, 1, 5, 5, 5, 1, 2, 0, 2],
            [2, 0, 2, 1, 5, 0, 5, 1, 2, 0, 0, 2, 1, 5, 0, 5, 1, 2, 0, 2],
            [2, 0, 2, 1, 5, 5, 5, 1, 2, 0, 0, 2, 1, 5, 5, 5, 1, 2, 0, 2],
            [2, 0, 2, 1, 1, 1, 1, 1, 2, 0, 0, 2, 1, 1, 1, 1, 1, 2, 0, 2],
            [2, 0, 2, 2, 2, 0, 2, 2, 2, 0, 0, 2, 2, 2, 0, 2, 2, 2, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
            [2, 2, 2, 2, 2, 0, 2, 2, 2, 0, 0, 2, 2, 2, 0, 2, 2, 2, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [1, 1, 1, 0, 1, 1, 1, 0, 0, 3, 3, 3, 3, 0, 1, 1, 1, 0, 1, 1, 1],
            [2, 2, 1, 0, 0, 0, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 0, 1, 2, 2],
            [0, 0, 0, 0, 0, 0, 0, 3, 1, 4, 1, 3, 3, 0, 0, 0, 0, 0, 0, 0],
        ]
    ];
    let keys = {}, player, base;
    let enemies = [], bullets = [], walls = [], explosions = [], bushes = [], powerUps = [];
    let playerLives, playerSpawnPos;
    let currentLevel = 0;
    let gameState = 'MENU'; // PLAYING, PAUSED, LEVEL_CLEAR, GAME_OVER, MENU
    let playerScore = 0;
    let highScore = parseInt(localStorage.getItem('tankGameHighScore')) || 0;
    let showAIStats = false; // AI狀態面板顯示開關
    let gameFrame = 0;
    let collisionGrid = []; // 碰撞網格快取，用於優化AI尋路性能

    class InputHandler {
        constructor() {
            window.addEventListener('keydown', (e) => {
                keys[e.code] = true;

                // I鍵切換AI狀態面板
                if (e.code === 'KeyI') {
                    showAIStats = !showAIStats;
                    console.log(`AI狀態面板: ${showAIStats ? '開啟' : '關閉'}`);
                }

                // Enter鍵進入下一關或重新開始遊戲
                if (e.code === 'Enter') {
                    try {
                        if (!audioInitialized) {
                            initAudio(); // 初始化音效
                        }

                        if (gameState === 'LEVEL_CLEAR') {
                            console.log(`Enter鍵進入下一關: ${currentLevel} -> ${currentLevel + 1}`);
                            currentLevel++;
                            init(currentLevel, false, true); // 強制開始
                        }
                        else if (gameState === 'GAME_OVER') {
                            console.log('Enter鍵重新開始遊戲');
                            currentLevel = 0;
                            init(currentLevel, true, true); // 強制開始
                        }
                    } catch (error) {
                        console.error('Enter鍵事件錯誤:', error);
                    }
                }
            });
            window.addEventListener('keyup', (e) => keys[e.code] = false);

            // Touch Controls Support
            this.setupTouchControls();
        }

        setupTouchControls() {
            const bindTouch = (id, code) => {
                const btn = document.getElementById(id);
                if (!btn) return;

                const press = (e) => { e.preventDefault(); keys[code] = true; };
                const release = (e) => { e.preventDefault(); keys[code] = false; };

                btn.addEventListener('touchstart', press, { passive: false });
                btn.addEventListener('touchend', release, { passive: false });
                btn.addEventListener('mousedown', press);
                btn.addEventListener('mouseup', release);
                btn.addEventListener('mouseleave', release);
            };

            bindTouch('btn-up', 'ArrowUp');
            bindTouch('btn-down', 'ArrowDown');
            bindTouch('btn-left', 'ArrowLeft');
            bindTouch('btn-right', 'ArrowRight');
            bindTouch('btn-shoot', 'Space');
        }
    }

    function drawTankBody(ctx, x, y, size, direction, colors) {
        const rx = Math.round(x);
        const ry = Math.round(y);
        const treadWidth = size * 0.2;
        const bodyWidth = size * 0.6;
        const bodyHeight = size * 0.8;
        const bodyVOffset = size * 0.1;
        const bodyHOffset = size * 0.1;

        ctx.fillStyle = colors.accent;
        if (direction === 'up' || direction === 'down') {
            ctx.fillRect(rx, ry, treadWidth, size);
            ctx.fillRect(rx + size - treadWidth, ry, treadWidth, size);
        } else {
            ctx.fillRect(rx, ry, size, treadWidth);
            ctx.fillRect(rx, ry + size - treadWidth, size, treadWidth);
        }

        ctx.fillStyle = colors.main;
        let bodyRect;
        if (direction === 'up' || direction === 'down') {
            bodyRect = { x: rx + treadWidth, y: ry + bodyVOffset, w: bodyWidth, h: bodyHeight };
        } else {
            bodyRect = { x: rx + bodyHOffset, y: ry + treadWidth, w: bodyHeight, h: bodyWidth };
        }
        ctx.fillRect(bodyRect.x, bodyRect.y, bodyRect.w, bodyRect.h);

        const cannonWidth = size * 0.15;
        const cannonLength = size * 0.4;
        ctx.fillStyle = colors.accent;

        switch (direction) {
            case 'up':
                ctx.fillRect(bodyRect.x + bodyRect.w / 2 - cannonWidth / 2, bodyRect.y - cannonLength, cannonWidth, cannonLength);
                break;
            case 'down':
                ctx.fillRect(bodyRect.x + bodyRect.w / 2 - cannonWidth / 2, bodyRect.y + bodyRect.h, cannonWidth, cannonLength);
                break;
            case 'left':
                ctx.fillRect(bodyRect.x - cannonLength, bodyRect.y + bodyRect.h / 2 - cannonWidth / 2, cannonLength, cannonWidth);
                break;
            case 'right':
                ctx.fillRect(bodyRect.x + bodyRect.w, bodyRect.y + bodyRect.h / 2 - cannonWidth / 2, cannonLength, cannonWidth);
                break;
        }
    }

    class Tank {
        constructor(x, y, color, direction = 'up') {
            this.x = x; this.y = y; this.width = TANK_SIZE; this.height = TANK_SIZE;
            this.color = color; this.speed = TANK_SPEED; this.direction = direction;
            this.shootCooldown = 0;
            // 平滑移動系統
            this.smoothX = x; this.smoothY = y;
            this.targetX = x; this.targetY = y;
            this.smoothSpeed = 0.2;
        }
        takeDamage(amount = 1) {
            this.health -= amount;
        }
        draw(ctx) {
            // 平滑移動更新
            if (VISUAL_EFFECTS.SMOOTH_MOVEMENT) {
                this.smoothX += (this.x - this.smoothX) * this.smoothSpeed;
                this.smoothY += (this.y - this.smoothY) * this.smoothSpeed;
            } else {
                this.smoothX = this.x;
                this.smoothY = this.y;
            }

            this.drawTankWithEffects(ctx, this.smoothX, this.smoothY, this.width, this.direction, this.color);
        }

        drawTankWithEffects(ctx, x, y, size, direction, colors) {
            const rx = Math.round(x);
            const ry = Math.round(y);

            // 發光效果
            if (colors.glow) {
                ctx.save();
                ctx.shadowColor = colors.glow;
                ctx.shadowBlur = 15;
                this.drawTankBody(ctx, rx, ry, size, direction, colors);
                ctx.restore();
            } else {
                this.drawTankBody(ctx, rx, ry, size, direction, colors);
            }
        }

        drawTankBody(ctx, x, y, size, direction, colors) {
            const treadWidth = size * 0.2;
            const bodyWidth = size * 0.6;
            const bodyHeight = size * 0.8;
            const bodyVOffset = size * 0.1;
            const bodyHOffset = size * 0.1;

            ctx.fillStyle = colors.accent;
            if (direction === 'up' || direction === 'down') {
                ctx.fillRect(x, y, treadWidth, size);
                ctx.fillRect(x + size - treadWidth, y, treadWidth, size);
            } else {
                ctx.fillRect(x, y, size, treadWidth);
                ctx.fillRect(x, y + size - treadWidth, size, treadWidth);
            }

            ctx.fillStyle = colors.main;
            let bodyRect;
            if (direction === 'up' || direction === 'down') {
                bodyRect = { x: x + treadWidth, y: y + bodyVOffset, w: bodyWidth, h: bodyHeight };
            } else {
                bodyRect = { x: x + bodyHOffset, y: y + treadWidth, w: bodyHeight, h: bodyWidth };
            }
            ctx.fillRect(bodyRect.x, bodyRect.y, bodyRect.w, bodyRect.h);

            const cannonWidth = size * 0.15;
            const cannonLength = size * 0.4;
            ctx.fillStyle = colors.accent;

            switch (direction) {
                case 'up':
                    ctx.fillRect(bodyRect.x + bodyRect.w / 2 - cannonWidth / 2, bodyRect.y - cannonLength, cannonWidth, cannonLength);
                    break;
                case 'down':
                    ctx.fillRect(bodyRect.x + bodyRect.w / 2 - cannonWidth / 2, bodyRect.y + bodyRect.h, cannonWidth, cannonLength);
                    break;
                case 'left':
                    ctx.fillRect(bodyRect.x - cannonLength, bodyRect.y + bodyRect.h / 2 - cannonWidth / 2, cannonLength, cannonWidth);
                    break;
                case 'right':
                    ctx.fillRect(bodyRect.x + bodyRect.w, bodyRect.y + bodyRect.h / 2 - cannonWidth / 2, cannonLength, cannonWidth);
                    break;
            }
        }

        getCollider() {
            const rect = { x: this.x, y: this.y, width: this.width, height: this.height };

            // Check Base
            if (base && !base.destroyed && checkCollision(rect, base)) return base;

            // Check Walls
            for (const wall of walls) {
                if (checkCollision(rect, wall)) return wall;
            }

            // Check Tanks
            const otherTanks = [player, ...enemies].filter(t => t !== this && t);
            for (const tank of otherTanks) {
                if (checkCollision(rect, tank)) return tank;
            }

            return null;
        }

        move(dx, dy) {
            const padding = 0.01; // Small buffer
            let moved = false;

            // --- X Axis ---
            if (dx !== 0) {
                this.x += dx;
                if (this.x < 0) this.x = 0;
                else if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

                const collider = this.getCollider();
                if (collider) {
                    if (dx > 0) this.x = collider.x - this.width - padding;
                    else if (dx < 0) this.x = collider.x + collider.width + padding;
                } else {
                    moved = true;
                }
            }

            // --- Y Axis ---
            if (dy !== 0) {
                this.y += dy;
                if (this.y < 0) this.y = 0;
                else if (this.y + this.height > canvas.height) this.y = canvas.height - this.height;

                const collider = this.getCollider();
                if (collider) {
                    if (dy > 0) this.y = collider.y - this.height - padding;
                    else if (dy < 0) this.y = collider.y + collider.height + padding;
                } else {
                    moved = true;
                }
            }

            this.targetX = this.x;
            this.targetY = this.y;

            if ((Math.abs(dx) > 0 || Math.abs(dy) > 0) && Math.random() < 0.1) {
                createParticles(this.x + this.width / 2, this.y + this.height, 1, 'smoke');
            }

            return moved;
        }

        // 檢查坦克是否被嵌入障礙物中
        isEmbedded() {
            const currentHitbox = { x: this.x, y: this.y, width: this.width, height: this.height };

            // 檢查是否與牆壁重疊
            for (const wall of walls) {
                if (checkCollision(currentHitbox, wall)) {
                    return true;
                }
            }

            // 檢查是否與基地重疊
            if (base && !base.destroyed && checkCollision(currentHitbox, base)) {
                return true;
            }

            // 檢查邊界
            if (this.x < 0 || this.x + this.width > canvas.width ||
                this.y < 0 || this.y + this.height > canvas.height) {
                return true;
            }

            return false;
        }

        // 將坦克移動到最近的有效位置
        unstickFromObstacles() {
            if (!this.isEmbedded()) return true;

            console.log(`Tank at (${this.x}, ${this.y}) is embedded, attempting to unstick...`);

            // 嘗試在附近找到有效位置
            const searchRadius = TILE_SIZE;
            const step = TANK_SPEED;

            // 搜索螺旋模式
            for (let radius = step; radius <= searchRadius; radius += step) {
                for (let angle = 0; angle < 360; angle += 45) {
                    const radians = (angle * Math.PI) / 180;
                    const testX = this.x + Math.cos(radians) * radius;
                    const testY = this.y + Math.sin(radians) * radius;

                    // 確保在邊界內
                    if (testX >= 0 && testX + this.width <= canvas.width &&
                        testY >= 0 && testY + this.height <= canvas.height) {

                        const testHitbox = { x: testX, y: testY, width: this.width, height: this.height };
                        let hasCollision = false;

                        // 檢查所有碰撞
                        for (const wall of walls) {
                            if (checkCollision(testHitbox, wall)) {
                                hasCollision = true;
                                break;
                            }
                        }

                        if (!hasCollision && base && !base.destroyed && checkCollision(testHitbox, base)) {
                            hasCollision = true;
                        }

                        if (!hasCollision) {
                            const otherTanks = [player, ...enemies].filter(t => t !== this && t);
                            for (const tank of otherTanks) {
                                if (checkCollision(testHitbox, tank)) {
                                    hasCollision = true;
                                    break;
                                }
                            }
                        }

                        if (!hasCollision) {
                            console.log(`Successfully unstuck tank to (${testX}, ${testY})`);
                            this.x = testX;
                            this.y = testY;
                            this.targetX = testX;
                            this.targetY = testY;
                            return true;
                        }
                    }
                }
            }

            // 如果螺旋搜索失敗，嘗試移動到預定義的安全位置
            const safePositions = [
                { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
                { x: canvas.width - TILE_SIZE * 3, y: TILE_SIZE * 2 },
                { x: TILE_SIZE * 2, y: canvas.height - TILE_SIZE * 3 },
                { x: canvas.width - TILE_SIZE * 3, y: canvas.height - TILE_SIZE * 3 },
                { x: canvas.width / 2, y: TILE_SIZE * 2 },
                { x: canvas.width / 2, y: canvas.height - TILE_SIZE * 3 }
            ];

            for (const pos of safePositions) {
                const testHitbox = { x: pos.x, y: pos.y, width: this.width, height: this.height };
                let hasCollision = false;

                for (const wall of walls) {
                    if (checkCollision(testHitbox, wall)) {
                        hasCollision = true;
                        break;
                    }
                }

                if (!hasCollision && base && !base.destroyed && checkCollision(testHitbox, base)) {
                    hasCollision = true;
                }

                if (!hasCollision) {
                    const otherTanks = [player, ...enemies].filter(t => t !== this && t);
                    for (const tank of otherTanks) {
                        if (checkCollision(testHitbox, tank)) {
                            hasCollision = true;
                            break;
                        }
                    }
                }

                if (!hasCollision) {
                    console.log(`Emergency unstick: moved tank to safe position (${pos.x}, ${pos.y})`);
                    this.x = pos.x;
                    this.y = pos.y;
                    this.targetX = pos.x;
                    this.targetY = pos.y;
                    return true;
                }
            }

            console.warn(`Failed to unstick tank at (${this.x}, ${this.y})`);
            return false;
        }

        // 驗證坦克位置並修正
        validateAndFixPosition() {
            if (this.isEmbedded()) {
                return this.unstickFromObstacles();
            }
            return true;
        }

        shoot() {
            let cooldownTime;
            if (this instanceof Player && this.rapidFire) {
                cooldownTime = 8; // 玩家快速射擊（更快）
            } else if (this instanceof Player) {
                cooldownTime = 15; // 玩家正常射擊（從60降勺15，允許連續射擊）
            } else if (this instanceof Enemy) {
                if (this.isElite) {
                    cooldownTime = this.eliteShootCooldown; // 精英敵人特殊冷卻
                } else {
                    cooldownTime = AI_CONFIG.ENEMY_SHOOT_COOLDOWN; // 普通敵人冷卻
                }
            } else {
                cooldownTime = 15; // 預設冷卻時間（減少）
            }

            if (this.shootCooldown <= 0) {
                let bulletX, bulletY, center_x = this.x + this.width / 2, center_y = this.y + this.height / 2;
                // Normal Shoot Logic moved to separate execution for overrides
                this.executeShoot();
                this.shootCooldown = cooldownTime;

                // 播放射擊音效
                playSound('SHOOT');
            }
        }

        executeShoot() {
            let bulletX, bulletY;
            const center_x = this.x + this.width / 2;
            const center_y = this.y + this.height / 2;

            switch (this.direction) {
                case 'up': bulletX = center_x - BULLET_SIZE / 2; bulletY = this.y - BULLET_SIZE; break;
                case 'down': bulletX = center_x - BULLET_SIZE / 2; bulletY = this.y + this.height; break;
                case 'left': bulletX = this.x - BULLET_SIZE; bulletY = center_y - BULLET_SIZE / 2; break;
                case 'right': bulletX = this.x + this.width; bulletY = center_y - BULLET_SIZE / 2; break;
            }
            bullets.push(new Bullet(bulletX, bulletY, this.direction, this));
            // 槍口火光效果
            createParticles(bulletX + BULLET_SIZE / 2, bulletY + BULLET_SIZE / 2, 3, 'spark');
        }
        update(timeScale = 1) { if (this.shootCooldown > 0) this.shootCooldown -= 1 * timeScale; }
    }

    class Player extends Tank {
        constructor(x, y) {
            super(x, y, COLORS.PLAYER, 'up');
            this.invincible = false;
            this.invincibilityTimer = 0;
            // 道具效果
            this.rapidFire = false;
            this.rapidFireTimer = 0;
            this.armor = false;
            this.armorTimer = 0;
            this.starInvincible = false;
            this.starInvincibleTimer = 0;
            this.weapon = 'normal'; // 'normal', 'shotgun', 'laser'
            this.weaponTimer = 0;
        }
        update(timeScale = 1) {
            super.update(timeScale);

            // 處理無敵時間
            if (this.invincible) {
                this.invincibilityTimer--;
                if (this.invincibilityTimer <= 0) {
                    this.invincible = false;
                }
            }

            // 處理道具效果計時器
            if (this.rapidFire) {
                this.rapidFireTimer--;
                if (this.rapidFireTimer <= 0) {
                    this.rapidFire = false;
                }
            }

            if (this.armor) {
                this.armorTimer--;
                if (this.armorTimer <= 0) {
                    this.armor = false;
                }
            }

            if (this.starInvincible) {
                this.starInvincibleTimer--;
                if (this.starInvincibleTimer <= 0) {
                    this.starInvincible = false;
                }
            }

            // 驗證位置，防止嵌入
            this.validateAndFixPosition();

            // WASD and Arrow Keys support
            // Normalize diagonal movement? For now, keep simple (one axis dominance or both)
            let dx = 0;
            let dy = 0;

            if (keys['ArrowUp'] || keys['KeyW']) {
                dy -= 1; this.direction = 'up'; // Prioritize logic or just set? Set direction to last pressed often feels best, but here we just track axes.
            }
            if (keys['ArrowDown'] || keys['KeyS']) {
                dy += 1; this.direction = 'down';
            }
            if (keys['ArrowLeft'] || keys['KeyA']) {
                dx -= 1; this.direction = 'left';
            }
            if (keys['ArrowRight'] || keys['KeyD']) {
                dx += 1; this.direction = 'right';
            }

            // Normalize
            if (dx !== 0 || dy !== 0) {
                // Determine direction based on movement if we want to be precise, or just keep the last key press direction logic above.
                // The above direction logic is flawed (stops at 'right' if right is pressed).
                // Better: Set direction based on non-zero movement.
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else if (dy !== 0) {
                    this.direction = dy > 0 ? 'down' : 'up';
                }

                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 0) {
                    dx = (dx / length) * this.speed * timeScale;
                    dy = (dy / length) * this.speed * timeScale;
                }
                this.move(dx, dy);
            }

            if (keys['Space']) this.shoot();
        }

        executeShoot() {
            if (this.weapon === 'shotgun') {
                const spread = ['up', 'down'].includes(this.direction) ? ['left', 'right'] : ['up', 'down'];
                // Main bullet
                super.executeShoot();
                // Flanking bullets (simplified visual spread not actual arc)
                // Actually, shotgun should shoot 3 bullets in slightly different angles. 
                // Since our grid is strict, let's shoot 3 parallel bullets or 1 fast one.
                // Let's do 3-way spread if space permits.
                const center_x = this.x + this.width / 2;
                const center_y = this.y + this.height / 2;
                let b1x, b1y, b2x, b2y;
                let perpX = 0, perpY = 0;

                if (this.direction === 'up' || this.direction === 'down') { perpX = 15; }
                else { perpY = 15; }

                // Hacky way to add spread bullets: manually add 2 more
                // We reuse base calculation from super but offset origin? No, we need separate bullets.
                // Let's just create 2 more bullets with slight offset.
                let bulletX, bulletY;
                switch (this.direction) {
                    case 'up': bulletX = center_x - BULLET_SIZE / 2; bulletY = this.y - BULLET_SIZE; break;
                    case 'down': bulletX = center_x - BULLET_SIZE / 2; bulletY = this.y + this.height; break;
                    case 'left': bulletX = this.x - BULLET_SIZE; bulletY = center_y - BULLET_SIZE / 2; break;
                    case 'right': bulletX = this.x + this.width; bulletY = center_y - BULLET_SIZE / 2; break;
                }

                bullets.push(new Bullet(bulletX + perpX, bulletY + perpY, this.direction, this));
                bullets.push(new Bullet(bulletX - perpX, bulletY - perpY, this.direction, this));

            } else if (this.weapon === 'laser') {
                // Laser is fast and pierces? Or just very fast?
                // Let's make it piercing.
                bulletX = center_x - BULLET_SIZE / 2; bulletY = center_y - BULLET_SIZE / 2;
                switch (this.direction) {
                    case 'up': bulletY = this.y - BULLET_SIZE; break;
                    case 'down': bulletY = this.y + this.height; break;
                    case 'left': bulletX = this.x - BULLET_SIZE; break;
                    case 'right': bulletX = this.x + this.width; break;
                }
                // Piercing bullet type
                bullets.push(new Bullet(bulletX, bulletY, this.direction, this, 'piercing'));
                createParticles(bulletX + BULLET_SIZE / 2, bulletY + BULLET_SIZE / 2, 3, 'energy');
            } else {
                super.executeShoot();
            }
        }
        respawn() {
            this.x = playerSpawnPos.x;
            this.y = playerSpawnPos.y;
            this.direction = 'up';
            this.invincible = true;
            this.invincibilityTimer = INVINCIBILITY_TIME;

            // 確保重生位置安全
            if (!this.validateAndFixPosition()) {
                console.warn('Player respawn position was invalid, attempting to find safe position');
                // 如果預設重生位置不安全，嘗試在附近找到安全位置
                const safePositions = [
                    { x: playerSpawnPos.x, y: playerSpawnPos.y + TILE_SIZE },
                    { x: playerSpawnPos.x, y: playerSpawnPos.y - TILE_SIZE },
                    { x: playerSpawnPos.x + TILE_SIZE, y: playerSpawnPos.y },
                    { x: playerSpawnPos.x - TILE_SIZE, y: playerSpawnPos.y },
                    { x: TILE_SIZE * 2, y: canvas.height - TILE_SIZE * 3 },
                    { x: TILE_SIZE * 4, y: canvas.height - TILE_SIZE * 3 }
                ];

                for (const pos of safePositions) {
                    this.x = pos.x;
                    this.y = pos.y;
                    if (this.validateAndFixPosition()) {
                        console.log(`Player respawned at safe position (${pos.x}, ${pos.y})`);
                        break;
                    }
                }
            }
        }

        // 道具效果激活
        activatePowerUp(type) {
            switch (type) {
                case 'RAPID_FIRE':
                    this.rapidFire = true;
                    this.rapidFireTimer = POWERUP_TYPES.RAPID_FIRE.duration;
                    break;
                case 'ARMOR':
                    this.armor = true;
                    this.armorTimer = POWERUP_TYPES.ARMOR.duration;
                    break;
                case 'EXTRA_LIFE':
                    playerLives++;
                    break;
                case 'INVINCIBLE':
                    this.starInvincible = true;
                    this.starInvincibleTimer = POWERUP_TYPES.INVINCIBLE.duration;
                    break;
            }
        }

        draw(ctx) {
            // 無敵時間閃爍效果
            if (this.invincible && Math.floor(this.invincibilityTimer / BLINK_INTERVAL) % 2 === 0) {
                return; // 不繪製，產生閃爍效果
            }

            // 無敵星星效果
            if (this.starInvincible && Math.floor(this.starInvincibleTimer / 4) % 2 === 0) {
                return; // 更快的閃爍
            }

            super.draw(ctx);

            // 護甲效果顯示
            if (this.armor) {
                ctx.strokeStyle = '#4444ff';
                ctx.lineWidth = 3;
                ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
            }

            // 快速射擊效果顯示
            if (this.rapidFire) {
                ctx.fillStyle = '#ff4444';
                ctx.beginPath();
                ctx.arc(this.x + this.width - 8, this.y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    class Enemy extends Tank {
        constructor(x, y, type) {
            super(x, y, type.colors, 'down');
            this.health = type.health;
            this.maxHealth = type.health; // 記錄原始血量用於計分
            this.speed = TANK_SPEED * type.speed;

            // 增強AI屬性（更高的攻擊性）
            this.personality = Math.random() < AI_CONFIG.COMBAT_AGGRESSION ? 'AGGRESSIVE' : (Math.random() < 0.8 ? 'STRATEGIC' : 'DEFENSIVE');
            this.aiState = 'SEEKING';
            this.behaviorPattern = this.chooseBehaviorPattern();
            this.groupId = Math.floor(Math.random() * 3); // 分組ID

            // 攻擊性坦克的特殊能力
            if (this.personality === 'AGGRESSIVE') {
                this.speed *= AI_CONFIG.AGGRESSIVE_BONUS_SPEED; // 攻擊性坦克速度加成
                this.aggressiveBehavior = true;
            }

            // 精英敵人的特殊能力
            if (this.maxHealth >= 4) { // 精英敵人標識
                this.isElite = true;
                this.speed *= 1.1; // 精英敵人额外速度加成
                this.eliteShootCooldown = 12; // 精英敵人更快的射擊冷卻（從25降勺12，極快連續射擊）
                this.smartTargeting = true; // 智能目標選擇
            }

            // AI計時器
            this.decisionTimer = 0;
            this.stuckTimer = 0;
            this.maneuverTimer = 0;
            this.coordinationTimer = 0;
            this.ambushTimer = 0;
            this.escapeTimer = 0; // 新增逃脫計時器

            // 路徑尋找
            this.pathTarget = null;
            this.lastPlayerPosition = null;
            this.patrolPoints = this.generatePatrolPoints();
            this.currentPatrolIndex = 0;
            this.escapeTarget = null; // 新增逃脫目標

            // 戰術狀態
            this.isRetreating = false;
            this.isAmbushing = false;
            this.isFlanking = false;
            this.teamRole = this.assignTeamRole();
        }

        update(timeScale = 1) {
            super.update(timeScale);

            // 動態難度調整
            if (AI_CONFIG.DYNAMIC_DIFFICULTY) {
                this.adjustDifficultyBasedOnLevel();
            }

            // 血量檢查與撤退機制
            this.checkRetreatCondition();

            // 群體協調
            this.updateGroupCoordination();

            // 驗證位置，防止嵌入
            if (!this.validateAndFixPosition()) {
                // 如果無法修正位置，強制重置到安全位置
                this.forceRepositionToSafeLocation();
            }

            // 主要AI更新
            switch (this.aiState) {
                case 'SEEKING': this.updateSeeking(); break;
                case 'MANEUVERING': this.updateManeuvering(); break;
                case 'RETREATING': this.updateRetreating(); break;
                case 'AMBUSHING': this.updateAmbushing(); break;
                case 'FLANKING': this.updateFlanking(); break;
                case 'COORDINATED_ATTACK': this.updateCoordinatedAttack(); break;
                case 'ESCAPING': this.updateEscaping(); break; // 新增逃脫狀態
            }

            // 射擊檢查（增強戰鬥行為）
            if (this.canSeeTarget() && !this.isRetreating) {
                // 攻擊性坦克更頻繁射擊
                if (this.personality === 'AGGRESSIVE' || Math.random() < 0.8) {
                    this.shoot();
                }
            }

            // 加強的戰鬥AI：主動尋找玩家
            if (this.personality === 'AGGRESSIVE' && this.aiState === 'SEEKING') {
                this.pursuePlayerAggressively();
            }
        }

        // 強制重置到安全位置
        forceRepositionToSafeLocation() {
            const safePositions = [
                { x: TILE_SIZE * 2, y: TILE_SIZE * 2 },
                { x: canvas.width - TILE_SIZE * 3, y: TILE_SIZE * 2 },
                { x: TILE_SIZE * 2, y: TILE_SIZE * 4 },
                { x: canvas.width - TILE_SIZE * 3, y: TILE_SIZE * 4 },
                { x: canvas.width / 2, y: TILE_SIZE * 2 }
            ];

            for (const pos of safePositions) {
                this.x = pos.x;
                this.y = pos.y;
                this.targetX = pos.x;
                this.targetY = pos.y;

                if (!this.isEmbedded()) {
                    console.log(`Enemy force repositioned to safe location (${pos.x}, ${pos.y})`);
                    // 重置後重新初始化AI狀態
                    this.aiState = 'SEEKING';
                    this.stuckTimer = 0;
                    this.escapeTimer = 0;
                    return;
                }
            }

            console.error('Failed to find safe position for enemy tank');
        }

        updateSeeking() {
            this.decisionTimer--;
            if (this.decisionTimer <= 0) {
                this.makeDecision();
            }

            const moveSuccess = this.attemptMove();
            if (!moveSuccess) {
                this.stuckTimer++;

                // 在複雜地形中更早觸發逃脫機制
                if (this.stuckTimer > 15 && this.isTrappedInEnclosure()) {
                    this.initiateEscapeSequence();
                } else if (this.stuckTimer > 30) {
                    this.switchToManeuvering();
                }
            } else {
                this.stuckTimer = 0;
            }
        }

        updateManeuvering() {
            this.maneuverTimer--;
            this.attemptMove();
            if (this.maneuverTimer <= 0) {
                this.aiState = 'SEEKING';
                this.decisionTimer = 0;
            }
        }

        switchToManeuvering() {
            this.aiState = 'MANEUVERING';
            this.stuckTimer = 0;
            this.maneuverTimer = 60;
            const currentDirection = this.direction;
            if (currentDirection === 'up' || currentDirection === 'down') {
                this.direction = Math.random() < 0.5 ? 'left' : 'right';
            } else {
                this.direction = Math.random() < 0.5 ? 'up' : 'down';
            }
        }

        // === 新增的AI方法 ===
        chooseBehaviorPattern() {
            const patterns = ['PATROL', 'HUNTER', 'GUARDIAN', 'FLANKER'];
            return patterns[Math.floor(Math.random() * patterns.length)];
        }

        assignTeamRole() {
            const roles = ['LEADER', 'SUPPORT', 'SCOUT'];
            return roles[this.groupId % roles.length];
        }

        generatePatrolPoints() {
            const points = [];
            for (let i = 0; i < 4; i++) {
                points.push({
                    x: Math.random() * (canvas.width - TANK_SIZE) + TANK_SIZE / 2,
                    y: Math.random() * (canvas.height - TANK_SIZE) + TANK_SIZE / 2
                });
            }
            return points;
        }

        adjustDifficultyBasedOnLevel() {
            const levelMultiplier = 1 + (currentLevel * 0.1);
            const baseSpeed = TANK_SPEED * ENEMY_TYPES[this.maxHealth === 1 ? 'NORMAL' : 'TOUGH'].speed;
            this.speed = Math.min(baseSpeed * levelMultiplier, TANK_SPEED * 1.5);
        }

        checkRetreatCondition() {
            const healthRatio = this.health / this.maxHealth;
            if (healthRatio < AI_CONFIG.RETREAT_HEALTH_THRESHOLD && !this.isRetreating) {
                this.isRetreating = true;
                this.aiState = 'RETREATING';
                this.decisionTimer = 300; // 5秒撤退時間
            }
        }

        // 新增：攻擊性追擊行為
        pursuePlayerAggressively() {
            if (!player) return;

            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 攻擊性坦克更加直接的追擊
            if (distance > TILE_SIZE * 2) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
                this.attemptMove();
            }

            // 在適當距離內持續射擊
            if (distance <= TILE_SIZE * 6 && this.canSeeTarget()) {
                this.shoot();
            }
        }

        // 增強的群體協調
        updateGroupCoordination() {
            this.coordinationTimer--;
            if (this.coordinationTimer <= 0) {
                this.coordinationTimer = 40; // 更頻繁的協調檢查
                const nearbyAllies = this.getNearbyAllies();

                if (nearbyAllies.length >= AI_CONFIG.GROUP_ATTACK_THRESHOLD - 1) {
                    if (Math.random() < 0.5) { // 提高協調攻擊機率
                        this.aiState = 'COORDINATED_ATTACK';
                        this.decisionTimer = 180;

                        // 通知附近盟友一起攻擊
                        nearbyAllies.forEach(ally => {
                            if (ally.aiState === 'SEEKING') {
                                ally.aiState = 'COORDINATED_ATTACK';
                                ally.decisionTimer = 180;
                            }
                        });
                    }
                }
            }
        }

        getNearbyAllies() {
            return enemies.filter(enemy => {
                if (enemy === this) return false;
                const distance = Math.sqrt(
                    Math.pow(enemy.x - this.x, 2) + Math.pow(enemy.y - this.y, 2)
                );
                return distance < AI_CONFIG.COORDINATION_RANGE;
            });
        }

        attemptMove() {
            switch (this.direction) {
                case 'up': return this.move(0, -this.speed);
                case 'down': return this.move(0, this.speed);
                case 'left': return this.move(-this.speed, 0);
                case 'right': return this.move(this.speed, 0);
            }
            return false;
        }

        makeDecision() {
            this.decisionTimer = Math.random() * 60 + 30;

            // 智能目標選擇
            if (this.personality === 'STRATEGIC' && base && !base.destroyed) {
                this.target = base;
            } else {
                this.target = player;
            }

            // 檢查是否被困在封閉區域
            if (this.isTrappedInEnclosure()) {
                this.initiateEscapeSequence();
                return;
            }

            // 檢查是否應該執行特殊戰術
            if (this.shouldAttemptFlanking()) {
                this.initiateFlanking();
                return;
            }

            if (this.shouldAttemptAmbush()) {
                this.initiateAmbush();
                return;
            }

            // 標準追蹤行為
            if (this.target) {
                const targetCenterX = this.target.x + this.target.width / 2;
                const targetCenterY = this.target.y + this.target.height / 2;
                const selfCenterX = this.x + this.width / 2;
                const selfCenterY = this.y + this.height / 2;
                const dx = targetCenterX - selfCenterX;
                const dy = targetCenterY - selfCenterY;

                // 使用增強的智能路徑選擇
                if (AI_CONFIG.SMART_PATHFINDING && this.isPathBlocked(dx, dy)) {
                    this.findAlternatePath(dx, dy);
                } else {
                    // 直接追蹤
                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.direction = dx > 0 ? 'right' : 'left';
                    } else {
                        this.direction = dy > 0 ? 'down' : 'up';
                    }
                }
            }
        }

        // === 新增的AI狀態更新方法 ===
        updateRetreating() {
            this.decisionTimer--;
            if (this.decisionTimer <= 0) {
                this.isRetreating = false;
                this.aiState = 'SEEKING';
                return;
            }

            // 遠離玩家
            if (player) {
                const dx = this.x - player.x;
                const dy = this.y - player.y;

                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
            }

            this.attemptMove();
        }

        updateAmbushing() {
            this.ambushTimer++;

            // 等待玩家靠近
            if (player) {
                const distance = Math.sqrt(
                    Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
                );

                if (distance < TILE_SIZE * 4 || this.ambushTimer > 300) {
                    this.isAmbushing = false;
                    this.aiState = 'SEEKING';
                    this.makeDecision();
                }
            }
        }

        updateFlanking() {
            this.decisionTimer--;
            if (this.decisionTimer <= 0) {
                this.isFlanking = false;
                this.aiState = 'SEEKING';
                return;
            }

            // 嘗圖繞到玩家側翸
            if (player) {
                const playerDirection = player.direction;
                let targetX, targetY;

                switch (playerDirection) {
                    case 'up':
                    case 'down':
                        targetX = player.x + (Math.random() < 0.5 ? -TILE_SIZE * 3 : TILE_SIZE * 3);
                        targetY = player.y;
                        break;
                    case 'left':
                    case 'right':
                        targetX = player.x;
                        targetY = player.y + (Math.random() < 0.5 ? -TILE_SIZE * 3 : TILE_SIZE * 3);
                        break;
                }

                const dx = targetX - this.x;
                const dy = targetY - this.y;

                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
            }

            this.attemptMove();
        }

        updateCoordinatedAttack() {
            this.decisionTimer--;
            if (this.decisionTimer <= 0) {
                this.aiState = 'SEEKING';
                return;
            }

            // 協調攻擊：根據組別角色行動
            const nearbyAllies = this.getNearbyAllies();
            if (nearbyAllies.length > 0) {
                switch (this.teamRole) {
                    case 'LEADER':
                        this.target = player;
                        this.makeDirectAttack();
                        break;
                    case 'SUPPORT':
                        this.provideCoverFire();
                        break;
                    case 'SCOUT':
                        this.attemptFlanking();
                        break;
                }
            } else {
                this.aiState = 'SEEKING';
            }
        }

        // 新增逃脫狀態更新
        updateEscaping() {
            this.escapeTimer--;

            if (this.escapeTimer <= 0) {
                this.aiState = 'SEEKING';
                this.escapeTarget = null;
                console.log(`Enemy at (${Math.round(this.x)}, ${Math.round(this.y)}) finished escaping`);
                return;
            }

            // 如果有逃脫目標，向目標移動
            if (this.escapeTarget) {
                const dx = this.escapeTarget.x - this.x;
                const dy = this.escapeTarget.y - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // 如果已經接近目標，結束逃脫
                if (distance < TILE_SIZE) {
                    this.aiState = 'SEEKING';
                    this.escapeTarget = null;
                    console.log(`Enemy reached escape target`);
                    return;
                }

                // 向逃脫目標移動
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
            } else {
                // 沒有逃脫目標，使用開放方向搜索
                const openDirection = this.findMostOpenDirection();
                if (openDirection) {
                    this.direction = openDirection;
                }
            }

            this.attemptMove();
        }

        canSeeTarget() {
            if (!this.target) return false;
            const targetCenterX = this.target.x + this.target.width / 2;
            const targetCenterY = this.target.y + this.target.height / 2;
            const selfCenterX = this.x + this.width / 2;
            const selfCenterY = this.y + this.height / 2;
            let isAligned = false;
            switch (this.direction) {
                case 'up': isAligned = targetCenterY < selfCenterY && Math.abs(targetCenterX - selfCenterX) < this.width; break;
                case 'down': isAligned = targetCenterY > selfCenterY && Math.abs(targetCenterX - selfCenterX) < this.width; break;
                case 'left': isAligned = targetCenterX < selfCenterX && Math.abs(targetCenterY - selfCenterY) < this.height; break;
                case 'right': isAligned = targetCenterX > selfCenterX && Math.abs(targetCenterY - selfCenterY) < this.height; break;
            }
            if (!isAligned) return false;
            return isPathClear({ x: selfCenterX, y: selfCenterY }, { x: targetCenterX, y: targetCenterY });
        }

        // === 新增的戰術方法 ===
        shouldAttemptFlanking() {
            if (this.isFlanking || !player) return false;
            return Math.random() < AI_CONFIG.FLANKING_PROBABILITY && this.personality === 'AGGRESSIVE';
        }

        shouldAttemptAmbush() {
            if (this.isAmbushing || !player) return false;
            return Math.random() < AI_CONFIG.AMBUSH_PROBABILITY && this.personality === 'STRATEGIC';
        }

        initiateFlanking() {
            this.isFlanking = true;
            this.aiState = 'FLANKING';
            this.decisionTimer = 240; // 4秒包夸時間
        }

        initiateAmbush() {
            this.isAmbushing = true;
            this.aiState = 'AMBUSHING';
            this.ambushTimer = 0;
        }

        isPathBlocked(dx, dy) {
            const steps = 3;
            for (let i = 1; i <= steps; i++) {
                const checkX = this.x + (dx / steps) * i;
                const checkY = this.y + (dy / steps) * i;

                for (const wall of walls) {
                    if (checkX >= wall.x && checkX <= wall.x + wall.width &&
                        checkY >= wall.y && checkY <= wall.y + wall.height) {
                        return true;
                    }
                }
            }
            return false;
        }

        findAlternatePath(dx, dy) {
            // 檢查是否被困在封閉區域
            if (this.isTrappedInEnclosure()) {
                this.initiateEscapeSequence();
                return;
            }

            // 使用A*算法尋找最佳路徑
            const bestDirection = this.findBestDirectionAStar();
            if (bestDirection) {
                this.direction = bestDirection;
                return;
            }

            // 如果A*失敗，使用壁面跟隨算法
            const wallFollowDirection = this.followWallToEscape();
            if (wallFollowDirection) {
                this.direction = wallFollowDirection;
                return;
            }

            // 最後備選：尋找最開闊的方向
            const openDirection = this.findMostOpenDirection();
            if (openDirection) {
                this.direction = openDirection;
            } else {
                // 完全沒有選擇時隨機移動
                const directions = ['up', 'down', 'left', 'right'];
                const availableDirections = directions.filter(dir => dir !== this.direction);
                this.direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
            }
        }

        // 檢查是否被困在封閉區域
        isTrappedInEnclosure() {
            const checkRadius = TILE_SIZE * 3;
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;

            // 檢查周圍是否被牆壁包圍
            let blockedDirections = 0;
            const directions = [
                { dx: 0, dy: -checkRadius }, // up
                { dx: 0, dy: checkRadius },  // down
                { dx: -checkRadius, dy: 0 }, // left
                { dx: checkRadius, dy: 0 }   // right
            ];

            for (const dir of directions) {
                if (this.isPositionBlocked(centerX + dir.dx, centerY + dir.dy)) {
                    blockedDirections++;
                }
            }

            return blockedDirections >= 3; // 如果3個或以上方向被阻擋，認為被困
        }

        // 啟動逃脫序列
        initiateEscapeSequence() {
            this.aiState = 'ESCAPING';
            this.escapeTimer = 240; // 4秒逃脫時間

            // 尋找最近的開放空間
            const openSpace = this.findNearestOpenSpace();
            if (openSpace) {
                this.escapeTarget = openSpace;
                console.log(`Enemy at (${Math.round(this.x)}, ${Math.round(this.y)}) initiating escape to (${openSpace.x}, ${openSpace.y})`);
            }
        }

        // 使用A*算法尋找最佳方向
        findBestDirectionAStar() {
            if (!this.target) return null;

            const start = {
                x: Math.floor(this.x / TILE_SIZE),
                y: Math.floor(this.y / TILE_SIZE)
            };

            const goal = {
                x: Math.floor(this.target.x / TILE_SIZE),
                y: Math.floor(this.target.y / TILE_SIZE)
            };

            const path = this.aStar(start, goal);
            if (path && path.length > 1) {
                const nextStep = path[1];
                const dx = nextStep.x - start.x;
                const dy = nextStep.y - start.y;

                if (dx > 0) return 'right';
                if (dx < 0) return 'left';
                if (dy > 0) return 'down';
                if (dy < 0) return 'up';
            }

            return null;
        }

        // A*算法實現
        aStar(start, goal) {
            const openSet = [start];
            const closedSet = new Set();
            const gScore = {};
            const fScore = {};
            const cameFrom = {};

            const key = (node) => `${node.x},${node.y}`;

            gScore[key(start)] = 0;
            fScore[key(start)] = this.heuristic(start, goal);

            while (openSet.length > 0) {
                // 尋找fScore最低的節點，增加安全性檢查
                openSet.sort((a, b) => (fScore[key(a)] || Infinity) - (fScore[key(b)] || Infinity));
                const current = openSet.shift();

                if (current.x === goal.x && current.y === goal.y) {
                    // 重建路徑
                    const path = [current];
                    let temp = current;
                    let safetyCount = 0;
                    while (cameFrom[key(temp)] && safetyCount < 200) {
                        temp = cameFrom[key(temp)];
                        path.unshift(temp);
                        safetyCount++;
                    }
                    return path;
                }

                closedSet.add(key(current));

                // 檢查鄰居
                const neighbors = [
                    { x: current.x + 1, y: current.y },
                    { x: current.x - 1, y: current.y },
                    { x: current.x, y: current.y + 1 },
                    { x: current.x, y: current.y - 1 }
                ];

                for (const neighbor of neighbors) {
                    if (this.isGridPositionBlocked(neighbor.x, neighbor.y) ||
                        closedSet.has(key(neighbor))) {
                        continue;
                    }

                    const tentativeGScore = gScore[key(current)] + 1;

                    if (!openSet.some(node => node.x === neighbor.x && node.y === neighbor.y)) {
                        openSet.push(neighbor);
                    } else if (tentativeGScore >= gScore[key(neighbor)]) {
                        continue;
                    }

                    cameFrom[key(neighbor)] = current;
                    gScore[key(neighbor)] = tentativeGScore;
                    fScore[key(neighbor)] = gScore[key(neighbor)] + this.heuristic(neighbor, goal);
                }

                // 限制搜索深度以避免極端情況下的卡頓
                if (closedSet.size > 150) break;
            }

            return null; // 沒有找到路徑
        }

        // 啟發式函數（曼哈頓距離）
        heuristic(a, b) {
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        }

        // 檢查網格位置是否被阻擋
        isGridPositionBlocked(gridX, gridY) {
            // 檢查邊界
            if (gridX < 0 || gridY < 0 || gridX >= MAP_WIDTH_TILES || gridY >= MAP_HEIGHT_TILES) {
                return true;
            }

            // 使用快取的網格直接查詢，大幅提升 A* 性能 (從 O(walls) 降到 O(1))
            if (collisionGrid[gridY] && collisionGrid[gridY][gridX]) {
                return true;
            }

            // 基地碰撞 (雖然基地不常移動，但通常固定在網格上)
            if (base && !base.destroyed) {
                const bGridX = Math.floor(base.x / TILE_SIZE);
                const bGridY = Math.floor(base.y / TILE_SIZE);
                // 基地可能佔據多個或特定的格點，這裡做簡單近似
                if (gridX === bGridX && gridY === bGridY) return true;
            }

            return false;
        }

        // 同步碰撞網格，用於優化尋路
        static syncCollisionGrid() {
            collisionGrid = Array(MAP_HEIGHT_TILES).fill().map(() => Array(MAP_WIDTH_TILES).fill(false));

            // 標記牆壁
            walls.forEach(w => {
                const r = Math.round(w.y / TILE_SIZE);
                const c = Math.round(w.x / TILE_SIZE);
                if (r >= 0 && r < MAP_HEIGHT_TILES && c >= 0 && c < MAP_WIDTH_TILES) {
                    collisionGrid[r][c] = true;
                }
            });

            // 標記基地
            if (base && !base.destroyed) {
                const r = Math.round(base.y / TILE_SIZE);
                const c = Math.round(base.x / TILE_SIZE);
                if (r >= 0 && r < MAP_HEIGHT_TILES && c >= 0 && c < MAP_WIDTH_TILES) {
                    collisionGrid[r][c] = true;
                }
            }
        }

        // 壁面跟隨算法
        followWallToEscape() {
            const directions = ['up', 'right', 'down', 'left'];
            const currentIndex = directions.indexOf(this.direction);

            // 右手法則：優先向右轉
            for (let i = 1; i <= 4; i++) {
                const newIndex = (currentIndex + i) % 4;
                const direction = directions[newIndex];

                if (this.canMoveInDirection(direction)) {
                    return direction;
                }
            }

            return null;
        }

        // 尋找最開闊的方向
        findMostOpenDirection() {
            const directions = ['up', 'down', 'left', 'right'];
            let bestDirection = null;
            let maxOpenness = -1;

            for (const direction of directions) {
                if (this.canMoveInDirection(direction)) {
                    const openness = this.calculateOpenness(direction);
                    if (openness > maxOpenness) {
                        maxOpenness = openness;
                        bestDirection = direction;
                    }
                }
            }

            return bestDirection;
        }

        // 計算某方向的開闊度
        calculateOpenness(direction) {
            const stepSize = TILE_SIZE;
            let openness = 0;
            let x = this.x;
            let y = this.y;

            for (let i = 0; i < 5; i++) {
                switch (direction) {
                    case 'up': y -= stepSize; break;
                    case 'down': y += stepSize; break;
                    case 'left': x -= stepSize; break;
                    case 'right': x += stepSize; break;
                }

                if (!this.isPositionBlocked(x, y)) {
                    openness++;
                } else {
                    break;
                }
            }

            return openness;
        }

        // 檢查是否能朝某方向移動
        canMoveInDirection(direction) {
            let nextX = this.x;
            let nextY = this.y;

            switch (direction) {
                case 'up': nextY -= this.speed; break;
                case 'down': nextY += this.speed; break;
                case 'left': nextX -= this.speed; break;
                case 'right': nextX += this.speed; break;
            }

            return !this.isPositionBlocked(nextX, nextY);
        }

        // 檢查位置是否被阻擋
        isPositionBlocked(x, y) {
            // 邊界檢查
            if (x < 0 || y < 0 || x + this.width > canvas.width || y + this.height > canvas.height) {
                return true;
            }

            // 創建測試hitbox
            const testHitbox = { x: x, y: y, width: this.width, height: this.height };

            // 檢查牆壁碰撞
            for (const wall of walls) {
                if (checkCollision(testHitbox, wall)) {
                    return true;
                }
            }

            // 檢查基地碰撞
            if (base && !base.destroyed && checkCollision(testHitbox, base)) {
                return true;
            }

            // 檢查其他坦克碰撞
            const otherTanks = [player, ...enemies].filter(t => t !== this && t);
            for (const tank of otherTanks) {
                if (checkCollision(testHitbox, tank)) {
                    return true;
                }
            }

            return false;
        }

        // 尋找最近的開放空間
        findNearestOpenSpace() {
            const searchRadius = TILE_SIZE * 8;
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;

            let bestSpace = null;
            let minDistance = Infinity;

            // 網格搜索開放空間
            for (let x = TILE_SIZE; x < canvas.width - TILE_SIZE; x += TILE_SIZE) {
                for (let y = TILE_SIZE; y < canvas.height - TILE_SIZE; y += TILE_SIZE) {
                    if (!this.isPositionBlocked(x, y)) {
                        const distance = Math.sqrt(
                            Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                        );

                        if (distance < minDistance && distance > TILE_SIZE * 2) {
                            // 確保這是一個真正開闊的區域
                            if (this.isAreaOpen(x, y, TILE_SIZE * 2)) {
                                minDistance = distance;
                                bestSpace = { x: x, y: y };
                            }
                        }
                    }
                }
            }

            return bestSpace;
        }

        // 檢查區域是否開闊
        isAreaOpen(centerX, centerY, radius) {
            const checkPoints = [
                { x: centerX - radius, y: centerY },
                { x: centerX + radius, y: centerY },
                { x: centerX, y: centerY - radius },
                { x: centerX, y: centerY + radius }
            ];

            for (const point of checkPoints) {
                if (this.isPositionBlocked(point.x, point.y)) {
                    return false;
                }
            }

            return true;
        }

        makeDirectAttack() {
            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;

                if (Math.abs(dx) > Math.abs(dy)) {
                    this.direction = dx > 0 ? 'right' : 'left';
                } else {
                    this.direction = dy > 0 ? 'down' : 'up';
                }
            }
            this.attemptMove();
        }

        provideCoverFire() {
            // 保持距離並提供火力支援
            if (player) {
                const distance = Math.sqrt(
                    Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
                );

                if (distance < TILE_SIZE * 4) {
                    // 太近，後退
                    const dx = this.x - player.x;
                    const dy = this.y - player.y;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.direction = dx > 0 ? 'right' : 'left';
                    } else {
                        this.direction = dy > 0 ? 'down' : 'up';
                    }
                } else if (distance > TILE_SIZE * 7) {
                    // 太遠，靠近
                    this.makeDirectAttack();
                }
                // 在適當距離內保持位置並射擊
            }
        }
        takeDamage() { this.health--; }

        draw(ctx) {
            super.draw(ctx);

            // AI狀態視覺指示器
            if (currentLevel > 0) { // 只在第二關以後顯示
                this.drawAIIndicators(ctx);
            }

            // 血量指示器
            if (this.health < this.maxHealth) {
                this.drawHealthBar(ctx);
            }
        }

        drawAIIndicators(ctx) {
            const indicatorSize = 8;
            let indicatorY = this.y - 15;

            // 狀態指示器
            let stateColor;
            switch (this.aiState) {
                case 'RETREATING': stateColor = '#ffff00'; break; // 黃色
                case 'AMBUSHING': stateColor = '#800080'; break;   // 紫色
                case 'FLANKING': stateColor = '#ffa500'; break;    // 橙色
                case 'COORDINATED_ATTACK': stateColor = '#ff0000'; break; // 紅色
                case 'ESCAPING': stateColor = '#00ffff'; break;    // 青色 - 新增逃脫狀態
                default: stateColor = '#ffffff'; break; // 白色
            }

            ctx.fillStyle = stateColor;
            ctx.beginPath();
            ctx.arc(this.x + this.width - indicatorSize, indicatorY, indicatorSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // 性格指示器
            let personalityColor;
            switch (this.personality) {
                case 'AGGRESSIVE': personalityColor = '#ff4444'; break;
                case 'STRATEGIC': personalityColor = '#4444ff'; break;
                case 'DEFENSIVE': personalityColor = '#44ff44'; break;
            }

            ctx.fillStyle = personalityColor;
            ctx.fillRect(this.x, indicatorY - indicatorSize / 2, indicatorSize / 2, indicatorSize);
        }

        drawHealthBar(ctx) {
            const barWidth = this.width;
            const barHeight = 4;
            const barY = this.y - 8;

            // 背景
            ctx.fillStyle = '#333333';
            ctx.fillRect(this.x, barY, barWidth, barHeight);

            // 血量
            const healthRatio = this.health / this.maxHealth;
            ctx.fillStyle = healthRatio > 0.5 ? '#44ff44' : (healthRatio > 0.25 ? '#ffff44' : '#ff4444');
            ctx.fillRect(this.x, barY, barWidth * healthRatio, barHeight);
        }
    }

    class Bullet {
        constructor(x, y, direction, owner) {
            this.x = x; this.y = y; this.width = BULLET_SIZE; this.height = BULLET_SIZE;
            this.direction = direction; this.speed = BULLET_SPEED; this.owner = owner;
        }
        update(timeScale = 1) {
            switch (this.direction) {
                case 'up': this.y -= this.speed * timeScale; break;
                case 'down': this.y += this.speed * timeScale; break;
                case 'left': this.x -= this.speed * timeScale; break;
                case 'right': this.x += this.speed * timeScale; break;
            }
        }
        draw(ctx) { ctx.fillStyle = COLORS.BULLET; ctx.beginPath(); ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2); ctx.fill(); }
    }

    class Wall {
        constructor(x, y, type) { this.x = x; this.y = y; this.width = TILE_SIZE; this.height = TILE_SIZE; this.type = type; }
        draw(ctx) {
            if (this.type === 'brick') {
                const brickW = this.width / 4, brickH = this.height / 2;
                for (let row = 0; row < 2; row++) {
                    for (let col = 0; col < 4; col++) {
                        const brickX = this.x + col * brickW, brickY = this.y + row * brickH;
                        ctx.fillStyle = COLORS.BRICK.shadow; ctx.fillRect(brickX, brickY, brickW, brickH);
                        ctx.fillStyle = COLORS.BRICK.main; ctx.fillRect(brickX + 1, brickY + 1, brickW - 2, brickH - 2);
                        ctx.fillStyle = COLORS.BRICK.highlight; ctx.fillRect(brickX + 1, brickY + 1, brickW - 4, 1);
                    }
                }
            } else {
                const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
                grad.addColorStop(0, COLORS.STEEL.highlight); grad.addColorStop(0.5, COLORS.STEEL.main); grad.addColorStop(1, COLORS.STEEL.shadow);
                ctx.fillStyle = grad; ctx.fillRect(this.x, this.y, this.width, this.height);
                ctx.strokeStyle = COLORS.STEEL.shadow; ctx.lineWidth = 2; ctx.strokeRect(this.x, this.y, this.width, this.height);
                ctx.fillStyle = COLORS.STEEL.rivet; const rivetSize = 4;
                ctx.fillRect(this.x + 2, this.y + 2, rivetSize, rivetSize); ctx.fillRect(this.x + this.width - rivetSize - 2, this.y + 2, rivetSize, rivetSize);
                ctx.fillRect(this.x + 2, this.y + this.height - rivetSize - 2, rivetSize, rivetSize); ctx.fillRect(this.x + this.width - rivetSize - 2, this.y + this.height - rivetSize - 2, rivetSize, rivetSize);
            }
        }
    }

    class Base {
        constructor(x, y) { this.x = x; this.y = y; this.width = TILE_SIZE; this.height = TILE_SIZE; this.destroyed = false; }
        draw(ctx) {
            const w = this.width, h = this.height, x = this.x, y = this.y;
            if (!this.destroyed) {
                ctx.fillStyle = COLORS.BASE.shadow; ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.6); ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.4);
                ctx.fillStyle = COLORS.BASE.main; ctx.fillRect(x + w * 0.4, y + h * 0.1, w * 0.2, h * 0.8); ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.6); ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.2);
                ctx.fillStyle = COLORS.BACKGROUND.main; ctx.fillRect(x + w * 0.45, y + h * 0.25, w * 0.1, h * 0.1);
            } else {
                ctx.fillStyle = COLORS.BASE.destroyed; ctx.fillRect(x + w * 0.4, y + h * 0.1, w * 0.2, h * 0.8); ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.6); ctx.fillRect(x + w * 0.2, y + h * 0.3, w * 0.6, h * 0.2);
                ctx.strokeStyle = '#ff3d00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w * 0.2, y + h * 0.2); ctx.lineTo(x + w * 0.8, y + h * 0.8); ctx.moveTo(x + w * 0.8, y + h * 0.2); ctx.lineTo(x + w * 0.2, y + h * 0.8); ctx.stroke();
            }
        }
    }

    class Explosion {
        constructor(x, y, size, type = 'normal') {
            this.x = x;
            this.y = y;
            this.size = size;
            this.life = type === 'tank' ? 60 : (type === 'powerup' ? 30 : 40); // 道具爆炸持續較短
            this.maxLife = this.life;
            this.type = type;

            // 爆炸粒子
            this.particles = [];
            const particleCount = type === 'tank' ? 15 : (type === 'powerup' ? 5 : 8);
            for (let i = 0; i < particleCount; i++) {
                this.particles.push({
                    x: 0,
                    y: 0,
                    vx: (Math.random() - 0.5) * 6,
                    vy: (Math.random() - 0.5) * 6,
                    size: Math.random() * 4 + 2,
                    color: type === 'powerup' ? '#ffffff' : COLORS.EXPLOSION[Math.floor(Math.random() * COLORS.EXPLOSION.length)]
                });
            }
        }
        update(timeScale = 1) {
            this.life -= 1 * timeScale;
            // 更新粒子位置
            for (const particle of this.particles) {
                particle.x += particle.vx * timeScale;
                particle.y += particle.vy * timeScale;
                particle.vx *= Math.pow(0.98, timeScale); // 阻力
                particle.vy *= Math.pow(0.98, timeScale);
            }
        }

        draw(ctx) {
            const p = this.life / this.maxLife;

            // 主爆炸效果
            if (p > 0.7) {
                const intensity = (p - 0.7) * 3.33; // 0.7-1.0 映射到 0-1
                ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 0.8 * intensity, 0, Math.PI * 2);
                ctx.fill();
            }

            // 火焰效果
            if (p > 0.3) {
                const fireProgress = (p - 0.3) / 0.7;
                const currentSize = this.size * (0.5 + fireProgress * 0.5);
                const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, currentSize);
                grad.addColorStop(0, `rgba(255, 255, 255, ${fireProgress * 0.8})`);
                grad.addColorStop(0.3, `rgba(255, 212, 79, ${fireProgress * 0.9})`);
                grad.addColorStop(0.7, `rgba(255, 112, 67, ${fireProgress * 0.7})`);
                grad.addColorStop(1, 'rgba(212, 67, 21, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // 粒子效果
            for (const particle of this.particles) {
                const particleAlpha = p * 0.8;
                if (particleAlpha > 0) {
                    let particleColor = particle.color;
                    if (typeof particleColor === 'string' && particleColor.includes('rgb')) {
                        particleColor = particleColor.replace(')', `, ${particleAlpha})`);
                    } else {
                        particleColor = `rgba(255, 235, 59, ${particleAlpha})`; // 後援顏色
                    }
                    ctx.fillStyle = particleColor;
                    ctx.beginPath();
                    ctx.arc(this.x + particle.x, this.y + particle.y, particle.size * p, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // 烟霧效果（爆炸末期）
            if (p < 0.5 && this.type === 'tank') {
                const smokeAlpha = (0.5 - p) * 0.4;
                ctx.fillStyle = `rgba(80, 80, 80, ${smokeAlpha})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    class Bush {
        constructor(x, y) {
            this.x = x; this.y = y; this.width = TILE_SIZE; this.height = TILE_SIZE;
            this.leaves = [];
            for (let i = 0; i < 20; i++) {
                const leafX = Math.random() * this.width;
                const leafY = Math.random() * this.height;
                const leafSize = Math.random() * 8 + 4;
                const colorChance = Math.random();
                let color;
                if (colorChance < 0.3) color = COLORS.BUSH.dark;
                else if (colorChance < 0.6) color = COLORS.BUSH.light;
                else color = COLORS.BUSH.main;
                this.leaves.push({ x: leafX, y: leafY, size: leafSize, color: color });
            }
        }
        draw(ctx) {
            ctx.fillStyle = COLORS.BUSH.main;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            for (const leaf of this.leaves) {
                ctx.fillStyle = leaf.color;
                ctx.beginPath();
                ctx.arc(this.x + leaf.x, this.y + leaf.y, leaf.size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    class PowerUp {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.width = POWERUP_SIZE;
            this.height = POWERUP_SIZE;
            this.type = type;
            this.config = POWERUP_TYPES[type];
            this.lifetime = POWERUP_LIFETIME;
            this.blinkTimer = 0;
        }

        update(timeScale = 1) {
            this.lifetime -= 1 * timeScale;
            this.blinkTimer += 1 * timeScale;
        }

        draw(ctx) {
            // 生命將盡時閃爍警告
            if (this.lifetime < 300 && Math.floor(this.blinkTimer / 15) % 2 === 0) {
                return;
            }

            // 道具背景
            ctx.fillStyle = this.config.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // 道具邊框
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // 道具符號
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px "Courier New", Courier, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.config.symbol, this.x + this.width / 2, this.y + this.height / 2 + 8);
        }

        isExpired() {
            return this.lifetime <= 0;
        }
    }

    function createExplosion(x, y, size, type = 'normal') {
        explosions.push(new Explosion(x, y, size, type));
        // 增強視覺效果
        createParticles(x, y, size / 4, 'spark');
        createScreenShake(size / 10, 15);
    }
    function checkCollision(rect1, rect2) { if (!rect1 || !rect2) return false; return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y; }

    // --- 計分系統函數 ---
    function addScore(points) {
        playerScore += points;
        if (playerScore > highScore) {
            highScore = playerScore;
            localStorage.setItem('tankGameHighScore', highScore.toString());
        }
    }

    // --- 粒子系統和視覺效果 ---
    class Particle {
        constructor(x, y, type = 'spark') {
            this.x = x;
            this.y = y;
            this.vx = (Math.random() - 0.5) * 8;
            this.vy = (Math.random() - 0.5) * 8;
            this.life = 60;
            this.maxLife = 60;
            this.size = Math.random() * 4 + 1;
            this.type = type;
            this.color = COLORS.PARTICLE[type] || COLORS.PARTICLE.spark;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.life--;
        }

        draw(ctx) {
            const alpha = this.life / this.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function createParticles(x, y, count = 8, type = 'spark') {
        if (!VISUAL_EFFECTS.PARTICLE_EFFECTS) return;
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(x, y, type));
        }
    }

    function createScreenShake(intensity = 5, duration = 20) {
        if (!VISUAL_EFFECTS.SCREEN_SHAKE) return;
        screenShake.intensity = intensity;
        screenShake.duration = duration;
    }
    function initAudio() {
        if (!AUDIO_ENABLED || audioInitialized) return;
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
            console.log('音效系統初始化成功');
        } catch (e) {
            console.log('音效系統初始化失敗:', e);
            audioInitialized = false;
        }
    }

    function playSound(soundType) {
        if (!audioInitialized || !audioContext) return;

        try {
            const config = SOUND_CONFIG[soundType];
            if (!config) return;

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = config.type;
            oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

            // 爆炸音效的頻率下降效果
            if (soundType === 'EXPLOSION' || soundType === 'ENEMY_DESTROY' || soundType === 'PLAYER_HIT') {
                oscillator.frequency.exponentialRampToValueAtTime(
                    config.frequency * 0.1,
                    audioContext.currentTime + config.duration
                );
            }

            gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + config.duration);
        } catch (e) {
            console.log('播放音效失敗:', e);
        }
    }

    function playMelody(notes, noteDuration = 0.2) {
        if (!audioInitialized || !audioContext) return;

        notes.forEach((frequency, index) => {
            if (frequency === 0) return; // 休止符

            const startTime = audioContext.currentTime + (index * noteDuration);
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, startTime);

            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration * 0.8);

            oscillator.start(startTime);
            oscillator.stop(startTime + noteDuration);
        });
    }

    // 背景音樂系統
    function createBackgroundMusic() {
        if (!audioInitialized || !audioContext) return null;

        try {
            // 創建主旋律音轨
            const melody = audioContext.createOscillator();
            const melodyGain = audioContext.createGain();

            // 創建伴奏音轨
            const bass = audioContext.createOscillator();
            const bassGain = audioContext.createGain();

            // 創建節奏音轨
            const drum = audioContext.createOscillator();
            const drumGain = audioContext.createGain();

            // 音轉連接
            melody.connect(melodyGain);
            bass.connect(bassGain);
            drum.connect(drumGain);

            melodyGain.connect(audioContext.destination);
            bassGain.connect(audioContext.destination);
            drumGain.connect(audioContext.destination);

            // 設定音色和音量 (降低音量)
            melody.type = 'square'; // 改回方波，更像8位元遊戲
            bass.type = 'triangle'; // 保持三角波
            drum.type = 'square'; // 保持方波節奏

            melodyGain.gain.setValueAtTime(0.08, audioContext.currentTime); // 稍微提高音量以配合馬力歐風格
            bassGain.gain.setValueAtTime(0.04, audioContext.currentTime);   // 稍微提高低音
            drumGain.gain.setValueAtTime(0.02, audioContext.currentTime);   // 保持輕柔節奏

            // 完整的超級馬力歐兄弟主題音樂（原版長度）
            // 第一段主旋律 + 第二段變化 + 重複段落
            const melodyPattern = [
                // 開場經典旋律
                659, 659, 0, 659, 0, 523, 659, 0, 784, 0, 0, 0, 392, 0, 0, 0,
                // 第二樂句
                523, 0, 0, 392, 0, 0, 330, 0, 0, 440, 0, 494, 0, 466, 440, 0,
                // 第三樂句
                392, 659, 784, 880, 0, 698, 784, 0, 659, 0, 523, 587, 523, 0, 0, 0,
                // 第四樂句
                523, 0, 0, 392, 0, 0, 330, 0, 0, 440, 0, 494, 0, 466, 440, 0,
                // 重複主題變化
                392, 659, 784, 880, 0, 698, 784, 0, 659, 0, 523, 587, 523, 0, 0, 0,
                // B段旋律
                784, 740, 698, 622, 0, 659, 0, 415, 440, 523, 0, 440, 523, 587, 0, 0,
                // B段繼續
                784, 740, 698, 622, 0, 659, 0, 1047, 0, 1047, 1047, 0, 0, 0, 0, 0,
                // 回到A段
                659, 659, 0, 659, 0, 523, 659, 0, 784, 0, 0, 0, 392, 0, 0, 0
            ];

            const bassPattern = [
                // 對應主旋律的低音伴奏
                131, 131, 0, 131, 0, 131, 131, 0, 131, 0, 0, 0, 98, 0, 0, 0,
                131, 0, 0, 98, 0, 0, 82, 0, 0, 110, 0, 123, 0, 116, 110, 0,
                98, 131, 156, 175, 0, 147, 156, 0, 131, 0, 104, 117, 104, 0, 0, 0,
                131, 0, 0, 98, 0, 0, 82, 0, 0, 110, 0, 123, 0, 116, 110, 0,
                98, 131, 156, 175, 0, 147, 156, 0, 131, 0, 104, 117, 104, 0, 0, 0,
                156, 147, 139, 124, 0, 131, 0, 82, 87, 104, 0, 87, 104, 117, 0, 0,
                156, 147, 139, 124, 0, 131, 0, 208, 0, 208, 208, 0, 0, 0, 0, 0,
                131, 131, 0, 131, 0, 131, 131, 0, 131, 0, 0, 0, 98, 0, 0, 0
            ];

            const drumPattern = [
                // 對應的鼓點節奏
                100, 0, 80, 0, 100, 0, 120, 0, 100, 0, 0, 0, 80, 0, 0, 0,
                90, 0, 0, 70, 0, 0, 60, 0, 0, 85, 0, 95, 0, 90, 85, 0,
                70, 100, 120, 140, 0, 110, 120, 0, 100, 0, 80, 90, 80, 0, 0, 0,
                90, 0, 0, 70, 0, 0, 60, 0, 0, 85, 0, 95, 0, 90, 85, 0,
                70, 100, 120, 140, 0, 110, 120, 0, 100, 0, 80, 90, 80, 0, 0, 0,
                120, 115, 110, 95, 0, 100, 0, 75, 80, 80, 0, 80, 80, 90, 0, 0,
                120, 115, 110, 95, 0, 100, 0, 160, 0, 160, 160, 0, 0, 0, 0, 0,
                100, 0, 80, 0, 100, 0, 120, 0, 100, 0, 0, 0, 80, 0, 0, 0
            ];

            let noteIndex = 0;
            // 音樂節奏調整：更改這個數值來調整音樂快慢
            // 0.1 = 非常快 (快節奏)
            // 0.2 = 快 (快速馬力歐)
            // 0.3 = 中等 (當前設定)
            // 0.4 = 慢 (放鬆節奏)
            // 0.5 = 非常慢 (緩慢節奏)
            const noteLength = 0.1; // 馬力歐節奍：每個音符0.3秒（中等速度）

            function playNextNote() {
                if (!musicPlaying) return;

                const currentTime = audioContext.currentTime;

                // 設定各音軌頻率
                melody.frequency.setValueAtTime(melodyPattern[noteIndex], currentTime);
                bass.frequency.setValueAtTime(bassPattern[noteIndex], currentTime);
                drum.frequency.setValueAtTime(drumPattern[noteIndex], currentTime);

                // 8位元遊戲風格的音量變化
                const beatStrength = (noteIndex % 8 === 0) ? 1.3 : 1.0; // 更明顯的音量對比
                melodyGain.gain.setValueAtTime(0.08 * beatStrength, currentTime);
                bassGain.gain.setValueAtTime(0.04 * beatStrength, currentTime);

                noteIndex = (noteIndex + 1) % melodyPattern.length;

                // 安排下一個音符
                setTimeout(playNextNote, noteLength * 1000);
            }

            // 開始播放
            melody.start();
            bass.start();
            drum.start();

            playNextNote();

            return {
                melody: melody,
                bass: bass,
                drum: drum,
                melodyGain: melodyGain,
                bassGain: bassGain,
                drumGain: drumGain
            };
        } catch (error) {
            console.warn('無法創建背景音樂:', error);
            return null;
        }
    }

    function startBackgroundMusic() {
        if (!audioInitialized || musicPlaying || !audioContext) return;

        musicPlaying = true;
        backgroundMusic = createBackgroundMusic();

        if (backgroundMusic) {
            console.log('背景音樂開始播放');
        }
    }

    function stopBackgroundMusic() {
        if (!musicPlaying || !backgroundMusic) return;

        try {
            musicPlaying = false;

            if (backgroundMusic.melody) backgroundMusic.melody.stop();
            if (backgroundMusic.bass) backgroundMusic.bass.stop();
            if (backgroundMusic.drum) backgroundMusic.drum.stop();

            backgroundMusic = null;
            console.log('背景音樂停止播放');
        } catch (error) {
            console.warn('停止背景音樂時發生錯誤:', error);
        }
    }

    function pauseBackgroundMusic() {
        if (backgroundMusic && musicPlaying) {
            // 完全停止背景音樂
            stopBackgroundMusic();
            console.log('背景音樂已暫停（停止播放）');
        }
    }

    function resumeBackgroundMusic() {
        if (audioInitialized && !musicPlaying) {
            // 重新開始播放背景音樂
            startBackgroundMusic();
            console.log('背景音樂已恢復（重新開始播放）');
        }
    }
    function spawnPowerUp(x, y) {
        if (Math.random() < POWERUP_SPAWN_CHANCE) {
            const types = Object.keys(POWERUP_TYPES);
            const randomType = types[Math.floor(Math.random() * types.length)];

            // 確保道具不與物件重疊
            const powerUpX = x + (TILE_SIZE - POWERUP_SIZE) / 2;
            const powerUpY = y + (TILE_SIZE - POWERUP_SIZE) / 2;
            const newPowerUp = new PowerUp(powerUpX, powerUpY, randomType);

            let hasCollision = false;
            for (const wall of walls) {
                if (checkCollision(newPowerUp, wall)) {
                    hasCollision = true;
                    break;
                }
            }

            if (!hasCollision) {
                powerUps.push(newPowerUp);
            }
        }
    }

    function isPathClear(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const stepSize = TILE_SIZE / 4;
        const steps = Math.floor(distance / stepSize);
        if (steps < 2) return true;
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = point1.x + t * dx;
            const py = point1.y + t * dy;
            for (const wall of walls) {
                if (px >= wall.x && px <= wall.x + wall.width && py >= wall.y && py <= wall.y + wall.height) {
                    return false;
                }
            }
        }
        return true;
    }

    let isInitializing = false;
    function init(levelIndex, resetScore = false, forceStart = false) {
        if (isInitializing) return;
        isInitializing = true;

        try {
            console.log(`正在初始化關卡 ${levelIndex + 1}... (resetScore: ${resetScore}, forceStart: ${forceStart})`);
            keys = {}; enemies = []; bullets = []; walls = []; explosions = []; bushes = []; powerUps = []; base = null;

            // 如果是強制開始或是正在過關中，切換到 PLAYING
            if (forceStart || gameState === 'LEVEL_CLEAR') {
                gameState = 'PLAYING';
            }
            // 否則如果是初次載入且目前不是遊戲中，保持在 MENU
            else if (resetScore && levelIndex === 0 && gameState !== 'PLAYING') {
                gameState = 'MENU';
            }
            else {
                gameState = 'PLAYING';
            }

            pauseBtn.textContent = '暫停遊戲';

            if (audioInitialized) {
                stopBackgroundMusic();
            }

            if (resetScore) {
                playerLives = PLAYER_START_LIVES;
                playerScore = 0;
            }

            let layout;
            if (levelIndex < levelLayouts.length) {
                layout = levelLayouts[levelIndex];
            } else {
                const baseLayoutIndex = (levelIndex - levelLayouts.length) % levelLayouts.length;
                layout = generateVariationLevel(levelLayouts[baseLayoutIndex], levelIndex);
            }

            if (!layout) {
                console.error('關卡佈局未找到');
                layout = levelLayouts[0];
            }

            playerSpawnPos = { x: canvas.width / 2 - TILE_SIZE * 4, y: canvas.height - TILE_SIZE };
            player = new Player(playerSpawnPos.x, playerSpawnPos.y);

            for (let row = 0; row < MAP_HEIGHT_TILES; row++) {
                for (let col = 0; col < MAP_WIDTH_TILES; col++) {
                    const x = col * TILE_SIZE, y = row * TILE_SIZE;
                    const tileType = layout[row]?.[col];
                    if (tileType === 1) walls.push(new Wall(x, y, 'brick'));
                    else if (tileType === 2) walls.push(new Wall(x, y, 'steel'));
                    else if (tileType === 4) base = new Base(x, y);
                    else if (tileType === 5) bushes.push(new Bush(x, y));
                    else if (tileType === 3) { walls.push(new Wall(x, y, 'brick')); }
                }
            }

            // 重要：同步碰撞網格以供 AI 尋路使用
            if (typeof Enemy !== 'undefined' && Enemy.syncCollisionGrid) {
                Enemy.syncCollisionGrid();
            }

            spawnEnemies(levelIndex);
            console.log(`關卡 ${levelIndex + 1} 初始化成功`);
        } catch (error) {
            console.error('!!! 關卡初始化嚴重錯誤 !!!', error);
            gameState = 'MENU'; // 返回選單模式而不是遞迴重試
        } finally {
            isInitializing = false;
        }
    }

    // 程序化生成關卡變化
    function generateVariationLevel(baseLayout, levelIndex) {
        const variation = JSON.parse(JSON.stringify(baseLayout)); // 深度複製
        const variationFactor = (levelIndex - levelLayouts.length) + 1;

        for (let row = 1; row < MAP_HEIGHT_TILES - 3; row++) {
            for (let col = 1; col < MAP_WIDTH_TILES - 1; col++) {
                if (variation[row][col] === 0 && Math.random() < 0.1 * Math.min(variationFactor * 0.2, 0.4)) {
                    // 隨機添加障礙物
                    const obstacleType = Math.random() < 0.7 ? 1 : (Math.random() < 0.5 ? 2 : 5);
                    variation[row][col] = obstacleType;
                } else if ((variation[row][col] === 1 || variation[row][col] === 5) && Math.random() < 0.05) {
                    // 少量移除障礙物
                    variation[row][col] = 0;
                }
            }
        }

        return variation;
    }

    // =====================================================================
    // === spawnEnemies HAS BEEN REWRITTEN WITH CORRECTED DATA AND LOGIC ===
    // =====================================================================
    function spawnEnemies(levelIndex) {
        // 關卡敵人數量和難度調整
        const baseEnemyCount = 4;
        const enemyCount = Math.min(baseEnemyCount + Math.floor(levelIndex * 1.5), 12); // 最多12個敵人

        // 根據關卡調整強化敵人比例
        const toughEnemyRatio = Math.min(0.2 + (levelIndex * 0.15), 0.7); // 從20%遞增到最多70%
        const eliteEnemyRatio = Math.max(0, Math.min((levelIndex - 2) * 0.1, 0.3)); // 從第3關開始，最多30%

        // --- CORRECTED DATA: Spawn points are now in guaranteed open spaces ---
        const spawnPoints = [
            { x: 1.5 * TILE_SIZE, y: 1.5 * TILE_SIZE },  // Top-left
            { x: 9.5 * TILE_SIZE, y: 1.5 * TILE_SIZE },  // Top-center
            { x: 17.5 * TILE_SIZE, y: 1.5 * TILE_SIZE }, // Top-right
            { x: 1.5 * TILE_SIZE, y: 3.5 * TILE_SIZE },  // 增加更多生成點
            { x: 17.5 * TILE_SIZE, y: 3.5 * TILE_SIZE }  // 增加更多生成點
        ];
        let spawnAttempts = 0;
        let collisionFailures = 0;

        // Level 10 Boss Spawn
        if (levelIndex === 9) { // Level 10 (0-indexed 9)
            // Clean area for Boss
            const bossX = canvas.width / 2 - TILE_SIZE;
            const bossY = TILE_SIZE * 2;
            enemies.push(new BossTank(bossX, bossY));
            return; // Only spawn boss? Or boss + minions? Let's spawn just Boss and some minions.
        }

        while (enemies.length < enemyCount && spawnAttempts < 300) {
            // --- CORRECTED LOGIC: Rotate through spawn points on every ATTEMPT, not every SUCCESS ---
            const spawnPoint = spawnPoints[spawnAttempts % spawnPoints.length];
            // 減少隨機偏移以確保更安全的生成位置
            const jitterRange = TILE_SIZE / 4; // 減少隨機範圍
            const x = spawnPoint.x + (Math.random() - 0.5) * jitterRange;
            const y = spawnPoint.y + (Math.random() - 0.5) * jitterRange;

            // 確保在邊界內
            const clampedX = Math.max(0, Math.min(x, canvas.width - TANK_SIZE));
            const clampedY = Math.max(0, Math.min(y, canvas.height - TANK_SIZE));

            // 智能敵人類型選擇（三種類型）
            let enemyType;
            const rand = Math.random();
            if (rand < eliteEnemyRatio) {
                enemyType = ENEMY_TYPES.ELITE; // 精英敵人
            } else if (rand < eliteEnemyRatio + toughEnemyRatio) {
                enemyType = ENEMY_TYPES.TOUGH; // 強化敵人
            } else {
                enemyType = ENEMY_TYPES.NORMAL; // 普通敵人
            }
            const newEnemy = new Enemy(clampedX, clampedY, enemyType);

            let hasCollision = false;
            const allObstacles = [player, ...enemies, ...walls, base];
            for (const obstacle of allObstacles) {
                if (obstacle && checkCollision(newEnemy, obstacle)) {
                    hasCollision = true;
                    collisionFailures++;
                    break;
                }
            }

            if (!hasCollision) {
                // 雙重驗證：確保新坦克沒有被嵌入
                if (!newEnemy.isEmbedded()) {
                    enemies.push(newEnemy);
                    console.log(`Successfully spawned enemy at (${clampedX}, ${clampedY})`);
                } else {
                    console.warn(`Enemy would be embedded at (${clampedX}, ${clampedY}), trying another position`);
                    collisionFailures++;
                }
            }

            spawnAttempts++;
        }

        console.log(`關卡 ${levelIndex + 1}: 生成 ${enemies.length} 個敵人 (強化敵人比例: ${Math.round(toughEnemyRatio * 100)}%, 精英敵人比例: ${Math.round(eliteEnemyRatio * 100)}%)`);

        // 緊急備用方案
        if (enemies.length === 0) {
            console.warn('沒有成功生成敵人，啟動緊急備用方案');
            const emergencySpawn = { x: TILE_SIZE * 2, y: TILE_SIZE * 2 };
            const emergencyEnemy = new Enemy(emergencySpawn.x, emergencySpawn.y, ENEMY_TYPES.NORMAL);
            enemies.push(emergencyEnemy);
            console.log('緊急生成了一個敵人');
        }
    }



    class BossTank extends Enemy {
        constructor(x, y) {
            super(x, y, ENEMY_TYPES.ELITE);
            this.maxHealth = 30; this.health = 30;
            this.width = TANK_SIZE * 2; this.height = TANK_SIZE * 2;
            this.speed = TANK_SPEED * 0.4;
            this.color = { main: '#4a148c', accent: '#7c43bd', glow: 'rgba(123, 31, 162, 0.8)' };
        }
        draw(ctx) {
            super.draw(ctx);
            // Health bar
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x, this.y - 12, this.width, 6);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x, this.y - 12, this.width * (this.health / this.maxHealth), 6);
        }
        shoot() {
            if (this.shootCooldown > 0) return;
            const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
            let bx = cx - BULLET_SIZE / 2, by = cy - BULLET_SIZE / 2;
            switch (this.direction) {
                case 'up': by -= this.height / 2 + BULLET_SIZE; break;
                case 'down': by += this.height / 2; break;
                case 'left': bx -= this.width / 2 + BULLET_SIZE; break;
                case 'right': bx += this.width / 2; break;
            }
            bullets.push(new Bullet(bx, by, this.direction, this));
            this.shootCooldown = 40;
            playSound('SHOOT');
        }
    }

    function handleCollisions() {
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            let bulletRemoved = false;

            if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                bulletRemoved = true;
            } else if (base && !base.destroyed && checkCollision(bullet, base)) {
                base.destroyed = true; gameState = 'GAME_OVER';
                createExplosion(base.x + TILE_SIZE / 2, base.y + TILE_SIZE / 2, TILE_SIZE * 2, 'tank');
                bulletRemoved = true;
                stopBackgroundMusic();
                playSound('GAME_OVER');
            } else {
                // Check Walls
                // Note: Piercing bullets can destroy steel? No, let's say they penetrate tanks but stop at steel/walls for balance, 
                // OR penetrate brick but stop at steel. 
                // Let's make "Piercing" penetrate TANKS only for now, and standard wall logic.
                // Actually, let's allow piercing bullets to destroy multiple bricks?
                // For simplicity: Bullet stops at wall.
                for (let j = walls.length - 1; j >= 0; j--) {
                    const wall = walls[j];
                    if (checkCollision(bullet, wall)) {
                        if (wall.type === 'brick' || (wall.type === 'steel' && bullet.damage >= 2)) { // Future: heavy bullets
                            walls.splice(j, 1);
                            Enemy.syncCollisionGrid(); // 更新尋路網格
                            if (bullet.owner instanceof Player) addScore(POINTS.BRICK_DESTROY);
                            playSound('EXPLOSION');
                        } else if (wall.type === 'steel') {
                            playSound('MetalHit'); // We don't have this sound yet, use EXPLOSION
                        }
                        bulletRemoved = true;
                        break; // Stop checking walls
                    }
                }

                if (!bulletRemoved && bullet.owner instanceof Player) {
                    for (let j = enemies.length - 1; j >= 0; j--) {
                        const enemy = enemies[j];
                        // If piercing, check if already hit this enemy
                        if (bullet.type === 'piercing' && bullet.hitList.includes(enemy)) continue;

                        if (checkCollision(bullet, enemy)) {
                            createExplosion(enemy.x + TANK_SIZE / 2, enemy.y + TANK_SIZE / 2, TANK_SIZE, 'tank');
                            enemy.takeDamage(bullet.damage);

                            if (bullet.type === 'piercing') {
                                bullet.hitList.push(enemy); // Mark as hit
                                // Don't remove bullet!
                            } else {
                                bulletRemoved = true;
                            }

                            if (enemy.health <= 0) {
                                let points = (enemy.maxHealth === 1) ? POINTS.ENEMY_NORMAL : POINTS.ENEMY_TOUGH;
                                if (enemy instanceof BossTank) points = 5000; // Boss points
                                addScore(points);
                                spawnPowerUp(enemy.x, enemy.y);
                                playSound('ENEMY_DESTROY');
                                enemies.splice(j, 1);
                            } else {
                                playSound('EXPLOSION');
                            }

                            if (bulletRemoved) break; // Stop checking enemies if bullet gone
                        }
                    }
                } else if (!bulletRemoved && bullet.owner instanceof Enemy) {
                    if (player && checkCollision(bullet, player) && !player.invincible && !player.starInvincible) {
                        if (player.armor) {
                            player.armor = false;
                            player.armorTimer = 0;
                            createExplosion(player.x + TANK_SIZE / 2, player.y + TANK_SIZE / 2, TANK_SIZE / 2, 'armor');
                            bulletRemoved = true;
                            playSound('EXPLOSION');
                        } else {
                            createExplosion(player.x + TANK_SIZE / 2, player.y + TANK_SIZE / 2, TANK_SIZE, 'tank');
                            playerLives--;
                            if (playerLives > 0) {
                                player.respawn();
                                playSound('PLAYER_HIT');
                            } else {
                                gameState = 'GAME_OVER';
                                stopBackgroundMusic();
                                playSound('GAME_OVER');
                            }
                            bulletRemoved = true;
                        }
                    }
                }
            }

            if (bulletRemoved) {
                bullets.splice(i, 1);
            }
        }

        // 道具收集碰撞檢測 (Moved outside Bullet loop)
        for (let j = powerUps.length - 1; j >= 0; j--) {
            const powerUp = powerUps[j];
            if (player && checkCollision(player, powerUp)) {
                player.activatePowerUp(powerUp.type);
                addScore(powerUp.config.points);
                createExplosion(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, POWERUP_SIZE / 2, 'powerup');
                powerUps.splice(j, 1);
                playSound('POWERUP_COLLECT');
            } else if (powerUp.isExpired()) {
                powerUps.splice(j, 1);
            }
        }
    }

    function update(timeScale = 1) {
        if (gameState !== 'PLAYING') return;

        gameFrame++; // 增加幀數計數器

        if (player) player.update(timeScale);
        enemies.forEach(e => e.update(timeScale));
        bullets.forEach(b => b.update(timeScale));
        powerUps.forEach(p => p.update(timeScale));
        explosions.forEach((e, index) => {
            e.update(timeScale);
            if (e.life <= 0) explosions.splice(index, 1);
        });
        particles.forEach((p, index) => {
            p.update(timeScale);
            if (p.life <= 0) particles.splice(index, 1);
        });

        handleCollisions(); // Collision handling is instantaneous, usually fine without timeScale unless complex physics

        // 全域防嵌入檢查（每30幀執行一次 -> Use generic counter or time）
        // Keep using gameFrame for simplicity as "periodic check"
        if (gameFrame % 30 === 0) {
            performGlobalEmbeddingCheck();
        }

        if (enemies.length === 0 && gameState === 'PLAYING') {
            // 關卡完成獎勵
            addScore(POINTS.LEVEL_COMPLETE + (currentLevel * 500));
            gameState = 'LEVEL_CLEAR';
            // 播放關卡完成音效
            playMelody([523, 659, 784, 1047], 0.3); // C-E-G-C 和弦
        }
    }

    // 全域防嵌入檢查系統
    function performGlobalEmbeddingCheck() {
        const allTanks = [player, ...enemies].filter(tank => tank !== null && tank !== undefined);

        for (const tank of allTanks) {
            if (tank.isEmbedded()) {
                console.warn(`Global check: Tank at (${tank.x}, ${tank.y}) is embedded, attempting to fix...`);
                if (!tank.unstickFromObstacles()) {
                    console.error(`Failed to unstick tank globally, may need manual intervention`);
                    // 為敵人坦克嘗試強制重置
                    if (tank instanceof Enemy) {
                        tank.forceRepositionToSafeLocation();
                    }
                }
            }
        }
    }

    function draw() {
        // 確保畫布清空
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 網格背景動畫
        drawAnimatedBackground(ctx);

        // 螢幕抖動效果
        if (screenShake.duration > 0) {
            screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
            screenShake.duration--;
            ctx.save();
            ctx.translate(screenShake.x, screenShake.y);
        }

        if (base) base.draw(ctx);
        walls.forEach(w => w.draw(ctx));
        powerUps.forEach(p => p.draw(ctx));
        if (player) player.draw(ctx);
        enemies.forEach(e => e.draw(ctx));
        explosions.forEach(e => e.draw(ctx)); // Updated in main update()
        bushes.forEach(b => b.draw(ctx));
        bullets.forEach(b => b.draw(ctx));

        // 粒子效果 - 已移至 update()
        particles.forEach(p => p.draw(ctx));

        if (screenShake.duration > 0) ctx.restore();

        drawUI(ctx);

        if (gameState === 'LEVEL_CLEAR') { drawMessageScreen('LEVEL CLEAR', 'Press Enter or Click to Start Next Level', 'white'); }
        else if (gameState === 'GAME_OVER') { drawMessageScreen('GAME OVER', 'Press Enter or Click to Restart', 'red', 70); }
        else if (gameState === 'PAUSED') { drawMessageScreen('PAUSED', 'Press Pause button to continue', '#00bcd4'); }
        else if (gameState === 'MENU') { drawMessageScreen('TANK BATTLE', 'Click "Start Game" to begin', '#00e676', 60); }
    }

    function drawAnimatedBackground(ctx) {
        if (!VISUAL_EFFECTS.BACKGROUND_ANIMATION) {
            ctx.fillStyle = COLORS.BACKGROUND.main;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // 游式背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, COLORS.BACKGROUND.main);
        gradient.addColorStop(1, COLORS.BACKGROUND.accent);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 動畫網格
        backgroundOffset += 0.5;
        ctx.strokeStyle = COLORS.BACKGROUND.grid;
        ctx.lineWidth = 1;

        const gridSize = TILE_SIZE;
        for (let x = -gridSize + (backgroundOffset % gridSize); x < canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }

        for (let y = -gridSize + (backgroundOffset % gridSize); y < canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    function drawMessageScreen(title, subtitle, color, titleSize = 50) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = color; ctx.font = `${titleSize}px "Courier New", Courier, monospace`;
        ctx.textAlign = 'center'; ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 20);
        if (subtitle) { ctx.font = '30px "Courier New", Courier, monospace'; ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 40); }
    }

    function drawUI(ctx) {
        ctx.fillStyle = COLORS.UI.main;
        ctx.font = '22px "Courier New", Courier, monospace';
        ctx.textAlign = 'left';

        // 生命顯示
        drawTankBody(ctx, 15, 15, TANK_SIZE * 0.6, 'up', COLORS.PLAYER);
        ctx.fillText('x ' + playerLives, 50, 35);

        let yOffset = 125;

        // 無敵狀態指示
        if (player && player.invincible) {
            ctx.fillStyle = COLORS.UI.accent;
            ctx.font = '18px "Courier New", Courier, monospace';
            const timeLeft = Math.ceil(player.invincibilityTimer / 60);
            ctx.fillText('重生無敵: ' + timeLeft + 's', 15, yOffset);
            yOffset += 25;
        }

        // 道具效果指示
        if (player) {
            ctx.font = '18px "Courier New", Courier, monospace';

            if (player.rapidFire) {
                ctx.fillStyle = COLORS.UI.danger;
                const timeLeft = Math.ceil(player.rapidFireTimer / 60);
                ctx.fillText('快速射擊: ' + timeLeft + 's', 15, yOffset);
                yOffset += 25;
            }

            if (player.armor) {
                ctx.fillStyle = COLORS.UI.accent;
                const timeLeft = Math.ceil(player.armorTimer / 60);
                ctx.fillText('護甲: ' + timeLeft + 's', 15, yOffset);
                yOffset += 25;
            }

            if (player.starInvincible) {
                ctx.fillStyle = COLORS.UI.warning;
                const timeLeft = Math.ceil(player.starInvincibleTimer / 60);
                ctx.fillText('無敵星星: ' + timeLeft + 's', 15, yOffset);
                yOffset += 25;
            }
        }

        // 分數顯示
        ctx.fillStyle = COLORS.UI.main;
        ctx.font = '22px "Courier New", Courier, monospace';
        ctx.fillText('分數: ' + playerScore.toLocaleString(), 15, 65);

        // 最高分顯示
        ctx.fillStyle = COLORS.UI.warning;
        ctx.fillText('最高: ' + highScore.toLocaleString(), 15, 95);

        // 關卡顯示
        ctx.fillStyle = COLORS.UI.main;
        ctx.textAlign = 'right';
        ctx.fillText('關卡 ' + (currentLevel + 1), canvas.width - 15, 35);

        // 敵人剩餘數量顯示（增強版）
        ctx.fillStyle = COLORS.UI.danger;
        ctx.font = '20px "Courier New", Courier, monospace';
        ctx.fillText('敵人: ' + enemies.length, canvas.width - 15, 65);

        // 統計不同類型敵人數量
        const enemyTypes = { normal: 0, tough: 0, elite: 0 };
        enemies.forEach(enemy => {
            if (enemy.maxHealth === 2) enemyTypes.normal++;
            else if (enemy.maxHealth === 3) enemyTypes.tough++;
            else if (enemy.maxHealth >= 4) enemyTypes.elite++;
        });

        // 顯示敵人類型分佈（只在有多種類型時顯示）
        let typeCount = 0;
        if (enemyTypes.normal > 0) typeCount++;
        if (enemyTypes.tough > 0) typeCount++;
        if (enemyTypes.elite > 0) typeCount++;

        if (typeCount > 1) {
            ctx.font = '14px "Courier New", Courier, monospace';
            let yPos = 85;

            if (enemyTypes.normal > 0) {
                ctx.fillStyle = COLORS.ENEMY_NORMAL.main;
                ctx.fillText('普通: ' + enemyTypes.normal, canvas.width - 15, yPos);
                drawTankBody(ctx, canvas.width - 35, yPos - 12, TANK_SIZE * 0.3, 'down', COLORS.ENEMY_NORMAL);
                yPos += 18;
            }

            if (enemyTypes.tough > 0) {
                ctx.fillStyle = COLORS.ENEMY_TOUGH.main;
                ctx.fillText('強化: ' + enemyTypes.tough, canvas.width - 15, yPos);
                drawTankBody(ctx, canvas.width - 35, yPos - 12, TANK_SIZE * 0.3, 'down', COLORS.ENEMY_TOUGH);
                yPos += 18;
            }

            if (enemyTypes.elite > 0) {
                const eliteColors = { main: '#ff1744', accent: '#d50000', glow: 'rgba(255, 23, 68, 0.4)' };
                ctx.fillStyle = eliteColors.main;
                ctx.fillText('精英: ' + enemyTypes.elite, canvas.width - 15, yPos);
                drawTankBody(ctx, canvas.width - 35, yPos - 12, TANK_SIZE * 0.3, 'down', eliteColors);
            }
        } else if (enemies.length > 0) {
            // 只有一種類型敵人時，顯示對應的圖示
            if (enemyTypes.normal > 0) {
                drawTankBody(ctx, canvas.width - 45, 45, TANK_SIZE * 0.5, 'down', COLORS.ENEMY_NORMAL);
            } else if (enemyTypes.tough > 0) {
                drawTankBody(ctx, canvas.width - 45, 45, TANK_SIZE * 0.5, 'down', COLORS.ENEMY_TOUGH);
            } else if (enemyTypes.elite > 0) {
                const eliteColors = { main: '#ff1744', accent: '#d50000', glow: 'rgba(255, 23, 68, 0.4)' };
                drawTankBody(ctx, canvas.width - 45, 45, TANK_SIZE * 0.5, 'down', eliteColors);
            }
        }

        // AI狀態面板（只在有敵人時且開啟顯示時顯示）
        if (enemies.length > 0 && currentLevel > 0 && showAIStats) {
            drawAIStatsPanel(ctx);
        }
    }

    function drawAIStatsPanel(ctx) {
        const panelX = 10; // 移到左上角
        const panelY = 200; // 移到更低的位置，避免擋住生命和分數顯示
        const panelWidth = 130; // 縮小寬度
        const panelHeight = 80; // 縮小高度

        // 面板背景 - 降低透明度
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        ctx.strokeStyle = '#666666'; // 使用較淡的邊框
        ctx.lineWidth = 1;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

        // 標題 - 使用較小字體
        ctx.fillStyle = '#cccccc';
        ctx.font = '11px "Courier New", Courier, monospace';
        ctx.textAlign = 'left';
        ctx.fillText('AI狀態:', panelX + 3, panelY + 12);

        // 統計敵人狀態
        const states = {};

        enemies.forEach(enemy => {
            states[enemy.aiState] = (states[enemy.aiState] || 0) + 1;
        });

        let yOffset = panelY + 25;
        ctx.font = '10px "Courier New", Courier, monospace';

        // 只顯示主要狀態，使用簡短標籤
        Object.entries(states).forEach(([state, count]) => {
            let stateText;
            let color = '#cccccc';

            switch (state) {
                case 'SEEKING': stateText = '尋找'; break;
                case 'RETREATING': stateText = '撤退'; color = '#ffff88'; break;
                case 'AMBUSHING': stateText = '埋伏'; color = '#cc88ff'; break;
                case 'FLANKING': stateText = '包抄'; color = '#ffaa88'; break;
                case 'COORDINATED_ATTACK': stateText = '協攻'; color = '#ff8888'; break;
                case 'ESCAPING': stateText = '逃脫'; color = '#88ffff'; break;
                case 'MANEUVERING': stateText = '機動'; break;
                default: stateText = state.substring(0, 4); // 截斷長狀態名
            }

            ctx.fillStyle = color;
            ctx.fillText(`${stateText}:${count}`, panelX + 3, yOffset);
            yOffset += 12;
        });
    }

    let lastTime = 0;
    function gameLoop(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Cap deltaTime to prevent huge jumps (e.g. tab switching)
        // 60FPS target = 16.6ms
        // If dt > 100ms, cap it.
        const safeDt = Math.min(deltaTime, 100);

        // Calculate TimeScale (1.0 at 60FPS)
        const timeScale = safeDt / (1000 / 60);

        try {
            update(timeScale);
            draw();
        } catch (error) {
            console.error('遊戲主循環出錯:', error);
            // 嘗試在出錯時依然進入下一幀，或者停止循環
        }

        requestAnimationFrame(gameLoop);
    }

    // 初始化音效系統（第一次使用者互動時）
    canvas.addEventListener('click', function () {
        try {
            if (!audioInitialized) {
                initAudio(); // 初始化音效
            }

            if (gameState === 'LEVEL_CLEAR') {
                console.log(`進入下一關: ${currentLevel} -> ${currentLevel + 1}`);
                currentLevel++;
                init(currentLevel, false, true); // 強制開始下一關
            }
            else if (gameState === 'GAME_OVER') {
                console.log('重新開始遊戲');
                currentLevel = 0;
                init(currentLevel, true, true); // 強制開始新遊戲
            }
        } catch (error) {
            console.error('點擊事件錯誤:', error);
        }
    });

    startBtn.addEventListener('click', function (e) {
        e.target.blur(); // 移除焦點，防止空白鍵再次觸發按鈕
        if (!audioInitialized) { initAudio(); }

        if (gameState === 'MENU' || gameState === 'GAME_OVER' || gameState === 'LEVEL_CLEAR') {
            if (gameState === 'LEVEL_CLEAR') {
                currentLevel++;
                init(currentLevel, false, true);
            } else {
                currentLevel = 0;
                init(currentLevel, true, true);
            }
        } else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
            pauseBtn.textContent = '暫停遊戲';
            resumeBackgroundMusic();
        }
    });

    pauseBtn.addEventListener('click', function (e) {
        e.target.blur();
        if (!audioInitialized) { initAudio(); }
        if (gameState === 'PLAYING') {
            gameState = 'PAUSED';
            pauseBtn.textContent = '繼續遊戲';
            pauseBackgroundMusic();
        }
        else if (gameState === 'PAUSED') {
            gameState = 'PLAYING';
            pauseBtn.textContent = '暫停遊戲';
            resumeBackgroundMusic();
        }
    });

    endBtn.addEventListener('click', function (e) {
        e.target.blur();
        gameState = 'GAME_OVER';
        pauseBtn.textContent = '暫停遊戲';
        stopBackgroundMusic();
    });

    new InputHandler();

    // 嘗試自動初始化音效
    try {
        initAudio();
    } catch (error) {
        console.log('等待使用者互動來啟動音效');
    }

    console.log('Game Script Loaded and Initialized');
    init(currentLevel, true);
    requestAnimationFrame(gameLoop);
});
