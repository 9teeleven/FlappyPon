document.addEventListener('DOMContentLoaded', () => {
    // Elemen DOM
    const loadingScreen = document.getElementById('loadingScreen');
    const homeScreen = document.getElementById('homeScreen');
    const startButton = document.getElementById('startButton');
    const gameCanvas = document.getElementById('gameCanvas');
    const scoreDisplay = document.getElementById('scoreDisplay');
    const mathModal = document.getElementById('mathModal');
    const questionEl = document.getElementById('question');
    const answerOptionsEl = document.getElementById('answerOptions');
    const startMessage = document.getElementById('startMessage');
    const ctx = gameCanvas.getContext('2d');

    // Aset Gambar
    const assets = {
        bird: new Image(), background: new Image(),
        pipeTop: new Image(), pipeBottom: new Image(),
        ground: new Image(),
    };
    assets.bird.src = 'assets/bird.png';
    assets.background.src = 'assets/background.png';
    assets.pipeTop.src = 'assets/pipe-top.png';
    assets.pipeBottom.src = 'assets/pipe-bottom.png';
    assets.ground.src = 'assets/tiles.png';

    let assetsLoaded = 0;
    const totalAssets = Object.keys(assets).length;

    function assetLoadedCallback(assetName, status) {
        if (status === 'error') {
            console.error(`Gagal memuat aset: ${assetName}`);
        }
        assetsLoaded++;
        if (assetsLoaded === totalAssets) {
            loadingScreen.style.display = 'none';
            homeScreen.style.display = 'flex';
        }
    }

    for (const key in assets) {
        assets[key].onload = () => assetLoadedCallback(key, 'success');
        assets[key].onerror = () => assetLoadedCallback(key, 'error');
    }

    // Game Variables
    let bird, pipes, score = 0, gameOver, gameLoopId, currentCorrectAnswer;
    let waitingForFirstFlap = true;
    const gravity = 800; // pixel/s²
    const flapStrength = -300; // pixel/s
    let pipeWidth;
    const pipeGap = 150;
    const pipeSpeed = 120; // pixel/s
    const pipeInterval = 1500; // ms
    let timeSinceLastPipe = 0;
    let groundX = 0;
    const groundHeight = 112;
    let lastTimestamp = 0;

    // Bank Soal
    let questionBank = [
        { q: "Hasil dari <strong>2<sup>4</sup></strong> adalah...", o: [8, 16, 6, 32], a: 16 },
        { q: "Hasil dari <strong>5<sup>3</sup></strong> adalah...", o: [15, 25, 125, 53], a: 125 },
        { q: "Hasil dari <strong>10<sup>3</sup></strong> adalah...", o: [30, 100, 300, 1000], a: 1000 },
        { q: "Bentuk sederhana dari <strong>3<sup>2</sup> &times; 3<sup>4</sup></strong> adalah...", o: ["3<sup>6</sup>", "3<sup>8</sup>", "9<sup>6</sup>", "9<sup>8</sup>"], a: "3<sup>6</sup>" },
        { q: "Bentuk sederhana dari <strong>7<sup>5</sup> &times; 7<sup>2</sup></strong> adalah...", o: ["7<sup>10</sup>", "49<sup>7</sup>", "7<sup>3</sup>", "7<sup>7</sup>"], a: "7<sup>7</sup>" },
        { q: "Bentuk sederhana dari <strong>4<sup>8</sup> &divide; 4<sup>5</sup></strong> adalah...", o: ["4<sup>13</sup>", "1<sup>3</sup>", "4<sup>3</sup>", "4<sup>40</sup>"], a: "4<sup>3</sup>" },
        { q: "Bentuk sederhana dari <strong>9<sup>7</sup> &divide; 9<sup>3</sup></strong> adalah...", o: ["9<sup>4</sup>", "9<sup>10</sup>", "1<sup>4</sup>", "9<sup>21</sup>"], a: "9<sup>4</sup>" },
        { q: "Bentuk sederhana dari <strong>(2<sup>3</sup>)<sup>4</sup></strong> adalah...", o: ["2<sup>7</sup>", "2<sup>81</sup>", "8<sup>4</sup>", "2<sup>12</sup>"], a: "2<sup>12</sup>" },
        { q: "Bentuk sederhana dari <strong>(6<sup>5</sup>)<sup>3</sup></strong> adalah...", o: ["6<sup>8</sup>", "6<sup>15</sup>", "6<sup>125</sup>", "30<sup>3</sup>"], a: "6<sup>15</sup>" },
        { q: "Hasil dari <strong>(2 &times; 5)<sup>2</sup></strong> adalah...", o: [20, 100, 14, 49], a: 100 },
        { q: "Bilangan <strong>81</strong> jika diubah ke basis 3 adalah...", o: ["3<sup>3</sup>", "3<sup>5</sup>", "3<sup>4</sup>", "3<sup>9</sup>"], a: "3<sup>4</sup>" },
        { q: "Hasil dari <strong>1<sup>100</sup> + 100<sup>0</sup></strong> adalah...", o: [101, 1, 100, 2], a: 2 },
    ];
    let shuffledQuestions = [];
    let currentQuestionIndex = 0;

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    function startGame(keepScore = false) {
        homeScreen.style.display = 'none';
        gameCanvas.style.display = 'block';
        scoreDisplay.style.display = 'block';
        startMessage.style.display = 'block';

        gameCanvas.width = 360;
        gameCanvas.height = 640;
        pipeWidth = assets.pipeTop.width;

        if (!keepScore) {
            score = 0;
            shuffleArray(questionBank);
            shuffledQuestions = [...questionBank];
            currentQuestionIndex = 0;
        }
        scoreDisplay.textContent = score;

        bird = {
            x: 60, y: 250,
            width: 40, height: 40,
            velocityY: 0,
            sprite: assets.bird,
            frameWidth: 16,
            frameHeight: 16,
            frameCount: 4,
            currentFrame: 0,
            animationCounter: 0,
            frameSpeed: 6
        };

        pipes = [];
        gameOver = false;
        waitingForFirstFlap = true;
        timeSinceLastPipe = 0;
        groundX = 0;
        lastTimestamp = 0;

        if (gameLoopId) cancelAnimationFrame(gameLoopId);
        gameLoop();

        document.addEventListener('keydown', handleFlap);
        gameCanvas.addEventListener('mousedown', handleFlap);
    }

    function handleFlap(e) {
        if (e.code === 'Space' || e.type === 'mousedown') {
            if (gameOver) return;
            if (waitingForFirstFlap) {
                waitingForFirstFlap = false;
                startMessage.style.display = 'none';
                addPipe();
            }
            bird.velocityY = flapStrength;
        }
    }

    function addPipe() {
        const minHeight = 80;
        const maxHeight = gameCanvas.height - pipeGap - groundHeight - minHeight;
        const topPipeHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
        pipes.push({ x: gameCanvas.width, topHeight: topPipeHeight, passed: false });
    }

    function gameLoop(timestamp) {
        if (gameOver) return;

        if (!lastTimestamp) lastTimestamp = timestamp;
        const deltaTime = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        update(deltaTime);
        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function update(deltaTime) {
        bird.animationCounter++;
        if (bird.animationCounter >= bird.frameSpeed) {
            bird.animationCounter = 0;
            bird.currentFrame = (bird.currentFrame + 1) % bird.frameCount;
        }

        if (waitingForFirstFlap) return;

        bird.velocityY += gravity * deltaTime;
        bird.y += bird.velocityY * deltaTime;

        groundX -= pipeSpeed * deltaTime;
        if (groundX <= -gameCanvas.width) {
            groundX = 0;
        }

        if (bird.y < 0 || bird.y + bird.height > gameCanvas.height - groundHeight) {
            return endGame();
        }

        timeSinceLastPipe += deltaTime * 1000;
        if (timeSinceLastPipe >= pipeInterval) {
            addPipe();
            timeSinceLastPipe = 0;
        }

        pipes.forEach(pipe => {
            pipe.x -= pipeSpeed * deltaTime;

            const topPipeBottomY = pipe.topHeight;
            const bottomPipeTopY = pipe.topHeight + pipeGap;

            if (bird.x < pipe.x + pipeWidth && bird.x + bird.width > pipe.x &&
                (bird.y < topPipeBottomY || bird.y + bird.height > bottomPipeTopY)) {
                return endGame();
            }

            if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
                score++;
                pipe.passed = true;
                scoreDisplay.textContent = score;
            }
        });
        pipes = pipes.filter(pipe => pipe.x + pipeWidth > 0);
    }

    function draw() {
        ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
        ctx.drawImage(assets.background, 0, 0, gameCanvas.width, gameCanvas.height);

        pipes.forEach(pipe => {
            const bottomPipeHeight = gameCanvas.height - pipe.topHeight - pipeGap - groundHeight;
            ctx.drawImage(assets.pipeTop, 0, assets.pipeTop.height - pipe.topHeight, pipeWidth, pipe.topHeight, pipe.x, 0, pipeWidth, pipe.topHeight);
            ctx.drawImage(assets.pipeBottom, 0, 0, pipeWidth, bottomPipeHeight, pipe.x, pipe.topHeight + pipeGap, pipeWidth, bottomPipeHeight);
        });

        ctx.drawImage(assets.ground, groundX, gameCanvas.height - groundHeight, gameCanvas.width, groundHeight);
        ctx.drawImage(assets.ground, groundX + gameCanvas.width, gameCanvas.height - groundHeight, gameCanvas.width, groundHeight);

        ctx.save();
        ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
        if (!waitingForFirstFlap) {
            ctx.rotate(Math.min(bird.velocityY / 300, Math.PI / 6));
        }
        const sourceX = bird.currentFrame * bird.frameWidth;
        ctx.drawImage(
            bird.sprite,
            sourceX, 0,
            bird.frameWidth, bird.frameHeight,
            -bird.width / 2, -bird.height / 2,
            bird.width, bird.height
        );
        ctx.restore();
    }

    function endGame() {
        gameOver = true;
        cancelAnimationFrame(gameLoopId);
        document.removeEventListener('keydown', handleFlap);
        gameCanvas.removeEventListener('mousedown', handleFlap);
        showMathQuiz();
    }

    function getNextQuestion() {
        if (currentQuestionIndex >= shuffledQuestions.length) {
            shuffleArray(shuffledQuestions);
            currentQuestionIndex = 0;
        }
        const question = shuffledQuestions[currentQuestionIndex];
        currentQuestionIndex++;
        return question;
    }

    function showMathQuiz() {
        const quiz = getNextQuestion();
        currentCorrectAnswer = quiz.a;
        questionEl.innerHTML = quiz.q;
        answerOptionsEl.innerHTML = '';

        const options = [...quiz.o];
        shuffleArray(options);

        options.forEach(option => {
            const button = document.createElement('button');
            button.innerHTML = option;
            button.classList.add('option-button');
            button.onclick = () => checkAnswer(option);
            answerOptionsEl.appendChild(button);
        });

        mathModal.style.display = 'flex';
    }

    function checkAnswer(selectedAnswer) {
        mathModal.style.display = 'none';
        if (selectedAnswer == currentCorrectAnswer) {
            startGame(true);
        } else {
            alert(`Jawaban salah! Jawaban yang benar adalah ${currentCorrectAnswer}. Skor direset.`);
            startGame(false);
        }
    }

    startButton.addEventListener('click', () => startGame(false));
});
