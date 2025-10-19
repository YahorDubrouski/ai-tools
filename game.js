"use strict";

// Dodge the Blocks — Iteration 12 (safe spawn + small refactor)

(() => {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const restartBtn = document.getElementById("restartBtn");
    const lowDifficultyBtn = document.getElementById("lowDifficulty");
    const highDifficultyBtn = document.getElementById("highDifficulty");
    const difficultySelector = document.getElementById("difficultySelector");

    // ---- Constants
    const COLOR = {
        bg: "#0a0d22",
        text: "#e3e7ff",
        player: "#7cc6ff",
        obstacle: "#ff6b6b",
        panel: "#11183a",
        panelBorder: "#3a3f71",
    };
    const FONT = "16px system-ui, sans-serif";
    const MAX_DT = 0.05; // s cap to avoid giant jumps
    const PLAYER = { size: 20, speed: 300, floorMargin: 28 };
    const OBSTACLE = {
        w: 40, h: 20, speed: 180, spawnInterval: 0.9,
        safeSpawnMarginX: 28, // px horizontally around player to avoid
        topSafePad: 2        // px below the top
    };

    // ---- Difficulty
    let difficulty = "low"; // "low" or "high"
    
    function setDifficulty(newDifficulty) {
        difficulty = newDifficulty;
        lowDifficultyBtn.classList.toggle("active", difficulty === "low");
        highDifficultyBtn.classList.toggle("active", difficulty === "high");
    }

    // ---- Records (max score)
    let maxRecordSeconds = loadMaxRecord();
    function loadMaxRecord() {
        try {
            const v = localStorage.getItem('dodge_maxRecord');
            return v ? parseFloat(v) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }
    function saveMaxRecord() {
        try {
            localStorage.setItem('dodge_maxRecord', String(maxRecordSeconds));
        } catch (e) {
            // ignore
        }
    }

    // ---- Utils
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    function centerText(text, y) {
        const m = ctx.measureText(text);
        ctx.fillText(text, (canvas.width - m.width) / 2, y);
    }
    function rightText(text, y) {
        const m = ctx.measureText(text);
        ctx.fillText(text, canvas.width - m.width - 12, y);
    }

    // ---- Input
    const input = createInput();
    function createInput() {
        const state = { left: false, right: false };
        const preventScrollKeys = new Set(["ArrowLeft", "ArrowRight"]);
        const down = (e) => {
            if (preventScrollKeys.has(e.code)) e.preventDefault();
            if (e.code === "ArrowLeft" || e.code === "KeyA") state.left = true;
            if (e.code === "ArrowRight" || e.code === "KeyD") state.right = true;
            if (e.code === "Enter") tryStartGame();
            if (e.code === "KeyR") tryRestartGame();
        };
        const up = (e) => {
            if (preventScrollKeys.has(e.code)) e.preventDefault();
            if (e.code === "ArrowLeft" || e.code === "KeyA") state.left = false;
            if (e.code === "ArrowRight" || e.code === "KeyD") state.right = false;
        };
        window.addEventListener("keydown", down, { passive: false });
        window.addEventListener("keyup", up, { passive: false });
        restartBtn.addEventListener("click", tryRestartGame);
        lowDifficultyBtn.addEventListener("click", () => setDifficulty("low"));
        highDifficultyBtn.addEventListener("click", () => setDifficulty("high"));
        return {
            get left() { return state.left; },
            get right() { return state.right; }
        };
    }

    // ---- Player
    const player = createPlayer();
    function createPlayer() {
        const w = PLAYER.size, h = PLAYER.size;
        return {
            x: (canvas.width - w) / 2,
            y: canvas.height - h - PLAYER.floorMargin,
            w, h,
            speed: PLAYER.speed
        };
    }
    function resetPlayer(p) { p.x = (canvas.width - p.w) / 2; }
    function updatePlayer(p, dt) {
        let vx = 0;
        if (gameState === "playing") {
            if (input.left)  vx -= p.speed;
            if (input.right) vx += p.speed;
        }
        p.x = clamp(p.x + vx * dt, 0, canvas.width - p.w);
    }
    function drawPlayer(p) {
        ctx.fillStyle = COLOR.player;
        ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    // ---- Obstacles
    /** @type {{x:number,y:number,w:number,h:number,speed:number}[]} */
    const obstacles = [];
    let spawnTimer = 0;

    function spawnObstacle() {
        const w = OBSTACLE.w, h = OBSTACLE.h;
        const speed = difficulty === "high" ? OBSTACLE.speed * 3 : OBSTACLE.speed;

        // Avoid spawning directly over the player's horizontal band
        const safeLeft = player.x - OBSTACLE.safeSpawnMarginX;
        const safeRight = player.x + player.w + OBSTACLE.safeSpawnMarginX;

        const minX = 0, maxX = canvas.width - w;

        // Build allowed ranges [min, safeLeft - w] and [safeRight, max]
        const ranges = [];
        const leftMax = Math.floor(safeLeft - w);
        if (leftMax >= minX) ranges.push([minX, leftMax]);

        const rightMin = Math.ceil(safeRight);
        if (rightMin <= maxX) ranges.push([rightMin, maxX]);

        let x;
        if (ranges.length === 0) {
            // No safe gap (player spans almost entire width): fall back to anywhere
            x = randInt(minX, maxX);
        } else {
            const [rx0, rx1] = ranges[randInt(0, ranges.length - 1)];
            x = randInt(rx0, rx1);
        }

        const y = -h + OBSTACLE.topSafePad;
        obstacles.push({ x, y, w, h, speed });
    }
    function clearObstacles() { obstacles.length = 0; spawnTimer = 0; }
    function updateObstacles(dt) {
        if (gameState === "playing") {
            spawnTimer += dt;
            const spawnInterval = difficulty === "high" ? OBSTACLE.spawnInterval / 3 : OBSTACLE.spawnInterval;
            while (spawnTimer >= spawnInterval) {
                spawnTimer -= spawnInterval;
                spawnObstacle();
            }
        }
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const o = obstacles[i];
            o.y += o.speed * dt;
            if (o.y > canvas.height) obstacles.splice(i, 1);
        }
    }
    function drawObstacles() {
        ctx.fillStyle = COLOR.obstacle;
        for (const o of obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
    }

    // ---- Collision (AABB)
    const aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    function checkCollision() {
        for (const o of obstacles) if (aabb(player, o)) return true;
        return false;
    }

    // ---- Game state
    let lastTime = performance.now();
    /** @type {"ready"|"playing"|"gameover"} */
    let gameState = "ready";
    let scoreSeconds = 0;

    function tryStartGame() {
        if (gameState === "ready") {
            resetGame();
            setState("playing");
        }
    }
    function tryRestartGame() {
        if (gameState === "gameover") {
            resetGame();
            setState("playing");
        }
    }
    function resetGame() {
        resetPlayer(player);
        clearObstacles();
        scoreSeconds = 0;
        // Reset difficulty to low on game restart
        setDifficulty("low");
    }
    function setState(s) {
        // If transitioning to gameover, update max record if needed and persist
        if (s === "gameover") {
            if (scoreSeconds > maxRecordSeconds) {
                maxRecordSeconds = scoreSeconds;
                saveMaxRecord();
            }
        }
        gameState = s;
        restartBtn.hidden = s !== "gameover";
        difficultySelector.hidden = s === "playing";
    }

    // ---- Main loop
    function frame(now) {
        const dt = Math.min((now - lastTime) / 1000, MAX_DT);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(frame);
    }

    function update(dt) {
        updatePlayer(player, dt);
        updateObstacles(dt);

        if (gameState === "playing") {
            scoreSeconds += dt;
            if (checkCollision()) setState("gameover");
        }
    }

    function draw() {
        // clear
        ctx.fillStyle = COLOR.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // HUD
        ctx.fillStyle = COLOR.text;
        ctx.font = FONT;
        ctx.fillText(`Score: ${scoreSeconds.toFixed(1)}s`, 12, 24);
        if (gameState === "playing") {
            ctx.fillText(`Difficulty: ${difficulty.toUpperCase()}`, 12, 48);
        }
        // Draw max record, right-aligned
        rightText(`Max Record: ${maxRecordSeconds.toFixed(1)}s`, 24);

        // entities
        drawPlayer(player);
        drawObstacles();

        // overlays
        if (gameState === "ready") drawCenteredOverlay("DODGE THE BLOCKS", "Press Enter to Start", `Move with ← → or A/D | Difficulty: ${difficulty.toUpperCase()}`);
        if (gameState === "gameover") drawGameOverOverlay();
    }

    function drawCenteredOverlay(title, line1, line2) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = COLOR.panel;
        const w = canvas.width * 0.8, h = 140, x = (canvas.width - w) / 2, y = (canvas.height - h) / 2;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = COLOR.panelBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();

        ctx.fillStyle = COLOR.text;
        ctx.font = "bold 20px system-ui, sans-serif";
        centerText(title, canvas.height / 2 - 20);
        ctx.font = "16px system-ui, sans-serif";
        centerText(line1, canvas.height / 2 + 6);
        centerText(line2, canvas.height / 2 + 28);
    }

    function drawGameOverOverlay() {
        drawCenteredOverlay("GAME OVER", `Your score: ${scoreSeconds.toFixed(1)}s`, "Press R or click Restart");
    }

    // kick off
    requestAnimationFrame(frame);
})();
