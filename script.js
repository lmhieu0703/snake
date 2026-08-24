// ==========================================
// 1. CẤU HÌNH MÁY CHỦ FIREBASE
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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==========================================
// 2. BIẾN TOÀN CỤC & TRẠNG THÁI HỆ THỐNG
// ==========================================
let uid = localStorage.getItem('cyberSnakeUid');
let playerName = "Khách";
let playerMoney = 0;
let playerHighScore = 0;
let hasRainbow = false;

// Trạng thái Game
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;

let snake = [];
let food = {};
let dx = gridSize, dy = 0;
let score = 0, currentPtsPerFood = 5;
let gameInterval, gameSpeed = 100;
let isGameOver = false;
let nextDirection = { x: gridSize, y: 0 };
let changingDirection = false; 
let isMoving = false; // CỜ HIỆU ĐỨNG IM CHỜ LỆNH

// Hồi sinh & Skin
let reviveCost = 1;
let rainbowReviveUsed = false;
let currentSkinType = 'color'; // 'color', 'custom', 'rainbow'
let currentSkinValue = '#00f5d4';
let customSkinImage = new Image();
let rainbowHue = 0;

// UI Elements
const els = {
    login: document.getElementById('login-screen'),
    menu: document.getElementById('menu-screen'),
    game: document.getElementById('game-screen'),
    lb: document.getElementById('leaderboard-screen'),
    inbox: document.getElementById('inbox-screen'),
    transfer: document.getElementById('transfer-screen'),
    code: document.getElementById('code-screen'),
    profile: document.getElementById('player-profile'),
    reviveModal: document.getElementById('revive-modal')
};

// Ẩn dòng chữ "Làm mới 5s" trên file HTML đi vì sếp không cần nữa
const lbTimerEl = document.getElementById('lb-timer');
if (lbTimerEl && lbTimerEl.parentNode) {
    lbTimerEl.parentNode.style.display = 'none'; 
}

// ==========================================
// 3. HỆ THỐNG TÀI KHOẢN & VÍ TIỀN
// ==========================================
window.onload = () => {
    if (!uid) { els.login.classList.add('active'); } 
    else { els.login.classList.remove('active'); els.login.classList.add('hidden'); loadUserData(); }
};

document.getElementById('btn-login').onclick = () => {
    let name = document.getElementById('reg-name').value.trim();
    if (name.length < 2) return alert("Tên phải dài hơn 2 ký tự!");
    
    uid = 'snk_' + Date.now();
    localStorage.setItem('cyberSnakeUid', uid);
    
    db.ref(`users/${uid}`).set({
        name: name, score: 0, money: 0, hasRainbow: false
    }).then(() => {
        alert("🎉 Đăng ký thành công! Chào mừng gia nhập Cyberpunk!");
        els.login.classList.remove('active'); els.login.classList.add('hidden');
        loadUserData();
    });
};

function loadUserData() {
    els.profile.classList.remove('hidden'); els.menu.classList.remove('hidden'); els.menu.classList.add('active');
    
    db.ref(`users/${uid}`).on('value', snap => {
        if (!snap.exists()) return;
        let data = snap.val();
        playerName = data.name; playerMoney = data.money || 0;
        playerHighScore = data.score || 0; hasRainbow = data.hasRainbow || false;

        document.getElementById('display-name').innerText = playerName;
        document.getElementById('display-money').innerText = playerMoney;
        document.getElementById('high-score').innerText = playerHighScore;

        let rBtn = document.getElementById('btn-buy-rainbow');
        let rRadio = document.getElementById('radio-rainbow');
        let rText = document.getElementById('rainbow-text');
        
        if (hasRainbow) {
            rBtn.innerText = "✅ ĐÃ SỞ HỮU RAINBOW (SKIN & HỒI SINH TỰ ĐỘNG)";
            rBtn.disabled = true; rBtn.style.opacity = "0.5";
            rRadio.disabled = false; rText.innerText = "🌈 Chế độ Rainbow";
        }
    });

    // Lắng nghe và đếm số Hộp Thư chưa đọc
    db.ref(`notifications/${uid}`).on('value', snap => {
        let unread = 0;
        snap.forEach(child => { if (!child.val().isRead) unread++; });
        const badge = document.getElementById('inbox-badge');
        
        if (unread > 0) { 
            badge.innerText = unread; 
            badge.style.display = 'inline-block'; 
        } else { 
            badge.style.display = 'none'; 
        }
    });
    
    setInterval(checkHourlyTop3, 60000); // Kiểm tra thưởng giờ (Chạy ngầm)
}

// ==========================================
// 4. KINH TẾ: SKIN, CHUYỂN TIỀN, HỘP THƯ, CODE
// ==========================================
document.getElementById('btn-buy-rainbow').onclick = () => {
    if (hasRainbow) return;
    if (playerMoney < 100) return alert("❌ Bạn không đủ 100$! Cày thêm hoặc xin bạn bè đi sếp.");
    db.ref(`users/${uid}/money`).set(playerMoney - 100); db.ref(`users/${uid}/hasRainbow`).set(true);
    alert("🎉 ĐÃ MỞ KHÓA SKIN RAINBOW! Bạn có 1 lượt hồi sinh MIỄN PHÍ mỗi ván game!");
};

document.querySelectorAll('input[name="skin"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('color-picker-box').style.display = (e.target.value === 'color') ? 'flex' : 'none';
        document.getElementById('image-upload-box').style.display = (e.target.value === 'custom') ? 'block' : 'none';
    });
});

document.getElementById('skin-upload').addEventListener('change', function(e) {
    if (playerMoney < 50) { alert("❌ Bạn cần 50$ để tải ảnh skin mới!"); document.getElementById('radio-color').checked = true; return; }
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            customSkinImage.src = event.target.result;
            db.ref(`users/${uid}/money`).set(playerMoney - 50);
            alert("✅ Đã cập nhật ảnh Skin và trừ 50$!");
        }
        reader.readAsDataURL(file);
    }
});

document.getElementById('btn-submit-transfer').onclick = () => {
    let targetName = document.getElementById('transfer-receiver').value.trim();
    let amount = parseInt(document.getElementById('transfer-amount').value);
    
    if(!targetName || isNaN(amount) || amount <= 0) return alert("Nhập sai thông tin!");
    if(amount > playerMoney) return alert("Bạn không đủ tiền để chuyển!");
    if(targetName === playerName) return alert("Không thể tự chuyển cho mình!");

    db.ref('users').orderByChild('name').equalTo(targetName).once('value', snap => {
        if(!snap.exists()) return alert("❌ Không tìm thấy người chơi mang tên này!");
        let targetId = Object.keys(snap.val())[0];
        
        db.ref(`users/${uid}/money`).set(playerMoney - amount); 
        db.ref(`notifications/${targetId}`).push({ sender: playerName, amount: amount, isRead: false, timestamp: Date.now() });
        alert(`✅ Đã chuyển thành công ${amount}$ cho ${targetName}!`);
        document.getElementById('transfer-amount').value = '';
    });
};

// ==========================================
// 🔥 XỬ LÝ HỘP THƯ - TỰ ĐỘNG XÓA SAU 24H
// ==========================================
document.getElementById('btn-inbox').onclick = () => {
    switchScreen('inbox-screen');
    db.ref(`notifications/${uid}`).once('value', snap => {
        const list = document.getElementById('inbox-list'); list.innerHTML = '';
        if (!snap.exists()) { list.innerHTML = '<p style="color:#888;">Hộp thư trống!</p>'; return; }
        
        let msgs = []; 
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000; 

        snap.forEach(c => {
            let msg = c.val();
            if (msg.isRead && (now - msg.timestamp > ONE_DAY)) {
                db.ref(`notifications/${uid}/${c.key}`).remove();
            } else {
                msgs.push({id: c.key, ...msg});
            }
        });
        
        if (msgs.length === 0) { list.innerHTML = '<p style="color:#888;">Hộp thư trống!</p>'; return; }

        msgs.reverse().forEach(msg => {
            let div = document.createElement('div'); div.className = 'inbox-item';
            div.innerHTML = `
                <div><span class="sender">Từ: ${msg.sender}</span>
                <span class="amount">+${msg.amount}$</span></div>
                ${!msg.isRead 
                    ? `<button onclick="claimMail('${msg.id}', ${msg.amount})" class="btn primary" style="padding: 8px; margin-top: 10px; font-size:12px;">NHẬN TIỀN</button>` 
                    : `<div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                           <span style="color:#666; font-size:12px;">Đã nhận (Sẽ tự xóa sau 24h)</span>
                           <button onclick="deleteMail('${msg.id}')" class="btn danger" style="padding: 4px 10px; font-size:11px; margin:0; width:auto;">XÓA</button>
                       </div>`
                }
            `;
            list.appendChild(div);
        });
    });
};

window.claimMail = function(mailId, amount) {
    db.ref(`users/${uid}/money`).set(playerMoney + amount);
    db.ref(`notifications/${uid}/${mailId}`).update({ isRead: true, timestamp: Date.now() });
    alert(`💰 Đã nhận ${amount}$ vào ví!`); 
    document.getElementById('btn-inbox').click(); 
};

window.deleteMail = function(mailId) {
    db.ref(`notifications/${uid}/${mailId}`).remove(); 
    document.getElementById('btn-inbox').click(); 
};

// ==========================================
// NHẬP CODE
// ==========================================
document.getElementById('btn-submit-code').onclick = () => {
    let code = document.getElementById('giftcode-input').value.trim().toUpperCase();
    if(!code) return;
    
    db.ref(`storage_data/codes/${code}`).once('value', snap => {
        if(!snap.exists()) return alert("❌ Code không tồn tại hoặc đã bị hủy!");
        let cData = snap.val();
        if(cData.usedBy !== false) return alert(`❌ Code này đã bị người chơi [${cData.usedBy}] nhập mất rồi!`);
        
        db.ref(`storage_data/codes/${code}`).update({ usedBy: playerName, usedAt: Date.now() });
        db.ref(`users/${uid}/money`).set(playerMoney + cData.amount);
        alert(`🎉 VÀO VIỆC! Búp được ${cData.amount}$ từ mã code ${code}!`);
        document.getElementById('giftcode-input').value = "";
    });
};

// ==========================================
// 5. CƠ CHẾ GAMEPLAY RẮN SĂN MỒI
// ==========================================
document.getElementById('btn-start').onclick = () => {
    gameSpeed = parseInt(document.getElementById('difficulty').value);
    currentPtsPerFood = parseInt(document.getElementById('difficulty').options[document.getElementById('difficulty').selectedIndex].dataset.pts);
    
    let skinChoice = document.querySelector('input[name="skin"]:checked').value;
    if (skinChoice === 'color') { currentSkinType = 'color'; currentSkinValue = document.getElementById('custom-color-picker').value; }
    else if (skinChoice === 'custom') { currentSkinType = 'custom'; }
    else if (skinChoice === 'rainbow') { currentSkinType = 'rainbow'; }

    switchScreen('game-screen');
    resetGame();
};

function resetGame() {
    snake = [ {x: 160, y: 160}, {x: 140, y: 160}, {x: 120, y: 160} ];
    dx = gridSize; dy = 0; nextDirection = { x: gridSize, y: 0 };
    score = 0; reviveCost = 1; rainbowReviveUsed = false; changingDirection = false; isGameOver = false;
    
    isMoving = false; // ĐỨNG IM CHỜ LỆNH
    
    document.getElementById('current-score').innerText = score;
    els.reviveModal.classList.add('hidden');
    
    placeFood();
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}

function placeFood() {
    let isOccupied = true;
    while(isOccupied) {
        food.x = Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize;
        food.y = Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize;
        // Fix lỗi thức ăn spawn đè lên người rắn
        isOccupied = snake.some(part => part.x === food.x && part.y === food.y);
    }
}

function gameLoop() {
    if (isGameOver) return;
    
    if (!isMoving) { draw(); return; } // Chưa vuốt/bấm thì nằm im nhấp nháy 7 màu
    
    changingDirection = false; 
    dx = nextDirection.x; dy = nextDirection.y;
    
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    
    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height || checkCollision(head)) {
        triggerDeath(); return;
    }

    snake.unshift(head);
    
    if (head.x === food.x && head.y === food.y) {
        score += currentPtsPerFood;
        document.getElementById('current-score').innerText = score;
        placeFood();
    } else { snake.pop(); }
    
    draw();
}

function checkCollision(head) {
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function draw() {
    ctx.fillStyle = '#02080d'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.05)';
    for(let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    ctx.fillStyle = '#ff2a6d'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff2a6d';
    ctx.fillRect(food.x, food.y, gridSize, gridSize); ctx.shadowBlur = 0;
    
    rainbowHue = (rainbowHue + 5) % 360; 

    snake.forEach((part, index) => {
        if (currentSkinType === 'custom' && customSkinImage.src) {
            ctx.drawImage(customSkinImage, part.x, part.y, gridSize, gridSize);
        } else {
            let color = currentSkinValue;
            if (currentSkinType === 'rainbow') color = `hsl(${rainbowHue + (index*10)}, 100%, 50%)`;
            
            ctx.fillStyle = index === 0 ? '#ffffff' : color;
            ctx.shadowBlur = index === 0 ? 10 : 5;
            ctx.shadowColor = color;
            ctx.fillRect(part.x, part.y, gridSize - 1, gridSize - 1);
            ctx.shadowBlur = 0;
        }
    });
}

// BẺ LÁI
document.addEventListener('keydown', e => {
    if (isGameOver || changingDirection) return;
    const key = e.keyCode;
    if([37, 38, 39, 40].includes(key)) e.preventDefault(); 
    
    if (key === 37 && dx !== gridSize) { nextDirection = {x: -gridSize, y: 0}; changingDirection = true; isMoving = true;} 
    if (key === 38 && dy !== gridSize) { nextDirection = {x: 0, y: -gridSize}; changingDirection = true; isMoving = true;} 
    if (key === 39 && dx !== -gridSize) { nextDirection = {x: gridSize, y: 0}; changingDirection = true; isMoving = true;} 
    if (key === 40 && dy !== -gridSize) { nextDirection = {x: 0, y: gridSize}; changingDirection = true; isMoving = true;} 
});

let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; touchStartY = e.changedTouches[0].screenY; }, {passive: false});
canvas.addEventListener('touchmove', e => e.preventDefault(), {passive: false}); 
canvas.addEventListener('touchend', e => {
    let touchEndX = e.changedTouches[0].screenX, touchEndY = e.changedTouches[0].screenY;
    let diffX = touchEndX - touchStartX, diffY = touchEndY - touchStartY;
    
    if(Math.abs(diffX) > Math.abs(diffY)) {
        if(diffX > 30 && dx !== -gridSize) { nextDirection = {x: gridSize, y: 0}; changingDirection = true; isMoving = true;}
        else if (diffX < -30 && dx !== gridSize) { nextDirection = {x: -gridSize, y: 0}; changingDirection = true; isMoving = true;}
    } else {
        if(diffY > 30 && dy !== -gridSize) { nextDirection = {x: 0, y: gridSize}; changingDirection = true; isMoving = true;}
        else if (diffY < -30 && dy !== gridSize) { nextDirection = {x: 0, y: -gridSize}; changingDirection = true; isMoving = true;}
    }
});

// ==========================================
// 6. XỬ LÝ HỒI SINH & GAME OVER
// ==========================================
function triggerDeath() {
    isGameOver = true;
    clearInterval(gameInterval);
    document.getElementById('dead-score').innerText = score;
    
    let freeMsg = document.getElementById('rainbow-free-msg');
    let priceText = document.getElementById('revive-price');
    
    if (hasRainbow && !rainbowReviveUsed) {
        priceText.innerText = "0 (MIỄN PHÍ)";
        freeMsg.style.display = "block";
    } else {
        priceText.innerText = reviveCost;
        freeMsg.style.display = "none";
    }
    els.reviveModal.classList.remove('hidden');
}

// NÚT HỒI SINH
document.getElementById('btn-do-revive').onclick = () => {
    let cost = (hasRainbow && !rainbowReviveUsed) ? 0 : reviveCost;
    
    if (playerMoney < cost) return alert("❌ Nghèo quá rồi, không đủ $ hồi sinh! Xin bạn bè đi.");
    
    if (cost > 0) {
        db.ref(`users/${uid}/money`).set(playerMoney - cost);
        reviveCost *= 2; 
    } else {
        rainbowReviveUsed = true; 
    }
    
    snake = [ {x: 160, y: 160}, {x: 140, y: 160}, {x: 120, y: 160} ];
    dx = gridSize; dy = 0; nextDirection = { x: gridSize, y: 0 };
    isMoving = false; isGameOver = false;
    
    els.reviveModal.classList.add('hidden');
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed); 
    draw(); 
};

document.getElementById('btn-die').onclick = () => {
    els.reviveModal.classList.add('hidden');
    
    let bonus1000 = Math.floor(score / 1000) * 10;
    if (bonus1000 > 0) {
        db.ref(`users/${uid}/money`).set(playerMoney + bonus1000);
        alert(`🎁 CHƠI HAY LẮM! Đạt mốc nghìn điểm, hệ thống thưởng nóng ${bonus1000}$`);
    }

    if (score > playerHighScore) {
        db.ref(`users/${uid}/score`).set(score);
        alert(`🏆 PHÁ KỶ LỤC CÁ NHÂN: ${score} ĐIỂM!`);
    }
    switchScreen('menu-screen');
};

document.getElementById('btn-back-menu').onclick = () => { if(confirm("Đầu hàng sẽ tính là thua. Thoát?")) document.getElementById('btn-die').click(); };

// ==========================================
// 7. BẢNG XẾP HẠNG ĐÔI & TOP 3 TỰ ĐỘNG
// ==========================================
let currentLbTab = 'score'; 

document.getElementById('btn-leaderboard').onclick = () => { 
    switchScreen('leaderboard-screen'); 
    fetchLeaderboard(); // Tải BXH 1 lần, bỏ cơ chế refresh liên tục
};

document.getElementById('tab-score').onclick = () => { currentLbTab = 'score'; changeTab(); };
document.getElementById('tab-money').onclick = () => { currentLbTab = 'money'; changeTab(); };

function changeTab() {
    document.getElementById('tab-score').classList.toggle('active', currentLbTab === 'score');
    document.getElementById('tab-money').classList.toggle('active', currentLbTab === 'money');
    document.getElementById('lb-value-header').innerText = (currentLbTab === 'score') ? 'ĐIỂM KỶ LỤC' : 'TÀI SẢN ($)';
    fetchLeaderboard();
}

function fetchLeaderboard() {
    // Lấy đúng 10 người cao nhất
    db.ref('users').orderByChild(currentLbTab).limitToLast(10).once('value', snap => {
        const tbody = document.getElementById('leaderboard-body');
        let arr = []; snap.forEach(c => arr.push(c.val()));
        
        // Sắp xếp giảm dần để top 1 ở trên cùng
        arr.sort((a, b) => b[currentLbTab] - a[currentLbTab]);
        
        tbody.innerHTML = '';
        if (arr.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">Chưa có ai ghi danh!</td></tr>';
            return;
        }

        arr.forEach((p, i) => {
            let tr = document.createElement('tr');
            let color = i < 3 ? 'color:#ffb800; font-weight:bold; font-size: 18px;' : '';
            tr.innerHTML = `
                <td style="${color}">TOP ${i+1}</td>
                <td style="${color}">${p.name}</td>
                <td style="color:#00f5d4; font-weight:bold;">${p[currentLbTab]}${currentLbTab==='money'?'$':''}</td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// CƠ CHẾ THƯỞNG 30$ / 20$ / 10$ CHO TOP 3 MỖI TIẾNG
function checkHourlyTop3() {
    const HOUR = 3600000; // 1 Tiếng
    db.ref('storage_data/lastTop3Reward').once('value', snap => {
        let lastTime = snap.val() || 0; 
        let now = Date.now();
        
        if (now - lastTime >= HOUR) {
            db.ref('storage_data/lastTop3Reward').set(now); 
            
            // Tìm 3 người điểm cao nhất
            db.ref('users').orderByChild('score').limitToLast(3).once('value', topSnap => {
                let arr = [];
                topSnap.forEach(child => { arr.push({ uid: child.key, ...child.val() }); });
                
                // Sắp xếp lại để xác định chính xác TOP 1, 2, 3
                arr.sort((a, b) => b.score - a.score);
                
                arr.forEach((p, index) => {
                    let reward = 0;
                    if (index === 0) reward = 30; // TOP 1
                    else if (index === 1) reward = 20; // TOP 2
                    else if (index === 2) reward = 10; // TOP 3
                    
                    if (reward > 0) {
                        // Vừa cộng thêm điểm kỷ lục, vừa gửi $ vào hộp thư
                        db.ref(`users/${p.uid}/score`).set(p.score + reward); 
                        db.ref(`notifications/${p.uid}`).push({         
                            sender: "HỆ THỐNG", 
                            amount: reward, 
                            isRead: false, 
                            timestamp: now, 
                            message: `Thưởng duy trì TOP ${index + 1} Điểm số!`
                        });
                    }
                });
            });
        }
    });
}

// ==========================================
// 8. TIỆN ÍCH CHUYỂN MÀN HÌNH
// ==========================================
document.querySelectorAll('.btn-close-any').forEach(btn => {
    btn.onclick = () => { switchScreen('menu-screen'); };
});
document.getElementById('btn-transfer').onclick = () => switchScreen('transfer-screen');
document.getElementById('btn-giftcode').onclick = () => switchScreen('code-screen');

function switchScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
    document.getElementById(screenId).classList.remove('hidden'); document.getElementById(screenId).classList.add('active');
}