import fs from 'node:fs';
const path = 'src/main.ts';
let s = fs.readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
function cut(start, end, replacement = '') {
  const a = s.indexOf(start), b = s.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Missing boundary: ${start}`);
  s = s.slice(0, a) + replacement + s.slice(b);
}
s = s.replace("import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';\n", "import { SceneBrushPass, SCENE_BRUSH_DEFAULTS, type SceneBrushSettings } from './SceneBrushPass.ts';\n");
cut('const composer = new EffectComposer(renderer);', 'let currentPreset:', `const paintTarget = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType,
  depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
});
const composer = new EffectComposer(renderer, paintTarget);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(Math.max(viewport.clientWidth, 1), Math.max(viewport.clientHeight, 1));
composer.addPass(new RenderPass(scene, camera));
const sceneBrushPass = new SceneBrushPass(camera);
composer.addPass(sceneBrushPass);
composer.addPass(new OutputPass());
let sceneBrushEnabled = true;

`);
cut('function applySceneOutlineDefaults(', 'function bindInterface()', `function syncSceneBrushwork(): void {
  sceneBrushPass.enabled = shaderEnabled && sceneBrushEnabled && currentDebugMode === 0
    && sceneBrushPass.settings.amount > 0;
}

function updateSceneBrushControls(): void {
  document.querySelectorAll<HTMLInputElement>('input[data-finish]').forEach(input => {
    input.value = String(sceneBrushPass.settings[input.dataset.finish as keyof SceneBrushSettings]);
    updateRangeOutput(input);
  });
}

`);
s = s.replaceAll('syncOutlinePasses()', 'syncSceneBrushwork()');
s = s.replace('let outlineColorsManuallyOverridden = false;\n', '');
s = s.replaceAll('  outlineColorsManuallyOverridden = false;\n', '');
s = s.replace('function applyReferenceLook(resetOutlineColors = false)', 'function applyReferenceLook()');
s = s.replaceAll('applyReferenceLook(true)', 'applyReferenceLook()');
s = s.replace('  if (resetOutlineColors) applySceneOutlineDefaults(true);\n', '');
s = s.replace('          if (buildContext.isActive()) applySceneOutlineDefaults();', '          if (buildContext.isActive()) syncSceneBrushwork();');
cut('  document.querySelectorAll<HTMLInputElement>(\'input[type="color"][data-color-uniform]\')', '  document.querySelectorAll<HTMLButtonElement>(\'[data-camera]\')', `  document.querySelectorAll<HTMLInputElement>('input[data-finish]').forEach(input => {
    input.addEventListener('input', () => {
      sceneBrushPass.settings[input.dataset.finish as keyof SceneBrushSettings] = Number(input.value);
      updateRangeOutput(input);
    });
  });
  updateSceneBrushControls();
  requiredElement<HTMLInputElement>('#scene-brush-enabled').addEventListener('change', event => {
    sceneBrushEnabled = (event.target as HTMLInputElement).checked;
  });
  requiredElement<HTMLSelectElement>('#scene-brush-view').addEventListener('change', event => {
    sceneBrushPass.uniforms.debug.value = Number((event.target as HTMLSelectElement).value);
  });

`);
s = s.replaceAll('  outlineRimPass.patternTexture = activeTexture.texture;\n', '')
  .replaceAll('  outlinePrimaryPass.patternTexture = activeTexture.texture;\n', '')
  .replaceAll('  outlineSecondaryPass.patternTexture = activeTexture.texture;\n', '');
s = s.replace('function replacePaintTexture(seed: number): void {', 'function replacePaintTexture(seed: number): void {\n  sceneBrushPass.uniforms.seedPhase.value = (seed % 10007) / 10007;');
s = s.replace('  clearSelection();\n  const geometries', '  clearSelection();\n  sceneBrushPass.clearSurfaces();\n  const geometries');
s = s.replace('  parent.add(group);\n  return paintedObject;', `  parent.add(group);
  // Lettering remains legible; all other painted surfaces get genuine deposits.
  if (!options.surfaceMap) sceneBrushPass.addSurface(base, 0.19, 73021 + paintedObjects.length * 3571);
  return paintedObject;`);
cut('function renderFrame(delta?: number): void {', 'function updateStats(): void {', `function renderFrame(delta?: number): void {
  syncSceneBrushwork();
  renderer.info.autoReset = false;
  renderer.info.reset();
  if (sceneBrushPass.enabled) composer.render(delta);
  else renderer.render(scene, camera);
}

`);
cut('          <details open>\n            <summary><span>Edges &amp; outlines', '          <details open>\n            <summary><span>Stylized shadows', `          <details open class="scene-brush-section">
            <summary><span>Paint beyond the edges</span><small>04</small></summary>
            <p class="finish-note">Loaded strokes follow the surfaces, catch their light, and fan out at the silhouette.</p>
            <div class="toggle-row"><label><input id="scene-brush-enabled" type="checkbox" checked /><span></span> Whole-scene brushwork</label></div>
            \${finishRangeMarkup('Scene brushwork', 'amount', 0, 1, 0.01)}
            \${finishRangeMarkup('Silhouette splay', 'splay', 0, 2.5, 0.01)}
            \${finishRangeMarkup('Stroke size', 'size', 0.4, 2.5, 0.01)}
            \${finishRangeMarkup('Dry edges', 'dry', 0, 1, 0.01)}
            <label class="select-row" for="scene-brush-view"><span>Brushwork view</span><select id="scene-brush-view">
              <option value="0">Finished painting</option><option value="1">Brush deposits only</option><option value="2">Silhouette strokes</option>
            </select></label>
          </details>

`);
cut('function colorMarkup(', 'if (import.meta.hot)', `function finishRangeMarkup(label: string, key: keyof SceneBrushSettings, min: number, max: number, step: number): string {
  return \`<label class="range-row" for="finish-\${key}"><span>\${label}</span><output for="finish-\${key}">—</output>
    <input id="finish-\${key}" data-finish="\${key}" type="range" min="\${min}" max="\${max}" step="\${step}" /></label>\`;
}

`);
s = s.replace('    composer.dispose();', '    sceneBrushPass.dispose();\n    composer.dispose();');
s = s.replace('function applySceneControlDefaults(sceneDefinition: PaintSceneDefinition): void {', `function applySceneControlDefaults(sceneDefinition: PaintSceneDefinition): void {
  Object.assign(sceneBrushPass.settings, SCENE_BRUSH_DEFAULTS);
  sceneBrushEnabled = true;
  sceneBrushPass.uniforms.debug.value = 0;
  sceneBrushPass.uniforms.seedPhase.value = (73021 % 10007) / 10007;
  const finishToggle = document.querySelector<HTMLInputElement>('#scene-brush-enabled');
  if (finishToggle) finishToggle.checked = true;
  const finishView = document.querySelector<HTMLSelectElement>('#scene-brush-view');
  if (finishView) finishView.value = '0';
  updateSceneBrushControls();`);
s = s.replace('  version: 3;', '  version: 4;\n  sceneBrushwork: SceneBrushSettings & { enabled: boolean };');
s = s.replace('    version: 3,', '    version: 4,\n    sceneBrushwork: { ...sceneBrushPass.settings, enabled: sceneBrushEnabled },');
fs.writeFileSync(path, s);
