window.onload = function () {
  const canvas = document.getElementById('trafficCanvas');
  const ctx = canvas.getContext('2d');
  let animationFrameId;
  let isRunning = false;
  let isPaused = false;

  const updateCanvasSize = () => {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth * 0.9;
    canvas.height = canvas.width;
  };

  window.addEventListener('resize', updateCanvasSize);
  updateCanvasSize();

  // Constants
  const ROAD_WIDTH = 100;
  const LANE_WIDTH = ROAD_WIDTH / 2;
  const INTERSECTION_SIZE = ROAD_WIDTH;
  const LIGHT_DURATION_BASE = 200; // Base green light duration (frames)
  const QUEUE_THRESHOLD = 5;

  // Roads
  const roads = {
    'N': { start: { x: canvas.width / 2, y: 0 }, end: { x: canvas.width / 2, y: canvas.height / 2 - INTERSECTION_SIZE / 2 } },
    'S': { start: { x: canvas.width / 2, y: canvas.height }, end: { x: canvas.width / 2, y: canvas.height / 2 + INTERSECTION_SIZE / 2 } },
    'W': { start: { x: 0, y: canvas.height / 2 }, end: { x: canvas.width / 2 - INTERSECTION_SIZE / 2, y: canvas.height / 2 } },
    'E': { start: { x: canvas.width, y: canvas.height / 2 }, end: { x: canvas.width / 2 + INTERSECTION_SIZE / 2, y: canvas.height / 2 } }
  };

  const trafficLights = {
    'N': { state: 'red', duration: LIGHT_DURATION_BASE, timer: 0, queue: [] },
    'S': { state: 'red', duration: LIGHT_DURATION_BASE, timer: 0, queue: [] },
    'W': { state: 'green', duration: LIGHT_DURATION_BASE, timer: LIGHT_DURATION_BASE, queue: [] },
    'E': { state: 'green', duration: LIGHT_DURATION_BASE, timer: LIGHT_DURATION_BASE, queue: [] }
  };

  let currentGreenGroup = ['W', 'E']; // Start with East-West

  class Vehicle {
    constructor(id, road) {
      this.id = id;
      this.road = road;
      this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
      this.speed = Math.random() * 0.5 + 1;
      this.position = { ...roads[road].start };
      this.stopped = false;
      this.distanceToIntersection = Infinity;

      // Lane offset
      const isHorizontal = road === 'W' || road === 'E';
      const offset = isHorizontal ? -LANE_WIDTH / 4 : LANE_WIDTH / 4;
      if (road === 'E' || road === 'S') {
        if (isHorizontal) this.position.y += offset;
        else this.position.x += offset;
      } else {
        if (isHorizontal) this.position.y -= offset;
        else this.position.x -= offset;
      }
    }

    update() {
      this.distanceToIntersection = this.calculateDistanceToIntersection();
      const light = trafficLights[this.road];
      const isAtStopLine = this.distanceToIntersection < 2;
      const lightIsRed = light.state === 'red' || light.state === 'yellow';

      if (lightIsRed && isAtStopLine && !this.stopped) {
        this.stopped = true;
        light.queue.push(this);
        this.speed = 0;
      }

      if (!this.stopped) {
        this.move();
      } else if (light.state === 'green' || this.distanceToIntersection > 2) {
        this.stopped = false;
        this.speed = Math.random() * 0.5 + 1;
        this.move();
      }
    }

    move() {
      if (this.road === 'N') this.position.y += this.speed;
      else if (this.road === 'S') this.position.y -= this.speed;
      else if (this.road === 'W') this.position.x += this.speed;
      else if (this.road === 'E') this.position.x -= this.speed;
    }

    calculateDistanceToIntersection() {
      if (this.road === 'N') return (canvas.height / 2 - INTERSECTION_SIZE / 2) - this.position.y;
      if (this.road === 'S') return this.position.y - (canvas.height / 2 + INTERSECTION_SIZE / 2);
      if (this.road === 'W') return (canvas.width / 2 - INTERSECTION_SIZE / 2) - this.position.x;
      if (this.road === 'E') return this.position.x - (canvas.width / 2 + INTERSECTION_SIZE / 2);
      return Infinity;
    }

    draw() {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let vehicles = [];
  let vehicleIdCounter = 0;
  let lastVehicleSpawnTime = Date.now();
  const spawnInterval = 100; // ms

  const drawRoads = () => {
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(0, canvas.height / 2 - ROAD_WIDTH / 2, canvas.width, ROAD_WIDTH);
    ctx.fillRect(canvas.width / 2 - ROAD_WIDTH / 2, 0, ROAD_WIDTH, canvas.height);

    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width / 2 - INTERSECTION_SIZE / 2, canvas.height / 2);
    ctx.moveTo(canvas.width, canvas.height / 2);
    ctx.lineTo(canvas.width / 2 + INTERSECTION_SIZE / 2, canvas.height / 2);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height / 2 - INTERSECTION_SIZE / 2);
    ctx.moveTo(canvas.width / 2, canvas.height);
    ctx.lineTo(canvas.width / 2, canvas.height / 2 + INTERSECTION_SIZE / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const drawTrafficLights = () => {
    const lightPos = {
      'N': { x: canvas.width / 2 - LANE_WIDTH / 2 - 10, y: canvas.height / 2 - INTERSECTION_SIZE / 2 - 20 },
      'S': { x: canvas.width / 2 + LANE_WIDTH / 2 + 10, y: canvas.height / 2 + INTERSECTION_SIZE / 2 + 20 },
      'W': { x: canvas.width / 2 - INTERSECTION_SIZE / 2 - 20, y: canvas.height / 2 + LANE_WIDTH / 2 + 10 },
      'E': { x: canvas.width / 2 + INTERSECTION_SIZE / 2 + 20, y: canvas.height / 2 - LANE_WIDTH / 2 - 10 }
    };

    for (const road in trafficLights) {
      const light = trafficLights[road];
      const pos = lightPos[road];

      ctx.fillStyle = '#6b7280';
      ctx.fillRect(pos.x - 5, pos.y - 10, 10, 20);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);

      if (light.state === 'green') ctx.fillStyle = '#22c55e';
      else if (light.state === 'yellow') ctx.fillStyle = '#f59e0b';
      else ctx.fillStyle = '#ef4444';

      ctx.fill();
    }
  };

  const updateTrafficLights = () => {
    currentGreenGroup.forEach(road => {
      const light = trafficLights[road];
      light.duration = light.queue.length > QUEUE_THRESHOLD ? LIGHT_DURATION_BASE * 2 : LIGHT_DURATION_BASE;
    });

    for (const road in trafficLights) {
      if (trafficLights[road].state === 'green' || trafficLights[road].state === 'yellow') {
        trafficLights[road].timer--;
        if (trafficLights[road].timer <= 0) {
          if (trafficLights[road].state === 'green') {
            trafficLights[road].state = 'yellow';
            trafficLights[road].timer = 60;
          } else {
            trafficLights[road].state = 'red';
            trafficLights[road].timer = 0;
          }
        }
      }
    }

    const allRed = currentGreenGroup.every(road => trafficLights[road].state === 'red');
    if (allRed) {
      currentGreenGroup = currentGreenGroup[0] === 'W' ? ['N', 'S'] : ['W', 'E'];
      currentGreenGroup.forEach(road => {
        trafficLights[road].state = 'green';
        trafficLights[road].timer = trafficLights[road].duration;
      });
    }
  };

  const updateMetrics = () => {
    document.getElementById('queue-N').textContent = trafficLights.N.queue.length;
    document.getElementById('queue-S').textContent = trafficLights.S.queue.length;
    document.getElementById('queue-W').textContent = trafficLights.W.queue.length;
    document.getElementById('queue-E').textContent = trafficLights.E.queue.length;
  };

  const gameLoop = () => {
    if (!isRunning || isPaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoads();
    drawTrafficLights();

    if (Date.now() - lastVehicleSpawnTime > spawnInterval) {
      const roadsList = Object.keys(roads);
      const randomRoad = roadsList[Math.floor(Math.random() * roadsList.length)];
      vehicles.push(new Vehicle(vehicleIdCounter++, randomRoad));
      lastVehicleSpawnTime = Date.now();
    }

    vehicles.forEach(v => v.update());
    vehicles.forEach(v => v.draw());

    vehicles = vehicles.filter(v =>
      v.position.x > -10 && v.position.x < canvas.width + 10 &&
      v.position.y > -10 && v.position.y < canvas.height + 10
    );

    updateTrafficLights();
    updateMetrics();

    animationFrameId = requestAnimationFrame(gameLoop);
  };

  // Buttons
  document.getElementById('startButton').addEventListener('click', () => {
    if (!isRunning) {
      isRunning = true;
      isPaused = false;
      gameLoop();
      document.getElementById('startButton').disabled = true;
      document.getElementById('pauseButton').disabled = false;
      document.getElementById('stopButton').disabled = false;
    }
  });

  document.getElementById('pauseButton').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pauseButton').textContent = isPaused ? "Resume Simulation" : "Pause Simulation";
  });

  document.getElementById('stopButton').addEventListener('click', () => {
    isRunning = false;
    isPaused = false;
    cancelAnimationFrame(animationFrameId);
    vehicles = [];
    for (const road in trafficLights) trafficLights[road].queue = [];
    updateMetrics();
    document.getElementById('startButton').disabled = false;
    document.getElementById('pauseButton').disabled = true;
    document.getElementById('stopButton').disabled = true;
  });

  // Start immediately
  document.getElementById('pauseButton').disabled = true;
  document.getElementById('stopButton').disabled = true;
  document.getElementById('startButton').click();
};
