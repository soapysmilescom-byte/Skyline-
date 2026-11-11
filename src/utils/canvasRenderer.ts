/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BirthdayProfile, StudioConfig } from '../types.ts';
import { ASSET_MAP, TRAIN_SCENES } from '../constants/presets.ts';

const loadedImageCache: Record<string, HTMLImageElement> = {};

export function preloadStudioImages(): Promise<void> {
  const promises = Object.values(ASSET_MAP).map((src) => {
    if (loadedImageCache[src]) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        loadedImageCache[src] = img;
        resolve();
      };
      img.onerror = () => {
        resolve();
      };
      img.src = src;
    });
  });
  return Promise.all(promises).then(() => {});
}

interface Particle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speedY: number;
  speedX: number;
  color: string;
}

const sparkleParticles: Particle[] = Array.from({ length: 45 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: 2 + Math.random() * 4,
  alpha: 0.3 + Math.random() * 0.7,
  speedY: -0.001 - Math.random() * 0.002,
  speedX: (Math.random() - 0.5) * 0.001,
  color: ['#FFD700', '#FFB6C1', '#FFFFFF', '#E6E6FA'][Math.floor(Math.random() * 4)],
}));

const steamPuffs = [
  { x: 0.5, y: 0.18, scale: 0.8, alpha: 0.4, age: 0 },
  { x: 0.52, y: 0.14, scale: 1.2, alpha: 0.3, age: 1 },
  { x: 0.49, y: 0.1, scale: 1.6, alpha: 0.15, age: 2 },
];

export function renderStudioCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  profile: BirthdayProfile,
  config: StudioConfig,
  customPhoto: HTMLImageElement | null = null,
  videoElement: HTMLVideoElement | null = null
) {
  ctx.clearRect(0, 0, width, height);

  if (profile.themeId === 'jungle_safari' || profile.videoSource) {
    renderSafariVideo(ctx, width, height, time, profile, config, customPhoto, videoElement);
    return;
  }

  let activeScene = TRAIN_SCENES[0];
  for (const s of TRAIN_SCENES) {
    if (time >= s.startTime && time < s.startTime + s.duration) {
      activeScene = s;
      break;
    }
  }
  if (time >= TRAIN_SCENES[TRAIN_SCENES.length - 1].startTime + TRAIN_SCENES[TRAIN_SCENES.length - 1].duration) {
    activeScene = TRAIN_SCENES[TRAIN_SCENES.length - 1];
  }

  const progress = Math.max(0, Math.min(1, (time - activeScene.startTime) / activeScene.duration));

  let bgSrc = ASSET_MAP.locomotiveFront;
  if (profile.themeId === 'cosmic_space') bgSrc = ASSET_MAP.spaceGalaxy;
  else if (profile.themeId === 'under_sea') bgSrc = ASSET_MAP.oceanReef;
  else if (profile.themeId === 'teddy_clouds') bgSrc = ASSET_MAP.teddyClouds;
  else if (profile.themeId === 'unicorn_rainbow') bgSrc = ASSET_MAP.unicornRainbow;
  else if (profile.themeId === 'racing_champion') bgSrc = ASSET_MAP.racingChampion;
  else if (profile.themeId === 'mint_safari') {
    bgSrc = activeScene.type === 'blessing_card' ? ASSET_MAP.royalFrame : ASSET_MAP.babyGarden;
  } else if (profile.themeId === 'royal_blue') {
    if (activeScene.type === 'baby_spotlight') bgSrc = ASSET_MAP.babyBoy;
    else if (activeScene.type === 'blessing_card') bgSrc = ASSET_MAP.royalFrame;
    else if (activeScene.type === 'baby_boarding') bgSrc = ASSET_MAP.babySteps;
    else bgSrc = activeScene.type === 'intro_locomotive' ? ASSET_MAP.locomotiveFront : ASSET_MAP.trainCarriage;
  } else {
    // Fairytale pink & default
    if (activeScene.type === 'baby_spotlight') {
      bgSrc = profile.gender === 'boy' ? ASSET_MAP.babyBoy : ASSET_MAP.babyGarden;
    } else if (activeScene.type === 'date_time_carriage' || activeScene.type === 'celebrate_carriage' || activeScene.type === 'venue_carriage') {
      bgSrc = ASSET_MAP.trainCarriage;
    } else if (activeScene.type === 'baby_boarding') {
      bgSrc = ASSET_MAP.babySteps;
    } else if (activeScene.type === 'blessing_card') {
      bgSrc = ASSET_MAP.royalFrame;
    }
  }

  const bgImg = loadedImageCache[bgSrc];
  ctx.save();

  // Gentle 3D motion pan & zoom
  const zoom = 1 + Math.sin(time * 0.8) * 0.02 + progress * 0.03;
  const panX = Math.sin(time * 0.5) * (width * 0.015);
  const panY = Math.cos(time * 0.4) * (height * 0.008);

  ctx.translate(width / 2 + panX, height / 2 + panY);
  ctx.scale(zoom, zoom);
  ctx.translate(-width / 2, -height / 2);

  if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
    const scaleX = width / bgImg.naturalWidth;
    const scaleY = height / bgImg.naturalHeight;
    const scale = Math.max(scaleX, scaleY);
    const offsetX = (width - bgImg.naturalWidth * scale) / 2;
    const offsetY = (height - bgImg.naturalHeight * scale) / 2;
    ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth, bgImg.naturalHeight, offsetX, offsetY, bgImg.naturalWidth * scale, bgImg.naturalHeight * scale);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#fbcfe8');
    gradient.addColorStop(0.5, '#f472b6');
    gradient.addColorStop(1, '#db2777');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw scene contents
  switch (activeScene.type) {
    case 'intro_locomotive':
      drawIntroLocomotive(ctx, width, height, progress, profile, time);
      break;
    case 'baby_spotlight':
      drawBabySpotlight(ctx, width, height, progress, profile, time, customPhoto);
      break;
    case 'date_time_carriage':
      drawDateTimeCarriage(ctx, width, height, progress, profile);
      break;
    case 'celebrate_carriage':
      drawCelebrateCarriage(ctx, width, height, progress, profile);
      break;
    case 'baby_boarding':
      drawBabyBoarding(ctx, width, height, progress, profile);
      break;
    case 'venue_carriage':
      drawVenueCarriage(ctx, width, height, progress, profile);
      break;
    case 'blessing_card':
      drawBlessingCard(ctx, width, height, progress, profile);
      break;
  }

  ctx.restore();

  drawSparkles(ctx, width, height, time, config.sparkleIntensity);
  drawVignette(ctx, width, height);
}

function drawIntroLocomotive(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, profile: BirthdayProfile, time: number) {
  const centerX = width * 0.5;
  const centerY = height * 0.44;
  const radius = width * 0.31;
  const pulse = 1 + Math.sin(time * 3) * 0.015;
  const alpha = Math.min(1, progress * 3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, centerY);
  ctx.scale(pulse, pulse);

  const grad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.3);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.7, 'rgba(255, 240, 245, 0.88)');
  grad.addColorStop(1, 'rgba(255, 215, 0, 0.4)');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = width * 0.015;
  ctx.strokeStyle = '#D4AF37';
  ctx.stroke();

  ctx.lineWidth = width * 0.006;
  ctx.strokeStyle = '#FFF8DC';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.94, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = width * 0.012;
  ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.89, 0, Math.PI * 2);
  ctx.stroke();

  const isBoy = profile.gender === 'boy';
  const theme = profile.themeId;
  const nameSize = Math.round(width * 0.13);

  ctx.font = `italic 700 ${nameSize}px "Great Vibes", "Playfair Display", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textGrad = ctx.createLinearGradient(0, -radius * 0.45, 0, -radius * 0.05);
  let subColor = '#831843';
  let decor = '🌸 ♥ 🌸';

  if (theme === 'cosmic_space') {
    textGrad.addColorStop(0, isBoy ? '#38bdf8' : '#e879f9');
    textGrad.addColorStop(1, isBoy ? '#6366f1' : '#c084fc');
    subColor = '#1e3a8a';
    decor = '★ 🚀 ★';
  } else if (theme === 'under_sea') {
    textGrad.addColorStop(0, '#06b6d4');
    textGrad.addColorStop(1, isBoy ? '#0284c7' : '#0d9488');
    subColor = '#0f766e';
    decor = '★ 🐬 ★';
  } else if (theme === 'racing_champion') {
    textGrad.addColorStop(0, '#ef4444');
    textGrad.addColorStop(1, '#b91c1c');
    subColor = '#7f1d1d';
    decor = '🏁 🏆 🏁';
  } else if (theme === 'teddy_clouds') {
    if (isBoy) {
      textGrad.addColorStop(0, '#0284c7');
      textGrad.addColorStop(1, '#0369a1');
      subColor = '#075985';
    } else {
      textGrad.addColorStop(0, '#f43f5e');
      textGrad.addColorStop(1, '#be185d');
      subColor = '#9f1239';
    }
    decor = '☁️ 🧸 ☁️';
  } else if (theme === 'unicorn_rainbow') {
    textGrad.addColorStop(0, '#d946ef');
    textGrad.addColorStop(1, '#9333ea');
    subColor = '#701a75';
    decor = '✨ 🦄 ✨';
  } else if (theme === 'royal_blue') {
    textGrad.addColorStop(0, '#1d4ed8');
    textGrad.addColorStop(1, '#1e3a8a');
    subColor = '#172554';
    decor = '👑 ⭐ 👑';
  } else if (theme === 'mint_safari') {
    textGrad.addColorStop(0, '#0d9488');
    textGrad.addColorStop(1, '#047857');
    subColor = '#065f46';
    decor = '🍃 🌼 🍃';
  } else {
    textGrad.addColorStop(0, '#E11D48');
    textGrad.addColorStop(1, '#BE185D');
    subColor = '#831843';
    decor = '🌸 ♥ 🌸';
  }

  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 8;
  ctx.fillStyle = textGrad;
  ctx.fillText(profile.name || 'Our Little Star', 0, -radius * 0.22);
  ctx.shadowBlur = 0;

  const turningSize = Math.round(width * 0.05);
  ctx.font = `600 ${turningSize}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = subColor;
  ctx.fillText('is turning', 0, radius * 0.08);

  const oneSize = Math.round(width * 0.16);
  ctx.font = `800 ${oneSize}px "Playfair Display", Georgia, serif`;
  const oneGrad = ctx.createLinearGradient(0, radius * 0.2, 0, radius * 0.65);
  if (isBoy || theme === 'royal_blue' || theme === 'racing_champion' || theme === 'cosmic_space') {
    oneGrad.addColorStop(0, '#f59e0b');
    oneGrad.addColorStop(0.5, '#d97706');
    oneGrad.addColorStop(1, '#b45309');
  } else {
    oneGrad.addColorStop(0, '#D946EF');
    oneGrad.addColorStop(0.5, '#EC4899');
    oneGrad.addColorStop(1, '#BE185D');
  }
  ctx.fillStyle = oneGrad;
  ctx.shadowColor = 'rgba(217, 70, 239, 0.3)';
  ctx.shadowBlur = 10;
  ctx.fillText('ONE!', 0, radius * 0.42);
  ctx.shadowBlur = 4;

  ctx.fillStyle = '#F59E0B';
  ctx.font = `${Math.round(width * 0.045)}px sans-serif`;
  ctx.fillText(decor, 0, radius * 0.72);

  ctx.restore();
  drawSteamPuffs(ctx, width, height, time);
}

function drawBabySpotlight(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number,
  profile: BirthdayProfile,
  time: number,
  customPhoto: HTMLImageElement | null
) {
  if (customPhoto && customPhoto.complete && customPhoto.naturalWidth > 0) {
    const cx = width * 0.5;
    const cy = height * 0.42;
    const r = width * 0.32;
    const bob = Math.sin(time * 2) * 8;

    ctx.save();
    ctx.translate(cx, cy + bob);

    const aura = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 1.3);
    aura.addColorStop(0, 'rgba(255, 235, 205, 0.8)');
    aura.addColorStop(1, 'rgba(255, 182, 193, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    const scale = Math.max((r * 2) / customPhoto.naturalWidth, (r * 2) / customPhoto.naturalHeight);
    const sw = customPhoto.naturalWidth * scale;
    const sh = customPhoto.naturalHeight * scale;
    ctx.drawImage(customPhoto, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();

    ctx.lineWidth = width * 0.02;
    ctx.strokeStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = width * 0.008;
    ctx.strokeStyle = '#FFF8DC';
    ctx.beginPath();
    ctx.arc(0, 0, r - width * 0.015, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = `${Math.round(width * 0.12)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('👑', 0, -r * 0.95);
    ctx.restore();
  }

  const tagY = height * 0.78;
  const tagAlpha = Math.min(1, progress * 2.5);

  ctx.save();
  ctx.globalAlpha = tagAlpha;
  ctx.translate(width * 0.5, tagY);

  const tagW = width * 0.85;
  const tagH = height * 0.085;
  const radius = 20;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, -tagW / 2, -tagH / 2, tagW, tagH, radius);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FBCFE8';
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9D174D';
  ctx.font = `italic 700 ${Math.round(width * 0.075)}px "Great Vibes", cursive`;

  const title = profile.gender === 'boy' ? 'Our Little Prince' : 'Our Little Princess';
  ctx.fillText(profile.name || title, 0, -tagH * 0.12);

  ctx.fillStyle = '#4B5563';
  ctx.font = `600 ${Math.round(width * 0.038)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillText('1st Birthday Celebration', 0, tagH * 0.28);

  ctx.restore();
}

function drawDateTimeCarriage(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, profile: BirthdayProfile) {
  drawCarriageBox(ctx, width, height, progress, () => {
    ctx.textAlign = 'center';
    ctx.font = `italic 700 ${Math.round(width * 0.11)}px "Great Vibes", cursive`;
    ctx.fillStyle = '#9D174D';
    ctx.shadowColor = 'rgba(244, 114, 182, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText('Date & Time', 0, -height * 0.06);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-width * 0.25, -height * 0.02);
    ctx.lineTo(width * 0.25, -height * 0.02);
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.fillText('✦', 0, -height * 0.012);

    ctx.font = `700 ${Math.round(width * 0.075)}px "Playfair Display", serif`;
    ctx.fillStyle = '#831843';
    ctx.fillText(profile.date || '15 June 2026', 0, height * 0.035);

    ctx.font = `600 ${Math.round(width * 0.046)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#475569';
    ctx.fillText(profile.time || '6:00 PM onwards', 0, height * 0.08);
  });
}

function drawCelebrateCarriage(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, profile: BirthdayProfile) {
  drawCarriageBox(ctx, width, height, progress, () => {
    ctx.textAlign = 'center';
    ctx.font = `600 ${Math.round(width * 0.052)}px "Playfair Display", serif`;
    ctx.fillStyle = '#64748B';
    ctx.fillText('Join us to celebrate', 0, -height * 0.07);

    ctx.font = `600 ${Math.round(width * 0.046)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#9D174D';
    ctx.fillText(`the ${profile.age || 1}${getOrdinal(profile.age || 1)} birthday of`, 0, -height * 0.025);

    ctx.font = `italic 700 ${Math.round(width * 0.16)}px "Great Vibes", cursive`;
    const grad = ctx.createLinearGradient(0, height * 0.01, 0, height * 0.09);
    grad.addColorStop(0, '#E11D48');
    grad.addColorStop(1, '#BE185D');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(244, 114, 182, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText(profile.name || 'Our Princess', 0, height * 0.055);
  });
}

function drawBabyBoarding(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, profile: BirthdayProfile) {
  const cy = height * 0.12;
  const alpha = Math.min(1, progress * 3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width * 0.5, cy);

  const boxW = width * 0.78;
  const boxH = height * 0.075;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 12;
  roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 18);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#F472B6';
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.font = `italic 700 ${Math.round(width * 0.07)}px "Great Vibes", cursive`;
  ctx.fillStyle = '#BE185D';
  ctx.fillText('All Aboard!', 0, -boxH * 0.1);

  ctx.font = `600 ${Math.round(width * 0.035)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#4B5563';
  ctx.fillText(`${profile.name || 'Baby'}'s Birthday Train`, 0, boxH * 0.28);

  ctx.restore();
}

function drawVenueCarriage(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, profile: BirthdayProfile) {
  drawCarriageBox(ctx, width, height, progress, () => {
    ctx.textAlign = 'center';
    ctx.font = `italic 700 ${Math.round(width * 0.12)}px "Great Vibes", cursive`;
    ctx.fillStyle = '#9D174D';
    ctx.shadowColor = 'rgba(244, 114, 182, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText('Party Venue', 0, -height * 0.065);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-width * 0.25, -height * 0.02);
    ctx.lineTo(width * 0.25, -height * 0.02);
    ctx.stroke();

    ctx.font = `700 ${Math.round(width * 0.068)}px "Playfair Display", serif`;
    ctx.fillStyle = '#831843';
    ctx.fillText(profile.venueName || 'Little Stars Party Hall', 0, height * 0.03);

    ctx.font = `500 ${Math.round(width * 0.04)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#475569';
    drawWrappedText(ctx, profile.venueAddress || 'Satellite Road, Ahmedabad', 0, height * 0.075, width * 0.65, width * 0.048);
  });
}

function drawBlessingCard(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, profile: BirthdayProfile) {
  const cx = width * 0.5;
  const cy = height * 0.48;
  const cardW = width * 0.82;
  const cardH = height * 0.52;
  const alpha = Math.min(1, progress * 3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const grad = ctx.createLinearGradient(0, -cardH / 2, 0, cardH / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
  grad.addColorStop(1, 'rgba(255, 241, 242, 0.94)');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 24);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#D4AF37';
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#F472B6';
  roundRect(ctx, -cardW / 2 + 8, -cardH / 2 + 8, cardW - 16, cardH - 16, 18);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.textAlign = 'center';
  ctx.font = `italic 500 ${Math.round(width * 0.046)}px "Playfair Display", Georgia, serif`;
  ctx.fillStyle = '#831843';
  ctx.fillText('With love,', 0, -cardH * 0.36);

  ctx.font = `400 ${Math.round(width * 0.038)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#475569';
  const roleText = profile.gender === 'boy' ? "little prince's special day" : "little princess's special day";
  ctx.fillText('we invite you to celebrate our', 0, -cardH * 0.24);
  ctx.fillText(roleText, 0, -cardH * 0.16);

  ctx.font = `italic 700 ${Math.round(width * 0.075)}px "Great Vibes", cursive`;
  ctx.fillStyle = '#BE185D';
  ctx.shadowColor = 'rgba(244, 114, 182, 0.4)';
  ctx.shadowBlur = 6;

  const parents = profile.parentsNames || 'Mr. Rohan Patel & Mrs. Priya Patel';
  if (parents.includes('&')) {
    const parts = parents.split('&');
    ctx.fillText(parts[0].trim(), 0, -cardH * 0.02);
    ctx.font = `600 ${Math.round(width * 0.045)}px "Playfair Display", serif`;
    ctx.fillStyle = '#D4AF37';
    ctx.fillText('&', 0, cardH * 0.08);
    ctx.font = `italic 700 ${Math.round(width * 0.075)}px "Great Vibes", cursive`;
    ctx.fillStyle = '#BE185D';
    ctx.fillText(parts[1].trim(), 0, cardH * 0.19);
  } else {
    ctx.fillText(parents, 0, cardH * 0.06);
  }

  ctx.shadowBlur = 0;
  ctx.font = `600 ${Math.round(width * 0.034)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#9CA3AF';
  ctx.fillText('♥ Your Presence is Our Greatest Gift ♥', 0, cardH * 0.38);

  ctx.restore();
}

function drawCarriageBox(ctx: CanvasRenderingContext2D, width: number, height: number, progress: number, renderContent: () => void) {
  const cx = width * 0.5;
  const cy = height * 0.38;
  const boxW = width * 0.78;
  const boxH = height * 0.26;
  const alpha = Math.min(1, progress * 3);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const grad = ctx.createLinearGradient(0, -boxH / 2, 0, boxH / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(1, 'rgba(254, 242, 242, 0.92)');
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 20);
  ctx.fill();

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#F9A8D4';
  ctx.stroke();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#D4AF37';
  roundRect(ctx, -boxW / 2 + 6, -boxH / 2 + 6, boxW - 12, boxH - 12, 16);
  ctx.stroke();

  renderContent();
  ctx.restore();
}

function drawSteamPuffs(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const startX = width * 0.5;
  const startY = height * 0.08;

  ctx.save();
  for (let i = 0; i < steamPuffs.length; i++) {
    const p = steamPuffs[i];
    const age = ((time * 1.5 + p.age) % 3) / 3;
    const y = startY - age * (height * 0.07);
    const x = startX + Math.sin(time * 2 + i) * 12;
    const r = (p.scale + age * 0.8) * (width * 0.07);
    const a = Math.max(0, (1 - age) * p.alpha);

    const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    grad.addColorStop(0, `rgba(255, 255, 255, ${a})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSparkles(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, intensity: number) {
  if (intensity <= 0) return;
  const count = Math.round((sparkleParticles.length * intensity) / 100);

  ctx.save();
  for (let i = 0; i < count; i++) {
    const p = sparkleParticles[i];
    p.y += p.speedY;
    p.x += p.speedX;

    if (p.y < 0) p.y = 1;
    if (p.x < 0) p.x = 1;
    if (p.x > 1) p.x = 0;

    const sx = p.x * width;
    const sy = p.y * height;
    const twinkle = 0.5 + Math.sin(time * 5 + i * 2) * 0.5;

    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha * twinkle;
    drawStar4(ctx, sx, sy, p.size * (0.8 + twinkle * 0.4));
  }
  ctx.restore();
}

function drawStar4(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx, cy, cx + r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + r);
  ctx.quadraticCurveTo(cx, cy, cx - r, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - r);
  ctx.fill();
}

function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const maxDim = Math.max(width, height) * 0.75;
  const vignette = ctx.createRadialGradient(width / 2, height / 2, maxDim * 0.55, width / 2, height / 2, maxDim);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let k = 0; k < lines.length; k++) {
    ctx.fillText(lines[k].trim(), x, startY + k * lineHeight);
  }
}

export interface InteractiveParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  alpha: number;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
}

export const activeInteractiveParticles: InteractiveParticle[] = [];

export function addInteractiveParticle(
  x: number,
  y: number,
  customEmoji?: string,
  themeId?: string
) {
  const defaultEmojis: Record<string, string[]> = {
    cosmic_space: ['🚀', '🪐', '⭐', '✨', '🛸', '🌟', '☄️'],
    under_sea: ['🐬', '🌊', '🫧', '🐠', '🐚', '🦀', '🐙'],
    unicorn_rainbow: ['🦄', '🌈', '✨', '💖', '⭐', '🌸', '💫'],
    teddy_clouds: ['🧸', '☁️', '🎈', '⭐', '🍼', '🍰', '✨'],
    racing_champion: ['🏎️', '🏁', '🏆', '🔥', '⚡', '🥇', '💥'],
    royal_blue: ['👑', '🚂', '✨', '⭐', '🥇', '🏰', '🎉'],
    fairytale_pink: ['🌸', '🎀', '✨', '💖', '👑', '🦋', '🍰'],
    mint_safari: ['🍃', '🌼', '🦋', '🌿', '🌱', '🎈', '✨'],
    jungle_safari: ['🦁', '🌴', '🦒', '🐘', '🐒', '🎈', '🐾'],
  };

  const pool = (themeId && defaultEmojis[themeId]) || ['✨', '🎈', '🎉', '💖', '🌟', '👶'];
  const count = 4 + Math.floor(Math.random() * 3);

  for (let i = 0; i < count; i++) {
    const emoji = customEmoji || pool[Math.floor(Math.random() * pool.length)];
    activeInteractiveParticles.push({
      x: x + (Math.random() - 0.5) * 50,
      y: y + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 120,
      vy: -140 - Math.random() * 160,
      emoji,
      size: 26 + Math.random() * 20,
      alpha: 1.0,
      rotation: (Math.random() - 0.5) * 0.5,
      vRot: (Math.random() - 0.5) * 2,
      life: 0,
      maxLife: 1.4 + Math.random() * 0.6,
    });
  }
}

interface ThemeVisualConfig {
  primaryColor: string;
  secondaryColor: string;
  accentGold: string;
  textColor: string;
  badgeEmoji: string;
  bgGradStart: string;
  bgGradEnd: string;
  boardGradStart: string;
  boardGradEnd: string;
  boardBorder: string;
  icon: string;
  title: string;
}

const THEME_VISUALS: Record<string, ThemeVisualConfig> = {
  jungle_safari: {
    primaryColor: '#1c3d18',
    secondaryColor: '#2d5a27',
    accentGold: '#fef08a',
    textColor: '#fef3c7',
    badgeEmoji: '🦁',
    bgGradStart: '#1c3d18',
    bgGradEnd: '#132810',
    boardGradStart: '#7c4a21',
    boardGradEnd: '#4e280c',
    boardBorder: '#381c06',
    icon: '🌴',
    title: 'Jungle Safari Adventure',
  },
  cosmic_space: {
    primaryColor: '#1e1b4b',
    secondaryColor: '#312e81',
    accentGold: '#38bdf8',
    textColor: '#e0e7ff',
    badgeEmoji: '🚀',
    bgGradStart: '#0f172a',
    bgGradEnd: '#030712',
    boardGradStart: '#1e1b4b',
    boardGradEnd: '#0f172a',
    boardBorder: '#6366f1',
    icon: '🪐',
    title: 'Cosmic Starlight Mission',
  },
  under_sea: {
    primaryColor: '#083344',
    secondaryColor: '#0e7490',
    accentGold: '#38bdf8',
    textColor: '#cffafe',
    badgeEmoji: '🐬',
    bgGradStart: '#082f49',
    bgGradEnd: '#02131e',
    boardGradStart: '#0e7490',
    boardGradEnd: '#083344',
    boardBorder: '#06b6d4',
    icon: '🌊',
    title: 'Under the Sea Adventure',
  },
  teddy_clouds: {
    primaryColor: '#451a03',
    secondaryColor: '#78350f',
    accentGold: '#fde047',
    textColor: '#fef9c3',
    badgeEmoji: '🧸',
    bgGradStart: '#451a03',
    bgGradEnd: '#291003',
    boardGradStart: '#b45309',
    boardGradEnd: '#78350f',
    boardBorder: '#f59e0b',
    icon: '☁️',
    title: 'Teddy Cloud Dream',
  },
  royal_blue: {
    primaryColor: '#172554',
    secondaryColor: '#1e3a8a',
    accentGold: '#facc15',
    textColor: '#fef08a',
    badgeEmoji: '👑',
    bgGradStart: '#0f172a',
    bgGradEnd: '#020617',
    boardGradStart: '#1e3a8a',
    boardGradEnd: '#0f172a',
    boardBorder: '#eab308',
    icon: '🚂',
    title: 'Royal Prince Express',
  },
  racing_champion: {
    primaryColor: '#7f1d1d',
    secondaryColor: '#991b1b',
    accentGold: '#facc15',
    textColor: '#ffffff',
    badgeEmoji: '🏎️',
    bgGradStart: '#450a0a',
    bgGradEnd: '#1a0505',
    boardGradStart: '#991b1b',
    boardGradEnd: '#450a0a',
    boardBorder: '#facc15',
    icon: '🏁',
    title: 'Speedway Racing Champion',
  },
  fairytale_pink: {
    primaryColor: '#831843',
    secondaryColor: '#9d174d',
    accentGold: '#fbcfe8',
    textColor: '#fdf2f8',
    badgeEmoji: '🌸',
    bgGradStart: '#500724',
    bgGradEnd: '#1f030e',
    boardGradStart: '#9d174d',
    boardGradEnd: '#700732',
    boardBorder: '#f472b6',
    icon: '🎀',
    title: 'Fairytale Princess Express',
  },
  unicorn_rainbow: {
    primaryColor: '#581c87',
    secondaryColor: '#701a75',
    accentGold: '#f0abfc',
    textColor: '#fae8ff',
    badgeEmoji: '🦄',
    bgGradStart: '#3b0764',
    bgGradEnd: '#170326',
    boardGradStart: '#701a75',
    boardGradEnd: '#4a044e',
    boardBorder: '#d946ef',
    icon: '🌈',
    title: 'Unicorn Fairyland',
  },
  mint_safari: {
    primaryColor: '#064e3b',
    secondaryColor: '#065f46',
    accentGold: '#a7f3d0',
    textColor: '#ecfdf5',
    badgeEmoji: '🍃',
    bgGradStart: '#022c22',
    bgGradEnd: '#011510',
    boardGradStart: '#065f46',
    boardGradEnd: '#064e3b',
    boardBorder: '#10b981',
    icon: '🌼',
    title: 'Mint Meadow Garden',
  },
};

// Universal Pixar 3D Video render engine
function renderSafariVideo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  profile: BirthdayProfile,
  config: StudioConfig,
  customPhoto: HTMLImageElement | null,
  videoEl: HTMLVideoElement | null
) {
  ctx.clearRect(0, 0, width, height);

  const themeVis = THEME_VISUALS[profile.themeId] || THEME_VISUALS.jungle_safari;
  const isSafari = profile.themeId === 'jungle_safari';

  const vWidth = videoEl?.videoWidth || 720;
  const vHeight = videoEl?.videoHeight || 1280;
  const scale = Math.max(width / vWidth, height / vHeight);
  const dw = vWidth * scale;
  const dh = vHeight * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;

  if (videoEl && videoEl.readyState >= 2) {
    ctx.drawImage(videoEl, dx, dy, dw, dh);
  } else {
    // Dynamic themed fallback while video buffer is loading
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, themeVis.bgGradStart);
    bgGrad.addColorStop(0.5, themeVis.primaryColor);
    bgGrad.addColorStop(1, themeVis.bgGradEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = themeVis.accentGold;
    ctx.font = `italic 700 ${Math.round(width * 0.07)}px "Playfair Display", serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${themeVis.badgeEmoji} ${themeVis.title} ${themeVis.icon}`, width / 2, height / 2 - 20);

    ctx.font = `600 ${Math.round(width * 0.038)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = themeVis.textColor;
    ctx.fillText('Loading 3D Pixar Animation...', width / 2, height / 2 + 25);
  }

  // Scene timing check:
  // Safari: 0-10s (Intro), 10-18s (Board), 18-29s (Venue), 29+s (Blessings)
  // All other themes (15s): 0-4s (Intro), 4-8s (Board), 8-12s (Venue), 12-15s (Blessings)
  if (isSafari) {
    if (time >= 0 && time < 10) {
      drawPixarIntroOverlay(ctx, dx, dy, dw, dh, time, profile, customPhoto, themeVis);
    } else if (time >= 10 && time < 18) {
      drawPixarInviteBoard(ctx, dx, dy, dw, dh, time - 10, profile, customPhoto, themeVis);
    } else if (time >= 18 && time < 29) {
      drawPixarVenueOverlay(ctx, dx, dy, dw, dh, time - 18, profile, themeVis);
    } else if (time >= 29) {
      drawPixarBlessingsOverlay(ctx, dx, dy, dw, dh, time - 29, profile, themeVis);
    }
  } else {
    if (time >= 0 && time < 4) {
      drawPixarIntroOverlay(ctx, dx, dy, dw, dh, time, profile, customPhoto, themeVis);
    } else if (time >= 4 && time < 8) {
      drawPixarInviteBoard(ctx, dx, dy, dw, dh, time - 4, profile, customPhoto, themeVis);
    } else if (time >= 8 && time < 12) {
      drawPixarVenueOverlay(ctx, dx, dy, dw, dh, time - 8, profile, themeVis);
    } else if (time >= 12) {
      drawPixarBlessingsOverlay(ctx, dx, dy, dw, dh, time - 12, profile, themeVis);
    }
  }

  // Draw interactive touch/click particles
  renderInteractiveParticles(ctx, width, height);

  drawSparkles(ctx, width, height, time, config.sparkleIntensity);
  drawVignette(ctx, width, height);
}

function renderInteractiveParticles(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const dt = 0.016;
  for (let i = activeInteractiveParticles.length - 1; i >= 0; i--) {
    const p = activeInteractiveParticles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      activeInteractiveParticles.splice(i, 1);
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 80 * dt; // slight gravity reduction
    p.rotation += p.vRot * dt;
    p.alpha = Math.max(0, 1 - p.life / p.maxLife);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;
    ctx.font = `${Math.round(p.size)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, 0, 0);
    ctx.restore();
  }
}

function drawPixarIntroOverlay(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  time: number,
  profile: BirthdayProfile,
  customPhoto: HTMLImageElement | null,
  themeVis: ThemeVisualConfig
) {
  const isBoy = profile.gender === 'boy';
  const childName = profile.name || (isBoy ? 'Leo' : 'Aneira');

  // Top Banner
  const bannerW = dw * 0.76;
  const bannerH = dh * 0.086;
  const bx = dx + dw * 0.5 - bannerW / 2;
  const by = dy + dh * 0.18 - bannerH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  const topGrad = ctx.createLinearGradient(bx, by, bx, by + bannerH);
  topGrad.addColorStop(0, themeVis.boardGradStart);
  topGrad.addColorStop(1, themeVis.boardGradEnd);
  ctx.fillStyle = topGrad;
  roundRect(ctx, bx, by, bannerW, bannerH, 12);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(2, dw * 0.006);
  ctx.strokeStyle = themeVis.boardBorder;
  ctx.stroke();

  // Golden corner rivets
  const boltR = Math.max(3, dw * 0.009);
  const bolts = [
    { x: bx + 16, y: by + 12 },
    { x: bx + bannerW - 16, y: by + 12 },
    { x: bx + 16, y: by + bannerH - 12 },
    { x: bx + bannerW - 16, y: by + bannerH - 12 },
  ];
  for (const bolt of bolts) {
    const boltGrad = ctx.createRadialGradient(bolt.x - 1, bolt.y - 1, 1, bolt.x, bolt.y, boltR);
    boltGrad.addColorStop(0, '#fef08a');
    boltGrad.addColorStop(0.6, '#ca8a04');
    boltGrad.addColorStop(1, '#713f12');
    ctx.fillStyle = boltGrad;
    ctx.beginPath();
    ctx.arc(bolt.x, bolt.y, boltR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const topMsg = `${themeVis.badgeEmoji} ${childName} is Turning ONE! ${themeVis.icon}`;

  ctx.font = `800 ${Math.round(dw * 0.048)}px "Playfair Display", Georgia, serif`;
  ctx.fillStyle = '#000000';
  ctx.fillText(topMsg, bx + bannerW / 2 + 1, by + bannerH / 2 + 2);

  const goldGrad = ctx.createLinearGradient(0, by, 0, by + bannerH);
  goldGrad.addColorStop(0, '#ffffff');
  goldGrad.addColorStop(0.4, themeVis.accentGold);
  goldGrad.addColorStop(1, '#d97706');
  ctx.fillStyle = goldGrad;
  ctx.fillText(topMsg, bx + bannerW / 2, by + bannerH / 2);
  ctx.restore();

  // Bottom Badge
  const badgeW = dw * 0.64;
  const badgeH = dh * 0.155;
  const badgeX = dx + dw * 0.5 - badgeW / 2;
  const badgeY = dy + dh * 0.74 - badgeH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  const bgGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeH);
  bgGrad.addColorStop(0, themeVis.primaryColor);
  bgGrad.addColorStop(0.5, themeVis.secondaryColor);
  bgGrad.addColorStop(1, themeVis.bgGradEnd);
  ctx.fillStyle = bgGrad;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 14);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(3, dw * 0.007);
  const borderGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
  borderGrad.addColorStop(0, '#fef08a');
  borderGrad.addColorStop(0.5, '#eab308');
  borderGrad.addColorStop(1, '#ca8a04');
  ctx.strokeStyle = borderGrad;
  ctx.stroke();

  ctx.lineWidth = Math.max(1, dw * 0.0025);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.45)';
  roundRect(ctx, badgeX + 5, badgeY + 5, badgeW - 10, badgeH - 10, 10);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(dw * 0.026)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = themeVis.accentGold;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 4;

  const tagLine = profile.jungleBadgeText || `${themeVis.badgeEmoji} ${childName.toUpperCase()} • 1ST BIRTHDAY CELEBRATION ${themeVis.icon}`;
  ctx.fillText(tagLine, badgeX + badgeW / 2, badgeY + badgeH * 0.32);

  ctx.font = `900 ${Math.round(dw * 0.042)}px "Playfair Display", "Plus Jakarta Sans", sans-serif`;
  const nameGrad = ctx.createLinearGradient(0, badgeY + badgeH * 0.45, 0, badgeY + badgeH * 0.85);
  nameGrad.addColorStop(0, '#ffffff');
  nameGrad.addColorStop(0.4, themeVis.accentGold);
  nameGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.fillText(`✨ ${childName.toUpperCase()} • TURNING 1 ✨`, badgeX + badgeW / 2, badgeY + badgeH * 0.68);
  ctx.restore();

  if (customPhoto && customPhoto.complete && customPhoto.naturalWidth > 0) {
    drawPixarPhotoMedallion(ctx, dx + dw * 0.84, dy + dh * 0.14, dw * 0.12, customPhoto, childName, time, themeVis);
  }
}

function drawPixarInviteBoard(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  time: number,
  profile: BirthdayProfile,
  customPhoto: HTMLImageElement | null,
  themeVis: ThemeVisualConfig
) {
  const childName = profile.name || (profile.gender === 'boy' ? 'Leo' : 'Aneira');
  const eventDate = profile.date || 'Thursday, 20th August 2026';
  const eventTime = profile.time || '07:00 PM onwards';

  const boardW = dw * 0.64;
  const boardH = dh * 0.4;
  const bx = dx + dw * 0.5 - boardW / 2;
  const by = dy + dh * 0.44 - boardH / 2;

  ctx.save();
  const boardGrad = ctx.createLinearGradient(bx, by, bx, by + boardH);
  boardGrad.addColorStop(0, themeVis.boardGradStart);
  boardGrad.addColorStop(0.5, themeVis.boardGradEnd);
  boardGrad.addColorStop(1, themeVis.primaryColor);
  ctx.fillStyle = boardGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, bx, by, boardW, boardH, 18);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = themeVis.accentGold;
  ctx.stroke();

  // Inner border
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  roundRect(ctx, bx + 6, by + 6, boardW - 12, boardH - 12, 12);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(dw * 0.034)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = themeVis.textColor;
  ctx.fillText('We cordially invite you all to celebrate', bx + boardW / 2, by + boardH * 0.16);

  ctx.font = `800 ${Math.round(dw * 0.046)}px "Playfair Display", Georgia, serif`;
  ctx.fillStyle = themeVis.accentGold;
  ctx.fillText(`1ST BIRTHDAY PARTY OF OUR`, bx + boardW / 2, by + boardH * 0.3);

  const nameSize = Math.round(dw * 0.084);
  ctx.font = `italic 800 ${nameSize}px "Cinzel", "Playfair Display", serif`;
  const grad = ctx.createLinearGradient(0, by + boardH * 0.42, 0, by + boardH * 0.6);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, themeVis.accentGold);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 6;
  ctx.fillText(childName, bx + boardW / 2, by + boardH * 0.5);

  ctx.shadowColor = 'transparent';
  ctx.font = `700 ${Math.round(dw * 0.038)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`📅 ${eventDate.startsWith('On ') ? eventDate : `On ${eventDate}`}`, bx + boardW / 2, by + boardH * 0.7);

  ctx.font = `600 ${Math.round(dw * 0.036)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = themeVis.textColor;
  ctx.fillText(`⏰ ${eventTime.startsWith('At ') ? eventTime : `At ${eventTime}`}`, bx + boardW / 2, by + boardH * 0.84);

  if (customPhoto && customPhoto.complete && customPhoto.naturalWidth > 0) {
    drawPixarPhotoMedallion(ctx, dx + dw * 0.5, by - dh * 0.065, dw * 0.13, customPhoto, childName, time, themeVis);
  }
  ctx.restore();
}

function drawPixarVenueOverlay(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  _time: number,
  profile: BirthdayProfile,
  themeVis: ThemeVisualConfig
) {
  const venue = profile.venueName || 'VTP Purvanchal, Club House';
  const address = profile.venueAddress || 'Kesnand Road, Wagholi, Pune - 412207';

  const cardW = dw * 0.64;
  const cardH = dh * 0.36;
  const cx = dx + dw * 0.5 - cardW / 2;
  const cy = dy + dh * 0.44 - cardH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  roundRect(ctx, cx, cy, cardW, cardH, 16);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = themeVis.primaryColor;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(dw * 0.058)}px "Playfair Display", Georgia, serif`;
  ctx.fillStyle = themeVis.primaryColor;
  ctx.fillText('Party Venue', cx + cardW / 2, cy + cardH * 0.2);

  ctx.font = `${Math.round(dw * 0.034)}px sans-serif`;
  ctx.fillStyle = '#10b981';
  ctx.fillText(`${themeVis.badgeEmoji} ────── ❖ ────── ${themeVis.icon}`, cx + cardW / 2, cy + cardH * 0.36);

  ctx.font = `800 ${Math.round(dw * 0.046)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(venue, cx + cardW / 2, cy + cardH * 0.54);

  ctx.font = `500 ${Math.round(dw * 0.034)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#334155';
  drawWrappedText(ctx, address, cx + cardW / 2, cy + cardH * 0.74, cardW * 0.88, dw * 0.042);
  ctx.restore();
}

function drawPixarBlessingsOverlay(
  ctx: CanvasRenderingContext2D,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  _time: number,
  profile: BirthdayProfile,
  themeVis: ThemeVisualConfig
) {
  const parents = profile.parentsNames || 'Prabhashankar & Prity';
  const grandparents = profile.grandparentsNames || 'Akhileshwar & Rita';

  const cardW = dw * 0.64;
  const cardH = dh * 0.38;
  const cx = dx + dw * 0.5 - cardW / 2;
  const cy = dy + dh * 0.46 - cardH / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  roundRect(ctx, cx, cy, cardW, cardH, 16);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = themeVis.primaryColor;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.round(dw * 0.048)}px "Playfair Display", Georgia, serif`;
  ctx.fillStyle = themeVis.primaryColor;
  ctx.fillText(`${themeVis.badgeEmoji} Overjoyed Parents`, cx + cardW / 2, cy + cardH * 0.2);

  ctx.font = `700 ${Math.round(dw * 0.044)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(parents, cx + cardW / 2, cy + cardH * 0.36);

  ctx.font = `800 ${Math.round(dw * 0.048)}px "Playfair Display", Georgia, serif`;
  ctx.fillStyle = themeVis.primaryColor;
  ctx.fillText(`${themeVis.icon} Blessed Grandparents`, cx + cardW / 2, cy + cardH * 0.6);

  ctx.font = `700 ${Math.round(dw * 0.044)}px "Plus Jakarta Sans", sans-serif`;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(grandparents, cx + cardW / 2, cy + cardH * 0.76);
  ctx.restore();
}

function drawPixarPhotoMedallion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  photo: HTMLImageElement,
  _name: string,
  time: number,
  themeVis: ThemeVisualConfig
) {
  ctx.save();
  ctx.translate(x, y);
  const bob = Math.sin(time * 2.5) * 4;
  ctx.translate(0, bob);

  const aura = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius * 1.3);
  aura.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
  aura.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.clip();

  const scale = Math.max((radius * 2) / photo.naturalWidth, (radius * 2) / photo.naturalHeight);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  ctx.drawImage(photo, -pw / 2, -ph / 2, pw, ph);
  ctx.restore();

  ctx.lineWidth = Math.max(3, radius * 0.12);
  ctx.strokeStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = Math.max(1.5, radius * 0.04);
  ctx.strokeStyle = themeVis.primaryColor;
  ctx.beginPath();
  ctx.arc(0, 0, radius - radius * 0.08, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = `${Math.round(radius * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(themeVis.badgeEmoji, 0, -radius * 0.88);

  ctx.restore();
}
