// Game variables
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over');
const blackoutScreen = document.getElementById('blackout-screen');
const lyricsContainer = document.getElementById('lyrics-container');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const player = document.getElementById('player');
const gameContainer = document.querySelector('.game-container');
const scoreDisplay = document.getElementById('score');
const livesCountDisplay = document.getElementById('lives-count');
const finalScoreDisplay = document.getElementById('final-score');

let score = 0;
let lives = 3;
let gameActive = false;
let playerPosition = 50; // Percentage
const playerWidth = 8; // vw
const containerMargin = 2; // vw
let animationFrameId;
let foodElements = [];
let lyricTimeouts = [];

// Speed progression variables
let baseSpeed = 0.3; // vh per frame
let speedIncrement = 0.05;
let currentSpeed = baseSpeed;
let lastSpeedIncreaseAt = 0;

// Touch control variables
let touchStartX = null;
let isTouchDevice = false;

// Game over sequence variables
const gameOverLyrics = [
    { text: "...", time: 0 },
    { text: "Nandito ako umiibig sa'yo", time: 4000 },
    { text: "Kahit na nagdurugo ang puso", time: 11000 },
    { text: "At kung sakaling iwanan ka niya", time: 19000 },
    { text: "'Wag kang mag-alala,", time: 26000 },
    { text: "May nagmamahal sa 'yo", time: 30000 },
    { text: "Nandito ako", time: 33000 },
    { text: "...", time: 36000 }
];

// Initialize game
function initGame() {
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);
    document.addEventListener('keydown', handleKeyPress);
    
    // Touch controls
    setupTouchControls();
    
    // Reset all screens
    startScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    blackoutScreen.style.display = 'none';
    
    // Reset game state
    score = 0;
    lives = 3;
    
    // Clear any existing food
    clearAllFood();
}

// Setup touch controls
function setupTouchControls() {
    // Detect if device supports touch
    isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        // Add touch event listeners to the document for general controls
        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        // Add specific touch listener for the start button
        startBtn.addEventListener('touchstart', handleButtonTouch, { passive: true });
        restartBtn.addEventListener('touchstart', handleButtonTouch, { passive: true });
        
        // Create in-game touch controls
        createTouchControls();
    }
}

// Handle button touches
function handleButtonTouch(e) {
    e.preventDefault();
    if (e.target.id === 'start-btn') {
        startGame();
    } else if (e.target.id === 'restart-btn') {
        restartGame();
    }
}

function createTouchControls() {
    // Create left touch area
    const leftTouchArea = document.createElement('div');
    leftTouchArea.id = 'left-touch';
    leftTouchArea.className = 'touch-control';
    leftTouchArea.style.position = 'absolute';
    leftTouchArea.style.left = '0';
    leftTouchArea.style.top = '0';
    leftTouchArea.style.width = '50%';
    leftTouchArea.style.height = '100%';
    leftTouchArea.style.zIndex = '15';
    
    // Create right touch area
    const rightTouchArea = document.createElement('div');
    rightTouchArea.id = 'right-touch';
    rightTouchArea.className = 'touch-control';
    rightTouchArea.style.position = 'absolute';
    rightTouchArea.style.right = '0';
    rightTouchArea.style.top = '0';
    rightTouchArea.style.width = '50%';
    rightTouchArea.style.height = '100%';
    rightTouchArea.style.zIndex = '15';
    
    // Add to game container
    gameContainer.appendChild(leftTouchArea);
    gameContainer.appendChild(rightTouchArea);
    
    // Add event listeners to touch areas
    leftTouchArea.addEventListener('touchstart', () => {
        if (gameActive) moveLeft();
    }, { passive: true });
    
    rightTouchArea.addEventListener('touchstart', () => {
        if (gameActive) moveRight();
    }, { passive: true });
}

function handleTouchStart(e) {
    if (!gameActive) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    
    // Get screen width to determine left/right side
    const screenWidth = window.innerWidth;
    const touchX = touch.clientX;
    
    if (touchX < screenWidth / 2) {
        // Left side touch
        moveLeft();
    } else {
        // Right side touch
        moveRight();
    }
}

function handleTouchMove(e) {
    e.preventDefault();
}

function handleTouchEnd(e) {
    e.preventDefault();
    touchStartX = null;
}

// Start game
function startGame() {
    // Reset game state
    score = 0;
    lives = 3;
    gameActive = true;
    playerPosition = 50;
    currentSpeed = baseSpeed;
    lastSpeedIncreaseAt = 0;
    
    // Update displays
    scoreDisplay.textContent = score;
    livesCountDisplay.textContent = lives;
    player.style.left = playerPosition + '%';
    
    // Show correct screens
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    blackoutScreen.style.display = 'none';
    gameScreen.classList.remove('hidden');
    
    // Clear any existing food
    clearAllFood();
    
    // Start game elements
    createFood();
    gameLoop();
}

// Handle keyboard input
function handleKeyPress(e) {
    if (!gameActive) return;
    
    if (e.key === 'a' || e.key === 'A') {
        moveLeft();
    } else if (e.key === 'd' || e.key === 'D') {
        moveRight();
    }
}

function moveLeft() {
    const newPosition = playerPosition - 3;
    const minLeft = containerMargin + (playerWidth * 0.5);
    if (newPosition >= minLeft) {
        playerPosition = newPosition;
    } else {
        playerPosition = minLeft;
    }
    player.style.left = playerPosition + '%';
}

function moveRight() {
    const newPosition = playerPosition + 3;
    const maxRight = 100 - containerMargin - (playerWidth * 0.5);
    if (newPosition <= maxRight) {
        playerPosition = newPosition;
    } else {
        playerPosition = maxRight;
    }
    player.style.left = playerPosition + '%';
}

// Food creation and movement
function createFood() {
    if (!gameActive) return;
    
    // Increase speed every 10 points
    if (score >= lastSpeedIncreaseAt + 10) {
        currentSpeed = baseSpeed + (Math.floor(score/10) * speedIncrement);
        lastSpeedIncreaseAt = Math.floor(score/10) * 10;
    }
    
    const food = document.createElement('div');
    food.classList.add('food');
    
    const leftPosition = Math.random() * (100 - 6); // 6vw is approx food width
    food.style.left = leftPosition + '%';
    food.style.top = '-5vh';
    
    const isGood = Math.random() < 0.7;
    if (isGood) {
        food.classList.add('good-food');
    } else {
        food.classList.add('harmful-food');
    }
    
    gameContainer.appendChild(food);
    
    const foodObject = {
        element: food,
        top: -5,
        left: leftPosition,
        isGood: isGood,
        speed: currentSpeed
    };
    foodElements.push(foodObject);
    
    // Schedule next food creation
    setTimeout(createFood, Math.random() * 500 + 200);
}

// Game loop
function gameLoop() {
    if (!gameActive) return;
    
    for (let i = foodElements.length - 1; i >= 0; i--) {
        const food = foodElements[i];
        food.top += food.speed;
        food.element.style.top = food.top + 'vh';
        
        if (checkCollision(food)) {
            handleCollision(food);
            removeFood(i);
        }
        else if (food.top > 100) {
            removeFood(i);
        }
    }
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// Collision detection
function checkCollision(food) {
    const playerRect = player.getBoundingClientRect();
    const foodRect = food.element.getBoundingClientRect();
    
    return !(
        foodRect.bottom < playerRect.top ||
        foodRect.top > playerRect.bottom ||
        foodRect.right < playerRect.left ||
        foodRect.left > playerRect.right
    );
}

// Handle collision
function handleCollision(food) {
    if (food.isGood) {
        score++;
        scoreDisplay.textContent = score;
    } else {
        lives--;
        livesCountDisplay.textContent = lives;
        
        if (lives <= 0) {
            endGame();
        }
    }
}

// Remove food
function removeFood(index) {
    if (index >= 0 && index < foodElements.length) {
        foodElements[index].element.remove();
        foodElements.splice(index, 1);
    }
}

// Clear all food
function clearAllFood() {
    foodElements.forEach(food => {
        if (food.element && food.element.parentNode) {
            food.element.remove();
        }
    });
    foodElements = [];
}

// End game
function endGame() {
    gameActive = false;
    cancelAnimationFrame(animationFrameId);
    finalScoreDisplay.textContent = score;
    
    // Clear any existing food
    clearAllFood();
    
    // Show blackout sequence when game ends
    showBlackoutSequence();
}

function showBlackoutSequence() {
    // Hide game elements
    player.style.display = 'none';
    document.querySelector('.score-container').style.display = 'none';
    
    // Show blackout screen
    blackoutScreen.style.display = 'flex';
    lyricsContainer.textContent = '';
    
    // Clear any existing lyric timeouts
    lyricTimeouts.forEach(timeout => clearTimeout(timeout));
    lyricTimeouts = [];
    
    // Try to play audio if available
    const gameOverAudio = new Audio('nandito ako.mp3');
    gameOverAudio.play()
        .catch(e => console.log("Audio play failed (file might not exist):", e));
    
    // Display lyrics
    gameOverLyrics.forEach(line => {
        const timeout = setTimeout(() => {
            lyricsContainer.textContent = line.text;
        }, line.time);
        lyricTimeouts.push(timeout);
    });
    
    // Show game over screen after lyrics finish
    const timeout = setTimeout(() => {
        blackoutScreen.style.display = 'none';
        player.style.display = 'block';
        document.querySelector('.score-container').style.display = 'block';
        
        // Hide game container when showing game over screen
        gameScreen.style.display = 'none';
        gameOverScreen.classList.remove('hidden');
    }, 60000);
    lyricTimeouts.push(timeout);
}

// Restart game
function restartGame() {
    // Clear lyric timeouts
    lyricTimeouts.forEach(timeout => clearTimeout(timeout));
    lyricTimeouts = [];
    
    // Reset display elements
    player.style.display = 'block';
    document.querySelector('.score-container').style.display = 'block';
    gameContainer.style.display = 'block'; // Show game container again
    
    // Start new game
    startGame();
}

// Start the game when page loads
window.addEventListener('load', initGame);