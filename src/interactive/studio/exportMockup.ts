import {layerSvgMarkup} from '../engine/ExperienceStage';
import type {ExperienceDocument, ExperienceSection} from '../engine/schema';

const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mockup';

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = globalThis.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

export function exportSectionSvg(document: ExperienceDocument, section: ExperienceSection) {
  const markup = layerSvgMarkup(document, section);
  download(new Blob([markup], {type: 'image/svg+xml;charset=utf-8'}), `${safeName(section.name)}-1920x1080.svg`);
}

export async function exportSectionPng(document: ExperienceDocument, section: ExperienceSection) {
  const markup = layerSvgMarkup(document, section);
  const source = URL.createObjectURL(new Blob([markup], {type: 'image/svg+xml;charset=utf-8'}));
  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The mockup could not be rendered. Check that every asset is available from this website.'));
      image.src = source;
    });
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = document.stage.width;
    canvas.height = document.stage.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('PNG export is not supported by this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('PNG export failed.')), 'image/png'));
    download(blob, `${safeName(section.name)}-1920x1080.png`);
  } finally {
    URL.revokeObjectURL(source);
  }
}

export function buildAiPrompt(document: ExperienceDocument, section: ExperienceSection) {
  const layers = section.layers.filter(layer => layer.visible).map((layer, index) => {
    const t = layer.transform;
    return `${index + 1}. ${layer.name} (${layer.type}), placed at x ${Math.round(t.x)}, y ${Math.round(t.y)}, size ${Math.round(t.width)}×${Math.round(t.height)}.${layer.description ? ` ${layer.description}` : ''}`;
  });
  return [
    `Create a production-quality layered visual asset for “${document.title}”, frame “${section.name}”.`,
    `Use the attached 1920×1080 mockup as the exact composition and perspective source of truth. Do not redesign, relocate, add or remove objects.`,
    `Keep the fixed background, floor datum, proportions and camera completely unchanged so this frame aligns pixel-perfectly with every adjacent animation frame.`,
    `Render only the requested scene with realistic materials, grounded objects, physically plausible shadows and clean editable separation. Do not include labels, guides or placeholder borders in the final artwork.`,
    section.description ? `Frame intent: ${section.description}` : '',
    layers.length ? `Visible mockup layers:\n${layers.join('\n')}` : 'The frame currently contains only the fixed background.',
    `Output at 1920×1080 (16:9).`,
  ].filter(Boolean).join('\n\n');
}

export async function copyAiPrompt(document: ExperienceDocument, section: ExperienceSection) {
  const prompt = buildAiPrompt(document, section);
  await navigator.clipboard.writeText(prompt);
  return prompt;
}
