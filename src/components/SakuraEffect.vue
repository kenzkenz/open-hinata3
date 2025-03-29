<template>
  <canvas ref="canvas" :style="canvasStyle"></canvas>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';

const canvas = ref(null);
const canvasStyle = ref({
  opacity: 1,
  transition: 'opacity 2s ease-out',
});

let ctx;
let width, height;
let animationFrameId;
const petals = [];
const petalCount = 50;
const petalImage = new Image();
// petalImage.src = 'https://chicodeza.com/wordpress/wp-content/uploads/sakurasozai-09.png';
petalImage.src = 'https://kenzkenz.xsrv.jp/open-hinata3/img/sakurasozai-09.png';

function random(min, max) {
  return Math.random() * (max - min) + min;
}

class Petal {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = random(0, width);
    this.y = random(-height, 0);
    this.radius = random(10, 30);
    this.speedX = random(-1, 1);
    this.speedY = random(1, 3);
    this.angle = random(0, 2 * Math.PI);
    this.spin = random(-0.02, 0.02);
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.spin;
    if (this.y > height || this.x < -50 || this.x > width + 50) {
      this.reset();
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.drawImage(petalImage, -this.radius / 2, -this.radius / 2, this.radius, this.radius);
    ctx.restore();
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  for (let petal of petals) {
    petal.update();
    petal.draw();
  }
  animationFrameId = requestAnimationFrame(animate);
}

function resizeCanvas() {
  width = canvas.value.width = window.innerWidth;
  height = canvas.value.height = window.innerHeight;
}

onMounted(() => {
  ctx = canvas.value.getContext('2d');
  resizeCanvas();
  for (let i = 0; i < petalCount; i++) {
    petals.push(new Petal());
  }
  petalImage.onload = () => {
    animate();
    // 停止用のタイマー（20秒後）＋ フェードアウト
    setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      canvasStyle.value.opacity = 0;
    }, 20000);
  };
  window.addEventListener('resize', resizeCanvas);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId);
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style scoped>
canvas {
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;
  pointer-events: none;
  background: transparent;
}
</style>