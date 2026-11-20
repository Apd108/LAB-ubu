import './style.css';
import { initLabScene } from './scene/labScene';

const container = document.getElementById('app') || document.body;
const lab = initLabScene(container);

// Expose camera and breadboard rect projection helper for tour and automation
(window as any).__labScene = lab;
