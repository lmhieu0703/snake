// ==========================================
// 1. CẤU HÌNH VÀ KHỞI TẠO FIREBASE ONLINE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDEQLXAKLqYka8RXqJXrOIGTJicHVw2Rjs",
  authDomain: "may-chu-lmh-f42e0.firebaseapp.com",
  databaseURL: "https://may-chu-lmh-f42e0-default-rtdb.firebaseio.com",
  projectId: "may-chu-lmh-f42e0",
  storageBucket: "may-chu-lmh-f42e0.firebasestorage.app",
  messagingSenderId: "498997200625",
  appId: "1:498997200625:web:9a8260bb3e5d35a2264b50"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// ==========================================
// 2. KHAI BÁO BIẾN & LẤY PHẦN TỬ HTML
// ==========================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;

let snake = [];
let food = {};
let dx = gridSize;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('cyberSnakeHighScore') || 0;
let gameInterval;
let gameSpeed = 80;
let isGameOver = false;
let nextDirection = { x: gridSize, y: 0 };
let changingDirection = false; 

// ID thiết bị duy nhất
let deviceId = localStorage.getItem('cyberSnakeDeviceId');
if (!deviceId) {
    deviceId = 'player_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    localStorage.setItem('cyberSnakeDeviceId', deviceId);
}

// Bỏ giá trị mặc định để check xem người chơi đã từng nhập tên chưa
let lastPlayerName = localStorage.getItem('cyberSnakePlayerName'); 

let currentSkinType = 'color';
let currentSkinValue = '#00f5d4';
let customSkinImage = new Image();

// DOM Elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const scoreEl = document.getElementById('current-score');
const highScoreEl = document.getElementById('high-score');
const difficultySelect = document.getElementById('difficulty');
const skinUpload = document.getElementById('skin-upload');
const leaderboardBody = document.getElementById('leaderboard-body');
const customColorPicker = document.getElementById('custom-color-picker');
const radioColor = document.getElementById('radio-color');
const radioCustom = document.getElementById('custom-skin-radio');

highScoreEl.textContent = highScore;

// ==========================================
// 3. GẮN SỰ KIỆN NÚT BẤM VÀ BÀN PHÍM
// ==========================================
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-leaderboard').addEventListener('click', showLeaderboard);
document.getElementById('btn-back-menu').addEventListener('click', showMenu);
document.getElementById('btn-close-leaderboard').addEventListener('click', showMenu);
document.addEventListener('keydown', handleKeyPress);

skinUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            customSkinImage.src = event.target.result;
            radioCustom.checked = true;
        }
        reader.readAsDataURL(file);
    }
});

customColorPicker.addEventListener('input', function() {
    radioColor.checked = true;
});

// ==========================================
// 4. CHUYỂN ĐỔI MÀN HÌNH
// ==========================================
function startGame() {
    gameSpeed = parseInt(difficultySelect.value);
    
    if (radioCustom.checked && customSkinImage.src) {
        currentSkinType = 'image';
    } else {
        currentSkinType = 'color';
        currentSkinValue = customColorPicker.value;
    }

    menuScreen.classList.remove('active');
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');
    
    window.focus(); 
    resetGame();
}

function showMenu() {
    clearInterval(gameInterval);
    gameScreen.classList.remove('active');
    gameScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('active');
    leaderboardScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    menuScreen.classList.add('active');
}

function showLeaderboard() {
    menuScreen.classList.remove('active');
    menuScreen.classList.add('hidden');
    leaderboardScreen.classList.remove('hidden');
    leaderboardScreen.classList.add('active');
    updateLeaderboardUI();
}

// ==========================================
// 5. LOGIC GAME RẮN SĂN MỒI
// ==========================================
function resetGame() {
    snake = [
        {x: 160, y: 160},
        {x: 140, y: 160},
        {x: 120, y: 160},
    ];
    dx = gridSize;
    dy = 0;
    nextDirection = { x: gridSize, y: 0 };
    changingDirection = false;
    score = 0;
    isGameOver = false;
    scoreEl.textContent = score;
    
    placeFood();
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}

function placeFood() {
    let isOccupied = true;
    let attempts = 0;
    
    while(isOccupied && attempts < 1000) {
        food.x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
        food.y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
        isOccupied = false;
        
        for (let part of snake) {
            if (part.x === food.x && part.y === food.y) {
                isOccupied = true;
                break;
            }
        }
        attempts++;
    }
}

function handleKeyPress(e) {
    if (isGameOver || changingDirection) return;
    
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    const keyPressed = e.keyCode;
    const goingUp = dy === -gridSize;
    const goingDown = dy === gridSize;
    const goingRight = dx === gridSize;
    const goingLeft = dx === -gridSize;

    if([37, 38, 39, 40].includes(keyPressed)) {
        e.preventDefault(); 
    }

    if (keyPressed === LEFT_KEY && !goingRight) { nextDirection = {x: -gridSize, y: 0}; changingDirection = true; }
    if (keyPressed === UP_KEY && !goingDown) { nextDirection = {x: 0, y: -gridSize}; changingDirection = true; }
    if (keyPressed === RIGHT_KEY && !goingLeft) { nextDirection = {x: gridSize, y: 0}; changingDirection = true; }
    if (keyPressed === DOWN_KEY && !goingUp) { nextDirection = {x: 0, y: gridSize}; changingDirection = true; }
}

function gameLoop() {
    if (isGameOver) return;
    
    changingDirection = false; 
    dx = nextDirection.x;
    dy = nextDirection.y;
    
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        placeFood();
    } else {
        snake.pop();
    }
    
    checkCollision();
    if (isGameOver) return; 
    
    draw();
}

function checkCollision() {
    const head = snake[0];
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        handleGameOver();
        return;
    }
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            handleGameOver();
            return;
        }
    }
}

function draw() {
    ctx.fillStyle = '#02080d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.05)';
    for(let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    ctx.fillStyle = '#ff2a6d';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff2a6d';
    ctx.fillRect(food.x, food.y, gridSize, gridSize);
    ctx.shadowBlur = 0;
    
    snake.forEach((part, index) => {
        if (currentSkinType === 'image' && customSkinImage.complete && customSkinImage.src) {
            ctx.drawImage(customSkinImage, part.x, part.y, gridSize, gridSize);
        } else {
            ctx.fillStyle = index === 0 ? '#ffffff' : currentSkinValue;
            ctx.shadowBlur = index === 0 ? 15 : 5;
            ctx.shadowColor = currentSkinValue;
            ctx.fillRect(part.x, part.y, gridSize - 1, gridSize - 1);
            ctx.shadowBlur = 0;
        }
    });
}

// ==========================================
// 6. XỬ LÝ BẢNG XẾP HẠNG ONLINE (TỰ ĐỘNG GHI)
// ==========================================
function handleGameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cyberSnakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    setTimeout(() => {
        if (score > 0) {
            // KIỂM TRA: Nếu chưa từng nhập tên thì hỏi 1 lần duy nhất
            if (!lastPlayerName) {
                let playerName = prompt(`💥 GAME OVER!\nĐiểm ván này: ${score}\n\nHãy nhập tên để lưu lên BẢNG XẾP HẠNG (Chỉ hỏi 1 lần duy nhất):`, "Người chơi");
                
                if (playerName && playerName.trim() !== "") {
                    lastPlayerName = playerName.trim();
                    localStorage.setItem('cyberSnakePlayerName', lastPlayerName); 
                    saveScoreOnline(lastPlayerName, score);
                } else {
                    showMenu(); 
                }
            } else {
                // ĐÃ TỪNG NHẬP TÊN RỒI -> Tự động lưu ngầm không cần hỏi
                saveScoreOnline(lastPlayerName, score);
            }
        } else {
            alert("💥 GAME OVER!\nBạn được 0 điểm. Chưa đủ trình lên Bảng Xếp Hạng đâu sếp ơi!");
            showMenu();
        }
    }, 100);
}

function saveScoreOnline(name, playerScore) {
    const userRef = database.ref('leaderboard/' + deviceId);
    
    userRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        
        // Nếu điểm cao hơn kỷ lục cũ (hoặc chơi lần đầu), thì lưu lên máy chủ
        if (!data || playerScore > data.score) {
            userRef.set({
                name: name.substring(0, 15),
                score: playerScore,
                timestamp: Date.now()
            }).then(() => {
                // Thông báo tự động bóp kỷ lục
                if (data) {
                    alert(`🎉 PHÁ KỶ LỤC CÁ NHÂN!\nKỷ lục mới ${playerScore} điểm của sếp đã được tự động lưu lên máy chủ!`);
                } else {
                    alert(`✅ Kỷ lục ${playerScore} điểm đã được lưu. Từ giờ hệ thống sẽ tự động cập nhật nếu sếp vượt kỷ lục này!`);
                }
                showLeaderboard();
            }).catch((err) => {
                alert("Lỗi kết nối máy chủ! " + err.message);
                showMenu();
            });
        } else {
            // Điểm thấp hơn -> Không lưu, báo nhẹ cho người chơi
            alert(`💥 GAME OVER!\nĐiểm ván này: ${playerScore}\nKỷ lục hiện tại của sếp vẫn là ${data.score} điểm. Cố lên nhé!`);
            showLeaderboard();
        }
    });
}

function updateLeaderboardUI() {
    leaderboardBody.innerHTML = '<tr><td colspan="3" style="color:#00f5d4;">Đang kết nối toàn cầu...</td></tr>';
    
    database.ref('leaderboard').orderByChild('score').limitToLast(20).once('value', (snapshot) => {
        let scores = [];
        snapshot.forEach((child) => {
            scores.push(child.val());
        });
        
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 5); 
        
        leaderboardBody.innerHTML = ''; 
        
        if (scores.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3">Chưa có ai ghi danh</td></tr>';
            return;
        }
        
        scores.forEach((entry, index) => {
            let tr = document.createElement('tr');
            let rankStyle = index === 0 ? 'style="color: #ffb800; font-weight: bold; text-shadow: 0 0 10px #ffb800;"' : '';
            
            tr.innerHTML = `
                <td ${rankStyle}>TOP ${index + 1}</td>
                <td ${rankStyle}>${entry.name}</td>
                <td class="highlight">${entry.score}</td>
            `;
            leaderboardBody.appendChild(tr);
        });
    });
}