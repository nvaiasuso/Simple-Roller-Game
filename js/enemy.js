// =====================================================================  
// enemy.js -- sleeper enemies: patrol, question, run, and shoot  
// =====================================================================  
  
var Enemy = {  
  list: [],  
  bullets: []  
};  
  
// find every "e" in the level and turn it into a real enemy  
Enemy.reset = function () {  
  Enemy.list = [];  
  Enemy.bullets = [];  
  for (var row = 0; row < CONFIG.ROWS; row++) {  
    for (var col = 0; col < Level.cols; col++) {  
      if (Level.charAt(col, row) === "e") {  
        Enemy.list.push({  
          x: col * CONFIG.TILE,  
          y: row * CONFIG.TILE,  
          state: "patrol",        // patrol, question, or run  
          timer: 0,               // how long it has seen you  
          dir: 1,                 // 1 = right, -1 = left  
          alerted: false,         // has it called the others?  
          shootTimer: 0  
        });  
        Enemy.setTile(col, row, ".");  
      }  
    }  
  }  
};  
  
// Level.grid is strings, so rebuild the row to swap one character  
Enemy.setTile = function (col, row, character) {  
  var line = Level.grid[row];  
  Level.grid[row] = line.substring(0, col) + character + line.substring(col + 1);  
};  
  
Enemy.update = function () {  
  var size = CONFIG.PLAYER_SIZE;  
  
  for (var i = 0; i < Enemy.list.length; i++) {  
    var e = Enemy.list[i];  
    var canSee = Enemy.playerVisible(e);  
  
    if (e.state === "patrol") {  
      // walk back and forth, turn at walls  
      var nextX = e.x + e.dir * CONFIG.ENEMY_SPEED;  
      if (Collide.hitsSolid(nextX, e.y, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE)) {  
        e.dir = -e.dir;  
      } else {  
        e.x = nextX;  
      }  
      // glimpsed or heard nearby -> question  
      if (canSee || Enemy.playerNear(e)) {  
        e.state = "question";  
        e.timer = 0;  
      }  
  
    } else if (e.state === "question") {  
      // stand still and check things out  
      e.timer = canSee ? e.timer + 1 : 0;  
      if (e.timer >= CONFIG.SPOT_FRAMES) {  
        e.state = "run";  
        if (!e.alerted) {  
          e.alerted = true;  
          Enemy.alertOthers(e);  
        }  
      }  
      if (!canSee && !Enemy.playerNear(e)) {  
        e.state = "patrol"; // lost interest  
      }  
  
    } else if (e.state === "run") {  
      // chase, lead the shots, and keep shooting  
      if (Player.x < e.x) { e.x = e.x - CONFIG.ENEMY_SPEED; }  
      if (Player.x > e.x + CONFIG.ENEMY_SIZE) { e.x = e.x + CONFIG.ENEMY_SPEED; }  
      e.shootTimer = e.shootTimer - 1;  
      if (canSee && e.shootTimer <= 0) {  
        Enemy.shoot(e);  
        e.shootTimer = CONFIG.ENEMY_SHOOT_FRAMES;  
      }  
      if (!canSee && !Enemy.playerNear(e)) {  
        e.state = "patrol";  
      }  
    }  
  }  
  
  // move every bullet, kill the player, remove spent bullets  
  for (var b = Enemy.bullets.length - 1; b >= 0; b--) {  
    var bullet = Enemy.bullets[b];  
    bullet.x = bullet.x + bullet.vx;  
    bullet.y = bullet.y + bullet.vy;  
    if (Collide.hitsSolid(bullet.x, bullet.y, 8, 8) ||  
        bullet.x < 0 || bullet.x > Level.pixelWidth()) {  
      Enemy.bullets.splice(b, 1);  
    } else if (Collide.hitsSolid === undefined) {  
      // (never happens -- kept simple)  
    } else if (bullet.x + 8 > Player.x && bullet.x < Player.x + size &&  
               bullet.y + 8 > Player.y && bullet.y < Player.y + size) {  
      Enemy.bullets.splice(b, 1);  
      Game.startLevel(Game.levelNumber); // a hit restarts the level  
    }  
  }  
};  
  
// true if the enemy has a clear line to the player on the same band of screen  
Enemy.playerVisible = function (e) {  
  var size = CONFIG.PLAYER_SIZE;  
  if (Math.abs((e.y + CONFIG.ENEMY_SIZE / 2) - (Player.y + size / 2)) > CONFIG.TILE * 2) {  
    return false; // too far above or below to see  
  }  
  return Math.abs(Player.x - e.x) < CONFIG.SPOT_DISTANCE;  
};  
  
// true if the player is close enough that the enemy "hears" them  
Enemy.playerNear = function (e) {  
  var dx = Player.x - e.x;  
  var dy = Player.y - e.y;  
  return (dx * dx + dy * dy) < CONFIG.HEAR_DISTANCE * CONFIG.HEAR_DISTANCE;  
};  
  
// getting spotted calls every other enemy to run  
Enemy.alertOthers = function (spotter) {  
  for (var i = 0; i < Enemy.list.length; i++) {  
    var e = Enemy.list[i];  
    if (e !== spotter && e.state === "patrol") {  
      e.state = "question";  
      e.timer = CONFIG.SPOT_FRAMES - 1;  
      e.alerted = true;  
    }  
  }  
};  
  
// one bullet, aimed where the player WILL be, not where they are  
Enemy.shoot = function (e) {  
  var ex = e.x + CONFIG.ENEMY_SIZE / 2;  
  var ey = e.y + CONFIG.ENEMY_SIZE / 2;  
  var px = Player.x + CONFIG.PLAYER_SIZE / 2 + Player.vx * CONFIG.LEAD_FRAMES;  
  var py = Player.y + CONFIG.PLAYER_SIZE / 2;  
  var dx = px - ex;  
  var dy = py - ey;  
  var dist = Math.sqrt(dx * dx + dy * dy);  
  if (dist === 0) { return; }  
  Enemy.bullets.push({  
    x: ex - 4,  
    y: ey - 4,  
    vx: dx / dist * CONFIG.BULLET_SPEED,  
    vy: dy / dist * CONFIG.BULLET_SPEED  
  });  
};  
  
Enemy.draw = function () {  
  var ctx = Draw.ctx;  
  for (var i = 0; i < Enemy.list.length; i++) {  
    var e = Enemy.list[i];  
    // asleep = plain circle, question = circle with a dot, run = circle with a line "eye"  
    ctx.beginPath();  
    ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2, e.y + CONFIG.ENEMY_SIZE / 2,  
            CONFIG.ENEMY_SIZE / 2, 0, Math.PI * 2);  
    ctx.fillStyle = "#ffffff";  
    ctx.fill();  
    ctx.lineWidth = CONFIG.LINE_WIDTH;  
    ctx.strokeStyle = "#000000";  
    ctx.stroke();  
    if (e.state === "question" || e.state === "run") {  
      ctx.fillStyle = "#000000";  
      ctx.beginPath();  
      ctx.arc(e.x + CONFIG.ENEMY_SIZE / 2 + e.dir * 6,  
              e.y + CONFIG.ENEMY_SIZE / 2, 4, 0, Math.PI * 2);  
      ctx.fill();  
    }  
  }  
  // bullets are small black squares  
  ctx.fillStyle = "#000000";  
  for (var b = 0; b < Enemy.bullets.length; b++) {  
    ctx.fillRect(Enemy.bullets[b].x, Enemy.bullets[b].y, 8, 8);  
  }  
};  
