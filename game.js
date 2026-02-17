const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 2000;

// Game State
let gameState = "menu";

// Player
let player = {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    radius: 18,
    speed: 4,
    weapon: 0 // 0=pistol, 1=rifle, 2=full-auto
};

// Weapons
const weapons = [
    { name: "Pistol", damage: 1, auto: false, ammo: Infinity },
    { name: "Rifle", damage: 2, auto: false, ammo: 30 },
    { name: "Full-Auto", damage: 1, auto: true, ammo: 50 }
];

// Key & Mouse
let keys = {};
let mouse = { x: 0, y: 0, down: false };

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
canvas.addEventListener("mousedown", () => mouse.down = true);
canvas.addEventListener("mouseup", () => mouse.down = false);

// Title screen click
canvas.addEventListener("click", () => {
    if (gameState === "menu") gameState = "playing";
});

// Game variables
let bullets = [];
let zombies = [];
let walls = [];
let houses = [];
let resources = [];
let particles = [];
let score = 0;
let wave = 1;

// Generate houses
for (let i = 0; i < 15; i++) {
    houses.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        w: 80,
        h: 60,
        loot: { wood: Math.floor(Math.random()*3)+1, stone: Math.floor(Math.random()*2), ammo: Math.floor(Math.random()*5) }
    });
}

// Generate ponds
let ponds = [];
for (let i = 0; i < 5; i++) {
    ponds.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        w: 150,
        h: 100
    });
}

// Spawn zombies
function spawnZombie() {
    const types = ["normal","helmet","fast"];
    const type = types[Math.floor(Math.random()*types.length)];
    let speed = type === "fast" ? 2.0 : type === "helmet" ? 1 : 1.5;
    let health = type === "helmet" ? 5 : 1;
    zombies.push({ x: Math.random()*MAP_WIDTH, y: Math.random()*MAP_HEIGHT, radius: 16, speed, type, health });
}

// Initial wave
for(let i=0;i<wave*5;i++) spawnZombie();

// Shoot bullet
function shoot() {
    const w = weapons[player.weapon];
    if(w.ammo<=0) return;
    let angle = Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);
    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle)*10,
        dy: Math.sin(angle)*10,
        radius: 4,
        damage: w.damage
    });
    if(isFinite(w.ammo)) w.ammo--;
}

// Build wall
function buildWall(type){
    let w = { x: player.x+player.radius, y: player.y+player.radius, w: 40, h: 10, life:type==='stone'?10:5, type:type, zombiesOn:0 };
    walls.push(w);
}

// Particle for blood
function createParticle(x,y){
    particles.push({
        x, y, radius: Math.random()*3+2,
        dx: (Math.random()-0.5)*2, dy: (Math.random()-0.5)*2,
        life: 30
    });
}

// Update game logic
function update() {
    if(gameState!=="playing") return;

    // Movement
    let vx = 0, vy = 0;
    if(keys["w"]) vy-=1;
    if(keys["s"]) vy+=1;
    if(keys["a"]) vx-=1;
    if(keys["d"]) vx+=1;
    let len = Math.hypot(vx,vy);
    if(len>0){ vx/=len; vy/=len; }

    let speed = player.speed;
    ponds.forEach(p=>{
        if(player.x>p.x && player.x<p.x+p.w && player.y>p.y && player.y<p.y+p.h) speed/=2;
    });

    player.x += vx*speed;
    player.y += vy*speed;
    player.x = Math.max(player.radius, Math.min(MAP_WIDTH-player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(MAP_HEIGHT-player.radius, player.y));

    // Weapon switch
    if(keys["1"]) player.weapon=0;
    if(keys["2"]) player.weapon=1;
    if(keys["3"]) player.weapon=2;

    // Build wall
    if(keys["shift"]){
        buildWall("wood");
    }

    // Shoot
    if(mouse.down){
        let w = weapons[player.weapon];
        if(w.auto || !w.auto) shoot();
    }

    // Update bullets
    bullets.forEach((b,i)=>{
        b.x+=b.dx;
        b.y+=b.dy;

        // Check zombie collision
        zombies.forEach((z,zi)=>{
            let dist = Math.hypot(b.x-z.x,b.y-z.y);
            if(dist<z.radius){
                z.health-=b.damage;
                createParticle(z.x,z.y);
                bullets.splice(i,1);
                if(z.health<=0){ zombies.splice(zi,1); score+=10; }
            }
        });
    });

    // Update zombies
    zombies.forEach(z=>{
        let angle = Math.atan2(player.y-z.y, player.x-z.x);
        z.x += Math.cos(angle)*z.speed;
        z.y += Math.sin(angle)*z.speed;
    });

    // Particles
    particles.forEach((p,i)=>{
        p.x+=p.dx; p.y+=p.dy;
        p.life--;
        if(p.life<=0) particles.splice(i,1);
    });

    // Next wave
    if(zombies.length===0){
        wave++;
        for(let i=0;i<wave*5;i++) spawnZombie();
    }
}

// Draw top-down
function drawMenu() {
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="white";
    ctx.textAlign="center";
    ctx.font="60px Arial";
    ctx.fillText("Zombie Survival", canvas.width/2, canvas.height/2-50);
    ctx.font="30px Arial";
    ctx.fillText("PLAY", canvas.width/2, canvas.height/2+10);
    ctx.font="18px Arial";
    ctx.fillText("Made by BananaMan5902", canvas.width/2, canvas.height-30);
}

function draw() {
    if(gameState==="menu"){ drawMenu(); return; }

    ctx.clearRect(0,0,canvas.width,canvas.height);

    const offsetX = player.x - canvas.width/2;
    const offsetY = player.y - canvas.height/2;

    // Ground
    ctx.fillStyle="#3e8f2b";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // Ponds
    ponds.forEach(p=>{
        let px = p.x-offsetX, py=p.y-offsetY;
        let grad = ctx.createRadialGradient(px+p.w/2,py+p.h/2,20,px+p.w/2,py+p.h/2,p.w/2);
        grad.addColorStop(0,"#4fc3f7");
        grad.addColorStop(1,"#1976d2");
        ctx.fillStyle=grad;
        ctx.beginPath();
        ctx.ellipse(px+p.w/2,py+p.h/2,p.w/2,p.h/2,0,0,Math.PI*2);
        ctx.fill();
    });

    // Houses
    houses.forEach(h=>{
        let hx = h.x-offsetX, hy=h.y-offsetY;
        ctx.fillStyle="#8d6e63";
        ctx.fillRect(hx, hy, h.w, h.h);
        ctx.fillStyle="rgba(0,0,0,0.15)";
        ctx.fillRect(hx+h.w-8, hy, 8, h.h);
    });

    // Player
    const px = canvas.width/2, py=canvas.height/2;
    ctx.fillStyle="rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.arc(px+3, py+5, player.radius,0,Math.PI*2);
    ctx.fill();

    let gradP = ctx.createRadialGradient(px-5, py-5, 5, px, py, player.radius);
    gradP.addColorStop(0, "#4a90ff"); gradP.addColorStop(1,"#0d47a1");
    ctx.fillStyle=gradP;
    ctx.beginPath();
    ctx.arc(px, py, player.radius,0,Math.PI*2);
    ctx.fill();

    let angle = Math.atan2(mouse.y - py, mouse.x - px);
    ctx.strokeStyle="black"; ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(px,py); ctx.lineTo(px+Math.cos(angle)*25, py+Math.sin(angle)*25);
    ctx.stroke();

    // Bullets
    ctx.fillStyle="yellow";
    bullets.forEach(b=>{
        ctx.beginPath();
        ctx.arc(b.x-offsetX, b.y-offsetY, b.radius,0,Math.PI*2);
        ctx.fill();
    });

    // Zombies
    zombies.forEach(z=>{
        let zx=z.x-offsetX, zy=z.y-offsetY;
        ctx.fillStyle="rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.arc(zx+2, zy+3, z.radius,0,Math.PI*2); ctx.fill();

        let gradZ = ctx.createRadialGradient(zx-4, zy-4, 4, zx, zy, z.radius);
        gradZ.addColorStop(0, "#66bb6a"); gradZ.addColorStop(1,"#1b5e20");
        ctx.fillStyle=gradZ; ctx.beginPath(); ctx.arc(zx, zy, z.radius,0,Math.PI*2); ctx.fill();

        if(z.type==="helmet"){
            ctx.strokeStyle="gray"; ctx.lineWidth=3;
            ctx.beginPath(); ctx.arc(zx, zy, z.radius-2,0,Math.PI*2); ctx.stroke();
        }
    });

    // Particles
    particles.forEach(p=>{
        ctx.fillStyle="red";
        ctx.beginPath();
        ctx.arc(p.x-offsetX, p.y-offsetY, p.radius,0,Math.PI*2);
        ctx.fill();
    });

    // HUD
    ctx.fillStyle="white";
    ctx.font="18px Arial";
    ctx.textAlign="left";
    ctx.fillText(`Score: ${score}`,10,20);
    ctx.fillText(`Wave: ${wave}`,10,40);
    ctx.fillText(`Weapon: ${weapons[player.weapon].name} Ammo: ${isFinite(weapons[player.weapon].ammo)?weapons[player.weapon].ammo:"∞"}`,10,60);
}

// Game loop
function gameLoop(){
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
