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

// Khởi tạo Firebase (chỉ khởi tạo nếu chưa có)
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

// Quản lý Skin Rắn
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
const skinRadios = document.getElementsByName('skin');
const skinUpload = document.getElementById('skin-upload');
const leaderboardBody = document.getElementById('leaderboard-body');

highScoreEl.textContent = highScore;

// ==========================================
// 3. GẮN SỰ KIỆN NÚT BẤM VÀ BÀN PHÍM
// ==========================================
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-leaderboard').addEventListener('click', showLeaderboard);
document.getElementById('btn-back-menu').addEventListener('click', showMenu);
document.getElementById('btn-close-leaderboard').addEventListener('click', showMenu);
document.addEventListener('keydown', handleKeyPress);

// Xử lý upload ảnh làm skin
skinUpload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            customSkinImage.src = event.target.result;
            document.getElementById('custom-skin-radio').checked = true;
        }
        reader.readAsDataURL(file);
    }
});

// ==========================================
// 4. CHUYỂN ĐỔI MÀN HÌNH
// ==========================================
function startGame() {
    // Lấy độ khó
    gameSpeed = parseInt(difficultySelect.value);
    
    // Lấy Skin
    let selectedSkin = 'cyan';
    for(let radio of skinRadios) {
        if(radio.checked) {
            selectedSkin = radio.value;
            break;
        }
    }
    
    if (selectedSkin === 'custom' && customSkinImage.src) {
        currentSkinType = 'image';
    } else {
        currentSkinType = 'color';
        if (selectedSkin === 'orange') currentSkinValue = '#ffb800';
        else currentSkinValue = '#00f5d4'; // cyan default
    }

    menuScreen.classList.remove('active');
    menuScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    gameScreen.classList.add('active');
    
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
    score = 0;
    isGameOver = false;
    scoreEl.textContent = score;
    
    placeFood();
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}

function placeFood() {
    food.x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
    food.y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
    // Đảm bảo thức ăn không đè lên thân rắn
    for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
            placeFood();
            return;
        }
    }
}

function handleKeyPress(e) {
    if (isGameOver) return;
    const LEFT_KEY = 37;
    const RIGHT_KEY = 39;
    const UP_KEY = 38;
    const DOWN_KEY = 40;

    const keyPressed = e.keyCode;
    // Chặn việc đi ngược lại hướng hiện tại để tránh tự cắn mình
    if (keyPressed === LEFT_KEY && dx !== gridSize) { nextDirection = {x: -gridSize, y: 0}; }
    if (keyPressed === UP_KEY && dy !== gridSize) { nextDirection = {x: 0, y: -gridSize}; }
    if (keyPressed === RIGHT_KEY && dx !== -gridSize) { nextDirection = {x: gridSize, y: 0}; }
    if (keyPressed === DOWN_KEY && dy !== -gridSize) { nextDirection = {x: 0, y: gridSize}; }
}

function gameLoop() {
    if (isGameOver) return;
    
    dx = nextDirection.x;
    dy = nextDirection.y;
    
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    snake.unshift(head); // Thêm đầu mới
    
    // Nếu ăn được mồi
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        placeFood();
    } else {
        snake.pop(); // Xóa đuôi nếu không ăn
    }
    
    checkCollision();
    draw();
}

function checkCollision() {
    const head = snake[0];
    // Đụng tường
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
        handleGameOver();
    }
    // Đụng thân
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            handleGameOver();
        }
    }
}

function draw() {
    // Xóa nền cũ (Màu đen sâu)
    ctx.fillStyle = '#02080d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ lưới Cyberpunk mờ mờ
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.05)';
    for(let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Vẽ mồi (Màu hồng Neon)
    ctx.fillStyle = '#ff2a6d';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff2a6d';
    ctx.fillRect(food.x, food.y, gridSize, gridSize);
    ctx.shadowBlur = 0;
    
    // Vẽ rắn
    snake.forEach((part, index) => {
        if (currentSkinType === 'image' && customSkinImage.complete && customSkinImage.src) {
            // Vẽ Skin bằng ảnh
            ctx.drawImage(customSkinImage, part.x, part.y, gridSize, gridSize);
        } else {
            // Vẽ Skin bằng màu Neon
            ctx.fillStyle = index === 0 ? '#ffffff' : currentSkinValue; // Đầu rắn màu trắng
            ctx.shadowBlur = index === 0 ? 15 : 5;
            ctx.shadowColor = currentSkinValue;
            // Trừ 1px để thấy rõ từng đốt rắn
            ctx.fillRect(part.x, part.y, gridSize - 1, gridSize - 1); 
            ctx.shadowBlur = 0;
        }
    });
}

// ==========================================
// 6. XỬ LÝ BẢNG XẾP HẠNG ONLINE (FIREBASE)
// ==========================================
function handleGameOver() {
    isGameOver = true;
    clearInterval(gameInterval);
    
    // Lưu kỷ lục cá nhân vào máy
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cyberSnakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    
    setTimeout(() => {
        let playerName = prompt(`GAME OVER!\nBạn đạt ${score} điểm.\nHãy nhập tên để lưu lên BẢNG XẾP HẠNG ONLINE:`, "Người chơi");
        
        if (playerName && playerName.trim() !== "") {
            saveScoreOnline(playerName.trim(), score);
        } else {
            showMenu();
        }
    }, 300);
}

// Đẩy điểm lên máy chủ Firebase
function saveScoreOnline(name, playerScore) {
    database.ref('leaderboard').push({
        name: name.substring(0, 15), // Giới hạn tên 15 ký tự
        score: playerScore,
        timestamp: Date.now()
    }).then(() => {
        showLeaderboard(); // Chuyển sang xem bảng xếp hạng
    }).catch((err) => {
        alert("Lỗi kết nối máy chủ! " + err.message);
        showMenu();
    });
}

// Lấy Top 5 từ Firebase và hiển thị
function updateLeaderboardUI() {
    leaderboardBody.innerHTML = '<tr><td colspan="3" style="color:#00f5d4;">Đang tải dữ liệu kết nối toàn cầu...</td></tr>';
    
    database.ref('leaderboard').orderByChild('score').limitToLast(20).once('value', (snapshot) => {
        let scores = [];
        snapshot.forEach((child) => {
            scores.push(child.val());
        });
        
        // Sắp xếp điểm giảm dần (Điểm cao nhất lên đầu)
        scores.sort((a, b) => b.score - a.score);
        
        // Lấy đúng Top 5
        scores = scores.slice(0, 5);
        
        leaderboardBody.innerHTML = ''; // Xóa chữ "Đang tải"
        
        if (scores.length === 0) {
            leaderboardBody.innerHTML = '<tr><td colspan="3">Chưa có ai ghi danh</td></tr>';
            return;
        }
        
        scores.forEach((entry, index) => {
            let tr = document.createElement('tr');
            // Hiệu ứng màu vàng cho Top 1
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