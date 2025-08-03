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
    
    // Aset Gambar (Pastikan semua file ini ada di folder yang sama)
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

    // Logika Pemuatan Aset
    let assetsLoaded = 0;
    const totalAssets = Object.keys(assets).length;

    function assetLoadedCallback(assetName, status) {
        if (status === 'error') {
            console.error(`Gagal memuat aset: ${assetName} dari URL ${assets[assetName].src}. Pastikan file ada di folder yang sama dan nama file sudah benar.`);
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

    // Pengaturan Game
    let bird, pipes, score = 0, gameOver, gameLoopId, currentCorrectAnswer;
    let waitingForFirstFlap = true;
    const gravity = 0.5;
    const flapStrength = -8;
    let pipeWidth; 
    const pipeGap = 150;
    const pipeSpeed = 2;
    const pipeInterval = 120;
    let frameCount = 0;
    
    // Pengaturan Tanah
    let groundX = 0;
    const groundHeight = 112;

    // BANK SOAL
    let questionBank = [
        { q: "Hasil dari <strong>5<sup>3</sup></strong> adalah...", o: [15, 25, 125, 53], a: 125 },
        { q: "Hasil dari <strong>10<sup>3</sup></strong> adalah...", o: [30, 100, 300, 1000], a: 1000 },
        { q: "Bentuk sederhana dari <strong>(2<sup>3</sup>)<sup>4</sup></strong> adalah...", o: ["2<sup>7</sup>", "2<sup>81</sup>", "8<sup>4</sup>", "2<sup>12</sup>"], a: "2<sup>12</sup>" },
        { q: "Bentuk sederhana dari <strong>(6<sup>5</sup>)<sup>3</sup></strong> adalah...", o: ["6<sup>8</sup>", "6<sup>15</sup>", "6<sup>125</sup>", "30<sup>3</sup>"], a: "6<sup>15</sup>" },
        { q: "Hasil dari <strong>(2 &times; 5)<sup>2</sup></strong> adalah...", o: [20, 100, 14, 49], a: 100 },
        { q: "Bilangan <strong>81</strong> jika diubah ke basis 3 adalah...", o: ["3<sup>3</sup>", "3<sup>5</sup>", "3<sup>4</sup>", "3<sup>9</sup>"], a: "3<sup>4</sup>" },
        { q: "Hasil dari <strong>1<sup>100</sup> + 100<sup>0</sup></strong> adalah...", o: [101, 1, 100, 2], a: 2 },
        { q: "Hasil dari <strong>3<sup>3</sup></strong> adalah...", o: [9, 27, 18, 33], a: 27 },
        { q: "Bentuk sederhana dari <strong>(p<sup>2</sup>q<sup>3</sup>)<sup>2</sup></strong> adalah...", o: ["p<sup>4</sup>q<sup>5</sup>", "p<sup>2</sup>q<sup>6</sup>", "p<sup>4</sup>q<sup>6</sup>", "p<sup>4</sup>q<sup>9</sup>"], a: "p<sup>4</sup>q<sup>6</sup>" },
        { q: "Bentuk sederhana dari <strong>a<sup>6</sup> &times; a</strong> adalah...", o: ["a<sup>6</sup>", "a<sup>7</sup>", "2a<sup>7</sup>", "a<sup>5</sup>"], a: "a<sup>7</sup>" },
        { q: "Hasil dari <strong>5<sup>-1</sup></strong> adalah...", o: [-5, "1/5", 5, 0.5], a: "1/5" },
        { q: "Bentuk sederhana dari <strong>(x<sup>10</sup>) &divide; (x<sup>5</sup>)</strong> adalah...", o: ["x<sup>2</sup>", "x<sup>15</sup>", "x<sup>5</sup>", "x<sup>50</sup>"], a: "x<sup>5</sup>" },
        { q: "Hasil dari <strong>2<sup>2</sup> + 2<sup>3</sup></strong> adalah...", o: [10, 12, 32, 25], a: 12 },
        { q: "Bilangan <strong>64</strong> jika diubah ke basis 4 adalah...", o: ["4<sup>2</sup>", "4<sup>4</sup>", "4<sup>3</sup>", "16<sup>2</sup>"], a: "4<sup>3</sup>" },
        { q: "Bentuk sederhana dari <strong>(y<sup>3</sup>z)<sup>5</sup></strong> adalah...", o: ["y<sup>8</sup>z<sup>5</sup>", "y<sup>15</sup>z", "y<sup>15</sup>z<sup>5</sup>", "y<sup>3</sup>z<sup>5</sup>"], a: "y<sup>15</sup>z<sup>5</sup>" },
        { q: "Hasil dari <strong>(1/2)<sup>3</sup></strong> adalah...", o: ["1/8", "1/6", "3/2", "3/8"], a: "1/8" },
        { q: "Bentuk sederhana dari <strong>√49</strong> adalah...", o: [6, 8, 7, 9], a: 7 },
        { q: "Bentuk lain dari <strong>√25</strong> adalah...", o: [4, 3, 5, 2], a: 5 },
        { q: "Bentuk sederhana dari <strong>√(4 × 9)</strong> adalah...", o: [6, 36, 12, 13], a: 6 },
        { q: "Hasil dari <strong>√64 + √36</strong> adalah...", o: [14, 16, 12, 10], a: 14 },
        { q: "Hasil dari <strong>√81 - √16</strong> adalah...", o: [7, 5, 9, 4], a: 5 },
        { q: "Hasil dari <strong>√49 × √4</strong> adalah...", o: [14, 28, 8, 7], a: 14 },
        { q: "Hasil dari <strong>√100 ÷ √25</strong> adalah...", o: [2, 4, 5, 10], a: 2 },
        { q: "Hasil dari <strong>2√9 + 3√4</strong> adalah...", o: [18, 12, 13, 15], a: 12 },
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
        frameCount = 0;
        groundX = 0;

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

    function gameLoop() {
        if (gameOver) return;
        update();
        draw();
        gameLoopId = requestAnimationFrame(gameLoop);
    }

    function update() {
        bird.animationCounter++;
        if (bird.animationCounter >= bird.frameSpeed) {
            bird.animationCounter = 0;
            bird.currentFrame = (bird.currentFrame + 1) % bird.frameCount;
        }

        if (waitingForFirstFlap) return;

        bird.velocityY += gravity;
        bird.y += bird.velocityY;
        
        groundX -= pipeSpeed;
        if (groundX <= -gameCanvas.width) {
            groundX = 0;
        }

        if (bird.y < 0 || bird.y + bird.height > gameCanvas.height - groundHeight) {
            return endGame();
        }

        frameCount++;
        if (frameCount % pipeInterval === 0) {
            addPipe();
        }

        pipes.forEach(pipe => {
            pipe.x -= pipeSpeed;
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

        // --- PERBAIKAN: Logika baru untuk menggambar pipa ---
        pipes.forEach(pipe => {
            const topPipeSourceY = assets.pipeTop.height - pipe.topHeight;
            const bottomPipeHeight = gameCanvas.height - pipe.topHeight - pipeGap - groundHeight;

            // Gambar pipa atas (mengambil potongan dari bawah gambar sumber)
            ctx.drawImage(assets.pipeTop, 0, topPipeSourceY, pipeWidth, pipe.topHeight, pipe.x, 0, pipeWidth, pipe.topHeight);
            
            // Gambar pipa bawah (mengambil potongan dari atas gambar sumber)
            ctx.drawImage(assets.pipeBottom, 0, 0, pipeWidth, bottomPipeHeight, pipe.x, pipe.topHeight + pipeGap, pipeWidth, bottomPipeHeight);
        });
        
        ctx.drawImage(assets.ground, groundX, gameCanvas.height - groundHeight, gameCanvas.width, groundHeight);
        ctx.drawImage(assets.ground, groundX + gameCanvas.width, gameCanvas.height - groundHeight, gameCanvas.width, groundHeight);

        ctx.save();
        ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
        if (!waitingForFirstFlap) {
            ctx.rotate(Math.min(bird.velocityY / 20, Math.PI / 6));
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



