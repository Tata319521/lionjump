/**
 * 第366夜 - 狮子大冒险（全环境动态背景版）
 */

let CONFIG = {};
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isGaming = false;
let score = 0;
let obstacles = [];
let frameId;
let player;
let bgManager; // 背景管理器
let obstacleTimer = 0; 
const MIN_GAP = 150; 

// --- 1. 背景管理类 ---
class BackgroundManager {
    constructor() {
        this.type = 'blue-sky';
        this.elements = [];
    }

    init() {
        this.type = 'horror';
        //const rand = Math.random();
        // 概率分布：恐怖(1%) > 烟花(5%) > 火山(14%) > 雪/风/阴/蓝天(各20%)
        /*
        if (rand < 0.01) this.type = 'horror';
        else if (rand < 0.06) this.type = 'fireworks';
        else if (rand < 0.20) this.type = 'volcano';
        else if (rand < 0.40) this.type = 'snow';
        else if (rand < 0.60) this.type = 'wind';
        else if (rand < 0.80) this.type = 'overcast';
        else this.type = 'blue-sky';
        */
        this.elements = [];
        // 初始化一些背景粒子（云、雪、灰烬等）
        for (let i = 0; i < 25; i++) {
            this.elements.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                s: Math.random() * 2 + 1, // 速度/大小
                c: Math.random() > 0.5 ? '#ff4500' : '#ff0000' // 颜色(火山用)
            });
        }
        // 更新CSS背景色
        this.updateCSS();
    }

    updateCSS() {
        const colors = {
            'blue-sky': 'linear-gradient(#87CEEB, #E0F7FA)',
            'overcast': 'linear-gradient(#708090, #2c3e50)',
            'snow': 'linear-gradient(#1a2a6c, #2c3e50)',
            'volcano': 'linear-gradient(#4a0e0e, #000000)',
            'wind': 'linear-gradient(#bdc3c7, #2c3e50)',
            'fireworks': 'linear-gradient(#000428, #004e92)',
            'horror': '#050000'
        };
        canvas.style.background = colors[this.type];
    }

    draw() {
        ctx.save();
        switch (this.type) {
            case 'blue-sky': this.drawClouds(); break;
            case 'snow': this.drawSnow(); break;
            case 'volcano': this.drawVolcano(); break;
            case 'wind': this.drawWind(); break;
            case 'fireworks': this.drawFireworks(); break;
            case 'horror': this.drawHorror(); break;
        }
        ctx.restore();
    }

    drawClouds() {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        this.elements.forEach(c => {
            c.x += c.s * 0.3;
            if (c.x > canvas.width) c.x = -60;
            ctx.beginPath();
            ctx.arc(c.x, c.y % 200, 20 * c.s, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawSnow() {
        ctx.fillStyle = "#FFF";
        this.elements.forEach(s => {
            s.y += s.s;
            s.x += Math.sin(s.y / 20);
            if (s.y > canvas.height) s.y = -10;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    drawVolcano() {
        this.elements.forEach(a => {
            a.y -= a.s * 2;
            a.x += (Math.random() - 0.5) * 4;
            if (a.y < 0) a.y = canvas.height;
            ctx.fillStyle = a.c;
            ctx.fillRect(a.x, a.y, 3, 3);
            ctx.shadowBlur = 10; ctx.shadowColor = "red";
        });
    }

    drawWind() {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        this.elements.forEach(w => {
            w.x += w.s * 15;
            if (w.x > canvas.width) w.x = -100;
            ctx.beginPath();
            ctx.moveTo(w.x, w.y);
            ctx.lineTo(w.x + 50, w.y);
            ctx.stroke();
        });
    }

    drawFireworks() {
        if (Math.random() < 0.05) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * (canvas.height / 2);
            ctx.font = "30px Arial";
            ctx.fillText("✨", x, y);
        }
    }

    drawHorror() {
        // 将 0.08 改成 0.5，红字会像下雨一样闪现
        if (Math.random() < 0.5) { 
            ctx.fillStyle = "rgba(255, 0, 0, 0.6)"; // 颜色加深
            ctx.font = "bold 20px Courier";
            ctx.fillText("STAY", Math.random() * canvas.width, Math.random() * canvas.height);
        }
        
        // 增加屏幕剧烈闪烁效果
        if (Math.random() < 0.1) {
            canvas.style.filter = "invert(100%)"; // 偶尔画面反色，非常吓人
        } else {
            canvas.style.filter = "none";
        }
    }
}

// --- 2. 玩家类 ---
class Player {
    constructor() {
        this.w = 50; this.h = 50; this.x = 60;
        this.reset();
    }
    reset() {
        this.y = canvas.height - 150;
        this.dy = 0; this.grounded = false; this.angle = 0;
        this.isCrying = false; this.cryScale = 1.0;
    }
    jump() {
        if (this.grounded && !this.isCrying) {
            this.dy = CONFIG.gameConfig.jumpPower;
            this.grounded = false;
        }
    }
    update() {
        if (this.isCrying) {
            if (this.cryScale > 0.8) this.cryScale -= 0.01;
            return;
        }
        this.dy += CONFIG.gameConfig.gravity;
        this.y += this.dy;
        const groundLevel = canvas.height - 100;
        if (this.y + this.h > groundLevel) {
            this.y = groundLevel - this.h; this.dy = 0; this.grounded = true; this.angle = 0;
        } else { this.angle += 0.15; }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        if (this.isCrying) {
            const shake = Math.sin(Date.now() / 30) * 3;
            ctx.scale(this.cryScale, this.cryScale);
            ctx.font = "60px Arial"; ctx.fillText("😭", shake, shake);
        } else {
            if (this.angle !== 0) ctx.rotate(this.angle);
            ctx.font = "45px Arial"; ctx.fillText("🦁", 0, 0);
        }
        ctx.restore();
    }
}

// --- 3. 障碍物类 ---
class Obstacle {
    constructor() {
        this.w = 35; this.h = 35; this.x = canvas.width;
        this.y = canvas.height - 100 - this.h;
        this.speed = CONFIG.gameConfig.obstacleSpeed;
        const types = ["🌵", "🔥", "🚧", "🧊"];
        this.type = types[Math.floor(Math.random() * types.length)];
    }
    update() { this.x -= this.speed; }
    draw() { ctx.font = "30px Arial"; ctx.fillText(this.type, this.x, this.y + 28); }
}

// --- 4. 辅助函数 ---
function updateProgressBar() {
    const target = CONFIG.gameConfig.targetScore;
    const percentage = Math.min(Math.floor((score / target) * 100), 100);
    const fill = document.getElementById('progress-fill');
    const pctTxt = document.getElementById('percent');
    const container = document.getElementById('progress-bar-container');
    if (fill && pctTxt) {
        fill.style.width = percentage + '%';
        pctTxt.innerText = percentage;
        if (percentage >= 80) container.classList.add('pulse-animation');
        else container.classList.remove('pulse-animation');
    }
}

async function init() {
    try {
        const response = await fetch('config.json');
        CONFIG = await response.json();
        player = new Player();
        bgManager = new BackgroundManager();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        setupEventListeners();
    } catch (e) { console.error("Init Error:", e); }
}

function resizeCanvas() {
    canvas.width = window.innerWidth > 500 ? 500 : window.innerWidth;
    canvas.height = window.innerHeight;
}

function setupEventListeners() {
    document.getElementById('start-btn').onclick = startGame;
    document.getElementById('submit-btn').onclick = handleLogic;
    window.addEventListener('keydown', (e) => {
        if (isGaming && (e.code === 'Space' || e.code === 'ArrowUp')) {
            player.jump(); e.preventDefault();
        }
    });
    canvas.addEventListener('touchstart', (e) => {
        if (isGaming) { player.jump(); e.preventDefault(); }
    }, { passive: false });
}

function startGame() {
    isGaming = true; score = 0; obstacles = []; obstacleTimer = 0;
    player.reset();
    bgManager.init(); // 随机生成背景
    updateProgressBar();
    document.querySelectorAll('.screen, .ui-layer').forEach(s => s.classList.add('hidden'));
    loop();
}

function loop() {
    if (!isGaming) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    bgManager.draw(); // 绘制背景层

    // 绘制地面
    ctx.fillStyle = "#2c3e50";
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    player.update();
    player.draw();

    obstacleTimer++;
    if (obstacleTimer > (MIN_GAP / CONFIG.gameConfig.obstacleSpeed)) {
        if (Math.random() < 0.05) {
            obstacles.push(new Obstacle());
            obstacleTimer = 0;
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.update(); obs.draw();

        // 碰撞检测
        const p = 12;
        if (player.x + p < obs.x + obs.w - p && player.x + player.w - p > obs.x + p &&
            player.y + p < obs.y + obs.h - p && player.y + player.h - p > obs.y + p) {
            handleCollision();
            return;
        }
        if (obs.x + obs.w < 0) {
            obstacles.splice(i, 1);
            score++; updateProgressBar();
        }
    }

    if (score >= CONFIG.gameConfig.targetScore) { triggerStory(); return; }
    frameId = requestAnimationFrame(loop);
}

function handleCollision() {
    isGaming = false;
    cancelAnimationFrame(frameId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2c3e50"; ctx.fillRect(0, canvas.height - 100, canvas.width, 100);

    if (score < CONFIG.gameConfig.targetScore) {
        player.isCrying = true;
        player.draw();
        setTimeout(() => {
            document.getElementById('fail-screen').classList.remove('hidden');
        }, 600);
    } else {
        triggerStory();
    }
}

function triggerStory() {
    isGaming = false; cancelAnimationFrame(frameId);
    document.body.classList.add('glitch-anim');
    setTimeout(() => {
        document.body.classList.remove('glitch-anim');
        document.getElementById('dialog-screen').classList.remove('hidden');
        document.getElementById('npc-display').innerHTML = CONFIG.texts.npcInitial;
    }, 1000);
}

function handleLogic() {
    const val = document.getElementById('user-input').value.trim().toLowerCase();
    const res = document.getElementById('result-screen');
    document.getElementById('dialog-screen').classList.add('hidden');
    res.classList.remove('hidden');

    let type = 'default';
    if (CONFIG.texts.loveKeywords.some(k => val.includes(k))) {
        type = 'love'; res.className = 'screen ending-love';
    } else if (CONFIG.texts.friendKeywords.some(k => val.includes(k))) {
        type = 'friend'; res.className = 'screen ending-friend';
    }

    document.getElementById('result-title').innerText = CONFIG.endings[type].title;
    document.getElementById('result-content').innerHTML = CONFIG.endings[type].content;
    const icons = { love: "🦁❤️🦒", friend: "🦁🤝💰", default: "🦁🚀" };
    document.getElementById('result-icon').innerHTML = `<div style="font-size:60px">${icons[type]}</div>`;
}

init();