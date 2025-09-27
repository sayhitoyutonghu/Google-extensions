// Simple chart implementation without external dependencies
(function(){
  window.Chart = class {
    constructor(ctx, config) {
      this.ctx = ctx;
      this.config = config;
      this.render();
    }
    render() {
      const { data, options } = this.config;
      const canvas = this.ctx;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      if (this.config.type === 'line') this.renderLine(ctx, data, rect);
      if (this.config.type === 'bar') this.renderBar(ctx, data, rect);
      if (this.config.type === 'doughnut') this.renderDoughnut(ctx, data, rect);
    }
    renderLine(ctx, data, rect) {
      const datasets = data.datasets;
      const labels = data.labels;
      const max = Math.max(...datasets.flatMap(d => d.data), 1);
      const stepX = rect.width / Math.max(labels.length - 1, 1);
      const stepY = rect.height / max;
      
      datasets.forEach((dataset) => {
        ctx.strokeStyle = dataset.borderColor || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        dataset.data.forEach((value, j) => {
          const x = j * stepX;
          const y = rect.height - (value * stepY);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    }
    renderBar(ctx, data, rect) {
      const labels = data.labels;
      const dataset = data.datasets[0] || { data: [] };
      const max = Math.max(...dataset.data, 1);
      const barWidth = rect.width / Math.max(labels.length, 1) * 0.8;
      const stepY = rect.height / max;
      
      labels.forEach((label, i) => {
        const value = dataset.data[i] || 0;
        const x = i * (rect.width / Math.max(labels.length, 1)) + (rect.width / Math.max(labels.length, 1) - barWidth) / 2;
        const y = rect.height - (value * stepY);
        const color = (dataset.backgroundColor && dataset.backgroundColor[i]) || '#99f6e4';
        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, value * stepY);
      });
    }
    renderDoughnut(ctx, data, rect) {
      const dataset = (data.datasets && data.datasets[0]) || { data: [], backgroundColor: [] };
      const total = dataset.data.reduce((a, b) => a + b, 0) || 1;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(centerX, centerY) * 0.8;
      let currentAngle = 0;
      
      dataset.data.forEach((value, i) => {
        const sliceAngle = (value / total) * 2 * Math.PI;
        const color = dataset.backgroundColor[i] || '#6b7280';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fill();
        currentAngle += sliceAngle;
      });
    }
    destroy() {}
  };
})();
