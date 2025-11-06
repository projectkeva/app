// PixelSplash.js
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Canvas from 'react-native-canvas';

export default function PixelSplash({ onFinish }) {
  const handleCanvas = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = 1080;
    const h = canvas.height = 1920;
    let t = 0;

    const draw = (alpha) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, w, h);

      const text = 'PROJECT KEVA';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = "bold 64px monospace";
      ctx.globalAlpha = alpha;

      // 模拟从蓝到紫到金的分段渐变
      const colors = ['#4aa5ff', '#8c7aff', '#f2c55c'];
      const segments = 30; // 越多越平滑
      for (let i = 0; i < segments; i++) {
        const ratio = i / segments;
        const colorIndex = Math.floor(ratio * (colors.length - 1));
        ctx.fillStyle = colors[colorIndex];
        ctx.save();
        ctx.beginPath();
        ctx.rect(w * ratio - w / (2 * segments), 0, w / segments, h);
        ctx.clip();
        ctx.fillText(text, w / 2, h / 2);
        ctx.restore();
      }
    };

    const animate = () => {
      t += 0.02;
      const alpha = Math.min(1, t);
      draw(alpha);
      if (t < 1.5) requestAnimationFrame(animate);
      else setTimeout(onFinish, 500);
    };
    animate();
  };

  return (
    <View style={styles.container}>
      <Canvas ref={handleCanvas} style={styles.canvas}/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
  canvas: { width: '100%', height: '100%' },
});
